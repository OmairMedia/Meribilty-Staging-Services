const express = require("express");
const router = express.Router();
const { verifyToken, verifyTokenVendorApp, verifyTokenFirebase, getCurrentDate } = require("../../functions/slash");
const { fcmTokenRef } = require("../../db/newRef");
const { body, validationResult } = require("express-validator");
const {
  send_notification_to_all_vendor,
} = require("../../functions/notifications");

router.post("/save_token",
  body("fcm_token").isString().withMessage("fcm_token must be a string"),
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
  (req, res) => {
    const params = req.body;
    const { user_id, user_type } = params.user;

    switch (user_type) {
      case "user":
        fcmTokenRef
        .child('users')
        .child(user_id)
        .set({
          fcm_token: {
            'token': params.fcm_token,
            'createdAt': getCurrentDate(),
          }
        })
        .then(() => {
          
          res.json({
            status: true,
            message: `FCM token saved for ${user_id}`
          })
        })
        .catch((err) => {
          console.log('ERROR === ', err);
          res.json({
            status: false,
            error: err.message
          })
        })
        break;

      case "pro":
          fcmTokenRef
          .child('users')
          .child(user_id)
          .set({
            fcm_token: {
              'token': params.fcm_token,
              'createdAt': getCurrentDate(),
            }
          })
          .then(() => {
            
            res.json({
              status: true,
              message: `FCM token saved for ${user_id}`
            })
          })
          .catch((err) => {
            console.log('ERROR === ', err);
            res.json({
              status: false,
              error: err.message
            })
          })
          break;

      case "driver":
        fcmTokenRef
        .child('drivers')
        .child(user_id)
        .set({
          fcm_token: {
            'token': params.fcm_token,
            'createdAt': getCurrentDate(),
          }
        })
        .then(() => {
      
          res.json({
            status: true,
            message: `FCM token saved for ${user_id}`
          })
        })
        .catch((err) => {
          console.log('ERROR === ', err);
          res.json({
            status: false,
            error: err.message
          })
        })
      break;

      case "vendor": 
      fcmTokenRef
      .child('vendors')
      .child(user_id)
      .set({
        fcm_token: {
          'token': params.fcm_token,
          'createdAt': getCurrentDate(),
        }
      })
      .then(() => {
        
        res.json({
          status: true,
          message: `FCM token saved for ${user_id}`
        })
      })
      .catch((err) => {
        console.log('ERROR === ', err);
        res.json({
          status: false,
          error: err.message
        })
      })
      break;
    
      default:
        res.json({
          status:false,
          error: "Unknown User Type"
        })
        break;
    }
  });

router.post(
    "/send-to-all-vendors_new-req-created",
    // Get FCM Token
    (req, res, next) => {
      var tokens =[]
      fcmTokenRef
        .child("vendors")
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            Object.values(snapshot.val()).map(doc => {
              tokens.push(doc.fcm_token.token)
            })
            
            req.body.tokens = tokens
            next();
          } else {
            res.json({
              status: false,
              error: "Couldnt Find FCM Token",
            });
          }
        });
    },
    // Send Notification
    (req, res) => {
      const params = req.body;
  
      send_notification_to_all_vendor(
        params.tokens,
        "New JOB",
        "New Job is created",
      )
        .then(() => {
          res.json({
            status: true,
            message: "Notification Sent",
          });
        })
        .catch((err) => {
          res.json({
            status: true,
            err: err,
          });
        });
    }
  );
  


module.exports = router;