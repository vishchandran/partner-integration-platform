const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const config = require("./config/config");
const logger = require("./logger/logger");
const partnerRoutes = require("./routes/partnerRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const eventRoutes = require("./routes/eventRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const kafkaConsumer = require("./kafka/kafkaConsumer");
const errorHandler = require("./interfaces/http/errorHandler");



const app = express();

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

app.use(express.json());
app.use(cors());
app.use(helmet());

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/

app.use("/partners", partnerRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/events", eventRoutes);
app.use("/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    service: config.appName,
    version: "1.0.0",
    environment: config.environment
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    timestamp: new Date().toISOString()
  });
});

app.use(errorHandler);

/*
|--------------------------------------------------------------------------
| Server Startup
|--------------------------------------------------------------------------
*/

app.listen(config.port, () => {

  logger.info(

    {

      port: config.port

    },

    `${config.appName} started successfully`

  );

  console.log("Starting Kafka consumer...");

  kafkaConsumer

    .startConsumer()

    .catch(console.error);

});
  
  

  
