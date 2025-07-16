const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const admin = require("firebase-admin");
const { verifyToken } = require("../middleware/auth");
const { getPassById } = require("../data/passes");
const {
  sendRegistrationConfirmationEmail,
  getEmailServiceStatus,
  sendNotificationEmail,
} = require("../services/emailService");
const { events } = require("../data/events");
const { workshops } = require("../data/workshops");

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
  },
];

const getPassLimits = (passId) => {
  return passLimits.find((limit) => limit.passId === passId) || null;
};

// Initialize Razorpay instance
let razorpay = null;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log("✅ Razorpay initialized successfully");
  } else {
    console.warn(
      "⚠️ Razorpay credentials not found - payment features will be disabled"
    );
  }
} catch (error) {
  console.error("❌ Failed to initialize Razorpay:", error.message);
}

// Create order endpoint
router.post("/create-order", verifyToken, async (req, res) => {
  try {
    const { currency = "INR", receipt, notes, registrationData } = req.body;
    const userEmail = req.user.email;

    // Calculate dynamic amount based on selected events/workshops
    let totalAmount = 0;
    const isCIT = req.user.email && req.user.email.endsWith("@citchennai.net");

    // Check if pass is selected
    if (registrationData.selectedPass) {
      const pass = getPassById(registrationData.selectedPass);
      const passLimitsInfo = getPassLimits(registrationData.selectedPass);

      if (pass && passLimitsInfo) {
        // Add pass cost
        const passPrice = isCIT
          ? parseInt(pass.citPrice.replace("₹", ""))
          : parseInt(pass.price.replace("₹", ""));
        totalAmount += passPrice;

        // Add cost for additional tech events beyond what's included (if selection is enabled)
        if (
          passLimitsInfo.techEventSelectionEnabled &&
          registrationData.selectedEvents
        ) {
          const additionalEvents = Math.max(
            0,
            registrationData.selectedEvents.length -
              passLimitsInfo.techEventsIncluded
          );
          if (additionalEvents > 0) {
            // Each additional tech event: ₹99 regular, ₹59 CIT
            totalAmount += additionalEvents * (isCIT ? 59 : 99);
          }
        }

        // Add cost for additional workshops beyond what's included
        if (registrationData.selectedWorkshops) {
          const additionalWorkshops = Math.max(
            0,
            registrationData.selectedWorkshops.length -
              passLimitsInfo.workshopsIncluded
          );
          if (additionalWorkshops > 0) {
            // Each additional workshop: ₹100 for both regular and CIT
            totalAmount += additionalWorkshops * 100;
          }
        }
      }
    } else {
      // No pass selected - charge for individual events and workshops

      // Calculate event costs
      if (
        registrationData.selectedEvents &&
        registrationData.selectedEvents.length > 0
      ) {
        registrationData.selectedEvents.forEach((event) => {
          // Tech events pricing: ₹99 regular, ₹59 CIT students
          totalAmount += isCIT ? 59 : 99;
        });
      }

      // Calculate workshop costs
      if (
        registrationData.selectedWorkshops &&
        registrationData.selectedWorkshops.length > 0
      ) {
        registrationData.selectedWorkshops.forEach((workshop) => {
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
          message: "No payment required - registration is free!",
        },
      });
    }

    // Check if Razorpay is initialized
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        error: "Payment service not configured",
        message: "Razorpay credentials are missing",
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
        totalEvents: registrationData.selectedEvents?.length || 0,
        totalWorkshops: registrationData.selectedWorkshops?.length || 0,
        totalNonTechEvents: registrationData.selectedNonTechEvents?.length || 0,
        selectedPass: registrationData.selectedPass || null,
        isCIT: isCIT,
        calculatedAmount: amount,
        ...notes,
      },
    };

    console.log('=== PAYMENT DEBUG ===');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Razorpay Key ID (first 10 chars):', process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.substring(0, 10) + '...' : 'MISSING');
    console.log('Calculated amount:', amount);
    console.log('Options being sent to Razorpay:', JSON.stringify(options, null, 2));
    console.log('Creating Razorpay order with amount:', amount, 'for user:', userEmail);
    
    const order = await razorpay.orders.create(options);
    
    console.log('Razorpay order created successfully:', order.id, 'amount:', order.amount);
    console.log('Full order response:', JSON.stringify(order, null, 2));
    console.log('=== END DEBUG ===');

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
          total: amount,
        },
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

    console.log(
      "Verifying payment for order:",
      razorpay_order_id,
      "payment:",
      razorpay_payment_id
    );

    // Check if this is a QR scan detection (frontend polling detected completed payment)
    const isQRScanDetection = razorpay_signature === 'qr_scan_detected';
    
    let isAuthentic = false;
    
    if (isQRScanDetection) {
      // For QR scan detection, we'll verify by checking the order status directly with Razorpay
      console.log("QR scan payment detection - verifying order status with Razorpay");
      try {
        const orderStatus = await razorpay.orders.fetch(razorpay_order_id);
        // Check if order status indicates payment was completed
        isAuthentic = orderStatus && (orderStatus.status === 'paid' || orderStatus.amount_paid > 0);
        console.log("Razorpay order status:", orderStatus.status, "amount_paid:", orderStatus.amount_paid);
      } catch (error) {
        console.error("Error fetching order status from Razorpay:", error);
        isAuthentic = false;
      }
    } else {
      // Normal signature verification for direct payments
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

      isAuthentic = expectedSignature === razorpay_signature;
    }

    if (!isAuthentic) {
      console.error(
        "Payment verification failed for order:",
        razorpay_order_id,
        "Type:", isQRScanDetection ? "QR scan" : "Direct payment"
      );
      return res.status(400).json({
        success: false,
        error: "Invalid payment verification",
        message: "Payment verification failed",
      });
    }

    console.log(
      "Payment verified successfully for order:",
      razorpay_order_id,
      "Type:", isQRScanDetection ? "QR scan" : "Direct payment"
    );

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

    // Send confirmation email
    try {
      const emailResult = await sendRegistrationConfirmationEmail(
        finalRegistrationData,
        events,
        workshops
      );

      if (emailResult.success) {
        console.log(
          `Confirmation email sent successfully to ${req.user.email} using ${emailResult.usedEmail}`
        );
      } else {
        console.error(
          `Failed to send confirmation email: ${emailResult.error}`
        );
        // Don't fail the registration if email fails
      }
    } catch (emailError) {
      console.error("Error sending confirmation email:", emailError);
      // Continue with successful response even if email fails
    }

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

// Simple environment test endpoint (no auth required for debugging)
router.get("/env-test", (req, res) => {
  res.json({
    success: true,
    data: {
      nodeEnv: process.env.NODE_ENV || 'development',
      hasRazorpayKeyId: !!process.env.RAZORPAY_KEY_ID,
      razorpayKeyIdPrefix: process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.substring(0, 8) + '...' : 'MISSING',
      hasRazorpaySecret: !!process.env.RAZORPAY_KEY_SECRET,
      port: process.env.PORT || 'not set',
      timestamp: new Date().toISOString()
    },
    message: "Environment check completed"
  });
});

// Debug endpoint to check environment and configuration
router.get("/debug-config", verifyToken, async (req, res) => {
  try {
    const config = {
      hasRazorpayKeyId: !!process.env.RAZORPAY_KEY_ID,
      hasRazorpayKeySecret: !!process.env.RAZORPAY_KEY_SECRET,
      hasWebhookSecret: !!process.env.RAZORPAY_WEBHOOK_SECRET,
      keyIdLength: process.env.RAZORPAY_KEY_ID
        ? process.env.RAZORPAY_KEY_ID.length
        : 0,
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      userEmail: req.user.email,
      userIsCIT: req.user.email && req.user.email.endsWith("@citchennai.net"),
      emailService: getEmailServiceStatus(),
    };

    res.json({
      success: true,
      data: config,
      message: "Configuration check completed",
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

// Email service status endpoint
router.get("/email-status", verifyToken, async (req, res) => {
  try {
    const emailStatus = getEmailServiceStatus();

    res.json({
      success: true,
      data: {
        emailConfigs: emailStatus,
        totalConfigured: emailStatus.filter((config) => config.isConfigured)
          .length,
        totalUsage: emailStatus.reduce(
          (sum, config) => sum + config.currentUsage,
          0
        ),
        timestamp: new Date().toISOString(),
      },
      message: "Email service status retrieved successfully",
    });
  } catch (error) {
    console.error("Email status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get email status",
      message: error.message,
    });
  }
});

// Test email endpoint
router.post("/test-email", verifyToken, async (req, res) => {
  try {
    const { type = "test" } = req.body;
    const userEmail = req.user.email;

    if (type === "registration") {
      // Test registration email with sample data
      const sampleRegistrationData = {
        registrationId: `TEST-${Date.now()}`,
        userEmail: userEmail,
        paymentDetails: {
          paymentId: "test_payment_123",
          amount: 299,
          orderId: "test_order_123",
        },
        selectedEvents: [1, 2],
        selectedWorkshops: [1],
        selectedNonTechEvents: [],
        selectedPass: null,
        status: "confirmed",
        paymentStatus: "verified",
      };

      const result = await sendRegistrationConfirmationEmail(
        sampleRegistrationData,
        events,
        workshops
      );

      res.json({
        success: result.success,
        data: result,
        message: result.success
          ? "Test registration email sent successfully"
          : "Failed to send test email",
      });
    } else {
      // Test simple notification email
      const result = await sendNotificationEmail(
        userEmail,
        "🧪 Tech Fiesta 2025 - Email Service Test",
        `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2 style="color: #667eea;">Email Service Test</h2>
          <p>This is a test email from the Tech Fiesta 2025 email service.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Recipient:</strong> ${userEmail}</p>
          <p style="background: #f0f0f0; padding: 15px; border-radius: 5px;">
            ✅ Email service is working correctly!
          </p>
        </div>
        `,
        `Tech Fiesta 2025 - Email Service Test\n\nThis is a test email from the Tech Fiesta 2025 email service.\nTimestamp: ${new Date().toISOString()}\nRecipient: ${userEmail}\n\nEmail service is working correctly!`
      );

      res.json({
        success: result.success,
        data: result,
        message: result.success
          ? "Test email sent successfully"
          : "Failed to send test email",
      });
    }
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send test email",
      message: error.message,
    });
  }
});

module.exports = router;
