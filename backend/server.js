const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// Import authentication middleware
const requireApiKey = require("./middleware/apiKeyMiddleware");

const app = express();

// Rate limiting configuration
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth routes
  message: {
    error: "Too many authentication attempts, please try again later.",
    retryAfter: "1 minutes",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Middleware
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(cors());

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI, {
    dbName: "cru-smartfarm",
  })
  .then(() =>
    console.log("Connected to MongoDB - cru-smartfarm database")
  )
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
const sensorDataRouter = require("./routes/sensorData");
const authRouter = require("./routes/auth");
const imageAnalysisRouter = require("./routes/imageAnalysis");
const sensorsRouter = require("./routes/sensors");
const alertsRouter = require("./routes/alerts");
const nodesRouter = require("./routes/nodes");
const systemSettingRouter = require("./routes/system_setting");
const cameraDataRouter = require("./routes/camera_data");
const cellAnalysisRouter = require("./routes/cell_analysis");
const userLogsRouter = require("./routes/user_logs");
const deviceStatusLogsRouter = require("./routes/device_status_logs");
// MQTT relay control router
const mqttRouter = require("./routes/mqtt");

// Public routes (no authentication required)
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/mqtt", mqttRouter); // Mount MQTT relay endpoints

// Protected routes (API key authentication required)
app.use("/api/sensor-data", requireApiKey, sensorDataRouter);
app.use("/api/image-analysis", requireApiKey, imageAnalysisRouter);
app.use("/api/sensors", requireApiKey, sensorsRouter);
app.use("/api/alerts", requireApiKey, alertsRouter);
app.use("/api/nodes", requireApiKey, nodesRouter);
app.use("/api/system-settings", requireApiKey, systemSettingRouter);
app.use("/api/camera-data", requireApiKey, cameraDataRouter);
app.use("/api/cell-analysis", requireApiKey, cellAnalysisRouter);
app.use("/api/user-logs", requireApiKey, userLogsRouter);
app.use("/api/device-status-logs", requireApiKey, deviceStatusLogsRouter);

// Basic route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Ultimate EGAT API" });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
