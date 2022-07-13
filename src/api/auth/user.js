// *******  LIBRARIES
const express = require("express");
const admin = require("firebase-admin");
const bcrypt = require("bcrypt-nodejs");
const moment = require("moment-timezone");
const {
  userRef,
  normalUserRef,
  proUserRef,
  driverRef,
  vendorRef,
  sessionsRef,
  forgetPasswordOTPRef,
  registrationOTPRef,
  walletRef,
} = require("../../db/ref");
const {
  proRef,
  usersRef,
} = require("../../db/newRef");
// const DBs = require("../../db/db");

const saltRounds = 10;
const config = require("../../config/private.json");
// Twilio Client
const twilioCred = require("../../config/private").twilio;
const { body, validationResult } = require("express-validator");

const twillio_client = require("twilio")(
  config.twilio.accountSid,
  config.twilio.authToken
);

const JWT_SECRET =
  "sdjkfh8923yhjdksbfma@#*(&@*!^#&@bhjb2qiuhesdbhjdsfg839ujkdhfjk";
const jwt = require("jsonwebtoken");

// Helper Functions
const { checkUserExistsUserApp, getCurrentDate ,getCurrentTimestamp} = require("../../functions/slash");

const axios = require('axios');


const router = express.Router();

// *********** USER AUTHENTICATION GET REQUESTS ***********

router.get("/", (req, res) => {
  res.json(["😀", "😳", "🙄"]);
});

// *********** USER AUTHENTICATION POST REQUESTS ***********

// Sending OTP Code / User Data Stored In  -> sms/register

//   {
//     "fullname":"fahad",
//     "email": "fahad@4slash.com",
//     "phone": "+923243288887",
//     "password": "fahad123",
//     "pro": false
// }
router.post(
  "/send_register_otp",
  body("fullname")
    .isLength({ max: 20 })
    .withMessage("Fullname must be less than 20 characters"),
  body("email").isEmail().withMessage("Invalid Email !"),
  body("phone").custom((value) => {
    function isValidPhonenumber(value) {
      return (/^\d{7,}$/).test(value.replace(/[\s()+\-\.]|ext/gi, ''));
    }

    if (isValidPhonenumber(value)) {
      return Promise.resolve();

    } else {
      return Promise.reject('Phone Number is not international');
    }
  }),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password Must Be 6 Characters at least!"),
  body("pro")
    .isBoolean()
    .withMessage("Pro Should be boolean!"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  checkUserExistsUserApp,
  (req, res, next) => {
    const params = req.body;

    console.log(params)

    //  Check If User Exists !

    if (params.pro) {
      userRef
        .child("pro")
        .child(params.phone)
        .get()
        .then((snapshot) => {
          if (snapshot.exists()) {
            res.json({
              status: false,
              message: "User already Exists With The Given Phone Number",
            });
          } else {
 
             
            
              // Bcrypt The Password Here ....
              const salt = bcrypt.genSaltSync(saltRounds);
              const hash = bcrypt.hashSync(params.password, salt);

              const data = {
                user: {
                  email: params.email,
                  password: hash,
                  fullname: params.fullname,
                  phone: params.phone,
                  type: "user",
                  user_type: "user",
                  form: params.pro ? "pro" : "user",
                  verified: false,
                  application_status: false
                },
                created: getCurrentDate(),
                created_timestamp: getCurrentTimestamp(),
                to: params.phone,
                status: "queued",
                retry: 0,
              };

              req.body.userData = data
              next()

             
          }
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    } else {
      userRef
        .child("users")
        .child(params.phone)
        .get()
        .then((snapshot) => {
          if (snapshot.exists()) {
            res.json({
              status: false,
              message: "User Already Exists On This Phone Number !",
            });
          } else {
            
            const data = {
              user: {
                ...params,
                user_type: "user",
                type: "user",
                verified: false,
                form: params.pro ? "pro" : "user",
              },
              created: getCurrentDate(),
              created_timestamp: getCurrentTimestamp(),
              to: params.phone,
              status: "queued",
              retry: 0,
            };

            req.body.userData = data;
            next();
          }
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    }
  },
  // Send SMS 
  async (req,res,next) => {
    const params = req.body;
    const code = Math.floor(Math.random() * 9000) + 1000; 
    let filterphone = params.phone;
            let transformphone = filterphone.substr(1);
            console.log('filterphone -> ',filterphone)
            console.log('transformphone -> ',transformphone)

   

    try {
      let content = `Welcome To Meribilty, Your User Registration OTP Code is ${code}`;
      
      
      let response = await axios.post(`http://bsms.its.com.pk/api.php?key=b23838b9978affdf2aab3582e35278c6&msgdata=${content}&to=${transformphone}`)
      let data = response.data;
      

      if(data.response.status === 'Success') {
        // success
        const addsms = registrationOTPRef.child(code);
        addsms
          .set({
            ...params.userData,
            code: code
          })
          .then(() =>
            res.json({
              status: true,
              otp: code,
            })
          )
          .catch((err) => console.log(err.message));
      } else {
        res.json({
          status:false,
          data:data
        })
      }

      
    } catch (error) {
      res.json({
        status:false,
        err: error
      }) 
    }
    
  }
);

// OTP Verification / OTP Record Remove / User Creation
router.post(
  "/register_after_otp",
  body("otp").isNumeric().withMessage("Please enter a valid otp"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  (req, res, next) => {
    //  @Data in Request Body
    //   {
    //     "otp":"77754",
    //   }

    const { otp } = req.body;

    registrationOTPRef
      .orderByChild("code")
      .equalTo(parseInt(otp))
      .once("value")
      .then(async (userSnap) => {
        const data = userSnap.val();
        if (data == null) {
          res.json({
            status: false,
            message: "Verification Failed !",
          });
        } else {
          // console.log("User Is -> ", data);
          const userData = data[otp].user;
          // console.log("This is user data -> ", userData);

          // See the UserRecord reference doc for the contents of userRecord.

          let uid = 1;

          const salt = bcrypt.genSaltSync(saltRounds);
          const hash = bcrypt.hashSync(userData.password, salt);

          if (userData.form === 'user') {
            await usersRef.child('users')
              .limitToLast(1)
              .once("value", (snapshot) => {
                if (snapshot.val()) {
                  uid = ((parseInt(Object.entries(snapshot.val())[0][1].id)) + 1);
                }
              })

            userRef
              .child("users")
              .child(userData.phone)
              .set({
                ...userData,
                password: hash,
                id: uid,
                created: getCurrentDate(),
                created_timestamp: getCurrentTimestamp(),
                verified: true,
                blocked: false
              })
              .then(() => {
                walletRef
                  .child("users")
                  .child(userData.phone)
                  .set({
                    amount: "0",
                    type: "cash",
                    transactions: []
                  })
                  .then(() => {


                    const additionalClaims = {
                      user_type: "user",
                    };

                    admin.auth()
                      .createCustomToken(userData.phone, additionalClaims)
                      .then((customToken) => {

                        sessionsRef
                          .child("users")
                          .child(userData.phone)
                          .set({
                            phone: userData.phone,
                            type: "user",
                            lastLogin: getCurrentDate(),
                            active: true,
                          })
                          .then(() => {
                            registrationOTPRef
                              .child(parseInt(otp))
                              .remove()
                              .then(() => {
                                res.json({
                                  status: true,
                                  message: "User Created Successfully ! ",
                                  active: true,
                                  application: false,
                                  token: customToken,
                                });
                              });
                          })
                          .catch((err) => {
                            res.json({
                              status: false,
                              error: err.message,
                            });
                          });

                      })
                  })
                  .catch((error) => {
                    res.json({
                      status: false,
                      error: error.message,
                    });
                  });
              })
              .catch((err) => {
                res.json({
                  status: false,
                  message: "Data could not be saved. ",
                  error: err.message,
                });
              });
          } else if (userData.form === 'pro') {

            await proRef
              .limitToLast(1)
              .once("value", (snapshot) => {
                if (snapshot.val()) {
                  uid = ((parseInt(Object.entries(snapshot.val())[0][1].id)) + 1);
                }
              })

            userRef
              .child("pro")
              .child(userData.phone)
              .set({
                ...userData,
                id: uid,
                created: getCurrentDate(),
                created_timestamp: getCurrentTimestamp(),
                verified: true,
                application_status: false,
                blocked: false
              })
              .then(() => {
                walletRef
                  .child("users")
                  .child(userData.phone)
                  .set({
                    amount: "0",
                    type: "cash",
                    transactions: []
                  })
                  .then(() => {
                    // const token = jwt.sign(
                    //   {
                    //     phone: userData.phone,
                    //     type: "pro",
                    //   },
                    //   JWT_SECRET
                    // );
                    const additionalClaims = {
                      user_type: "user",
                    };

                    admin.auth()
                      .createCustomToken(userData.phone, additionalClaims)
                      .then((customToken) => {

                        sessionsRef
                          .child("pro")
                          .child(userData.phone)
                          .set({
                            phone: userData.phone,
                            type: "pro",
                            lastLogin: getCurrentDate(),
                            active: true,
                          })
                          .then(() => {
                            registrationOTPRef
                              .child(parseInt(otp))
                              .remove()
                              .then(() => {
                                res.json({
                                  status: true,
                                  message: "Pro User Created Successfully ! ",
                                  application: userData.application_status,
                                  active: userData.password ? true : false,
                                  token: customToken,
                                });
                              });
                          })
                          .catch((err) => {
                            res.json({
                              status: false,
                              error: err.message,
                            });
                          });

                      }
                      )


                  })
                  .catch((error) => {
                    res.json({
                      status: false,
                      error: error.message,
                    });
                  });
              })
              .catch((err) => {
                res.json({
                  status: false,
                  message: "Error creating user ",
                  error: err.message,
                });
              });
          }
        }
      })
      .catch((err) => {
        res.json({
          status: false,
          message: err.message,
        });
      });
  }
);

module.exports = router;
