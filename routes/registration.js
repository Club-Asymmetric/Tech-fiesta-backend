const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");
const {
  sendRegistrationConfirmationEmail,
} = require("../services/emailService");
const { events } = require("../data/events");
const { workshops } = require("../data/workshops");

// Middleware to verify Firebase ID token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Missing or invalid authorization header",
      });
    }

    const token = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Invalid token",
    });
  }
};

// Check for duplicate registrations
router.post("/check-duplicate", verifyToken, async (req, res) => {
  try {
    const { email, whatsapp } = req.body;

    if (!email || !whatsapp) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        message: "Email and WhatsApp number are required",
      });
    }

    const db = admin.firestore();
    const registrationsRef = db.collection("registrations");

    // Check for email duplicates
    const emailQuery = registrationsRef.where(
      "email",
      "==",
      email.toLowerCase()
    );
    const emailSnapshot = await emailQuery.get();

    // Check for WhatsApp duplicates
    const whatsappQuery = registrationsRef.where("whatsapp", "==", whatsapp);
    const whatsappSnapshot = await whatsappQuery.get();

    const duplicateFields = [];
    let existingRegistration = null;

    if (!emailSnapshot.empty) {
      duplicateFields.push("email");
      existingRegistration = {
        id: emailSnapshot.docs[0].id,
        ...emailSnapshot.docs[0].data(),
      };
    }

    if (!whatsappSnapshot.empty) {
      duplicateFields.push("whatsapp");
      if (!existingRegistration) {
        existingRegistration = {
          id: whatsappSnapshot.docs[0].id,
          ...whatsappSnapshot.docs[0].data(),
        };
      }
    }

    res.json({
      success: true,
      data: {
        exists: duplicateFields.length > 0,
        duplicateFields,
        existingRegistration,
      },
      message: "Duplicate check completed",
    });
  } catch (error) {
    console.error("Error checking duplicate registration:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check for duplicate registrations",
      message: error.message,
    });
  }
});

// Submit registration
router.post("/submit", verifyToken, async (req, res) => {
  try {
    const formData = req.body;
    const userEmail = req.user.email;

    // Validate that the user is submitting their own registration
    if (formData.email.toLowerCase() !== userEmail.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You can only submit registration for your own email address",
      });
    }

    // Calculate total amount based on selected events/workshops
    let totalAmount = 0;
    const isCIT = req.user.email && req.user.email.endsWith("@citchennai.net");

    // Calculate cost for tech events (if no pass selected)
    if (!formData.selectedPass && formData.selectedEvents) {
      formData.selectedEvents.forEach((selectedEvent) => {
        const event = events.find((e) => e.id === selectedEvent.id);
        if (event && event.price) {
          const price = isCIT && event.citPrice ? event.citPrice : event.price;
          totalAmount += parseInt(price.replace("₹", ""));
        }
      });
    }

    // Calculate cost for workshops (if no pass selected)
    if (!formData.selectedPass && formData.selectedWorkshops) {
      const workshopsData = require("../data/workshops").workshops;
      formData.selectedWorkshops.forEach((selectedWorkshop) => {
        const workshop = workshopsData.find(
          (w) => w.id === selectedWorkshop.id
        );
        if (workshop && workshop.price) {
          const price =
            isCIT && workshop.citPrice ? workshop.citPrice : workshop.price;
          totalAmount += parseInt(price.replace("₹", ""));
        }
      });
    }

    // Add pass cost if selected
    if (formData.selectedPass) {
      const { getPassById } = require("../data/passes");
      const pass = getPassById(formData.selectedPass);
      if (pass) {
        const passPrice = isCIT ? pass.citPrice : pass.price;
        totalAmount += parseInt(passPrice.replace("₹", ""));
      }
    }

    // Non-tech events are always free to register (paid on arrival)
    // So they don't add to totalAmount

    console.log(
      `💰 Calculated total amount: ₹${totalAmount} for user ${userEmail}`
    );
    console.log(`📊 Registration details:`, {
      selectedEvents: formData.selectedEvents?.length || 0,
      selectedWorkshops: formData.selectedWorkshops?.length || 0,
      selectedNonTechEvents: formData.selectedNonTechEvents?.length || 0,
      selectedPass: formData.selectedPass || null,
      isCIT,
    });

    // Always send confirmation email regardless of amount
    // Free registrations (totalAmount = 0) are confirmed immediately
    // Paid registrations will need payment processing
    if (totalAmount === 0) {
      // Free registration - create record directly
      const registrationId = `TF2025-${require("uuid")
        .v4()
        .substr(0, 8)
        .toUpperCase()}`;

      // Create registration record
      const db = admin.firestore();
      const registrationData = {
        registrationId,
        userId: req.user.uid,
        userEmail: req.user.email,
        ...formData,
        status: "confirmed", // Directly confirmed since it's free
        paymentStatus: "not-required",
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        eventCount:
          (formData.selectedEvents?.length || 0) +
          (formData.selectedWorkshops?.length || 0) +
          (formData.selectedNonTechEvents?.length || 0),
      };

      await db.collection("registrations").add(registrationData);

      console.log(
        `Free registration completed: ${registrationId} for user ${userEmail}`
      );

      // Send confirmation email for free registration
      try {
        const emailData = {
          registrationId,
          userEmail: req.user.email,
          userName: formData.name,
          userDetails: {
            name: formData.name,
            email: formData.email,
            whatsapp: formData.whatsapp,
            college: formData.college,
            department: formData.department,
            year: formData.year,
          },
          teamDetails: formData.isTeamEvent
            ? {
                isTeamEvent: formData.isTeamEvent,
                teamSize: formData.teamSize,
                teamMembers: formData.teamMembers || [],
              }
            : null,
          paymentDetails: { amount: 0 }, // Free registration
          selectedPass: formData.selectedPass,
          selectedEvents: formData.selectedEvents || [],
          selectedWorkshops: formData.selectedWorkshops || [],
          selectedNonTechEvents: formData.selectedNonTechEvents || [],
        };

        console.log(
          `📧 Sending confirmation email for free registration: ${registrationId}`
        );
        const emailResult = await sendRegistrationConfirmationEmail(
          emailData,
          events,
          workshops
        );

        if (emailResult.success) {
          console.log(
            `✅ Free registration email sent successfully to ${req.user.email}`
          );
        } else {
          console.error(
            `❌ Failed to send free registration email:`,
            emailResult.error
          );
        }
      } catch (emailError) {
        console.error(`❌ Error sending free registration email:`, emailError);
        // Don't fail the registration if email fails
      }

      return res.json({
        success: true,
        data: {
          registrationId,
          status: "confirmed",
          eventCount: registrationData.eventCount,
        },
        message: "Registration completed successfully",
      });
    } else {
      // For paid registrations - redirect to payment processing
      console.log(`💳 Payment required: ₹${totalAmount} for user ${userEmail}`);

      return res.json({
        success: true,
        data: {
          requiresPayment: true,
          amount: totalAmount,
          currency: "INR",
          registrationData: formData,
        },
        message: "Please complete payment to finalize registration",
      });
    }
  } catch (error) {
    console.error("Error processing registration:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process registration",
      message: error.message,
    });
  }
});

// Get user's registrations
router.get("/my-registrations", verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const db = admin.firestore();
    const registrationsRef = db.collection("registrations");

    const query = registrationsRef.where("userEmail", "==", userEmail);
    const snapshot = await query.get();

    const registrations = [];
    snapshot.forEach((doc) => {
      registrations.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.json({
      success: true,
      data: registrations,
      message: "User registrations retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting user registrations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve registrations",
      message: error.message,
    });
  }
});

module.exports = router;
