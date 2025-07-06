const express = require("express");
const router = express.Router();
const {
  events,
  getTechEvents,
  getNonTechEvents,
  getEventById,
  getUpcomingEvents,
} = require("../data/events");

// Get all events
router.get("/", (req, res) => {
  try {
    res.json({
      success: true,
      data: events,
      message: "Events retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve events",
      message: error.message,
    });
  }
});

// Get technical events
router.get("/tech", (req, res) => {
  try {
    const techEvents = getTechEvents();
    res.json({
      success: true,
      data: techEvents,
      message: "Technical events retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve technical events",
      message: error.message,
    });
  }
});

// Get non-technical events
router.get("/non-tech", (req, res) => {
  try {
    const nonTechEvents = getNonTechEvents();
    res.json({
      success: true,
      data: nonTechEvents,
      message: "Non-technical events retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve non-technical events",
      message: error.message,
    });
  }
});

// Get upcoming events
router.get("/upcoming", (req, res) => {
  try {
    const upcomingEvents = getUpcomingEvents();
    res.json({
      success: true,
      data: upcomingEvents,
      message: "Upcoming events retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve upcoming events",
      message: error.message,
    });
  }
});

// Get event by ID
router.get("/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const event = getEventById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
        message: `Event with ID ${id} does not exist`,
      });
    }

    res.json({
      success: true,
      data: event,
      message: "Event retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve event",
      message: error.message,
    });
  }
});

module.exports = router;
