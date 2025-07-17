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

    // Calculate total amount based on selected events/workshops
    const totalAmount = 0; // For free registrations

    if (totalAmount === 0) {
      // Free registration - create record directly
      const registrationId = `TF2025-${require('uuid').v4().substr(0, 8).toUpperCase()}`;
      
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
        eventCount: (formData.selectedEvents?.length || 0) + 
                    (formData.selectedWorkshops?.length || 0) + 
                    (formData.selectedNonTechEvents?.length || 0),
        
        // Admin tracking fields
        arrivalStatus: {
          hasArrived: false,
          arrivalTime: null,
          checkedInBy: null,
          notes: ""
        },
        
        // Workshop details for pass holders
        workshopDetails: {
          selectedWorkshop: formData.selectedPass ? (formData.selectedWorkshops?.[0]?.id || null) : null,
          workshopTitle: formData.selectedPass ? (formData.selectedWorkshops?.[0]?.title || "") : "",
          canEditWorkshop: !!formData.selectedPass, // Can edit if they have a pass
          workshopAttended: false,
          workshopAttendanceTime: null
        },
        
        // Event attendance tracking
        eventAttendance: {
          techEvents: (formData.selectedEvents || []).map(event => ({
            eventId: event.id,
            eventTitle: event.title,
            attended: false,
            attendanceTime: null,
            notes: ""
          })),
          workshops: (formData.selectedWorkshops || []).map(workshop => ({
            workshopId: workshop.id,
            workshopTitle: workshop.title,
            attended: false,
            attendanceTime: null,
            notes: ""
          })),
          nonTechEvents: (formData.selectedNonTechEvents || []).map(event => ({
            eventId: event.id,
            eventTitle: event.title,
            attended: false,
            attendanceTime: null,
            paidOnArrival: false,
            amountPaid: 0,
            notes: ""
          }))
        },
        
        // Admin notes and flags
        adminNotes: {
          generalNotes: "",
          specialRequirements: "",
          flagged: false,
          flagReason: "",
          lastModifiedBy: null,
          lastModifiedAt: null
        },
        
        // Contact and emergency details
        contactDetails: {
          emergencyContact: "",
          emergencyPhone: "",
          dietaryRestrictions: "",
          accessibility: ""
        }
      };
      
      await db.collection("registrations").add(registrationData);
      
      console.log(`Free registration completed: ${registrationId} for user ${userEmail}`);
      
      return res.json({
        success: true,
        data: {
          registrationId,
          status: "confirmed",
          eventCount: registrationData.eventCount
        },
        message: "Registration completed successfully"
      });
    }

    // For paid registrations (not currently in use since totalAmount is always 0)
    res.json({
      success: true,
      data: {
        requiresPayment: true,
        amount: totalAmount,
        currency: "INR",
        message: "Payment required to complete registration",
      },
      message: "Please complete payment to finalize registration",
    });
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

// Admin endpoint to update arrival status
router.put("/admin/arrival/:registrationId", verifyToken, async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { hasArrived, notes, checkedInBy } = req.body;

    const db = admin.firestore();
    const registrationsRef = db.collection("registrations");
    
    // Find registration by registrationId
    const query = registrationsRef.where("registrationId", "==", registrationId);
    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: "Registration not found",
        message: "No registration found with the provided ID",
      });
    }

    const docRef = snapshot.docs[0].ref;
    const updateData = {
      "arrivalStatus.hasArrived": hasArrived,
      "arrivalStatus.notes": notes || "",
      "arrivalStatus.checkedInBy": checkedInBy || req.user.email,
      "arrivalStatus.arrivalTime": hasArrived ? admin.firestore.Timestamp.now() : null,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await docRef.update(updateData);

    res.json({
      success: true,
      data: { registrationId, hasArrived, notes },
      message: "Arrival status updated successfully",
    });
  } catch (error) {
    console.error("Error updating arrival status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update arrival status",
      message: error.message,
    });
  }
});

// Admin endpoint to update workshop selection
router.put("/admin/workshop/:registrationId", verifyToken, async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { selectedWorkshop, workshopTitle } = req.body;

    const db = admin.firestore();
    const registrationsRef = db.collection("registrations");
    
    const query = registrationsRef.where("registrationId", "==", registrationId);
    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: "Registration not found",
        message: "No registration found with the provided ID",
      });
    }

    const docRef = snapshot.docs[0].ref;
    const updateData = {
      "workshopDetails.selectedWorkshop": selectedWorkshop,
      "workshopDetails.workshopTitle": workshopTitle || "",
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await docRef.update(updateData);

    res.json({
      success: true,
      data: { registrationId, selectedWorkshop, workshopTitle },
      message: "Workshop selection updated successfully",
    });
  } catch (error) {
    console.error("Error updating workshop selection:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update workshop selection",
      message: error.message,
    });
  }
});

// Admin endpoint to update event attendance
router.put("/admin/attendance/:registrationId", verifyToken, async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { eventType, eventId, attended, notes, paidOnArrival, amountPaid } = req.body;

    const db = admin.firestore();
    const registrationsRef = db.collection("registrations");
    
    const query = registrationsRef.where("registrationId", "==", registrationId);
    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: "Registration not found",
        message: "No registration found with the provided ID",
      });
    }

    const doc = snapshot.docs[0];
    const docRef = doc.ref;
    const data = doc.data();

    // Update the specific event attendance
    const eventAttendance = data.eventAttendance || {};
    const eventTypeArray = eventAttendance[eventType] || [];
    
    const eventIndex = eventTypeArray.findIndex(e => e.eventId === eventId);
    if (eventIndex !== -1) {
      eventTypeArray[eventIndex] = {
        ...eventTypeArray[eventIndex],
        attended,
        attendanceTime: attended ? admin.firestore.Timestamp.now() : null,
        notes: notes || "",
        ...(eventType === 'nonTechEvents' && { paidOnArrival, amountPaid: amountPaid || 0 })
      };

      const updateData = {
        [`eventAttendance.${eventType}`]: eventTypeArray,
        updatedAt: admin.firestore.Timestamp.now(),
      };

      await docRef.update(updateData);
    }

    res.json({
      success: true,
      data: { registrationId, eventType, eventId, attended },
      message: "Event attendance updated successfully",
    });
  } catch (error) {
    console.error("Error updating event attendance:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update event attendance",
      message: error.message,
    });
  }
});

// Admin endpoint to update notes and flags
router.put("/admin/notes/:registrationId", verifyToken, async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { generalNotes, specialRequirements, flagged, flagReason } = req.body;

    const db = admin.firestore();
    const registrationsRef = db.collection("registrations");
    
    const query = registrationsRef.where("registrationId", "==", registrationId);
    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: "Registration not found",
        message: "No registration found with the provided ID",
      });
    }

    const docRef = snapshot.docs[0].ref;
    const updateData = {
      "adminNotes.generalNotes": generalNotes || "",
      "adminNotes.specialRequirements": specialRequirements || "",
      "adminNotes.flagged": flagged || false,
      "adminNotes.flagReason": flagReason || "",
      "adminNotes.lastModifiedBy": req.user.email,
      "adminNotes.lastModifiedAt": admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await docRef.update(updateData);

    res.json({
      success: true,
      data: { registrationId, generalNotes, specialRequirements, flagged, flagReason },
      message: "Admin notes updated successfully",
    });
  } catch (error) {
    console.error("Error updating admin notes:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update admin notes",
      message: error.message,
    });
  }
});

// Admin endpoint to get all registrations with admin fields
router.get("/admin/all", verifyToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const registrationsRef = db.collection("registrations");
    const snapshot = await registrationsRef.orderBy("createdAt", "desc").get();

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
      message: "All registrations retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting all registrations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve registrations",
      message: error.message,
    });
  }
});

module.exports = router;
