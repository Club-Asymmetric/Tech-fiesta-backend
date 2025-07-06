const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");

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

    // Generate unique IDs
    const registrationId = `TF2025-${uuidv4().substr(0, 8).toUpperCase()}`;
    const documentId = uuidv4();

    // Check for duplicates first
    const db = admin.firestore();
    const registrationsRef = db.collection("registrations");

    const emailQuery = registrationsRef.where(
      "email",
      "==",
      formData.email.toLowerCase()
    );
    const emailSnapshot = await emailQuery.get();

    if (!emailSnapshot.empty) {
      return res.status(400).json({
        success: false,
        error: "Duplicate registration",
        message: "A registration already exists with this email address",
      });
    }

    // Prepare registration data
    const registrationData = {
      registrationId,
      name: formData.name.trim(),
      department: formData.department.trim(),
      email: formData.email.toLowerCase().trim(),
      whatsapp: formData.whatsapp.trim(),
      college: formData.college.trim(),
      year: formData.year,
      isTeamEvent: formData.isTeamEvent,
      teamSize: formData.teamSize,
      teamMembers: formData.teamMembers || [],
      selectedEvents: formData.selectedEvents,
      selectedWorkshops: formData.selectedWorkshops,
      selectedNonTechEvents: formData.selectedNonTechEvents,
      transactionIds: formData.transactionIds,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      status: "pending",
      paymentStatus: "pending",
      userId: req.user.uid,
      userEmail: req.user.email,
    };

    // Add to Firestore
    const docRef = await registrationsRef.add(registrationData);

    console.log("Registration submitted successfully:", docRef.id);

    res.json({
      success: true,
      data: {
        registrationId,
        documentId: docRef.id,
      },
      message: `Registration submitted successfully! Your registration ID is ${registrationId}. Please save this for future reference.`,
    });
  } catch (error) {
    console.error("Error submitting registration:", error);
    res.status(500).json({
      success: false,
      error: "Failed to submit registration",
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
