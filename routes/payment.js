const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const admin = require("firebase-admin");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create order endpoint
router.post("/create-order", verifyToken, async (req, res) => {
  try {
    const { amount, currency = "INR", receipt, notes, registrationData } = req.body;
    const userEmail = req.user.email;

    // Validate amount (minimum ₹1)
    if (!amount || amount < 1) {
      return res.status(400).json({
        success: false,
        error: "Invalid amount",
        message: "Amount must be at least ₹1",
      });
    }

    // Create order in Razorpay
    const options = {
      amount: amount * 100, // Convert to paise
      currency: currency,
      receipt: receipt || `TF2025_${Date.now()}`,
      notes: {
        userEmail: userEmail,
        userId: req.user.uid,
        ...notes,
      },
    };

    const order = await razorpay.orders.create(options);

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
      registrationData: registrationData || {}, // Store for webhook processing
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
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

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({
        success: false,
        error: "Invalid signature",
        message: "Payment verification failed",
      });
    }

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

// Webhook endpoint to handle Razorpay events
router.post("/webhook", async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    
    if (!secret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    if (!signature) {
      return res.status(400).json({ error: 'No signature header' });
    }
    
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(req.body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(req.body);
    console.log('Webhook event received:', event.event);
    
    // Handle different webhook events
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;
      case 'order.paid':
        await handleOrderPaid(event.payload.order.entity, event.payload.payment.entity);
        break;
      default:
        console.log('Unhandled webhook event:', event.event);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Webhook event handlers
async function handlePaymentCaptured(payment) {
  try {
    const db = admin.firestore();
    
    // Find the order
    const orderDoc = await db
      .collection("payment_orders")
      .doc(payment.order_id)
      .get();

    if (!orderDoc.exists) {
      console.error('Order not found for payment:', payment.id);
      return;
    }

    const orderData = orderDoc.data();
    
    // Check if registration already exists
    if (orderData.registrationId) {
      console.log('Registration already exists for order:', payment.order_id);
      return;
    }
    
    // Generate registration ID and create registration
    const { v4: uuidv4 } = require("uuid");
    const registrationId = `TF2025-${uuidv4().substr(0, 8).toUpperCase()}`;

    // Create registration record
    const registrationData = {
      registrationId,
      paymentDetails: {
        orderId: payment.order_id,
        paymentId: payment.id,
        amount: payment.amount / 100, // Convert from paise
        currency: payment.currency,
        status: payment.status,
        paidAt: admin.firestore.Timestamp.now(),
        method: payment.method,
        webhookProcessed: true,
      },
      status: "confirmed",
      paymentStatus: "verified",
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      userId: orderData.userId,
      userEmail: orderData.userEmail,
      // Add registration data from order notes
      ...orderData.registrationData
    };

    await db.collection("registrations").add(registrationData);
    
    // Update order status
    await db.collection("payment_orders").doc(payment.order_id).update({
      status: "completed",
      paymentId: payment.id,
      registrationId,
      completedAt: admin.firestore.Timestamp.now(),
      webhookProcessed: true,
    });

    console.log('Registration created via webhook:', registrationId);
  } catch (error) {
    console.error('Error handling payment captured:', error);
  }
}

async function handlePaymentFailed(payment) {
  try {
    const db = admin.firestore();
    
    // Update order status to failed
    await db.collection("payment_orders").doc(payment.order_id).update({
      status: "failed",
      failedAt: admin.firestore.Timestamp.now(),
      failureReason: payment.error_description || payment.error_code || 'Payment failed',
      webhookProcessed: true,
    });

    console.log('Payment failed via webhook:', payment.id, payment.error_description);
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

async function handleOrderPaid(order, payment) {
  try {
    const db = admin.firestore();
    
    // Update order as paid
    await db.collection("payment_orders").doc(order.id).update({
      orderPaidAt: admin.firestore.Timestamp.now(),
      orderStatus: 'paid',
      webhookProcessed: true,
    });

    console.log('Order marked as paid via webhook:', order.id);
  } catch (error) {
    console.error('Error handling order paid:', error);
  }
}

module.exports = router;
