const express = require("express");
const path = require("path");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const firebase_admin = require("firebase-admin");
const fileUpload = require("express-fileupload");
const session = require("express-session");
const momenttimezone = require("moment-timezone");
require("dotenv").config({ path: "/config/keys.env" });

// Initializing Firebase Admin SDK
const serviceAccount = require("./config/serviceAccount.json");

const admin = firebase_admin.initializeApp({
  credential: firebase_admin.credential.cert(serviceAccount),
  databaseURL:
  "https://meribilty-staging-default-rtdb.asia-southeast1.firebasedatabase.app/",
  storageBucket: "meribilty-staging.appspot.com",
});

// Initialize The App
const app = express();
const { checkSubscriptionExpirations } = require("./functions/cron");


// -----------   3rd Party Libraries Middlewares
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(morgan("dev"));
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// --------  Middlewares  --------
const middlewares = require("./middleware/index");

checkSubscriptionExpirations;




// Auth
// Authentication Apis
app.use("/auth/user", require("./api/auth/user"));
app.use("/auth/pro", require("./api/auth/pro"));
app.use("/auth/driver", require("./api/auth/driver"));
app.use("/auth/vendor", require("./api/auth/vendor"));

// SAME CITY MOVEMENT
app.use("/ppl", require("./api/requests/ppl"));
// GET DATA APIS 
app.use("/api", require("./api/api"));
// Driver App
app.use("/driver", require("./api/driver"));
// Chat
app.use("/chat", require("./api/chat/chat"));
// Notifications
app.use("/fcm", require("./api/notifications/notify"));
// Admin
app.use("/admin", require("./api/admin"));


app.use(middlewares.notFound);
app.use(middlewares.errorHandler);


// Tasks (Firebase Listening For Realtime Events)
require("./tasks/pplRequests");

// Cron Job (Every Hour - If Order Does Not Receive Qoute / Qoute Accepted WithIn Time Limit , Then Order Will Be Cancelled & All Pending Qoutes Will Be Cancelled)
require("./functions/checkOrderTimeJob")


module.exports = app;
