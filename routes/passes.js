const express = require("express");
const router = express.Router();
const { passes, getPassById, getAvailablePasses } = require("../data/passes");

// GET /api/passes - Get all passes
router.get("/", (req, res) => {
  try {
    res.json({
      success: true,
      data: getAvailablePasses(),
    });
  } catch (error) {
    console.error("Error fetching passes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch passes",
      error: error.message,
    });
  }
});

// GET /api/passes/:id - Get pass by ID
router.get("/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pass = getPassById(id);

    if (!pass) {
      return res.status(404).json({
        success: false,
        message: "Pass not found",
      });
    }

    res.json({
      success: true,
      data: pass,
    });
  } catch (error) {
    console.error("Error fetching pass:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pass",
      error: error.message,
    });
  }
});

module.exports = router;
