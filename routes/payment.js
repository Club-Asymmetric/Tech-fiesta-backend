const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const admin = require("firebase-admin");
const { verifyToken } = require("../middleware/auth");
const { getPassById } = require("../data/passes");

const router = express.Router();

// Pass limits configuration (should match frontend)
const passLimits = [
  {
    passId: 1,
    workshopsIncluded: 1,
    maxAdditionalWorkshops: 4,
    workshopSelectionEnabled: true,
    techEventsIncluded: 6, // Unlimited
    maxAdditionalTechEvents: 0,
    techEventSelectionEnabled: false, // Disabled - unlimited access
    nonTechEventsIncluded: 4,
    maxAdditionalNonTechEvents: 0,
    nonTechEventSelectionEnabled: false, // Disabled - pay on arrival
  }
];

const getPassLimits = (passId) => {
  return passLimits.find(limit => limit.passId === passId) || null;
};

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create order endpoint
router.post("/create-order", verifyToken, async (req, res) => {
  try {
    const { currency = "INR", receipt, notes, registrationData } = req.body;
    const userEmail = req.user.email;

    // Calculate dynamic amount based on selected events/workshops
    let totalAmount = 0;
    const isCIT = req.user.email && req.user.email.endsWith('@citchennai.net');
    
    // Check if pass is selected
    if (registrationData.selectedPass) {
      const pass = getPassById(registrationData.selectedPass);
      const passLimitsInfo = getPassLimits(registrationData.selectedPass);
      
      if (pass && passLimitsInfo) {
        // Add pass cost
        const passPrice = isCIT ? parseInt(pass.citPrice.replace('₹', '')) : parseInt(pass.price.replace('₹', ''));
        totalAmount += passPrice;
        
        // Add cost for additional tech events beyond what's included (if selection is enabled)
        if (passLimitsInfo.techEventSelectionEnabled && registrationData.selectedEvents) {
          const additionalEvents = Math.max(0, registrationData.selectedEvents.length - passLimitsInfo.techEventsIncluded);
          if (additionalEvents > 0) {
            // Each additional tech event: ₹99 regular, ₹59 CIT
            totalAmount += additionalEvents * (isCIT ? 59 : 99);
          }
        }
        
        // Add cost for additional workshops beyond what's included
        if (registrationData.selectedWorkshops) {
          const additionalWorkshops = Math.max(0, registrationData.selectedWorkshops.length - passLimitsInfo.workshopsIncluded);
          if (additionalWorkshops > 0) {
            // Each additional workshop: ₹100 for both regular and CIT
            totalAmount += additionalWorkshops * 100;
          }
        }
      }
    } else {
      // No pass selected - charge for individual events and workshops
      
      // Calculate event costs
      if (registrationData.selectedEvents && registrationData.selectedEvents.length > 0) {
        registrationData.selectedEvents.forEach(event => {
          // Tech events pricing: ₹99 regular, ₹59 CIT students
          totalAmount += isCIT ? 59 : 99;
        });
      }

      // Calculate workshop costs
      if (registrationData.selectedWorkshops && registrationData.selectedWorkshops.length > 0) {
        registrationData.selectedWorkshops.forEach(workshop => {
          // Workshop pricing: ₹100 for both regular and CIT students
          totalAmount += 100;
        });
      }
    }

    // Non-tech events are free (pay on arrival), so no cost added

    // Final amount
    const amount = totalAmount;

    // Validate amount
    if (amount < 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid amount",
        message: "Amount cannot be negative",
      });
    }

    // If amount is 0, return free registration response
    if (amount === 0) {
      return res.json({
        success: true,
        data: {
          amount: 0,
          currency: currency,
          freeRegistration: true,
          message: "No payment required - registration is free!"
        }
      });
    }

    // Create order in Razorpay
    const options = {
      amount: 1 * 100, // Convert to paise - use calculated amount
      currency: currency,
      receipt: receipt || `TF2025_${Date.now()}`,
      notes: {
        userEmail: userEmail,
        userId: req.user.uid,
        totalEvents: (registrationData.selectedEvents?.length || 0),
        totalWorkshops: (registrationData.selectedWorkshops?.length || 0),
        totalNonTechEvents: (registrationData.selectedNonTechEvents?.length || 0),
        selectedPass: registrationData.selectedPass || null,
        isCIT: isCIT,
        calculatedAmount: amount,
        ...notes,
      },
    };

    console.log('Creating Razorpay order with amount:', amount, 'for user:', userEmail);
    const order = await razorpay.orders.create(options);
    console.log('Razorpay order created successfully:', order.id, 'amount:', order.amount);

    // Store order details in Firebase for verification
    const db = admin.firestore();
    await db.collection("payment_orders").doc(order.id).set({
      orderId: order.id,
      amount: amount,
      currency: currency,
      status: "created",
      userId: req.user.uid,
      userEmail: userEmail,
      createdAt: admin.firestore.Timestamp.now(),
      notes: notes || {},
      registrationData: registrationData || {}, // Store for client verification
      calculatedAmount: amount,
      verificationMethod: "client-side", // Indicates client-side verification flow
      breakdown: {
        techEvents: registrationData.selectedEvents?.length || 0,
        workshops: registrationData.selectedWorkshops?.length || 0,
        nonTechEvents: registrationData.selectedNonTechEvents?.length || 0,
      }
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
        calculatedAmount: amount,
        breakdown: {
          techEvents: registrationData.selectedEvents?.length || 0,
          workshops: registrationData.selectedWorkshops?.length || 0,
          nonTechEvents: registrationData.selectedNonTechEvents?.length || 0,
          total: amount
        }
      },
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create order",
      message: error.message,
    });
  }
});

// Verify payment endpoint
router.post("/verify-payment", verifyToken, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      registrationData,
    } = req.body;

    console.log('Verifying payment for order:', razorpay_order_id, 'payment:', razorpay_payment_id);

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      console.error('Payment signature verification failed for order:', razorpay_order_id);
      return res.status(400).json({
        success: false,
        error: "Invalid signature",
        message: "Payment verification failed",
      });
    }

    console.log('Payment signature verified successfully for order:', razorpay_order_id);

    // Get order details from Firebase
    const db = admin.firestore();
    const orderDoc = await db
      .collection("payment_orders")
      .doc(razorpay_order_id)
      .get();

    if (!orderDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
        message: "Order details not found",
      });
    }

    const orderData = orderDoc.data();

    // Verify user owns this order
    if (orderData.userId !== req.user.uid) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized",
        message: "You are not authorized to verify this payment",
      });
    }

    // Check if registration already exists to prevent duplicates
    if (orderData.registrationId) {
      console.log('Registration already exists for order:', razorpay_order_id, 'registration:', orderData.registrationId);
      return res.json({
        success: true,
        data: {
          registrationId: orderData.registrationId,
          status: "confirmed",
          paymentStatus: "verified",
          amount: orderData.amount,
        },
        message: "Registration already completed successfully",
      });
    }

    // Generate registration ID
    const { v4: uuidv4 } = require("uuid");
    const registrationId = `TF2025-${uuidv4().substr(0, 8).toUpperCase()}`;

    // Create registration record with payment details
    const finalRegistrationData = {
      registrationId,
      ...registrationData,
      paymentDetails: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        amount: orderData.amount,
        currency: orderData.currency,
        status: "paid",
        paidAt: admin.firestore.Timestamp.now(),
        verificationMethod: "client-side", // Indicates this was verified via client, not webhook
      },
      status: "confirmed",
      paymentStatus: "verified",
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      userId: req.user.uid,
      userEmail: req.user.email,
    };

    // Save registration to database
    const registrationRef = await db
      .collection("registrations")
      .add(finalRegistrationData);

    // Update payment order status
    await db.collection("payment_orders").doc(razorpay_order_id).update({
      status: "completed",
      paymentId: razorpay_payment_id,
      registrationId,
      completedAt: admin.firestore.Timestamp.now(),
    });

    console.log("Payment verified and registration completed:", registrationId);

    res.json({
      success: true,
      data: {
        registrationId,
        status: "confirmed",
        paymentStatus: "verified",
        amount: orderData.amount,
      },
      message: "Payment verified and registration completed successfully",
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      success: false,
      error: "Payment verification failed",
      message: error.message,
    });
  }
});

// Get payment status endpoint
router.get("/status/:orderId", verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const db = admin.firestore();

    const orderDoc = await db.collection("payment_orders").doc(orderId).get();

    if (!orderDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
        message: "Order details not found",
      });
    }

    const orderData = orderDoc.data();

    // Verify user owns this order
    if (orderData.userId !== req.user.uid) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized",
        message: "You are not authorized to view this order",
      });
    }

    res.json({
      success: true,
      data: {
        orderId: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        status: orderData.status,
        createdAt: orderData.createdAt,
        registrationId: orderData.registrationId || null,
      },
      message: "Order status retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching payment status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch payment status",
      message: error.message,
    });
  }
});

// Note: Webhooks removed - using client-side verification only
// This simplifies deployment but requires users to complete the payment flow

// Get payment warnings for frontend display
router.get("/payment-warnings", (req, res) => {
  res.json({
    success: true,
    data: {
      warnings: [
        "⚠️ DO NOT close this browser tab during payment",
        "⚠️ DO NOT navigate to other pages until payment is complete",
        "⚠️ Keep this page open until you see the confirmation message",
        "⚠️ If you close the page during payment, your registration may not be completed even if payment succeeds"
      ],
      title: "Important Payment Instructions",
      subtitle: "Please read carefully before proceeding"
    },
    message: "Payment warnings retrieved successfully"
  });
});

// Debug endpoint to check environment and configuration
router.get("/debug-config", verifyToken, async (req, res) => {
  try {
    const config = {
      hasRazorpayKeyId: !!process.env.RAZORPAY_KEY_ID,
      hasRazorpayKeySecret: !!process.env.RAZORPAY_KEY_SECRET,
      hasWebhookSecret: !!process.env.RAZORPAY_WEBHOOK_SECRET,
      keyIdLength: process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.length : 0,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      userEmail: req.user.email,
      userIsCIT: req.user.email && req.user.email.endsWith('@citchennai.net')
    };

    res.json({
      success: true,
      data: config,
      message: "Configuration check completed"
    });
  } catch (error) {
    console.error("Debug config error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get debug config",
      message: error.message,
    });
  }
});

module.exports = router;
