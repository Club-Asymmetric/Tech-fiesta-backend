const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// Import routes
const eventRoutes = require("./routes/events");
const workshopRoutes = require("./routes/workshops");

// Routes
app.use("/api/events", eventRoutes);
app.use("/api/workshops", workshopRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    message: "Backend server is running!",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

// Test endpoint to verify data loading
app.get("/api/test", (req, res) => {
  const { events } = require("./data/events");
  const { workshops } = require("./data/workshops");

  res.json({
    message: "Data loaded successfully",
    counts: {
      events: events.length,
      workshops: workshops.length,
      techEvents: events.filter((e) => e.type === "tech").length,
      nonTechEvents: events.filter((e) => e.type === "non-tech").length,
    },
    sampleData: {
      firstEvent: events[0],
      firstWorkshop: workshops[0],
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `CORS enabled for: ${process.env.FRONTEND_URL || "http://localhost:3000"}`
  );
});

module.exports = app;
