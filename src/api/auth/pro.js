// *******  LIBRARIES
const express = require("express");
const admin = require("firebase-admin");

const bcrypt = require("bcrypt-nodejs");

const saltRounds = 10;
const config = require("../../config/private.json");
const nodemailer = require("nodemailer");
const moment = require("moment-timezone");

// Twilio Client
const twilioCred = require("../../config/private").twilio;
const {
  default: strictTransportSecurity,
} = require("helmet/dist/middlewares/strict-transport-security");

const twillio_client = require("twilio")(
  config.twilio.accountSid,
  config.twilio.authToken
);

const {
  userRef,
  normalUserRef,
  proUserRef,
  driverRef,
  vendorRef,
  sessionsRef,
  forgetPasswordOTPRef,
  registrationOTPRef,
  proUserApplicationRef,
  walletRef,
} = require("../../db/ref");

const { proRef } = require("../../db/newRef");

// Helper Functions
const {
  sendProUserApplicationEmail,
  checkUserExistsUserApp,
  verifyTokenFirebase,
  getCurrentDate,
  getCurrentTimestamp
} = require("../../functions/slash");

const JWT_SECRET =
  "sdjkfh8923yhjdksbfma@#*(&@*!^#&@bhjb2qiuhesdbhjdsfg839ujkdhfjk";
const jwt = require("jsonwebtoken");

const { body, validationResult } = require("express-validator");

const router = express.Router();

// *********** PRO USER - POST REQUESTS ***********


// Send Pro User Application
router.post(
  "/send_application",
  // body("fullname")
  //   .isLength({ max: 20 })
  //   .withMessage("Fullname must be less than 20 characters"),
  // body("email").isEmail().withMessage("Invalid Email !"),
  // body("bussiness_name")
  //   .isLength({ max: 25 })
  //   .withMessage("bussiness_name must be less than 25 characters"),
  // body("bussiness_address")
  //   .isLength({ max: 25 })
  //   .withMessage("bussiness_address must be less than 25 characters"),
  // body("NTN")
  //   .isNumeric()
  //   .isLength({ min: 13, max: 13 })
  //   .withMessage("NTN is not valid"),
  // body("landline")
  //   .isMobilePhone()
  //   .withMessage("landline is not a valid phone number !"),
  // body("owner").isString().withMessage("owner is not valid !"),
  // body("point_of_contact")
  //   .isMobilePhone()
  //   .withMessage("point_of_contact is not valid !"),
  // body("cargo_volumne_per_month")
  //   .isNumeric()
  //   .withMessage("cargo_volumne_per_month is not valid !"),
  // body("credit_duration")
  //   .isNumeric()
  //   .withMessage("credit_duration is not valid !"),
  // body("credit_requirement_per_month")
  //   .isNumeric()
  //   .withMessage("credit_requirement_per_month is not valid !"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  verifyTokenFirebase,
  // Check User Type (User Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        req.body.user = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot sent a pro user application  !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot sent a pro user application !`,
        });
        break;
    }
  },
  (req, res) => {
    //   {
    //  "token": "",
    //   "fullname": "fahad",
    //   "email": "fahad@4slash.com",
    //   "bussiness_name": "fahad and co",
    //   "bussiness_address": "lalu khait",
    //   "NTN": "3243288887",
    //   "landline": "3243288887",
    //   "owner": "owner",
    //   "point_of_contact": "3243288887",
    //   "cargo_volumne_per_month": "3243288887",
    //   "credit_duration": "3243288887",
    //   "credit_requirement_per_month": "3243288887"
    // }

    const params = req.body;

    // SMTP Settings
    const subject = "New Pro User Application";
    const mail = sendProUserApplicationEmail(subject, params);

    proUserApplicationRef.once("value", (snapshot) => {
      if (snapshot.exists()) {
        const applications = snapshot.val();
        if (applications[params.user.user_id]) {
          const application = applications[params.user.user_id];
          const date = application.submittedOn;
          res.json({
            status: false,
            message: `Application Already Submitted By User On ${date}!`,
          });
        } else {
          mail
            .then(() => {
              proUserApplicationRef
                .child(params.user.user_id)
                .set({
                  phone: params.user.user_id,
                  ...params,
                  token: null,
                  user: null,
                  submittedOn: getCurrentDate(),
                  submittedOn_timestamp: getCurrentTimestamp(),
                  status: "pending",
                })
                .then(() => {
                  // Sending User SMS Regarding The Application Receive
                  twillio_client.messages
                    .create(
                      {
                        messagingServiceSid:
                          "MG5d789b427b36967a17122347859e3e7e",
                        to: params.user.user_id,
                        from: config.twilio.phone,
                        body: "Thanks For Submitting Pro User Application. We have received it and reviewing it. We will notify you the status soon.",
                      },
                      (err, resData) => {
                        if (err) {
                          return res.json({
                            status: false,
                            message: err,
                          });
                        }
                      }
                    )
                    .catch((err) => {
                      res.json({
                        status: false,
                        error: err,
                      });
                    });
                  res.json({
                    status: true,
                    message:
                      "Application has been sent. it will be reviewed for 2-4 Bussiness Days.",
                  });
                })
                .catch((err) => {
                  res.json({
                    status: false,
                    message: err.message,
                  });
                });
            })
            .catch((error) => {
              res.json({
                status: false,
                level: "Error while sending email",
                error: error,
              });
            });
        }
      } else {
        proUserApplicationRef
          .child(params.user.user_id)
          .set({
            ...params,
            submittedOn: getCurrentDate(),
            status: "pending",
          })
          .then(() => {
            // Sending User SMS Regarding The Application Receive
            twillio_client.messages
              .create(
                {
                  messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
                  to: params.user.user_id,
                  from: config.twilio.phone,
                  body: "Thanks For Submitting Pro User Application. We have received it and reviewing it. We will notify you the status soon.",
                },
                (err, resData) => {
                  if (err) {
                    return res.json({
                      status: false,
                      message: err,
                    });
                  }
                }
              )
              .catch((err) => {
                res.json({
                  status: false,
                  error: err,
                });
              });
            res.json({
              status: true,
              message:
                "Application has been sent. it will be reviewed for 2-4 Bussiness Days.",
            });
          })
          .catch((err) => {
            res.json({
              status: false,
              message: err.message,
            });
          });
      }
    });
  }
);

module.exports = router;
