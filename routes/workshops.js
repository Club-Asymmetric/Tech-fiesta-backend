const express = require("express");
const router = express.Router();
const {
  workshops,
  getWorkshopsByCategory,
  getWorkshopsByLevel,
  getWorkshopById,
  getAvailableWorkshops,
  getWorkshopCategories,
  getWorkshopLevels,
} = require("../data/workshops");

// Get all workshops
router.get("/", (req, res) => {
  try {
    res.json({
      success: true,
      data: workshops,
      message: "Workshops retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve workshops",
      message: error.message,
    });
  }
});

// Get workshops by category
router.get("/category/:category", (req, res) => {
  try {
    const category = req.params.category;
    const categoryWorkshops = getWorkshopsByCategory(category);
    res.json({
      success: true,
      data: categoryWorkshops,
      message: `Workshops in ${category} category retrieved successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve workshops by category",
      message: error.message,
    });
  }
});

// Get workshops by level
router.get("/level/:level", (req, res) => {
  try {
    const level = req.params.level;
    const levelWorkshops = getWorkshopsByLevel(level);
    res.json({
      success: true,
      data: levelWorkshops,
      message: `${level} level workshops retrieved successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve workshops by level",
      message: error.message,
    });
  }
});

// Get available workshops
router.get("/available", (req, res) => {
  try {
    const availableWorkshops = getAvailableWorkshops();
    res.json({
      success: true,
      data: availableWorkshops,
      message: "Available workshops retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve available workshops",
      message: error.message,
    });
  }
});

// Get workshop categories
router.get("/categories", (req, res) => {
  try {
    const categories = getWorkshopCategories();
    res.json({
      success: true,
      data: categories,
      message: "Workshop categories retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve workshop categories",
      message: error.message,
    });
  }
});

// Get workshop levels
router.get("/levels", (req, res) => {
  try {
    const levels = getWorkshopLevels();
    res.json({
      success: true,
      data: levels,
      message: "Workshop levels retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve workshop levels",
      message: error.message,
    });
  }
});

// Get workshop by ID
router.get("/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const workshop = getWorkshopById(id);

    if (!workshop) {
      return res.status(404).json({
        success: false,
        error: "Workshop not found",
        message: `Workshop with ID ${id} does not exist`,
      });
    }

    res.json({
      success: true,
      data: workshop,
      message: "Workshop retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve workshop",
      message: error.message,
    });
  }
});

module.exports = router;
