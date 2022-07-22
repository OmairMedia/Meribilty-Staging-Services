// *******  LIBRARIES
const express = require("express");
const admin = require("firebase-admin");
const moment = require("moment");

const bcrypt = require("bcrypt-nodejs");
const config = require("../config/private.json");
const { body, validationResult } = require("express-validator");
const referralCodes = require("referral-codes");
const twillio_client = require("twilio")(
  config.twilio.accountSid,
  config.twilio.authToken
);
const _ = require("lodash");
const axios = require('axios');

const {
  userRef,
  forgetPasswordOTPRef,
  invitedOTPRef,
  walletRef,
  sessionsRef,
  referalsRef,
} = require("../db/ref");

const {
  pplRequestRef,
  scmRequestRef,
  pplCommission,
  pplInvoiceRef,
  pplVehiclesRef,
  pplVehicleTypeRef,
  pplMaterialsListRef,
  pplUserCounterRef,
  pplSettingsRef,
  pplVendorVehicleRef,
  pplCancellationReasonRef,
  pplBiddingsRef,
  pplVendorToVendorRequestRef,
  pplTemporary,
  pplUserVehicleSelections,
  pplRoutesEstimation,
  fcmTokenRef,
  notificationsRef,
} = require("../db/newRef");

const saltRounds = 10;

const {
  verifyToken,
  checkUserExists,
  verifyTokenVendorApp,
  verifyTokenFirebase,
  getCurrentDate,
  getCurrentTimestamp,
} = require("../functions/slash");

const {
  send_notification_to_single_user,
} = require("../functions/notifications");

const { Storage } = require("@google-cloud/storage");
const storage = new Storage({
  keyFilename: "src/config/serviceAccount.json",
});

const bucket = storage.bucket("meribilty-staging.appspot.com");

const JWT_SECRET =
  "sdjkfh8923yhjdksbfma@#*(&@*!^#&@bhjb2qiuhesdbhjdsfg839ujkdhfjk";
const jwt = require("jsonwebtoken");

const router = express.Router();

// ============= AUTHENTICATION REQUESTS (STARTS) =============

// user_login_1   (Login -1 On User's App)
router.post(
  "/user_login_1",
  body("phone").custom((value) => {
    function isValidPhonenumber(value) {
      return /^\d{7,}$/.test(value.replace(/[\s()+\-\.]|ext/gi, ""));
    }

    if (isValidPhonenumber(value)) {
      return Promise.resolve();
    } else {
      return Promise.reject("Phone Number is not international");
    }
  }),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  // Check In Users
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          if(user.blocked === true || user.blocked === 'true') {
             res.json({
              status:false,
              error: "This User Has Been Blocked By Admin"
             })
          } else {
            req.body.user_type = "user";
            req.body.user = user;
  
            console.log("debug -> ", user);
  
            if (user.password) {
              // Create Session
              sessionsRef
                .child("users")
                .child(params.phone)
                .set({
                  phone:params.phone,
                  type: "user",
                  lastLogin: getCurrentDate(),
                  active: true,
                })
                .then(() => {
                  res.json({
                    status: true,
                    type: "user",
                    active: true,
                    application: false,
                  });
                })
                .catch((err) => {
                  res.json({
                    status: false,
                    error: err.message,
                  });
                });
            } else {
              // Send OTP SMS
              const code = Math.floor(Math.random() * 9000) + 1000;
              let filterphone = params.phone;
              let transformphone = filterphone.substr(1);
              console.log('filterphone -> ',filterphone)
              console.log('transformphone -> ',transformphone)
          
  
              let content = `Welcome To Meribilty, Verify Your OTP Code is ${code} And Set Your Password !`;
  
              axios.post(`http://bsms.its.com.pk/api.php?key=b23838b9978affdf2aab3582e35278c6&msgdata=${content}&receiver=${transformphone}`).then((response)=>{
              let data = response.data;
              
                if(data.response.status === 'Success') {
                  const smsdata = {
                    created: getCurrentDate(),
                    to: params.phone,
                    type: "user",
                    code,
                  };
  
                  const addsms = invitedOTPRef.child(code);
                  addsms
                    .set(smsdata)
                    .then(() =>
                      res.json({
                        status: true,
                        type: "user",
                        active: false,
                        application: false,
                      })
                    )
                    .catch((err) =>
                      res.json({
                        status: false,
                        error: err,
                      })
                    );
                } else {
                  res.json({
                    status:false,
                    data:data
                  })
                }
              }).catch((err)=>{
                res.json({
                  status:false,
                  error: err
                }) 
              })
              
            }
          }
        } else {
          req.body.user = null;
          next();
          console.log("ok");
        }
      });
  },
  // Check In Pro
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("pro")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const pro = snapshot.val();

          if(pro.blocked === true || pro.blocked === 'true') {
            res.json({
             status:false,
             error: "This User Has Been Blocked By Admin"
            })
         } else {
          req.body.pro = pro;
          req.body.user_type = pro.type;
          req.body.application = pro.application_status;

          if (pro.password) {
            res.json({
              status: true,
              type: req.body.user_type,
              active: true,
              application: req.body.application,
            });
          } else {
            // Send OTP SMS
            const code = Math.floor(Math.random() * 9000) + 1000;
            let filterphone = params.phone;
            let transformphone = filterphone.substr(1);
            console.log('filterphone -> ',filterphone)
            console.log('transformphone -> ',transformphone)
        
            let content = `Welcome To Meribilty, Verify Your OTP Code is ${code} And Set Your Password !`;
 
             axios.post(`http://bsms.its.com.pk/api.php?key=b23838b9978affdf2aab3582e35278c6&msgdata=${content}&receiver=${transformphone}`).then((response)=>{
             let data = response.data;
             
               if(data.response.status === 'Success') {
                 const smsdata = {
                  created: getCurrentDate(),
                  to: pro.phone,
                  type: pro.type,
                  code,
                 };
 
                 const addsms = invitedOTPRef.child(code);
                 addsms
                   .set(smsdata)
                   .then(() =>
                      res.json({
                        status: true,
                        type: req.body.user_type,
                        active: false,
                        application: req.body.application,
                      })
                   )
                   .catch((err) =>
                     res.json({
                       status: false,
                       error: err.message,
                     })
                   );
               } else {
                 res.json({
                   status:false,
                   data:data
                 })
               }
             }).catch((err)=>{
               res.json({
                 status:false,
                 error: err
               }) 
             })


            // twillio_client.messages
            //   .create(
            //     {
            //       messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
            //       to: pro.phone,
            //       from: config.twilio.phone,
            //       body: `Welcome To Meribilty, Verify Your OTP Code is ${code} And Set Your Password !`,
            //     },
            //     (err, resData) => {
            //       if (err) {
            //         return res.json({
            //           status: false,
            //           message: err,
            //         });
            //       }
            //       // Bcrypt The Password Here ....

            //       const data = {
            //         messageID: resData.sid,
            //         created: getCurrentDate(),
            //         to: pro.phone,
            //         type: pro.type,
            //         code,
            //       };

            //       const addsms = invitedOTPRef.child(code);
            //       addsms
            //         .set(data)
            //         .then(() =>
            //           res.json({
            //             status: true,
            //             type: req.body.user_type,
            //             active: false,
            //             application: req.body.application,
            //           })
            //         )
            //         .catch((err) =>
            //           res.json({
            //             status: false,
            //             error: err.message,
            //           })
            //         );
            //     }
            //   )
            //   .catch((err) => {
            //     res.json({
            //       status: false,
            //       error: err.message,
            //     });
            //   });
          }
         }
        } else {
          req.body.pro = null;
          next();
        }
      });
  },
  (req, res) => {
    res.json({
      status: false,
      error: "User Not Found !",
    });
  }
);

// validate Invited User
router.post(
  "/validate_invited",
  body("otp").isLength({ min: 4 }).withMessage("otp must be 4 digits !"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  (req, res) => {
    const params = req.body;

    invitedOTPRef
      .orderByChild("code")
      .equalTo(parseInt(params.otp))
      .once("value")
      .then((userSnap) => {
        const data = userSnap.val();
        if (data == null) {
          res.json({
            status: false,
            message: "Verification Failed !",
          });
        } else {
          // console.log("User Is -> ", data);
          const userData = data[params.otp];
          console.log("This is user data -> ", userData);

          if (userData.type == "user" || userData.type == "pro") {
            if (userData) {
              invitedOTPRef
                .child(params.otp)
                .remove()
                .then(() => {
                  res.json({
                    status: true,
                    message: "success",
                    type: "user",
                  });
                })
                .catch((err) => {
                  res.json({
                    status: false,
                    error: err.message,
                  });
                });
            } else {
              res.json({
                status: false,
                error: "User Not Found !",
              });
            }
          }

          if (userData.type == "driver") {
            if (userData) {
              invitedOTPRef
                .child(params.otp)
                .remove()
                .then(() => {
                  res.json({
                    status: true,
                    message: "success",
                    type: userData.type,
                  });
                })
                .catch((err) => {
                  res.json({
                    status: false,
                    error: err.message,
                  });
                });
            } else {
              res.json({
                status: false,
                error: "User Not Found !",
              });
            }
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

// set_password_firsttime
router.post(
  "/set_user_password_firsttime",
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be 6 Characters !"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  // Check In User
  (req, res, next) => {
    const params = req.body;

    console.log("params -> ", params);

    userRef
      .child("users")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();

          console.log("user -> ", user);

          if (user.password) {
            res.json({
              status: false,
              error: "User Already Have Password",
            });
          } else {
            // TODO: CHeck
            // Create Password For Driver
            const salt = bcrypt.genSaltSync(saltRounds);
            const hash = bcrypt.hashSync(params.password, salt);

            const additionalClaims = {
              user_type: user.type,
            };

            admin
              .auth()
              .createCustomToken(params.phone, additionalClaims)
              .then((customToken) => {
                userRef
                  .child("users")
                  .child(user.phone)
                  .update({
                    password: hash,
                    verified: true,
                  })
                  .then(() => {
                    res.json({
                      status: true,
                      message: `Password has been added. You are now logged in!`,
                      type: user.type,
                      active: true,
                      application: false,
                      token: customToken,
                      profile: {
                        ...user,
                        password: null,
                      },
                    });
                  })
                  .catch((err) => {
                    res.json({
                      status: false,
                      error: err.message,
                    });
                  });
              });
          }
        } else {
          userRef
            .child("pro")
            .child(params.phone)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const pro = snapshot.val();

                if (pro.password) {
                  res.json({
                    status: false,
                    error: "User Already Have Password",
                  });
                } else {
                  // Create Password For Driver
                  const salt = bcrypt.genSaltSync(saltRounds);
                  const hash = bcrypt.hashSync(params.password, salt);

                  const additionalClaims = {
                    user_type: pro.type,
                  };

                  admin
                    .auth()
                    .createCustomToken(params.phone, additionalClaims)
                    .then((customToken) => {
                      userRef
                        .child("pro")
                        .child(pro.phone)
                        .update({
                          password: hash,
                        })
                        .then(() => {
                          res.json({
                            status: true,
                            message: `${params.password} has been added as your password. You are now logged in!`,
                            active: true,
                            type: pro.type,
                            application: pro.application_status,
                            token: customToken,
                            profile: {
                              ...pro,
                              password: null,
                            },
                          });
                        })
                        .catch((err) => {
                          res.json({
                            status: false,
                            error: err.message,
                          });
                        });
                    });
                }
              } else {
                res.json({
                  status: false,
                  error: "User Not Found !",
                });
              }
            });
        }
      });
  }
);

// user_login_2 (Login -2 In User's App) 
// Gives Firebase Custom Token To ---> App
router.post(
  "/user_login_2",
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be 6 Characters !"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  // Check In User
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();

          if(user.blocked === true || user.blocked === 'true') {
            res.json({
             status:false,
             error: "This User Has Been Blocked By Admin"
            })
         } else {
            
          
          if (user.password) {
            // Check Password Is Correct
            const check = bcrypt.compareSync(params.password, user.password);

            if (check) {
              const additionalClaims = {
                user_type: "user",
              };

              admin
                .auth()
                .createCustomToken(params.phone, additionalClaims)
                .then((customToken) => {
                  res.json({
                    status: true,
                    message: `Success !`,
                    type: "user",
                    application: user.application_status,
                    token: customToken,
                    profile: {
                      ...user,
                      password: null,
                    },
                  });
                });
            } else {
              res.json({
                status: false,
                message: "Password Is Incorrect !",
              });
            }
          } else {
            // TODO: CHeck
            // Create Password For Driver
            const salt = bcrypt.genSaltSync(saltRounds);
            const hash = bcrypt.hashSync(params.password, salt);

            userRef
              .child("users")
              .child(user.phone)
              .update({
                password: hash,
                verified: true,
              })
              .then(() => {
                res.json({
                  status: true,
                  message: `${params.password} has been added as your password. You are now logged in!`,
                  type: "user",
                });
              })
              .catch((err) => {
                res.json({
                  status: false,
                  error: err.message,
                });
              });
          }


         }

         
        } else {
          userRef
            .child("pro")
            .child(params.phone)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const pro = snapshot.val();

                if (pro.password) {
                  // Check Password Is Correct
                  const check = bcrypt.compareSync(
                    params.password,
                    pro.password
                  );

                  if (check) {
                    const additionalClaims = {
                      user_type: pro.type,
                    };

                    admin
                      .auth()
                      .createCustomToken(params.phone, additionalClaims)
                      .then((customToken) => {
                        res.json({
                          status: true,
                          message: `Success !`,
                          type: pro.type,
                          application: pro.application_status,
                          token: customToken,
                          profile: {
                            ...pro,
                            password: null,
                          },
                        });
                      });
                  } else {
                    res.json({
                      status: false,
                      message: "Password Is Incorrect !",
                    });
                  }
                } else {
                  // Create Password For Driver
                  const salt = bcrypt.genSaltSync(saltRounds);
                  const hash = bcrypt.hashSync(params.password, salt);

                  userRef
                    .child("pro")
                    .child(pro.phone)
                    .update({
                      password: hash,
                    })
                    .then(() => {
                      res.json({
                        status: true,
                        message: `${params.password} has been added as your password. You are now logged in!`,
                        type: "pro",
                      });
                    })
                    .catch((err) => {
                      res.json({
                        status: false,
                        error: err.message,
                      });
                    });
                }
              } else {
                req.body.pro = null;
                next();
              }
            });
        }
      });
  }
);

// vendor_login_1 (Login -1 On Vendor's App)
router.post(
  "/vendor_login_1",
  body("phone").custom((value) => {
    function isValidPhonenumber(value) {
      return /^\d{7,}$/.test(value.replace(/[\s()+\-\.]|ext/gi, ""));
    }

    if (isValidPhonenumber(value)) {
      return Promise.resolve();
    } else {
      return Promise.reject("Phone Number is not international");
    }
  }),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  // Check In Drivers
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("drivers")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const driver = snapshot.val();
          
          if(driver.blocked === true || driver.blocked === 'true') {
            res.json({
              status:false,
              error: "This Driver Has Been Blocked By Admin!"
            })
          } else {
            req.body.user_type = "driver";
            req.body.driver = driver;
  
            const additionalClaims = {
              user_type: "driver",
            };
  
            admin
              .auth()
              .createCustomToken(driver.phone, additionalClaims)
              .then((customToken) => {
                if (driver.password) {
                  sessionsRef
                    .child("drivers")
                    .child(req.body.driver.phone)
                    .set({
                      phone: req.body.driver.phone,
                      type: "driver",
                      lastLogin: getCurrentDate(),
                      active: true,
                    })
                    .then(() => {
                      res.json({
                        status: true,
                        type: "driver",
                        active: true,
                        // token: customToken,
                      });
                    })
                    .catch((err) => {
                      res.json({
                        status: false,
                        error: err.message,
                      });
                    });
                } else {
                  const code = Math.floor(Math.random() * 9000) + 1000;
                  let filterphone = params.phone;
                  let transformphone = filterphone.substr(1);
                  console.log('filterphone -> ',filterphone)
                  console.log('transformphone -> ',transformphone)
                  let content = `Welcome To Meribilty, Verify Your OTP Code is ${code} And Set Your Password !`;
   
                  axios.post(`http://bsms.its.com.pk/api.php?key=b23838b9978affdf2aab3582e35278c6&msgdata=${content}&receiver=${transformphone}`).then((response)=>{
                  let data = response.data;
                  
                    if(data.response.status === 'Success') {
                      const smsdata = {
                          type: "invited",
                          created: getCurrentDate(),
                          to: driver.phone,
                          type: "driver",
                          code,
                      };
      
                      const addsms = invitedOTPRef.child(code);
                      addsms
                        .set(smsdata)
                        .then(() =>
                          res.json({
                            status: true,
                            type: "driver",
                            active: false,
                            // token: customToken,
                          })
                        )
                        .catch((err) =>
                          res.json({
                            status: false,
                            error: err.message,
                          })
                        );
                    } else {
                      res.json({
                        status:false,
                        data:data
                      })
                    }
                  }).catch((err)=>{
                    res.json({
                      status:false,
                      error: err
                    }) 
                  })
  
  
  
                  // twillio_client.messages
                  //   .create(
                  //     {
                  //       messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
                  //       to: driver.phone,
                  //       from: config.twilio.phone,
                  //       body: `Welcome To Meribilty, Verify Your OTP Code is ${code} And Set Your Password !`,
                  //     },
                  //     (err, resData) => {
                  //       if (err) {
                  //         return res.json({
                  //           status: false,
                  //           message: err,
                  //         });
                  //       }
                  //       // Bcrypt The Password Here ....
  
                  //       const data = {
                  //         type: "invited",
                  //         messageID: resData.sid,
                  //         created: getCurrentDate(),
                  //         to: driver.phone,
                  //         type: "driver",
                  //         code,
                  //       };
  
                  //       const addsms = invitedOTPRef.child(code);
                  //       addsms
                  //         .set(data)
                  //         .then(() =>
                  //           res.json({
                  //             status: true,
                  //             type: "driver",
                  //             active: false,
                  //             // token: customToken,
                  //           })
                  //         )
                  //         .catch((err) =>
                  //           res.json({
                  //             status: false,
                  //             error: err,
                  //           })
                  //         );
                  //     }
                  //   )
                  //   .catch((err) => {
                  //     res.json({
                  //       status: false,
                  //       error: err,
                  //     });
                  //   });
                }
              });
          }
        } else {
          req.body.driver = null;
          next();
        }
      });
  },
  // Check In Vendors
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("vendors")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const driver = snapshot.val();
          if(driver.blocked === true || driver.blocked === 'true') {
            res.json({
              status:false,
              error: "This Vendor Has Been Blocked By Admin"
            })
          } else {
            req.body.user_type = "vendors";
            req.body.vendor = driver;
  
            const additionalClaims = {
              user_type: "vendor",
            };
            
            
            res.json({
              status: true,
              type: "vendor",
              active: true,
              // token: customToken,
            });
            // admin
            //   .auth()
            //   .createCustomToken(req.body.vendor.phone, additionalClaims)
            //   .then((customToken) => {
            //     if (driver.registration_step == 2) {
                 
            //     } else {
            //       res.json({
            //         status: true,
            //         type: "vendor",
            //         active: true,
            //         // token: customToken,
            //       });
            //     }
            //   });
          }
        } else {
          req.body.vendor = null;
          next();
        }
      });
  },
  (req, res) => {
    res.json({
      status: false,
      error: "User Not Found !",
    });
  }
);

// vendor_login_2 (Login -2 In Vendor's App) 
// Gives Firebase Custom Token To ---> App
router.post(
  "/vendor_login_2",
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be 6 Characters !"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  // Check In Drivers
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("drivers")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const driver = snapshot.val();

          if(driver.blocked === true || driver.blocked === 'true') {
             res.json({
              status:false,
              error: "This Driver Has Been Blocked By Admin"
             })
          } else {
            if (driver.password) {
              // Check Password Is Correct
              const check = bcrypt.compareSync(params.password, driver.password);
  
              if (check) {
                const additionalClaims = {
                  user_type: "driver",
                };
  
                admin
                  .auth()
                  .createCustomToken(params.phone, additionalClaims)
                  .then((customToken) => {
                    res.json({
                      status: true,
                      message: `Signin Successfull !`,
                      type: "driver",
                      token: customToken,
                      profile: {
                        ...driver,
                        password: null,
                      },
                    });
                  });
              } else {
                res.json({
                  status: false,
                  message: "Password Is Incorrect !",
                });
              }
            } else {
              // Create Password For Driver
              const salt = bcrypt.genSaltSync(saltRounds);
              const hash = bcrypt.hashSync(params.password, salt);
  
              userRef
                .child("drivers")
                .child(driver.phone)
                .update({
                  password: hash,
                  verified: true,
                })
                .then(() => {
                  res.json({
                    status: true,
                    message: `${params.password} has been added as your password successfully !`,
                  });
                })
                .catch((err) => {
                  res.json({
                    status: false,
                    error: err.message,
                  });
                });
            }
          }

          
        } else {
          req.body.driver = null;
          next();
        }
      });
  },
  // Check In Vendors
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("vendors")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const driver = snapshot.val();

          if(driver.blocked === true || driver.blocked === 'true') {
             res.json({
              status:false,
              error: 'This Vendor Has Been Blocked By Admin !'
             })
          } else {
            if (driver.password) {
              // Check Password Is Correct
              const check = bcrypt.compareSync(params.password, driver.password);
  
              if (check) {
                const additionalClaims = {
                  user_type: "vendor",
                };
  
                admin
                  .auth()
                  .createCustomToken(params.phone, additionalClaims)
                  .then((customToken) => {
                    res.json({
                      status: true,
                      message: `success !`,
                      type: "vendor",
                      token: customToken,
                      profile: {
                        ...driver,
                        password: null,
                      },
                    });
                  });
              } else {
                res.json({
                  status: false,
                  message: "Password Is Incorrect !",
                });
              }
            } else {
              // Create Password For Vendor
  
              const salt = bcrypt.genSaltSync(saltRounds);
              const hash = bcrypt.hashSync(params.password, salt);
  
              userRef
                .child("vendors")
                .child(driver.phone)
                .update({
                  password: hash,
                  verified: true,
                })
                .then(() => {
                  res.json({
                    status: true,
                    message: `${params.password} has been added as your password. You are now logged in!`,
                    type: params.user.user_type,
                  });
                })
                .catch((err) => {
                  res.json({
                    status: false,
                    error: err.message,
                  });
                });
            }
          }

         
        } else {
          req.body.vendors = null;
          next();
        }
      });
  },
  (req, res) => {
    res.json({
      status: false,
      error: "User Not Found !",
    });
  }
);

// set_driver_password_firsttime
router.post(
  "/set_driver_password_firsttime",
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be 6 Characters !"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  // Check In User
  (req, res, next) => {
    const params = req.body;

    console.log("params -> ", params);

    userRef
      .child("drivers")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();

          console.log("user -> ", user);

          if (user.password) {
            res.json({
              status: false,
              error: "User Already Have Password",
            });
          } else {
            // TODO: CHeck
            // Create Password For Driver
            const salt = bcrypt.genSaltSync(saltRounds);
            const hash = bcrypt.hashSync(params.password, salt);

            const additionalClaims = {
              user_type: user.type,
            };

            admin
              .auth()
              .createCustomToken(params.phone, additionalClaims)
              .then((customToken) => {
                userRef
                  .child("drivers")
                  .child(user.phone)
                  .update({
                    password: hash,
                    verified: true,
                  })
                  .then(() => {
                    res.json({
                      status: true,
                      message: `Password has been added. You are now logged in!`,
                      type: user.type,
                      active: true,
                      token: customToken,
                      profile: {
                        ...user,
                        password: null,
                      },
                    });
                  })
                  .catch((err) => {
                    res.json({
                      status: false,
                      error: err.message,
                    });
                  });
              });
          }
        } else {
          res.json({
            status: false,
            error: "Driver Not Found",
          });
        }
      });
  }
);

// Sending Forgot Password OTP \ User Data is saved with sms message record
router.post(
  "/user_app_forgot_password",
  // Check Users
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          next();
        } else {
          userRef
            .child("pro")
            .child(params.phone)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                req.body.user = user;
                next();
              } else {
                res.json({
                  status: false,
                  error: "User Not Found !",
                });
              }
            });
        }
      });
  },
  // Check User Type
  (req, res, next) => {
    const params = req.body;

    if (params.user.user_type == "user") {
      if (params.user.password) {
        const code = Math.floor(Math.random() * 9000) + 1000;

        const setData = {
          user: req.body.user.phone,
          phone: params.phone,
          token: code,
          type: "user",
          created: getCurrentDate(),
        };

        forgetPasswordOTPRef.child(code).set(setData, (err) => {
          if (err) {
            return res.json({
              status: false,
              message: err.message,
            });
          }

          let filterphone = params.phone;
                let transformphone = filterphone.substr(1);
                console.log('filterphone -> ',filterphone)
                console.log('transformphone -> ',transformphone)
           
          let content = `Forgot Password Token is: ${code}`;
          axios.post(`http://bsms.its.com.pk/api.php?key=b23838b9978affdf2aab3582e35278c6&msgdata=${content}&receiver=${transformphone}`).then((response)=>{
            let data = response.data;
            
              if(data.response.status === 'Success') {
                res.json({
                  status: true,
                  user_type: "user",
                  otp: code,
                });
              } else {
                res.json({
                  status:false,
                  data:data
                })
              }
            }).catch((err)=>{
              res.json({
                status:false,
                error: err
              }) 
            })

          // twillio_client.messages
          //   .create(
          //     {
          //       messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
          //       to: params.phone,
          //       from: config.twilio.phone,
          //       body: `Forgot Password Token is: ${code}`,
          //     },
          //     (err, resData) => {
          //       if (err) {
          //         return res.json({
          //           status: false,
          //           message: { err },
          //         });
          //       }
          //       return res.json({
          //         status: true,
          //         user_type: "user",
          //         otp: code,
          //       });
          //     }
          //   )
          //   .catch((err) => {
          //     res.json({
          //       status: false,
          //       error: { err },
          //     });
          //   });
        });
      } else {
        res.json({
          status: false,
          error:
            "You have not set password for your phone number . Please login and verify your phone first.",
        });
      }
    } else if (params.user.user_type == "pro") {
      if (params.user.password) {
        const code = Math.floor(Math.random() * 9000) + 1000;

        const setData = {
          user: req.body.user.phone,
          phone: params.phone,
          token: code,
          type: "pro",
          created: getCurrentDate(),
        };

        forgetPasswordOTPRef.child(code).set(setData, (err) => {
          if (err) {
            return res.json({
              status: false,
              message: err.message,
            });
          }
          

          let filterphone = params.phone;
          let transformphone = filterphone.substr(1);
          console.log('filterphone -> ',filterphone)
          console.log('transformphone -> ',transformphone)
          let content = `Forgot Password Token is: ${code}`;
          axios.post(`http://bsms.its.com.pk/api.php?key=b23838b9978affdf2aab3582e35278c6&msgdata=${content}&receiver=${transformphone}`).then((response)=>{
            let data = response.data;
            
              if(data.response.status === 'Success') {
                res.json({
                  status: true,
                  user_type: "pro",
                  otp: code,
                });
              } else {
                res.json({
                  status:false,
                  data:data
                })
              }
            }).catch((err)=>{
              res.json({
                status:false,
                error: err
              }) 
            })

          // twillio_client.messages
          //   .create(
          //     {
          //       messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
          //       to: params.phone,
          //       from: config.twilio.phone,
          //       body: `Forgot Password Token is: ${code}`,
          //     },
          //     (err, resData) => {
          //       if (err) {
          //         return res.json({
          //           status: false,
          //           message: { err },
          //         });
          //       }
          //       return res.json({
          //         status: true,
          //         user_type: "pro",
          //         otp: code,
          //       });
          //     }
          //   )
          //   .catch((err) => {
          //     res.json({
          //       status: false,
          //       error: { err },
          //     });
          //   });
        });
      } else {
        res.json({
          status: false,
          error:
            "You have not set password for your phone number . Please login and verify your phone first.",
        });
      }
    } else {
      res.json({
        status: false,
        error: "conditional error",
      });
    }
  }
);

// Verify Forgot Password
router.post(
  "/verify-forgot-password",
  // Verify OTP
  (req, res) => {
    const params = req.body;
    forgetPasswordOTPRef.child(parseInt(params.otp)).once("value", (snap) => {
      const data = snap.val();

      // console.log("Data -> ", data);
      if (data !== null) {
        const phone = data.user;
        const userType = data.type;

        console.log("user -> ", data);
        // Encrypting Password

        forgetPasswordOTPRef
          .child(params.otp)
          .remove()
          .then(() => {
            res.json({
              status: true,
              message: "OTP Verified",
              phone: phone,
              type: userType,
            });
          })
          .catch((err) =>
            res.json({
              status: false,
              message: err.message,
            })
          );

        // User Record Edit
      } else {
        res.json({
          status: false,
          message: "Invalid OTP Code",
        });
      }
    });
  }
);

// After Forgot Password -> Updates New Password To User Record
router.post(
  "/user_app_new_password",
  // Check User
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          req.body.userType = "user";
          next();
        } else {
          userRef
            .child("pro")
            .child(params.phone)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                req.body.user = user;
                req.body.userType = "pro";
                next();
              } else {
                res.json({
                  status: false,
                  error: "Phone not registered with any user",
                });
              }
            });
        }
      });
  },
  (req, res) => {
    // const phone = req.body.phone;
    // const type = req.body.type;
    const params = req.body;

    if (params.userType === "pro") {
      const salt = bcrypt.genSaltSync(saltRounds);
      const newHash = bcrypt.hashSync(params.password, salt);
      userRef
        .child("pro")
        .child(params.phone)
        .update({
          password: newHash,
        })
        .then(() => {
          res.json({
            status: true,
            message: "Password Updated Successfully",
          });
        })
        .catch((err) =>
          res.json({
            status: false,
            message: err.message,
          })
        );
    } else if (params.userType === "user") {
      const salt = bcrypt.genSaltSync(saltRounds);
      const newHash = bcrypt.hashSync(params.password, salt);
      userRef
        .child("users")
        .child(params.phone)
        .update({
          password: newHash,
        })
        .then(() => {
          res.json({
            status: true,
            message: "Password Updated Successfully",
          });
        })
        .catch((err) =>
          res.json({
            status: false,
            message: err.message,
          })
        );
    } else {
      res.json({
        status: false,
        error: "Unknown User Type",
      });
    }
  }
);

// Sending Forgot Password OTP \ User Data is saved with sms message record
router.post(
  "/driver_app_forgot_password",
  // Check Drivers
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("drivers")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const driver = snapshot.val();

          if (driver.password) {
            req.body.driver = driver;
            next();
          } else {
            res.json({
              status: false,
              error:
                "You have not set password for your phone number . Please login and verify your phone first.",
            });
          }
        } else {
          req.body.driver = null;
          next();
        }
      });
  },
  // Check Vendor
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("vendors")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          next();
        } else {
          req.body.vendor = null;
          next();
        }
      });
  },
  // Check User Type
  (req, res, next) => {
    const params = req.body;

    if (req.body.driver && req.body.vendor == null) {
      const code = Math.floor(Math.random() * 9000) + 1000;

      const setData = {
        driver: req.body.driver.phone,
        phone: params.phone,
        token: code,
        type: "driver",
        created: getCurrentDate(),
      };
      forgetPasswordOTPRef.child(code).set(setData, (err) => {
        if (err) {
          return res.json({
            status: false,
            message: err.message,
          });
        }
        

        let filterphone = params.phone;
          let transformphone = filterphone.substr(1);
          console.log('filterphone -> ',filterphone)
          console.log('transformphone -> ',transformphone)
        let content = `Forgot Password Token is: "${code}`;
        axios.post(`http://bsms.its.com.pk/api.php?key=b23838b9978affdf2aab3582e35278c6&msgdata=${content}&receiver=${transformphone}`).then((response)=>{
          let data = response.data;
          
            if(data.response.status === 'Success') {
              res.json({
                status: true,
                type: "driver",
                otp: code,
              });
            } else {
              res.json({
                status:false,
                data:data
              })
            }
          }).catch((err)=>{
            res.json({
              status:false,
              error: err
            }) 
          })

        // twillio_client.messages
        //   .create(
        //     {
        //       messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
        //       to: params.phone,
        //       from: config.twilio.phone,
        //       body: `Forgot Password Token is: "${code}`,
        //     },
        //     (err, resData) => {
        //       if (err) {
        //         return res.json({
        //           status: false,
        //           message: err,
        //         });
        //       }
        //       return res.json({
        //         status: true,
        //         type: "driver",
        //         otp: code,
        //       });
        //     }
        //   )
        //   .catch((err) => {
        //     res.json({
        //       status: false,
        //       error: err,
        //     });
        //   });
      });
    }

    if (req.body.vendor && req.body.driver == null) {
      const code = Math.floor(Math.random() * 9000) + 1000;

      const setData = {
        vendor: req.body.vendor.phone,
        phone: params.phone,
        token: code,
        type: "vendor",
        created: getCurrentDate(),
      };
      forgetPasswordOTPRef.child(code).set(setData, (err) => {
        if (err) {
          return res.json({
            status: false,
            message: err.message,
          });
        }
        

        
        let filterphone = params.phone;
          let transformphone = filterphone.substr(1);
          console.log('filterphone -> ',filterphone)
          console.log('transformphone -> ',transformphone)
        let content = `Forgot Password Token is: "${code}`;
        axios.post(`http://bsms.its.com.pk/api.php?key=b23838b9978affdf2aab3582e35278c6&msgdata=${content}&receiver=${transformphone}`).then((response)=>{
          let data = response.data;
          
            if(data.response.status === 'Success') {
              res.json({
                status: true,
                type: "vendor",
                otp: code,
              });
            } else {
              res.json({
                status:false,
                data:data
              })
            }
          }).catch((err)=>{
            res.json({
              status:false,
              error: err
            }) 
          })


        // twillio_client.messages
        //   .create(
        //     {
        //       messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
        //       to: params.phone,
        //       from: config.twilio.phone,
        //       body: `Forgot Password Token is: "${code}`,
        //     },
        //     (err, resData) => {
        //       if (err) {
        //         return res.json({
        //           status: false,
        //           message: err,
        //         });
        //       }
        //       return res.json({
        //         status: true,
        //         type: "vendor",
        //         otp: code,
        //       });
        //     }
        //   )
        //   .catch((err) => {
        //     res.json({
        //       status: false,
        //       error: err,
        //     });
        //   });
      });
    }
  }
);

// After Forgot Password -> Updates New Password To User Record
router.post(
  "/driver_app_new_password",
  // Check In Driver And Vendor
  (req, res, next) => {
    // const phone = req.body.phone;
    const params = req.body;

    userRef
      .child("vendors")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          req.body.userType = user.type;

          next();
        } else {
          userRef
            .child("drivers")
            .child(params.phone)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                req.body.user = user;
                req.body.userType = user.type;
                next();
              } else {
                res.json({
                  status: false,
                  error: "User Not Found !",
                });
              }
            });
        }
      });
  },
  (req, res) => {
    const params = req.body;
    const salt = bcrypt.genSaltSync(saltRounds);
    const newHash = bcrypt.hashSync(params.password, salt);

    console.log("user type -> ", params.userType);

    if (params.userType === "driver") {
      userRef
        .child("drivers")
        .child(params.phone)
        .update({
          password: newHash,
        })
        .then(() => {
          res.json({
            status: true,
            message: "Password Set Successfully !",
            phone: params.phone,
            type: params.userType,
          });
        })
        .catch((err) =>
          res.json({
            status: false,
            message: err.message,
          })
        );
    } else if (params.userType === "vendor") {
      userRef
        .child("vendors")
        .child(params.phone)
        .update({
          password: newHash,
        })
        .then(() => {
          res.json({
            status: true,
            message: "Password Set Successfully !",
            phone: params.phone,
            type: params.userType,
          });
        })
        .catch((err) =>
          res.json({
            status: false,
            message: err.message,
          })
        );
    } else {
      res.json({
        status: false,
        error: "Unknown User Type",
      });
    }
  }
);


// ============= AUTHENTICATION REQUESTS (ENDS) =============

// Get wallet
router.post("/get_wallet", verifyTokenFirebase, (req, res, next) => {
  const params = req.body;

  switch (params.user.user_type) {
    case "user":
      walletRef
        .child("users")
        .child(params.user.user_id)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const wallet = snapshot.val();
            res.json({
              status: true,
              type: "user",
              data: wallet,
              transactions: wallet.transactions || null,
            });
          } else {
            res.json({
              status: false,
              error: "No Wallet Found",
            });
          }
        });
      break;

    case "pro":
      walletRef
        .child("users")
        .child(params.user.user_id)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const wallet = snapshot.val();
            res.json({
              status: true,
              type: params.user.user_type,
              data: wallet,
            });
          } else {
            res.json({
              status: false,
              error: "No Wallet Found",
            });
          }
        });
      break;

    case "driver":
      walletRef
        .child("drivers")
        .child(params.user.user_id)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const wallet = snapshot.val();
            res.json({
              status: true,
              type: params.user.user_type,
              data: wallet,
            });
          } else {
            res.json({
              status: false,
              error: "No Wallet Found",
            });
          }
        });
      break;

    case "vendor":
      walletRef
        .child("vendors")
        .child(params.user.user_id)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const wallet = snapshot.val();
            res.json({
              status: true,
              type: params.user.user_type,
              data: wallet,
            });
          } else {
            res.json({
              status: false,
              error: "No Wallet Found",
            });
          }
        });
      break;

    default:
      res.json({
        status: false,
        error: "Unknown User Type !",
      });
      break;
  }
});

// ---------------------
// Get Single Bilty For Both (Transit & Upcountry Requests)
router.post(
  "/get_single_bilty_transit",
  verifyTokenFirebase,
  //  Get Request Data
  (req, res, next) => {
    const params = req.body;

    const orderNo = params.biltyNo.slice(2, params.biltyNo.length - 2);

    pplRequestRef.child(orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();

        if (request.request_type) {
          req.body.request = request;
          next();
        } else {
          res.json({
            status: false,
            error: "Request Type Is Not Transit !",
          });
        }
      } else {
        res.json({
          status: false,
          error: "Request Not Found !",
        });
      }
    });
  },
  // Get Bilty
  (req, res) => {
    const params = req.body;

    let final_amount;

    if (params.request.qoute) {
      final_amount = params.request.qoute.qoute_amount;
    }

    if (params.request.user_counter) {
      final_amount = params.request.user_counter.amount;
    }

    if (params.request.vendor_counter) {
      final_amount = params.request.vendor_counter.amount;
    }

    const transitbilties = params.request.bilty;

    switch (params.request.request_type) {
      case "transit":
        if (transitbilties) {
          if (transitbilties.length !== 0) {
            const filterOut = transitbilties.filter((bilty) => {
              return bilty.biltyNo === params.biltyNo;
            });

            if (filterOut) {
              if (filterOut.length !== 0) {
                const bilty = filterOut[0];

                delete params.request.bilty;

                let data = {
                  ...params.request,
                  orderNo: params.request.orderNo,
                  user_counter: null,
                  qoute: null,
                  vendor_counter: null,
                  ...bilty,
                  final_amount,
                  documents: params.request.documents,
                };

                res.json({
                  status: true,
                  data: data,
                });
              } else {
                res.json({
                  status: false,
                  error: "Bilty Not Found !",
                });
              }
            }
          }
        }

        break;

      case "upcountry":
        if (transitbilties) {
          if (transitbilties.length !== 0) {
            const filterOut = transitbilties.filter((bilty) => {
              return bilty.biltyNo === params.biltyNo;
            });

            if (filterOut) {
              if (filterOut.length !== 0) {
                const bilty = filterOut[0];

                delete params.request.bilty;

                let data = {
                  ...params.request,
                  orderNo: params.request.orderNo,
                  user_counter: null,
                  qoute: null,
                  vendor_counter: null,
                  ...bilty,
                  final_amount,
                  documents: params.request.documents,
                };

                res.json({
                  status: true,
                  data: data,
                });
              } else {
                res.json({
                  status: false,
                  error: "Bilty Not Found !",
                });
              }
            }
          }
        }

        break;

      default:
        res.json({
          status: false,
          error: "Unknown Request Type - (Check Bilty Status For PPL)!",
        });

        break;
    }
  }
);


// ============= GET USER DATA (STARTS) =============



// get_user_pending_orders
router.post(
  "/get_user_pending_orders",
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        next();
        break;
      case "pro":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`,
        });
        break;
    }
  },
  // Get Transit Qoutes
  (req, res, next) => {
    const params = req.body;

    // Get All Qoutes For Vendor
    pplBiddingsRef
      .child("transit")
      .child("qoutes")
      .orderByChild("user_phone")
      .equalTo(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const transitQoutes = [];

          snapshot.forEach((snap) => {
            transitQoutes.push(snap.val().orderNo);
          });

          req.body.transitQoutes = transitQoutes;
          next();
        } else {
          req.body.transitQoutes = [];
          next();
        }
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  },
  // Get Upcountry Qoutes
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
      .child("upcountry")
      .child("qoutes")
      .orderByChild("user_phone")
      .equalTo(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const upcountryQoutes = [];

          snapshot.forEach((snap) => {
            upcountryQoutes.push(snap.val().orderNo);
          });

          req.body.upcountryQoutes = upcountryQoutes;
          next();
        }
        // if (snapshot.val()) {
        //   const upcountryQoutes = [];
        //   snapshot.forEach((snap) => {
        //      if(snap.val().status === 'pending') {
        //     upcountryQoutes.push({
        //       orderNo: snap.val().orderNo,
        //       subOrderNo: snap.val().subOrderNo
        //     })
        //     }
        //   })

        //   req.body.upcountryQoutes = upcountryQoutes;
        //   next();
        // }
        else {
          req.body.upcountryQoutes = [];
          next();
        }
      })
      .catch((err) => console.log(err));
  },
  // Get Requests - Vendor Not Qouted On
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.once("value", (snapshot) => {
      if (snapshot.val()) {
        const requests = [];
        snapshot.forEach((snap) => {
          if (
            snap.val().status === "pending" ||
            snap.val().status === "qoute_accepted" ||
            snap.val().status === "user_counter_accepted" ||
            snap.val().status === "vendor_counter_accepted"
          ) {
            if (snap.val().user_phone === params.user.user_id) {
              requests.push(snap.val());
            }

            // check contact persons
            if (snap.val().contact_person) {
              if (snap.val().contact_person !== "self") {
                let allcontactpersons = snap.val().contact_person;

                for (let key in allcontactpersons) {
                  if (key === params.user.user_id) {
                    requests.push(snap.val());
                  }
                }
              }
            }
          }
        });

        // Get User Orders
        const userOrders = requests.filter((order) => {
          return order.request_type;
        });

        const allqoutes = [...params.transitQoutes, ...params.upcountryQoutes];
        const removedDuplicates = [...new Set(allqoutes)];
        // const upcountryQoutes = params.upcountryQoutes;

        // const upcountryRequest = requests.filter((x) => {
        //   return x.request_type === 'upcountry'
        // })

        // const filterForUpcountry = [];

        // upcountryRequest.forEach((x) => {

        //   upcountryQoutes.forEach((qoute) => {
        //     if (x.orderNo === qoute.orderNo) {
        //       filterForUpcountry.push()
        //     }
        //   })
        // })

        // console.log('filter for upcountry -> ', filterForUpcountry)

        if (removedDuplicates.length > 0) {
          const filterRequests = userOrders.filter(
            (item) => !removedDuplicates.includes(item.orderNo)
          );

          filterRequests.forEach((order) => {
            var createdAt = order.createdAt;
            createdAt = `${createdAt.substr(3, 2)}/${createdAt.substr(
              0,
              2
            )}/${createdAt.substr(6)}`;
            var now = getCurrentDate();
            now = `${now.substr(3, 2)}/${now.substr(0, 2)}/${now.substr(6)}`;
            // diff = moment(new Date(now), 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]').diff(moment(new Date(createdAt), 'YYYY-MM-DD[T]HH:mm:ss. SSS[Z]'), 'minutes');
            // const diff = (((new Date(now) - new Date(createdAt)) / 1000) / 60);
            // var m = Number((Math.abs(diff) * 100).toPrecision(15));
            // m = (Math.round(m) / 100).toString();
            // var min = m.split('.')[0];
            const diff = parseInt(
              Math.abs(new Date(now).getTime() - new Date(createdAt).getTime())
            );
            var min = parseInt((diff / (1000 * 60)) % 60).toString();
            order["attempt"] =
              min < 10 ? "First" : min < 20 ? "Second" : "Exhausted";
            if (min < 20) {
              min = min < 10 ? min : min.substr(1);
              // var sec = m.split('.')[1];
              // sec = (sec.length == 2 && sec.substr(0, 1) >= 6) ? (parseInt(sec.substr(0, 1)) + 1).toString() : sec;
              const sec = parseInt((diff / 1000) % 60);
              order["counter"] = `${min}:${sec}`;
            }
          });
          // ).toString().split('.')[1]);

          // let getApprovalPendingOrders = userOrders.filter((item)=>{
          //   return (item.status === 'qoute_accepted' || item.status === 'user_counter_accepted' || item.status === 'vendor_counter_accepted')
          // })

          // console.log('getApprovalPendingOrders -> ',getApprovalPendingOrders);
          console.log("condition approved");

          let final = [...filterRequests];

          const sortedfilterRequests = final.sort(function (a, b) {
            return b.createdAt_timestamp - a.createdAt_timestamp;
          });

          res.json({
            status: true,
            data: sortedfilterRequests,
          });
        } else {
          console.log("condition not approved");

          const sorteduserOrders = userOrders.sort(function (a, b) {
            return b.createdAt_timestamp - a.createdAt_timestamp;
          });

          res.json({
            status: true,
            data: sorteduserOrders,
          });
        }
      } else {
        res.json({
          status: true,
          data: [],
        });
      }
    });
  }
);

// /get_user_active_orders
router.post(
  "/get_user_active_orders",
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        console.log(params.user);
        next();
        break;
      case "pro":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`,
        });
        break;
    }
  },
  // Get Active Order
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.once("value", (snapshot) => {
      if (snapshot.val()) {
        const requests = [];

        snapshot.forEach((snap) => {
          if (snap.val().user_phone === params.user.user_id) {
            requests.push(snap.val());
          }

          // check contact persons
          if (snap.val().contact_person) {
            if (snap.val().contact_person !== "self") {
              let allcontactpersons = snap.val().contact_person;

              for (let key in allcontactpersons) {
                if (key === params.user.user_id) {
                  console.log("Contact Agent Matched !");
                  requests.push(snap.val());
                }
              }
            }
          }
        });

        //  Active Orders
        // const userOrders = requests.filter((x) => {
        //   return x.user_phone === params.user.user_id;
        // });

        // Filter For Active Orders
        const activeOrders = requests.filter((x) => {
          if (x.status !== "completed" && x.status === "accepted") {
            return x;
          }
        });

        const filterupcountryOrders = [];

        const sortedtransitOrders = activeOrders.sort(function (a, b) {
          return b.createdAt_timestamp - a.createdAt_timestamp;
        });

        res.json({
          status: true,
          transit: { data: sortedtransitOrders },
          upcountry: { data: [] },
        });
      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });
  }
);

// /get_user_completed_orders
router.post(
  "/get_user_completed_orders",
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        next();
        break;
      case "pro":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`,
        });
        break;
    }
  },
  // Get Completed Order
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.once("value", (snapshot) => {
      if (snapshot.val()) {
        const requests = [];

        snapshot.forEach((snap) => {
          if (snap.val().user_phone === params.user.user_id) {
            requests.push(snap.val());
          }

          // check contact persons
          if (snap.val().contact_person) {
            if (snap.val().contact_person !== "self") {
              let allcontactpersons = snap.val().contact_person;

              for (let key in allcontactpersons) {
                if (key === params.user.user_id) {
                  requests.push(snap.val());
                }
              }
            }
          }
        });

        //  user Orders
        // const userOrders = requests.filter((x) => {
        //   return x.user_phone === params.user.user_id;
        // });

        // Filter For Active Orders
        const completedOrders = requests.filter((x) => {
          if (x.status === "completed") {
            return x;
          }
        });

        // Transit Orders
        const transitOrders = completedOrders.filter((x) => {
          return x.request_type === "transit";
        });

        // Upcountry Orders
        const upcountryOrders = completedOrders.filter((x) => {
          return x.request_type === "upcountry";
        });

        const sortedtransitOrders = transitOrders.sort(function (a, b) {
          return b.createdAt_timestamp - a.createdAt_timestamp;
        });

        const sortedupcountryOrders = upcountryOrders.sort(function (a, b) {
          return b.createdAt_timestamp - a.createdAt_timestamp;
        });

        res.json({
          status: true,
          transit: {
            data: [...sortedtransitOrders,...sortedupcountryOrders]
          }
        });
      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });
  }
);

// /get_user_rejected_orders
router.post(
  "/get_user_rejected_orders",
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        next();
        break;
      case "pro":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`,
        });
        break;
    }
  },
  // Get Completed Order
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.once("value", (snapshot) => {
      if (snapshot.val()) {
        const requests = [];

        snapshot.forEach((snap) => {
          if (snap.val().user_phone === params.user.user_id) {
            requests.push(snap.val());
          }
          // check contact persons
          if (snap.val().contact_person) {
            if (snap.val().contact_person !== "self") {
              let allcontactpersons = snap.val().contact_person;

              for (let key in allcontactpersons) {
                if (key === params.user.user_id) {
                  requests.push(snap.val());
                }
              }
            }
          }
        });

        //  user Orders
        // const userOrders = requests.filter((x) => {
        //   return x.user_phone === params.user.user_id;
        // });

        // Filter For Active Orders
        const completedOrders = requests.filter((x) => {
          if (
            x.status === "qoute_rejected" ||
            x.status === "user_counter_rejected" ||
            x.status === "vendor_counter_rejected"
          ) {
            return x;
          }
        });

        // Transit Orders
        const transitOrders = completedOrders.filter((x) => {
          return x.request_type === "transit";
        });

        // Upcountry Orders
        const upcountryOrders = completedOrders.filter((x) => {
          return x.request_type === "upcountry";
        });

        const sortedtransitOrders = transitOrders.sort(function (a, b) {
          return b.createdAt_timestamp - a.createdAt_timestamp;
        });

        const sortedupcountryOrders = upcountryOrders.sort(function (a, b) {
          return b.createdAt_timestamp - a.createdAt_timestamp;
        });

        res.json({
          status: true,
          transit: {
            data: [...sortedtransitOrders, ...sortedupcountryOrders],
          },
        });
      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });
  }
);

// user_get_vendor_qoutes
router.post(
  "/user_get_vendor_qoutes",
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        next();
        break;
      case "pro":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`,
        });
        break;
    }
  },
  // Get Qoutes
  async (req, res, next) => {
    const params = req.body;
    //console.log(params.user);
    // Get All Qoutes For Vendor
    const transitQoutesSnap = await pplBiddingsRef
      .child("transit")
      .child("qoutes")
      .orderByChild("user_phone")
      .equalTo(params.user.user_id)
      .once("value");

    const upcountryQoutesSnap = await pplBiddingsRef
      .child("upcountry")
      .child("qoutes")
      .orderByChild("user_phone")
      .equalTo(params.user.user_id)
      .once("value");

    // Qoutes
    const rawtransitQoutes = await transitQoutesSnap.val();
    const rawupcountryQoutes = await upcountryQoutesSnap.val();

    const upcountryAndTransitQoutes = [];

    if (rawtransitQoutes !== null) {
      const convert1 = Object.entries(rawtransitQoutes);
      convert1.forEach((x) => {
        upcountryAndTransitQoutes.push(x[1]);
      });
    }

    if (rawupcountryQoutes !== null) {
      const convert2 = Object.entries(rawupcountryQoutes);
      convert2.forEach((x) => {
        upcountryAndTransitQoutes.push(x[1]);
      });
    }

    // Filter For Pending Qoutes
    const pendingQoutes1 = upcountryAndTransitQoutes.filter((qoute) => {
      return qoute.status === "pending";
    });

    // console.log('pendingQoutes1 -> ',pendingQoutes1);

    var pendingQoutes1Group = pendingQoutes1.reduce(function (r, a) {
      r[a.orderNo] = r[a.orderNo] || [];
      r[a.orderNo].push(a);
      return r;
    }, Object.create(null));

    //check min quote amounts
    var minQuotePendingQuotes = {};
    var min_quote = 99999999999;
    Object.values(pendingQoutes1Group).map((groupQuoteByOrderNo) => {
      groupQuoteByOrderNo.map((pendingQuote, i) => {
        if (pendingQuote.qoute_amount < min_quote) {
          min_quote = pendingQuote.qoute_amount;
          minQuotePendingQuotes[pendingQuote.orderNo] = pendingQuote;
        }
      });
    });

    // //check same quote amounts
    let prevRating = 0;
    Object.values(pendingQoutes1Group).map((groupQuoteByOrderNo) => {
      groupQuoteByOrderNo.forEach((pendingQuote, i) => {
        if (
          pendingQuote.qoute_amount ===
            Object.values(minQuotePendingQuotes)[0].qoute_amount &&
          prevRating < pendingQuote.rating
        ) {
          prevRating = pendingQuote.rating;
          minQuotePendingQuotes[pendingQuote.orderNo] = pendingQuote;
        }
      });
    });

    minQuotePendingQuotes = Object.values(minQuotePendingQuotes);

    // console.log('sortedpendingQoutes1 -> ',)

    // Filter For Accepted Qoutes
    const acceptedQoutes1 = [];
    // Filter For Rejected Qoutes
    const rejectedQoutes1 = [];

    let pendingOrderNos = [];

    pplRequestRef
      .orderByChild("user_phone")
      .equalTo(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          snapshot.forEach((snap) => {
            order = snap.val();

            if (order.request_type) {
              if (order.status == "qoute_accepted") {
                acceptedQoutes1.push(order.qoute);
              } else if (order.status == "qoute_rejected") {
                rejectedQoutes1.push(order.qoute);
              } else if (order.status === "pending") {
                pendingOrderNos.push(order.orderNo);
              }
              // else if (order.status == "pending") {
              //   rejectedQoutes1.push(order.qoute);
              // }
            }
          });
        }
      });

    // Filter For Accepted Qoutes
    // const acceptedQoutes1 = [];
    // await pplRequestRef.orderByChild('status').equalTo('qoute_accepted').once('value', (snapshot) => {
    //   if (snapshot.val()) {
    //     snapshot.forEach((snap) => {
    //       acceptedQoutes1.push(snap.val().qoute)
    //     })
    //   }
    // })
    // const acceptedQoutes1 = transitQoutes.filter((qoute) => {
    //   return qoute.status === 'qoute_accepted'
    // })

    // Filter For Rejected Qoutes
    // const rejectedQoutes1 = [];
    // await pplRequestRef.orderByChild('status').equalTo('qoute_rejected').once('value', (snapshot) => {
    //   if (snapshot.val()) {
    //     snapshot.forEach((snap) => {
    //       rejectedQoutes1.push(snap.val().qoute)
    //     })
    //   }
    // })
    // const rejectedQoutes1 = transitQoutes.filter((qoute) => {
    //   return qoute.status == 'rejected'
    // })

    // UPCOUNTRY
    // Filter For Pending Qoutes
    // const pendingQoutes2 = upcountryQoutes.filter((qoute) => {
    //   return qoute.status == 'pending'
    // })

    // Filter For Accepted Qoutes
    // const acceptedQoutes2 = upcountryQoutes.filter((qoute) => {
    //   return qoute.status == 'accepted'
    // })

    // Filter For Rejected Qoutes
    // const rejectedQoutes2 = upcountryQoutes.filter((qoute) => {
    //   return qoute.status == 'rejected'
    // })

    // minQuotePendingQuotes
    const sortedpendingQoutes1 = pendingQoutes1.sort(function (a, b) {
      return b.vendor_countered_on_timestamp - a.vendor_countered_on_timestamp;
    });

    const sortedacceptedQoutes1 = acceptedQoutes1.sort(function (a, b) {
      return b.vendor_countered_on_timestamp - a.vendor_countered_on_timestamp;
    });

    const sortedrejectedQoutes1 = rejectedQoutes1.sort(function (a, b) {
      return b.vendor_countered_on_timestamp - a.vendor_countered_on_timestamp;
    });

    let allorderNos = pendingQoutes1.map((x) => x.orderNo);
    let final = [];
    // const orderedQoutes = _.orderBy(
    //   pendingQoutes1,
    //   ["qoute_amount"],
    //   ["asc"]
    // );


    pendingOrderNos.forEach((x) => {
      // var res = Math.min.apply(Math, pendingQoutes1.map(function(o) { 
      //   return o.qoute_amount; }));

      // console.log('min -> ',res); 

      let filtered = pendingQoutes1.filter((qoute) => {
        return qoute.orderNo === x
      })

      if(filtered) {
        if(filtered.length > 0) {
          // let orderedQoutes = _.orderBy(
          //   filtered,
          //   ["qoute_amount"],
          // );

          var res = Math.min.apply(Math, filtered.map(function(o) { 
            return o.qoute_amount; }));

          let pluckout = filtered.filter((item)=>{
            return item.qoute_amount === String(res)
          })  

          if(pluckout) {
            if(pluckout.length > 0) {
              final.push(pluckout[0]);
            }
          }
          
        }
      }


      // final.push(res);
      // orderedQoutes.forEach((y) => {
      //   // console.log('orderNo -> ',y.orderNo);
      //   // console.log('amount -> ',y.qoute_amount);
      //   if (x === y.orderNo) {
          
      //     if (final) {
      //       let check = final.filter((z) => z.orderNo === y.orderNo);
      //       if (!check || check.length === 0) {
      //         final.push(y);
              
      //       }
      //     }
      //   }
      // });
    });

    res.json({
      status: true,
      pending: final,
      accepted: [...sortedacceptedQoutes1],
      rejected: [...sortedrejectedQoutes1],
    });
  }
);


// user_get_vendor_qoute (Terms & Condition Page)
router.post(
  "/user_get_vendor_qoute",
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        next();
        break;
      case "pro":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`,
        });
        break;
    }
  },
  // Get Qoutes
  async (req, res, next) => {
    const params = req.body;
    //console.log(params.user);
    // Get All Qoutes For Vendor
    const transitQoutesSnap = await pplBiddingsRef
      .child("transit")
      .child("qoutes")
      .orderByChild("orderNo")
      .equalTo(params.orderNo)
      .once("value");

    const upcountryQoutesSnap = await pplBiddingsRef
      .child("upcountry")
      .child("qoutes")
      .orderByChild("orderNo")
      .equalTo(params.orderNo)
      .once("value");

    // Qoutes
    const rawtransitQoutes = await transitQoutesSnap.val();
    const rawupcountryQoutes = await upcountryQoutesSnap.val();

    const upcountryAndTransitQoutes = [];

    if (rawtransitQoutes !== null) {
      const convert1 = Object.entries(rawtransitQoutes);
      convert1.forEach((x) => {
        upcountryAndTransitQoutes.push(x[1]);
      });
    }

    if (rawupcountryQoutes !== null) {
      const convert2 = Object.entries(rawupcountryQoutes);
      convert2.forEach((x) => {
        upcountryAndTransitQoutes.push(x[1]);
      });
    }

    // Filter For Pending Qoutes
    const pendingQoutes1 = upcountryAndTransitQoutes.filter((qoute) => {
      return qoute.status === "pending";
    });

    console.log('pendingQoutes1 -> ',pendingQoutes1);

    // console.log('pendingQoutes1 -> ',pendingQoutes1);


    // console.log('sortedpendingQoutes1 -> ',)

    // Filter For Accepted Qoutes
    const acceptedQoutes1 = [];
    // Filter For Rejected Qoutes
    const rejectedQoutes1 = [];

    let pendingOrderNos = [];

    pplRequestRef
      .orderByChild("orderNo")
      .equalTo(params.orderNo)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          snapshot.forEach((snap) => {
            order = snap.val();

            if (order.status === "pending") {
              pendingOrderNos.push(order.orderNo);
            }
          });
        }
      });

   
    // minQuotePendingQuotes
    const sortedpendingQoutes1 = pendingQoutes1.sort(function (a, b) {
      return b.vendor_countered_on_timestamp - a.vendor_countered_on_timestamp;
    });

    const sortedacceptedQoutes1 = acceptedQoutes1.sort(function (a, b) {
      return b.vendor_countered_on_timestamp - a.vendor_countered_on_timestamp;
    });

    const sortedrejectedQoutes1 = rejectedQoutes1.sort(function (a, b) {
      return b.vendor_countered_on_timestamp - a.vendor_countered_on_timestamp;
    });

    let allorderNos = pendingQoutes1.map((x) => x.orderNo);
    let final = [];
    // const orderedQoutes = _.orderBy(
    //   pendingQoutes1,
    //   ["qoute_amount"],
    //   ["asc"]
    // );

    console.log('allorderNos -> ',allorderNos);


    pendingOrderNos.forEach((x) => {
      // var res = Math.min.apply(Math, pendingQoutes1.map(function(o) { 
      //   return o.qoute_amount; }));

      // console.log('min -> ',res); 

      let filtered = pendingQoutes1.filter((qoute) => {
        return qoute.orderNo === x
      })

      console.log('filtered -> ',filtered);

      if(filtered) {
        if(filtered.length > 0) {
          // let orderedQoutes = _.orderBy(
          //   filtered,
          //   ["qoute_amount"],
          // );

          var res = Math.min.apply(Math, filtered.map(function(o) { 
            return o.qoute_amount; }));


          console.log('res -> ',res);  

          let pluckout = filtered.filter((item)=>{
            return item.qoute_amount === String(res)
          })  

          if(pluckout) {
            if(pluckout.length > 0) {
              final.push(pluckout[0]);
            }
          }
          
        }
      }


      // final.push(res);
      // orderedQoutes.forEach((y) => {
      //   // console.log('orderNo -> ',y.orderNo);
      //   // console.log('amount -> ',y.qoute_amount);
      //   if (x === y.orderNo) {
          
      //     if (final) {
      //       let check = final.filter((z) => z.orderNo === y.orderNo);
      //       if (!check || check.length === 0) {
      //         final.push(y);
              
      //       }
      //     }
      //   }
      // });
    });

    res.json({
      status: true,
      pending: final,
      accepted: [...sortedacceptedQoutes1],
      rejected: [],
    });
  }
);

// /get_user_pending_orders
router.post(
  "/get_user_payment_approval_awaiting_orders",
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        console.log("user -> ", params.user.user_id);
        next();
        break;
      case "pro":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`,
        });
        break;
    }
  },
  // Get Requests - Vendor Not Qouted On
  (req, res, next) => {
    const params = req.body;

    pplRequestRef
      .orderByChild("user_phone")
      .equalTo(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const requests = [];
          snapshot.forEach((snap) => {
            if (
              snap.val().status === "qoute_accepted" ||
              snap.val().status === "user_counter_accepted" ||
              snap.val().status === "vendor_counter_accepted"
            ) {
              requests.push(snap.val());
            }
          });

          // Get Filter For Payment Method Bank
          const onlyBank = requests.filter((order) => {
            return (
              order.payment_method === "bank" &&
              order.bank_tranfer_slip_status === false
            );
          });

          const sorteduserOrders = onlyBank.sort(function (a, b) {
            return b.createdAt_timestamp - a.createdAt_timestamp;
          });

          res.json({
            status: true,
            data: sorteduserOrders,
          });
          // console.log('filter for upcountry -> ', filterForUpcountry)
        } else {
          res.json({
            status: true,
            data: [],
          });
        }
      });
  }
);

// /get_upcountry_qoutes
router.post(
  "/get_upcountry_qoutes",
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        next();
        break;
      case "pro":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`,
        });
        break;
    }
  },
  // Get All Qoutes (Upcountry)
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
      .child("upcountry")
      .child("qoutes")
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const upcountryQoutes = [];
          snapshot.forEach((snap) => {
            upcountryQoutes.push(snap.val());
          });

          req.body.upcountryQoutes = upcountryQoutes;
          next();
        } else {
          req.body.upcountryQoutes = [];
          next();
        }
      });
  },
  // Get Order
  async (req, res, next) => {
    const params = req.body;
    const requests = [];
    const filterupcountryOrders = [];

    await pplRequestRef.once("value", (snapshot) => {
      if (snapshot.val()) {
        snapshot.forEach((snap) => {
          requests.push(snap.val());
        });

        //  user Orders
        const userOrders = requests.filter((x) => {
          return x.user_phone === params.user.user_id;
        });

        // Upcountry Orders
        const upcountryOrders = userOrders.filter((x) => {
          return x.request_type === "upcountry";
        });

        upcountryOrders.forEach((x) => {
          const suborders = x.subOrders;
          let check = false;

          for (const subOrder of suborders) {
            if (
              subOrder.status == "pending" ||
              subOrder.status == "qoute_rejected" ||
              subOrder.status == "user_counter_rejected" ||
              subOrder.status == "vendor_counter_rejected"
            ) {
              check = true;
              break;
            }
          }

          if (check) {
            filterupcountryOrders.push(x);
          }
        });

        // Rates Found Logic
        filterupcountryOrders.forEach((order) => {
          const suborders = order.subOrders;

          suborders.forEach((suborder) => {
            const suborderno = suborder.subOrderNo;
            console.log("suborderno -> ", suborderno);
            const qoutelookup = params.upcountryQoutes.filter((qoute) => {
              return qoute.subOrderNo === suborderno;
            });

            if (qoutelookup) {
              if (qoutelookup.length > 0) {
                let qoute = qoutelookup[0];
                if (qoute.status == "countered") {
                  pplBiddingsRef
                    .child("upcountry")
                    .child("user_counter")
                    .once("value", (snapshot) => {
                      if (snapshot.val()) {
                        snapshot.forEach((snap) => {
                          if (snap.val().subOrderNo == suborderno) {
                            console.log(
                              "Counter found for subOrderNo#",
                              snap.val().subOrderNo
                            );
                            qoute = snap.val();
                          }
                        });
                      }
                    });
                }
                if (qoute.status == "countered") {
                  pplBiddingsRef
                    .child("upcountry")
                    .child("vendor_counter")
                    .once("value", (snapshot) => {
                      if (snapshot.val()) {
                        snapshot.forEach((snap) => {
                          if (snap.val().subOrderNo == suborderno) {
                            console.log(
                              "Vendor counter found for subOrderNo#",
                              snap.val().subOrderNo
                            );
                            qoute = snap.val();
                          }
                        });
                      }
                    });
                }
                suborder["rates_found"] = true;
                suborder["qoute"] = qoute;
              } else {
                suborder["rates_found"] = false;
                var createdAt = order.createdAt;
                createdAt = `${createdAt.substr(3, 2)}/${createdAt.substr(
                  0,
                  2
                )}/${createdAt.substr(6)}`;
                var now = getCurrentDate();
                now = `${now.substr(3, 2)}/${now.substr(0, 2)}/${now.substr(
                  6
                )}`;
                // diff = moment(new Date(now), 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]').diff(moment(new Date(createdAt), 'YYYY-MM-DD[T]HH:mm:ss. SSS[Z]'), 'minutes');
                // const diff = (((new Date(now) - new Date(createdAt)) / 1000) / 60);
                // var m = Number((Math.abs(diff) * 100).toPrecision(15));
                // m = (Math.round(m) / 100).toString();
                // var min = m.split('.')[0];
                const diff = parseInt(
                  Math.abs(
                    new Date(now).getTime() - new Date(createdAt).getTime()
                  )
                );
                var min = parseInt((diff / (1000 * 60)) % 60).toString();
                suborder["attempt"] =
                  min < 10 ? "First" : min < 20 ? "Second" : "Exhausted";
                if (min < 20) {
                  min = min < 10 ? min : min.substr(1);
                  // var sec = m.split('.')[1];
                  // sec = (sec.length == 2 && sec.substr(0, 1) >= 6) ? (parseInt(sec.substr(0, 1)) + 1).toString() : sec;
                  const sec = parseInt((diff / 1000) % 60);
                  suborder["counter"] = `${min}:${sec}`;
                }
              }
            }
            // console.log('qoutelookup -> ', qoutelookup);
          });
        });
      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });

    const sortedfilterupcountryOrders = filterupcountryOrders.sort(function (
      a,
      b
    ) {
      return b.createdAt_timestamp - a.createdAt_timestamp;
    });

    res.json({
      status: true,
      data: sortedfilterupcountryOrders,
    });
  }
);

// /get_upcountry_pending_orders
router.post(
  "/get_upcountry_pending_orders",
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        next();
        break;
      case "pro":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`,
        });
        break;
    }
  },
  // Get All Qoutes (Upcountry)
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
      .child("upcountry")
      .child("qoutes")
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const upcountryQoutes = [];
          snapshot.forEach((snap) => {
            upcountryQoutes.push(snap.val());
          });

          req.body.upcountryQoutes = upcountryQoutes;
          next();
        } else {
          req.body.upcountryQoutes = [];
          next();
        }
      });
  },
  // Get Order
  async (req, res, next) => {
    const params = req.body;
    const requests = [];
    const filterupcountryOrders = [];

    await pplRequestRef.once("value", (snapshot) => {
      if (snapshot.val()) {
        snapshot.forEach((snap) => {
          requests.push(snap.val());
        });

        //  user Orders
        const userOrders = requests.filter((x) => {
          return x.user_phone === params.user.user_id;
        });

        // Upcountry Orders
        const upcountryOrders = userOrders.filter((x) => {
          return x.request_type === "upcountry" && x.status == "pending";
        });

        upcountryOrders.forEach((x) => {
          const suborders = x.subOrders;
          let check = suborders.length;

          suborders.forEach((suborder) => {
            if (
              suborder.status == "qoute_accepted" ||
              suborder.status == "user_counter_accepted" ||
              suborder.status == "vendor_counter_accepted"
            ) {
              check--;
            }
          });

          if (check === 0) {
            filterupcountryOrders.push(x);
          }
        });

        // Rates Found Logic
        filterupcountryOrders.forEach((order) => {
          const suborders = order.subOrders;

          suborders.forEach((suborder) => {
            const suborderno = suborder.subOrderNo;
            console.log("suborderno -> ", suborderno);
            const qoutelookup = params.upcountryQoutes.filter((qoute) => {
              return qoute.subOrderNo === suborderno;
            });

            if (qoutelookup) {
              if (qoutelookup.length > 0) {
                let qoute = qoutelookup[0];
                if (qoute.status == "countered") {
                  pplBiddingsRef
                    .child("upcountry")
                    .child("user_counter")
                    .once("value", (snapshot) => {
                      if (snapshot.val()) {
                        snapshot.forEach((snap) => {
                          if (snap.val().subOrderNo == suborderno) {
                            console.log(
                              "Counter found for subOrderNo#",
                              snap.val().subOrderNo
                            );
                            qoute = snap.val();
                          }
                        });
                      }
                    });
                }
                if (qoute.status == "countered") {
                  pplBiddingsRef
                    .child("upcountry")
                    .child("vendor_counter")
                    .once("value", (snapshot) => {
                      if (snapshot.val()) {
                        snapshot.forEach((snap) => {
                          if (snap.val().subOrderNo == suborderno) {
                            console.log(
                              "Vendor counter found for subOrderNo#",
                              snap.val().subOrderNo
                            );
                            qoute = snap.val();
                          }
                        });
                      }
                    });
                }
                suborder["qoute"] = qoute;
                suborder["rates_found"] = true;
              } else {
                suborder["rates_found"] = false;
              }
            }
            // console.log('qoutelookup -> ', qoutelookup);
          });
        });
      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });

    const sortedfilterupcountryOrders = filterupcountryOrders.sort(function (
      a,
      b
    ) {
      return b.createdAt_timestamp - a.createdAt_timestamp;
    });

    res.json({
      status: true,
      data: sortedfilterupcountryOrders,
    });
  }
);

// get_user_counter_offers
router.post(
  "/user_get_counter_offers",
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        next();
        break;

      case "pro":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`,
        });
        break;
    }
  },
  async (req, res) => {
    const params = req.body;

    // Get All User Counter Offers For Vendor
    const transitUserCounterSnap = await pplBiddingsRef
      .child("transit")
      .child("user_counter")
      .orderByChild("user_phone")
      .equalTo(params.user.user_id)
      .once("value");
    const upcountryUserCounterSnap = await pplBiddingsRef
      .child("upcountry")
      .child("user_counter")
      .orderByChild("user_phone")
      .equalTo(params.user.user_id)
      .once("value");

    // User Counter Offer
    const rawtransitUserCounterOffers = await transitUserCounterSnap.val();
    const rawupcountryUserCounterOffers = await upcountryUserCounterSnap.val();

    //const transitUserCounterOffers = [];
    const transitUpcountryUserCounterOffers = [];

    if (rawtransitUserCounterOffers !== null) {
      const convert3 = Object.entries(rawtransitUserCounterOffers);
      convert3.forEach((x) => {
        transitUpcountryUserCounterOffers.push(x[1]);
      });
    }

    if (rawupcountryUserCounterOffers !== null) {
      const convert4 = Object.entries(rawupcountryUserCounterOffers);
      convert4.forEach((x) => {
        transitUpcountryUserCounterOffers.push(x[1]);
      });
    }

    // Transit
    // Filter For Pending Qoutes
    const pendingOffers1 = transitUpcountryUserCounterOffers.filter((qoute) => {
      return qoute.status === "pending";
    });

    // Filter For Accepted Qoutes
    const acceptedOffers1 = [];
    // Filter For Rejected Qoutes
    const rejectedOffers1 = [];

    pplRequestRef
      .orderByChild("user_phone")
      .equalTo(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          snapshot.forEach((snap) => {
            order = snap.val();
            if (order.request_type) {
              if (order.status == "user_counter_accepted") {
                acceptedOffers1.push(order.user_counter);
              } else if (order.status == "user_counter_rejected") {
                rejectedOffers1.push(order.user_counter);
              }
            }
            // else if (order.request_type == 'upcountry') {
            //   order.subOrders.forEach((subOrder) => {
            //     if (subOrder.status == 'user_counter_accepted') {
            //       acceptedOffers1.push(subOrder.user_counter)
            //     } else if (subOrder.status == 'user_counter_rejected') {
            //       rejectedOffers1.push(subOrder.user_counter)
            //     }
            //   })
            // }
          });
        }
      });

    // Filter For Accepted Qoutes
    // const acceptedOffers1 = [];
    // await pplRequestRef.orderByChild('status').equalTo('user_counter_accepted').once('value', (snapshot) => {
    //   if (snapshot.val()) {
    //     snapshot.forEach((snap) => {
    //       acceptedOffers1.push(snap.val().user_counter)
    //     })
    //   }
    // })
    // const acceptedOffers1 = transitUserCounterOffers.filter((qoute) => {
    //   return qoute.status === 'accepted'
    // })

    // Filter For Rejected Qoutes
    // const rejectedOffers1 = [];
    // await pplRequestRef.orderByChild('status').equalTo('user_counter_rejected').once('value', (snapshot) => {
    //   if (snapshot.val()) {
    //     snapshot.forEach((snap) => {
    //       rejectedOffers1.push(snap.val().user_counter)
    //     })
    //   }
    // })
    // const rejectedOffers1 = transitUserCounterOffers.filter((qoute) => {
    //   return qoute.status === 'rejected'
    // })

    // UPCOUNTRY
    // Filter For Pending Qoutes
    // const pendingOffers2 = upcountryUserCounterOffers.filter((qoute) => {
    //   return qoute.status === 'pending'
    // })

    // Filter For Accepted Qoutes
    // const acceptedOffers2 = upcountryUserCounterOffers.filter((qoute) => {
    //   return qoute.status === 'accepted'
    // })

    // Filter For Rejected Qoutes
    // const rejectedOffers2 = upcountryUserCounterOffers.filter((qoute) => {
    //   return qoute.status === 'rejected'
    // })

    const sortedpendingOffers1 = pendingOffers1.sort(function (a, b) {
      return b.counteredAt_timestamp - a.counteredAt_timestamp;
    });

    const sortedacceptedOffers1 = acceptedOffers1.sort(function (a, b) {
      return b.counteredAt_timestamp - a.counteredAt_timestamp;
    });

    const sortedrejectedOffers1 = rejectedOffers1.sort(function (a, b) {
      return b.counteredAt_timestamp - a.counteredAt_timestamp;
    });

    res.json({
      status: true,
      // data: [...pendingOffers1],
      data: [...sortedpendingOffers1],
      accepted: [...sortedacceptedOffers1],
      rejected: [...sortedrejectedOffers1],
    });
  }
);

// /get_vendor_partner_counter_offers
router.post(
  "/user_get_partner_counter_offers",
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        next();
        break;
      case "pro":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`,
        });
        break;
    }
  },
  async (req, res) => {
    const params = req.body;

    // Get All Vendor Counter Offers For Vendor
    const transitVendorCounterSnap = await pplBiddingsRef
      .child("transit")
      .child("vendor_counter")
      .orderByChild("user_phone")
      .equalTo(params.user.user_id)
      .once("value");

    const upcountryVendorCounterSnap = await pplBiddingsRef
      .child("upcountry")
      .child("vendor_counter")
      .orderByChild("user_phone")
      .equalTo(params.user.user_id)
      .once("value");

    // Vendor Counter Offer
    const rawtransitVendorCounterOffers = await transitVendorCounterSnap.val();
    const rawupcountryVendorCounterOffers =
      await upcountryVendorCounterSnap.val();

    const transitUpcountryVendorCounterOffers = [];
    //const transitVendorCounterOffers = [];
    //const upcountryVendorCounterOffers = [];

    if (rawtransitVendorCounterOffers !== null) {
      const convert5 = Object.entries(rawtransitVendorCounterOffers);
      convert5.forEach((x) => {
        transitUpcountryVendorCounterOffers.push(x[1]);
      });
    }
    if (rawupcountryVendorCounterOffers !== null) {
      const convert6 = Object.entries(rawupcountryVendorCounterOffers);
      convert6.forEach((x) => {
        transitUpcountryVendorCounterOffers.push(x[1]);
      });
    }

    // Transit
    // Filter For Pending Qoutes
    // const pendingOffers1 = rawtransitVendorCounterOffers.filter((qoute) => {
    //   return qoute.status === "pending";
    // });
    const pendingOffers2 = transitUpcountryVendorCounterOffers.filter(
      (qoute) => {
        return qoute.status === "pending";
      }
    );

    // Filter For Accepted Qoutes
    const acceptedOffers1 = [];
    // Filter For Rejected Qoutes
    const rejectedOffers1 = [];

    pplRequestRef
      .orderByChild("user_phone")
      .equalTo(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          snapshot.forEach((snap) => {
            order = snap.val();
            if (order.request_type) {
              if (order.status == "vendor_counter_accepted") {
                acceptedOffers1.push(order.vendor_counter);
              } else if (order.status == "vendor_counter_rejected") {
                rejectedOffers1.push(order.vendor_counter);
              }
            }
            // else if (order.request_type == 'upcountry') {
            //   order.subOrders.forEach((subOrder) => {
            //     if (subOrder.status == 'vendor_counter_accepted') {
            //       acceptedOffers1.push(subOrder.vendor_counter)
            //     } else if (subOrder.status == 'vendor_counter_rejected') {
            //       rejectedOffers1.push(subOrder.vendor_counter)
            //     }
            //   })
            // }
          });
        }
      });

    // Filter For Accepted Qoutes
    // const acceptedOffers1 = [];
    // await pplRequestRef.orderByChild('status').equalTo('vendor_counter_accepted').once('value', (snapshot) => {
    //   if (snapshot.val()) {
    //     snapshot.forEach((snap) => {
    //       acceptedOffers1.push(snap.val().vendor_counter)
    //     })
    //   }
    // })
    // const acceptedOffers1 = transitVendorCounterOffers.filter((qoute) => {
    //   return qoute.status === 'accepted'
    // })

    // Filter For Rejected Qoutes
    // const rejectedOffers1 = [];
    // await pplRequestRef.orderByChild('status').equalTo('vendor_counter_rejected').once('value', (snapshot) => {
    //   if (snapshot.val()) {
    //     snapshot.forEach((snap) => {
    //       rejectedOffers1.push(snap.val().vendor_counter)
    //     })
    //   }
    // })
    // const rejectedOffers1 = transitVendorCounterOffers.filter((qoute) => {
    //   return qoute.status === 'rejected'
    // })

    // UPCOUNTRY
    // Filter For Pending Qoutes
    // const pendingOffers2 = upcountryVendorCounterOffers.filter((qoute) => {
    //   return qoute.status === 'pending'
    // })

    // Filter For Accepted Qoutes
    // const acceptedOffers2 = upcountryVendorCounterOffers.filter((qoute) => {
    //   return qoute.status === 'accepted'
    // })

    // Filter For Rejected Qoutes
    // const rejectedOffers2 = upcountryVendorCounterOffers.filter((qoute) => {
    //   return qoute.status === 'rejected'
    // })

    const sortedpendingOffers1 = [...pendingOffers2].sort(function (a, b) {
      return b.vendor_countered_on_timestamp - a.vendor_countered_on_timestamp;
    });

    const sortedacceptedOffers1 = acceptedOffers1.sort(function (a, b) {
      return b.vendor_countered_on_timestamp - a.vendor_countered_on_timestamp;
    });

    const sortedrejectedOffers1 = rejectedOffers1.sort(function (a, b) {
      return b.vendor_countered_on_timestamp - a.vendor_countered_on_timestamp;
    });

    res.json({
      status: true,
      pending: [...sortedpendingOffers1],
      accepted: [...sortedacceptedOffers1],
      rejected: [...sortedrejectedOffers1],
    });
  }
);

// ============= GET USER DATA (ENDS) =============


// ============= GET VENDOR/DRIVER DATA (STARTS) =============


// /get_vendor_orders -> (For driver App)
router.post(
  "/get_vendor_orders",
  verifyTokenFirebase,
  // Get PPL Orders
  async (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "driver":
        pplRequestRef.once("value", (snapshot) => {
          if (snapshot.val()) {
            const requests = snapshot.val();
            const convert = Object.entries(requests);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
              console.log("orders statuses -> ", x[1].status);
            });

            //  Filter By Driver
            const getByDriver = final.filter((order) => {
              if (order.bilty) {
                //  For PPL
                const allbilties = order.bilty;
                const searchForDriver = allbilties.filter((bilty) => {
                  return bilty.driver === params.user.user_id;
                });

                return searchForDriver;

                console.log("searchForDriver -> ", searchForDriver);
              }
            });

            console.log("getByDriver -> ", getByDriver);

            req.body.ppl = getByDriver;
            next();
          } else {
            req.body.ppl = [];
            next();
          }
        });
        break;

      case "vendor":
        next();
        break;

      default:
        res.json({
          status: false,
          error: "Unknown User Type",
        });
        break;
    }
  },
  // Get Qoutes,User Counter Offers,Vendor Counter Offers
  async (req, res, next) => {
    const params = req.body;

    if (params.user.user_type === "vendor") {
      // Get All Qoutes For Vendor
      const transitQoutesSnap = await pplBiddingsRef
        .child("transit")
        .child("qoutes")
        .orderByChild("phone")
        .equalTo(params.user.user_id)
        .once("value");
      const upcountryQoutesSnap = await pplBiddingsRef
        .child("upcountry")
        .child("qoutes")
        .orderByChild("phone")
        .equalTo(params.user.user_id)
        .once("value");
      // Get All User Counter Offers For Vendor
      const transitUserCounterSnap = await pplBiddingsRef
        .child("transit")
        .child("user_counter")
        .orderByChild("vendor_phone")
        .equalTo(params.user.user_id)
        .once("value");
      const upcountryUserCounterSnap = await pplBiddingsRef
        .child("upcountry")
        .child("user_counter")
        .orderByChild("vendor_phone")
        .equalTo(params.user.user_id)
        .once("value");
      // Get All Vendor Counter Offers For Vendor
      const transitVendorCounterSnap = await pplBiddingsRef
        .child("transit")
        .child("vendor_counter")
        .orderByChild("vendor_phone")
        .equalTo(params.user.user_id)
        .once("value");
      const upcountryVendorCounterSnap = await pplBiddingsRef
        .child("upcountry")
        .child("vendor_counter")
        .orderByChild("vendor_phone")
        .equalTo(params.user.user_id)
        .once("value");

      // Qoutes
      const rawtransitQoutes = await transitQoutesSnap.val();
      const rawupcountryQoutes = await upcountryQoutesSnap.val();
      // User Counter Offer
      const rawtransitUserCounterOffers = await transitUserCounterSnap.val();
      const rawupcountryUserCounterOffers =
        await upcountryUserCounterSnap.val();
      // Vendor Counter Offer
      const rawtransitVendorCounterOffers =
        await transitVendorCounterSnap.val();
      const rawupcountryVendorCounterOffers =
        await upcountryVendorCounterSnap.val();

      const transitQoutes = [];
      const upcountryQoutes = [];
      const transitUserCounterOffers = [];
      const upcountryUserCounterOffers = [];
      const transitVendorCounterOffers = [];
      const upcountryVendorCounterOffers = [];

      if (rawtransitQoutes !== null) {
        const convert1 = Object.entries(rawtransitQoutes);
        convert1.forEach((x) => {
          transitQoutes.push(x[1]);
        });
      }

      if (rawupcountryQoutes !== null) {
        const convert2 = Object.entries(rawupcountryQoutes);
        convert2.forEach((x) => {
          upcountryQoutes.push(x[1]);
        });
      }

      if (rawtransitUserCounterOffers !== null) {
        const convert3 = Object.entries(rawtransitUserCounterOffers);
        convert3.forEach((x) => {
          transitUserCounterOffers.push(x[1]);
        });
      }

      if (rawupcountryUserCounterOffers !== null) {
        const convert4 = Object.entries(rawupcountryUserCounterOffers);
        convert4.forEach((x) => {
          upcountryUserCounterOffers.push(x[1]);
        });
      }
      if (rawtransitVendorCounterOffers !== null) {
        const convert5 = Object.entries(rawtransitVendorCounterOffers);
        convert5.forEach((x) => {
          transitVendorCounterOffers.push(x[1]);
        });
      }
      if (rawupcountryVendorCounterOffers !== null) {
        const convert6 = Object.entries(rawupcountryVendorCounterOffers);
        convert6.forEach((x) => {
          upcountryVendorCounterOffers.push(x[1]);
        });
      }

      const data = [
        ...transitQoutes,
        ...upcountryQoutes,
        ...transitUserCounterOffers,
        ...upcountryUserCounterOffers,
        ...transitVendorCounterOffers,
        ...upcountryVendorCounterOffers,
      ];

      console.log("data -> ", data);

      const allOrders = data.map((x) => {
        return x.orderNo;
      });

      // TODO: Get Orders From all order numbers
      req.body.allQoutesAndCounters = data;
      next();
    } else {
      next();
    }
  },
  // Get SCM Orders
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "driver":
        scmRequestRef.once("value", (snapshot) => {
          if (snapshot.val()) {
            const requests = snapshot.val();
            const convert = Object.entries(requests);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
            });

            //  Get By Driver
            const getByDriver = final.filter((order) => {
              return order.driverData === params.user.user_id;
            });

            req.body.scm = final;
            console.log("scm -> ", final);
            next();
          } else {
            req.body.scm = [];
            next();
          }
        });
        break;

      case "vendor":
        next();
        break;

      default:
        next();
        break;
    }
  },
  // Throw data
  (req, res, next) => {
    const params = req.body;

    // const sortedPPL = _.orderBy(params.ppl, (a) => moment(a.createdAt), 'asc')

    switch (params.user.user_type) {
      case "driver":
        let allOrders = [...params.ppl, ...params.scm];

        res.json({
          status: true,
          orders: allOrders,
        });
        break;
      case "vendor":
        next();
        break;

      default:
        res.json({
          status: false,
          error: "Unknown User Type",
        });
        break;
    }
  },
  // Get Active Orders (transit) For Vendor
  (req, res, next) => {
    const params = req.body;

    // Transit
    pplRequestRef
      .orderByChild("request_type")
      .equalTo("transit")
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const requests = [];
          snapshot.forEach((snap) => {
            requests.push(snap.val());
          });

          //  console.log('active requests -> ',requests)

          // Filter Rate Confirmed Requests
          const forthisvendor = requests.filter((req) => {
            return req.vendor_phone === params.user.user_id;
          });
          const rateConfirmed = forthisvendor.filter((req) => {
            return req.status !== "pending";
          });

          // req.status !== 'cancelled' && req.status !== 'rejected'

          req.body.transitActiveOrders = rateConfirmed;
          next();
        } else {
          res.json({
            status: false,
            error: "No Transit Requests Found !",
          });
        }
      });
  },
  // Get Active Orders (upcountry) For Vendor
  (req, res, next) => {
    const params = req.body;

    // Upcountry
    pplRequestRef
      .orderByChild("request_type")
      .equalTo("upcountry")
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const requests = [];
          snapshot.forEach((snap) => {
            const req = snap.val();
            let checkVendorInSuborders = false;

            req.subOrders.forEach((suborder) => {
              if (suborder.vendor_phone === params.user.user_id) {
                checkVendorInSuborders = true;
              }
            });

            if (checkVendorInSuborders) {
              requests.push(snap.val());
            }
          });

          //  console.log('upcountry requests -> ',requests)

          // Filter Rate Confirmed Requests
          //  const rateConfirmed = requests.filter((req) => {
          //      return req.status !== 'pending' && req.status !== 'cancelled' && req.status !== 'rejected'
          //  })

          //  req.body.transitActiveOrders = rateConfirmed;
          //  next()

          const sortedrequests = requests.sort(function (a, b) {
            return b.createdAt_timestamp - a.createdAt_timestamp;
          });

          const sortedtransitActiveOrders = params.transitActiveOrders.sort(
            function (a, b) {
              return b.createdAt_timestamp - a.createdAt_timestamp;
            }
          );

          const sortedallQoutesAndCounters = params.allQoutesAndCounters.sort(
            function (a, b) {
              return b.createdAt_timestamp - a.createdAt_timestamp;
            }
          );

          res.json({
            status: true,
            data: [
              ...sortedrequests,
              ...sortedtransitActiveOrders,
              ...sortedallQoutesAndCounters,
            ],
          });

          //  console.log('rateConfirmed -> ',rateConfirmed);
        } else {
          res.json({
            status: false,
            error: "No Requests Found !",
          });
        }
      });
  }
);

// /get_vendor_active_orders
router.post(
  "/get_vendor_active_orders",
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`,
        });
        break;
    }
  },
  // Get Vendor Profile
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("vendors")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();

          if (vendor.orders) {
            if (vendor.orders.length > 0) {
              const orders = vendor.orders;
              req.body.orders = orders;
              console.log("orders -> ", orders);
              next();
            } else {
              res.json({
                status: false,
                error: "Vendor Does Not Have Active Orders",
              });
            }
          } else {
            res.json({
              status: false,
              error: "Vendor Does Not Have Active Orders",
            });
          }
        } else {
          res.json({
            status: false,
            error: "Vendor Not Found !",
          });
        }
      });
  },
  // Get Active Order
  (req, res, next) => {
    const params = req.body;

    const orders = params.orders;

    pplRequestRef.once("value", (snapshot) => {
      if (snapshot.val()) {
        const requests = [];

        snapshot.forEach((snap) => {
          requests.push(snap.val());
        });

        // Transit Active Orders
        const activeOrders = [];
        requests.filter((x) => {
          orders.forEach((order) => {
            // console.log('order -> ', order);
            if (x.status !== "completed") {
              if (x.orderNo === order) {
                activeOrders.push(x);
              }
            }
          });
        });

        const sortedactiveOrders = activeOrders.sort(function (a, b) {
          return b.createdAt_timestamp - a.createdAt_timestamp;
        });

        res.json({
          status: true,
          data: [...sortedactiveOrders],
        });
      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });
  }
);

// /get_vendor_completed_orders
router.post(
  "/get_vendor_completed_orders",
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`,
        });
        break;
    }
  },
  // Get Completed Order
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.once("value", (snapshot) => {
      if (snapshot.val()) {
        const requests = [];
        console.log(snapshot.val());

        snapshot.forEach((snap) => {
          if (snap.val().vendor_phone === params.user.user_id) {
            requests.push(snap.val());
          }
        });

        //  Active Orders
        const transitRequests = requests.filter((x) => {
          return x.request_type === "transit";
        });

        const upcountryRequests = requests.filter((x) => {
          return x.request_type === "upcountry";
        });

        // Filter For Transit Active Orders
        const transitCompletedOrders = transitRequests.filter((x) => {
          if (x.status === "completed") {
            return x;
          }
        });

        // Filter For Upcountry Active Orders
        const upcountryCompleteOrders = upcountryRequests.filter((x) => {
          if (x.status === "completed") {
            return x;
          }
        });

        const sortedtransitCompletedOrders = transitCompletedOrders.sort(
          function (a, b) {
            return b.createdAt_timestamp - a.createdAt_timestamp;
          }
        );

        const sortedupcountryCompleteOrders = upcountryCompleteOrders.sort(
          function (a, b) {
            return b.createdAt_timestamp - a.createdAt_timestamp;
          }
        );

        res.json({
          status: true,
          data: [
            ...sortedtransitCompletedOrders,
            ...sortedupcountryCompleteOrders,
          ],
        });
      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });
  }
);

// /get_vendor_rejected_orders
router.post(
  "/get_vendor_rejected_orders_2",
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`,
        });
        break;
    }
  },
  // Get Completed Order
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.once("value", (snapshot) => {
      if (snapshot.val()) {
        const requests = [];
        console.log(snapshot.val());

        snapshot.forEach((snap) => {
          requests.push(snap.val());
        });

        //  Active Orders
        const transitRequests = requests.filter((x) => {
          return x.request_type === "transit";
        });

        const upcountryRequests = requests.filter((x) => {
          return x.request_type === "upcountry";
        });

        // Filter For Transit Active Orders
        const transitCompletedOrders = transitRequests.filter((x) => {
          if (
            x.status === "qoute_rejected" ||
            x.status === "user_counter_rejected" ||
            x.status === "vendor_counter_rejected"
          ) {
            return x;
          }
        });

        // Filter For Upcountry Active Orders
        const upcountryCompleteOrders = upcountryRequests.filter((x) => {
          if (
            x.status === "qoute_rejected" ||
            x.status === "user_counter_rejected" ||
            x.status === "vendor_counter_rejected"
          ) {
            return x;
          }
        });

        const sortedtransitCompletedOrders = transitCompletedOrders.sort(
          function (a, b) {
            return b.createdAt_timestamp - a.createdAt_timestamp;
          }
        );

        const sortedupcountryCompleteOrders = upcountryCompleteOrders.sort(
          function (a, b) {
            return b.createdAt_timestamp - a.createdAt_timestamp;
          }
        );

        res.json({
          status: true,
          data: [
            ...sortedtransitCompletedOrders,
            ...sortedupcountryCompleteOrders,
          ],
        });
      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });
  }
);

// /get_vendor_qoutes
router.post(
  "/get_vendor_qoutes",
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`,
        });
        break;
    }
  },
  // Get Qoutes,User Counter Offers,Vendor Counter Offers
  async (req, res, next) => {
    const params = req.body;

    // Get All Qoutes For Vendor
    const transitQoutesSnap = await pplBiddingsRef
      .child("transit")
      .child("qoutes")
      .orderByChild("phone")
      .equalTo(params.user.user_id)
      .once("value");

    const upcountryQoutesSnap = await pplBiddingsRef
      .child("upcountry")
      .child("qoutes")
      .orderByChild("phone")
      .equalTo(params.user.user_id)
      .once("value");

    // Qoutes
    const rawtransitQoutes = await transitQoutesSnap.val();
    const rawupcountryQoutes = await upcountryQoutesSnap.val();

    const transitQoutes = [];
    const upcountryQoutes = [];

    if (rawtransitQoutes !== null) {
      const convert1 = Object.entries(rawtransitQoutes);
      convert1.forEach((x) => {
        transitQoutes.push(x[1]);
      });
    }

    if (rawupcountryQoutes !== null) {
      const convert2 = Object.entries(rawupcountryQoutes);
      convert2.forEach((x) => {
        upcountryQoutes.push(x[1]);
      });
    }

    // Filter For Pending Qoutes
    const pendingQoutes1 = transitQoutes.filter((qoute) => {
      return qoute.status === "pending";
    });

    // Filter For Accepted Qoutes
    const acceptedQoutes1 = transitQoutes.filter((qoute) => {
      return qoute.status === "accepted";
    });

    // Filter For Rejected Qoutes
    const rejectedQoutes1 = transitQoutes.filter((qoute) => {
      return qoute.status == "rejected";
    });

    // UPCOUNTRY
    // Filter For Pending Qoutes
    const pendingQoutes2 = upcountryQoutes.filter((qoute) => {
      return qoute.status == "pending";
    });

    // Filter For Accepted Qoutes
    const acceptedQoutes2 = upcountryQoutes.filter((qoute) => {
      return qoute.status == "accepted";
    });

    // Filter For Rejected Qoutes
    const rejectedQoutes2 = upcountryQoutes.filter((qoute) => {
      return qoute.status == "rejected";
    });

    const sortedpendingOffers1 = pendingQoutes1.sort(function (a, b) {
      return b.createdAt_timestamp - a.createdAt_timestamp;
    });

    const sortedpendingQoutes2 = pendingQoutes2.sort(function (a, b) {
      return b.createdAt_timestamp - a.createdAt_timestamp;
    });

    const sortedacceptedQoutes1 = acceptedQoutes1.sort(function (a, b) {
      return b.createdAt_timestamp - a.createdAt_timestamp;
    });

    const sortedacceptedQoutes2 = acceptedQoutes2.sort(function (a, b) {
      return b.createdAt_timestamp - a.createdAt_timestamp;
    });

    const sortedrejectedQoutes1 = rejectedQoutes1.sort(function (a, b) {
      return b.createdAt_timestamp - a.createdAt_timestamp;
    });

    const sortedrejectedQoutes2 = rejectedQoutes2.sort(function (a, b) {
      return b.createdAt_timestamp - a.createdAt_timestamp;
    });

    res.json({
      status: true,
      pending: [...sortedpendingOffers1, ...sortedpendingQoutes2],
      accepted: [...sortedacceptedQoutes1, ...sortedacceptedQoutes2],
      rejected: [...sortedrejectedQoutes1, ...sortedrejectedQoutes2],
    });
  }
);

// get_user_counter_offers
router.post(
  "/get_user_counter_offers",
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`,
        });
        break;
    }
  },
  async (req, res) => {
    const params = req.body;

    // Get All User Counter Offers For Vendor
    const transitUserCounterSnap = await pplBiddingsRef
      .child("transit")
      .child("user_counter")
      .orderByChild("vendor_phone")
      .equalTo(params.user.user_id)
      .once("value");
    const upcountryUserCounterSnap = await pplBiddingsRef
      .child("upcountry")
      .child("user_counter")
      .orderByChild("vendor_phone")
      .equalTo(params.user.user_id)
      .once("value");

    // User Counter Offer
    const rawtransitUserCounterOffers = await transitUserCounterSnap.val();
    const rawupcountryUserCounterOffers = await upcountryUserCounterSnap.val();

    const transitUserCounterOffers = [];
    const upcountryUserCounterOffers = [];

    if (rawtransitUserCounterOffers !== null) {
      const convert3 = Object.entries(rawtransitUserCounterOffers);
      convert3.forEach((x) => {
        transitUserCounterOffers.push(x[1]);
      });
    }

    if (rawupcountryUserCounterOffers !== null) {
      const convert4 = Object.entries(rawupcountryUserCounterOffers);
      convert4.forEach((x) => {
        upcountryUserCounterOffers.push(x[1]);
      });
    }

    // Transit
    // Filter For Pending Qoutes
    const pendingOffers1 = transitUserCounterOffers.filter((qoute) => {
      return qoute.status === "pending";
    });

    const acceptedOffers1 = transitUserCounterOffers.filter((qoute) => {
      return qoute.status === "accepted";
    });

    // Filter For Accepted Qoutes
    // const acceptedOffers1 = transitUserCounterOffers.filter((qoute) => {
    //   return qoute.status === 'accepted'
    // })

    // Filter For Rejected Qoutes
    // const rejectedOffers1 = transitUserCounterOffers.filter((qoute) => {
    //   return qoute.status === 'rejected'
    // })

    // UPCOUNTRY
    // Filter For Pending Qoutes
    const pendingOffers2 = upcountryUserCounterOffers.filter((qoute) => {
      return qoute.status === "pending";
    });

    // Filter For Accepted Qoutes
    const acceptedOffers2 = upcountryUserCounterOffers.filter((qoute) => {
      return qoute.status === "accepted";
    });

    // Filter For Rejected Qoutes
    // const rejectedOffers2 = upcountryUserCounterOffers.filter((qoute) => {
    //   return qoute.status === 'rejected'
    // })

    const sortedpendingOffers1 = pendingOffers1.sort(function (a, b) {
      return b.counteredAt_timestamp - a.counteredAt_timestamp;
    });

    const sortedpendingOffers2 = pendingOffers2.sort(function (a, b) {
      return b.counteredAt_timestamp - a.counteredAt_timestamp;
    });

    const sortedAcceptedOffers1 = acceptedOffers1.sort(function (a, b) {
      return b.counteredAt_timestamp - a.counteredAt_timestamp;
    });

    const sortedAcceptedOffers2 = acceptedOffers2.sort(function (a, b) {
      return b.counteredAt_timestamp - a.counteredAt_timestamp;
    });

    res.json({
      status: true,
      data: [...sortedpendingOffers1, ...sortedpendingOffers2],
      accepted: [...sortedAcceptedOffers1, ...sortedAcceptedOffers2],
      rejected: [],
    });
  }
);

// /get_vendor_partner_counter_offers
router.post(
  "/get_vendor_partner_counter_offers",
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`,
        });
        break;
    }
  },
  async (req, res) => {
    const params = req.body;

    // Get All Vendor Counter Offers For Vendor
    const transitVendorCounterSnap = await pplBiddingsRef
      .child("transit")
      .child("vendor_counter")
      .orderByChild("vendor_phone")
      .equalTo(params.user.user_id)
      .once("value");

    const upcountryVendorCounterSnap = await pplBiddingsRef
      .child("upcountry")
      .child("vendor_counter")
      .orderByChild("vendor_phone")
      .equalTo(params.user.user_id)
      .once("value");

    // Vendor Counter Offer
    const rawtransitVendorCounterOffers = await transitVendorCounterSnap.val();
    const rawupcountryVendorCounterOffers =
      await upcountryVendorCounterSnap.val();

    const transitVendorCounterOffers = [];
    const upcountryVendorCounterOffers = [];

    if (rawtransitVendorCounterOffers !== null) {
      const convert5 = Object.entries(rawtransitVendorCounterOffers);
      convert5.forEach((x) => {
        transitVendorCounterOffers.push(x[1]);
      });
    }
    if (rawupcountryVendorCounterOffers !== null) {
      const convert6 = Object.entries(rawupcountryVendorCounterOffers);
      convert6.forEach((x) => {
        upcountryVendorCounterOffers.push(x[1]);
      });
    }

    // Transit
    // Filter For Pending Qoutes
    const pendingOffers1 = transitVendorCounterOffers.filter((qoute) => {
      return qoute.status === "pending";
    });

    // Filter For Accepted Qoutes
    const acceptedOffers1 = transitVendorCounterOffers.filter((qoute) => {
      return qoute.status === "accepted";
    });

    // Filter For Rejected Qoutes
    const rejectedOffers1 = transitVendorCounterOffers.filter((qoute) => {
      return qoute.status === "rejected";
    });

    // UPCOUNTRY
    // Filter For Pending Qoutes
    const pendingOffers2 = upcountryVendorCounterOffers.filter((qoute) => {
      return qoute.status === "pending";
    });

    // Filter For Accepted Qoutes
    const acceptedOffers2 = upcountryVendorCounterOffers.filter((qoute) => {
      return qoute.status === "accepted";
    });

    // Filter For Rejected Qoutes
    const rejectedOffers2 = upcountryVendorCounterOffers.filter((qoute) => {
      return qoute.status === "rejected";
    });

    const sortedPendingOffers = pendingOffers1.sort(function (a, b) {
      return b.vendor_countered_on_timestamp - a.vendor_countered_on_timestamp;
    });

    const sortedPendingOffersUpcountry = upcountryVendorCounterOffers.sort(
      function (a, b) {
        return (
          b.vendor_countered_on_timestamp - a.vendor_countered_on_timestamp
        );
      }
    );

    res.json({
      status: true,
      pending: [...sortedPendingOffers, ...sortedPendingOffersUpcountry],
      // accepted: [...acceptedOffers1, ...acceptedOffers2],
      rejected: [...rejectedOffers1, ...rejectedOffers2],
    });
  }
);

// /get_"new_jobs -> (For driver/vendor App)
router.post(
  "/get_new_jobs",
  verifyTokenFirebase,
  // (req,res,next) => {
  //   req.body.user = {
  //     user_id:"+923332295570",
  //     user_type:"vendor"
  //   };
  //   next();
  // },
  // Get PPL Orders
  async (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "driver":
        pplRequestRef.once("value", (snapshot) => {
          if (snapshot.val()) {
            const requests = snapshot.val();
            const convert = Object.entries(requests);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
              console.log("orders statuses -> ", x[1].status);
            });

            //  Filter By Driver
            const getByDriver = final.filter((order) => {
              if (order.bilty) {
                //  For PPL
                const allbilties = order.bilty;
                const searchForDriver = allbilties.filter((bilty) => {
                  return bilty.driver === params.user.user_id;
                });

                return searchForDriver;

                console.log("searchForDriver -> ", searchForDriver);
              }
            });

            console.log("getByDriver -> ", getByDriver);

            req.body.ppl = getByDriver;
            next();
          } else {
            req.body.ppl = [];
            next();
          }
        });
        break;

      case "vendor":
        next();
        break;

      default:
        res.json({
          status: false,
          error: "Unknown User Type",
        });
        break;
    }
  },
  // Get Transit Qoutes
  (req, res, next) => {
    const params = req.body;

    // Get All Qoutes For Vendor
    pplBiddingsRef
      .child("transit")
      .child("qoutes")
      .orderByChild("phone")
      .equalTo(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const transitQoutes = [];

          snapshot.forEach((snap) => {
            transitQoutes.push(snap.val().orderNo);
          });

          console.log("transitQoutes -> ", transitQoutes);
          req.body.transitQoutes = transitQoutes;
          next();
        } else {
          req.body.transitQoutes = [];
          next();
        }
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  },
  // Get Upcountry Qoutes
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
      .child("upcountry")
      .child("qoutes")
      .orderByChild("phone")
      .equalTo(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const upcountryQoutes = [];
          snapshot.forEach((snap) => {
            upcountryQoutes.push(snap.val().orderNo);
          });
          // console.log('Upcountry Qoutes -> ',upcountryQoutes)
          req.body.upcountryQoutes = upcountryQoutes;
          next();
        } else {
          req.body.upcountryQoutes = [];
          next();
        }
      })
      .catch((err) => console.log(err));
  },
  // Get Qoute Time
  (req,res,next) => {
    const params = req.body;

    pplSettingsRef.child('vendor_qoute_time').child(0).once('value', (snapshot) => {
      console.log('snapshot.val() -> ',snapshot.val());
      if(snapshot.val()) {
        const time = snapshot.val();
        req.body.time = time;
        next();
      } else {
        res.json({
          status:false,
          error: 'Vendor Qoute Time Not Found !'
        })
      }
    })
  },
  // Get Requests - Vendor Not Qouted On
  (req, res, next) => {
    const params = req.body;

    pplRequestRef
      .orderByChild("status")
      .equalTo("pending")
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const requests = [];
          snapshot.forEach((snap) => {
            requests.push(snap.val());
          });

          const allqoutes = [
            ...params.transitQoutes,
            ...params.upcountryQoutes,
          ];
          // console.log('allqoutes -> ', allqoutes)
          const removedDuplicates = [...new Set(allqoutes)];
          // console.log('COMPARE -> ', allqoutes.filter(item => !(removedDuplicates.find(x => x.orderNo == item.orderNo).orderNo == item.orderNo)))
          // const upcountryQoutes = params.upcountryQoutes;
          // console.log('upcountryQoutes -> ', upcountryQoutes)
          const filterrequests = requests.filter(
            (item) => !removedDuplicates.includes(item.orderNo)
          );

          filterrequests.forEach((x) => {
            x["rates_found"] = false;
          });

         console.log('params.time.minutes -> ',params.time.minutes);

          const sortedtransitRequest = filterrequests.sort(function (a, b) {
            return b.createdAt_timestamp - a.createdAt_timestamp;
          });

          let alljobs = [...sortedtransitRequest];

          let checkedtime = [];

          let now = getCurrentTimestamp();
          let nowdate = getCurrentDate();
          alljobs.forEach((x) => {
            let requestCreationTime = x.createdAt_timestamp;
            let datediff = difference2Parts(requestCreationTime - now);
            console.log("datediff.minutes -> ", datediff.minutes);
            console.log('params.time.minutes -> ',params.time.minutes);
            if (datediff.minutes < params.time.minutes) {
              console.log(`Orderno#${x.orderNo} -> `, datediff.minutes);
              checkedtime.push(x);
            }
          });

          res.json({
            status: true,
            data: [...checkedtime],
          });
        } else {
          res.json({
            status: true,
            data: [],
          });
        }
      });
  }
);


// /get_vendor_qoutes
router.post(
  "/get_vendor_lost_jobs",
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`,
        });
        break;
    }
  },
  // Get Qoutes,User Counter Offers,Vendor Counter Offers
  async (req, res, next) => {
    const params = req.body;

    // Get All Qoutes For Vendor
    const transitQoutesSnap = await pplBiddingsRef
      .child("transit")
      .child("qoutes")
      .orderByChild("phone")
      .equalTo(params.user.user_id)
      .once("value");

    const upcountryQoutesSnap = await pplBiddingsRef
      .child("upcountry")
      .child("qoutes")
      .orderByChild("phone")
      .equalTo(params.user.user_id)
      .once("value");

    // Qoutes
    const rawtransitQoutes = await transitQoutesSnap.val();
    const rawupcountryQoutes = await upcountryQoutesSnap.val();

    const transitQoutes = [];
    const upcountryQoutes = [];

    if (rawtransitQoutes !== null) {
      const convert1 = Object.entries(rawtransitQoutes);
      convert1.forEach((x) => {
        transitQoutes.push(x[1]);
      });
    }

    if (rawupcountryQoutes !== null) {
      const convert2 = Object.entries(rawupcountryQoutes);
      convert2.forEach((x) => {
        upcountryQoutes.push(x[1]);
      });
    }

    // Filter For Pending Qoutes
    const pendingQoutes1 = transitQoutes.filter((qoute) => {
      return qoute.status === "pending";
    });

    // Filter For Rejected Qoutes
    const rejectedQoutes1 = transitQoutes.filter((qoute) => {
      return qoute.status === "rejected";
    });

    // UPCOUNTRY
    // Filter For Pending Qoutes
    const pendingQoutes2 = upcountryQoutes.filter((qoute) => {
      return qoute.status == "pending";
    });

    // Filter For Rejected Qoutes
    const rejectedQoutes2 = upcountryQoutes.filter((qoute) => {
      return qoute.status === "rejected";
    });


    // let allpendingqoutes = [...pendingQoutes1,...pendingQoutes2];
    let allrejectedqoutes = [...rejectedQoutes1,...rejectedQoutes2];
     

    // let checklost = allpendingqoutes.map((x) => {
    //   let datediff = difference2Parts(requestCreationTime - now);
    // })


    res.json({
      status: true,
      data: [...allrejectedqoutes],
    });
    





    // const sortedpendingOffers1 = pendingQoutes1.sort(function (a, b) {
    //   return b.createdAt_timestamp - a.createdAt_timestamp;
    // });

    // const sortedpendingQoutes2 = pendingQoutes2.sort(function (a, b) {
    //   return b.createdAt_timestamp - a.createdAt_timestamp;
    // });

    // const sortedrejectedQoutes1 = rejectedQoutes1.sort(function (a, b) {
    //   return b.createdAt_timestamp - a.createdAt_timestamp;
    // });

    // const sortedrejectedQoutes2 = rejectedQoutes2.sort(function (a, b) {
    //   return b.createdAt_timestamp - a.createdAt_timestamp;
    // });

   
  }
);


function difference2Parts(milliseconds) {
  const secs = Math.floor(Math.abs(milliseconds) / 1000);
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const millisecs = Math.floor(Math.abs(milliseconds)) % 1000;
  const multiple = (term, n) => (n !== 1 ? `${n} ${term}s` : `1 ${term}`);

  return {
    days: days,
    hours: hours % 24,
    hoursTotal: hours,
    minutesTotal: mins,
    minutes: mins % 60,
    seconds: secs % 60,
    secondsTotal: secs,
    milliSeconds: millisecs,
    get diffStr() {
      return `${multiple(`day`, this.days)}, ${multiple(
        `hour`,
        this.hours
      )}, ${multiple(`minute`, this.minutes)} and ${multiple(
        `second`,
        this.seconds
      )}`;
    },
    get diffStrMs() {
      return `${this.diffStr.replace(` and`, `, `)} and ${multiple(
        `millisecond`,
        this.milliSeconds
      )}`;
    },
  };
}


// ============= GET VENDOR/DRIVER DATA (ENDS) =============


// Get Single Bilty
router.post(
  "/get_vendor_single_bilty",
  verifyTokenFirebase,
  // Get Order And Bilty
  (req, res, next) => {
    const params = req.body;
    const getOrderNo = params.biltyNo.slice(2, params.biltyNo.length - 2);

    pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();
        req.body.request = request;
        next();
      } else {
        res.json({
          status: false,
          error: "Request not Found !",
        });
      }
    });
  },
  // Bilty
  (req, res) => {
    const params = req.body;

    let final_amount;

    if (params.request.qoute) {
      final_amount = params.request.qoute.qoute_amount;
    }

    if (params.request.user_counter) {
      final_amount = params.request.user_counter.amount;
    }

    if (params.request.vendor_counter) {
      final_amount = params.request.vendor_counter.amount;
    }

    if (params.request.request_type) {
      const bilties = params.request.bilty;

      const currentBilty = bilties.filter((bilty) => {
        return bilty.biltyNo === params.biltyNo;
      });

      let currentBilty2;

      if (currentBilty) {
        if (currentBilty.length > 0) {
          currentBilty2 = currentBilty[0];
        }
      }

      delete params.request.bilty;

      let data = {
        ...currentBilty2,
        ...params.request,
        final_amount,
      };

      res.json({
        status: true,
        data: data,
      });
    }
  }
);

// ---------------------

// router.get("get_driver_history");

// Get User Profile
// {
//   "token": ""
// }
router.post(
  "/get_user_profile",
  verifyTokenFirebase,
  // Get Profile
  (req, res, next) => {
    const params = req.body;
    let userType;
    if (params.user.user_type == "user") {
      userType = "users";
    } else if (params.user.user_type == "driver") {
      userType = "drivers";
    } else if (params.user.user_type == "vendor") {
      userType = "vendors";
    } else {
      userType = params.user.user_type;
    }

    userRef
      .child(userType)
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();

          res.json({
            status: true,
            data: {
              ...user,
              password: null,
            },
          });
        } else {
          userRef
            .child("pro")
            .child(params.user.user_id)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();

                res.json({
                  status: true,
                  data: {
                    ...user,
                    password: null,
                  },
                });
              } else {
                res.json({
                  status: false,
                  error: "No User Profile Found !",
                });
              }
            });
        }
      });
  }
);

// /get_vendor_rejected_orders
router.post(
  "/get_vendor_rejected_orders",
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        console.log("vendor phone -> ", params.user.user_id);
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`,
        });
        break;
    }
  },
  // Get Completed Order
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.once("value", (snapshot) => {
      if (snapshot.val()) {
        const requests = [];
        console.log(snapshot.val());

        snapshot.forEach((snap) => {
          if (snap.val().vendor_phone === params.user.user_id) {
            requests.push(snap.val());
          }
        });

        //  Active Orders
        const transitRequests = requests.filter((x) => {
          return x.request_type === "transit";
        });

        const upcountryRequests = requests.filter((x) => {
          return x.request_type === "upcountry";
        });

        // Filter For Transit Active Orders
        const transitCompletedOrders = transitRequests.filter((x) => {
          if (
            x.status === "qoute_rejected" ||
            x.status === "user_counter_rejected" ||
            x.status === "vendor_counter_rejected"
          ) {
            return x;
          }
        });

        // Filter For Upcountry Active Orders
        const upcountryCompleteOrders = upcountryRequests.filter((x) => {
          if (
            x.status === "qoute_rejected" ||
            x.status === "user_counter_rejected" ||
            x.status === "vendor_counter_rejected"
          ) {
            return x;
          }
        });

        const sortedtransitCompletedOrders = transitCompletedOrders.sort(
          function (a, b) {
            return b.createdAt_timestamp - a.createdAt_timestamp;
          }
        );

        const sortedupcountryCompleteOrders = upcountryCompleteOrders.sort(
          function (a, b) {
            return b.createdAt_timestamp - a.createdAt_timestamp;
          }
        );

        res.json({
          status: true,
          data: [
            ...sortedtransitCompletedOrders,
            ...sortedupcountryCompleteOrders,
          ],
        });
      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });
  }
);

//get_user_rejected_orders
router.post(
  "/get_user_rejected_orders",
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        next();
        break;
      case "pro":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`,
        });
        break;
    }
  },
  // Get Completed Order
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.once("value", (snapshot) => {
      if (snapshot.val()) {
        const requests = [];

        snapshot.forEach((snap) => {
          if (snap.val().user_phone === params.user.user_id) {
            requests.push(snap.val());
          }
        });

        //  user Orders
        const userOrders = requests.filter((x) => {
          return x.user_phone === params.user.user_id;
        });

        // Filter For Active Orders
        const completedOrders = userOrders.filter((x) => {
          if (
            x.status === "qoute_rejected" ||
            x.status === "user_counter_rejected" ||
            x.status === "vendor_counter_rejected"
          ) {
            return x;
          }
        });

        // Transit Orders
        const transitOrders = completedOrders.filter((x) => {
          return x.request_type === "transit";
        });

        // Upcountry Orders
        const upcountryOrders = completedOrders.filter((x) => {
          return x.request_type === "upcountry";
        });

        const sortedtransitOrders = transitOrders.sort(function (a, b) {
          return b.createdAt_timestamp - a.createdAt_timestamp;
        });

        const sortedupcountryOrders = upcountryOrders.sort(function (a, b) {
          return b.createdAt_timestamp - a.createdAt_timestamp;
        });

        res.json({
          status: true,
          data: [...sortedtransitOrders, ...sortedupcountryOrders],
        });
      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });
  }
);

// ============= PROFILE (STARTS) =============


// Update User Profile
// /update_user_profile 
router.post(
  "/update_user_profile",
  verifyTokenFirebase,
  // Check And Upload Profile Image
  // (req, res, next) => {
  //   const files = req.files;

  //   if (req.files) {
  //     const { profileImage } = req.files;

  //     // Uploading Bill of landing
  //     const profileImage_filename = profileImage.name;
  //     const profileImage_filetype = profileImage_filename.split(".")[1];
  //     const profileImage_name = `${req.body.user.user_id}_profile_image`;

  //     const path = "ProfileImages/";

  //     fileUpload(
  //       profileImage,
  //       profileImage_name,
  //       path,
  //       profileImage_filetype,
  //       (err) => {
  //         if (err) {
  //           console.log("err -> ", err);
  //           next();
  //         } else if (err == null) {
  //           next();
  //         }
  //       }
  //     );
  //   } else {
  //     next();
  //   }
  // },
  // Get Image Links
  // async (req, res, next) => {
  //   const params = req.body;
  //   const files = req.files;

  //   if(req.files)
  //   {
  //     let options = {
  //       prefix: `ProfileImages/`,
  //     };

  //     const [files] = await storage.bucket("meribilty-staging.appspot.com").getFiles(options);
  //     var uploadImages = [];

  //     files.forEach((file) => {
  //       const fileName = file.name;

  //       if (fileName.includes(params.user.user_id)) {
  //         let image = {
  //           name: file.name,
  //           url: file.publicUrl(),
  //         };

  //         uploadImages.push(image);
  //       }
  //     });

  //     if(uploadImages.length > 0)
  //     {
  //       req.body.ProfileImage = uploadImages;
  //     }

  //     console.log('uploadImages -> ',uploadImages)
  //     next();
  //   } else {
  //     console.log('No Profile Image Uploaded')
  //     next();
  //   }

  // },
  // Update Profile
  (req, res) => {
    const params = req.body;
    let userType;
    if (params.user.user_type == "user") {
      userType = "users";
    } else {
      userType = params.user.user_type;
    }

    userRef
      .child(userType)
      .child(params.user.user_id)
      .update({
        ...params,
        token: null,
        user: null,
      })
      .then(() => {
        res.json({
          status: true,
          message: "User Profile Updated !",
        });
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  }
);

// Get vendor_or_driver Profile
router.post(
  "/get_vendor_or_driver_profile",
  verifyTokenFirebase,
  // Get Profile
  (req, res) => {
    const params = req.body;

    if (params.user.user_type == "vendor") {
      userType = "vendors";
    } else if (params.user.user_type == "driver") {
      userType = "drivers";
    } else {
      res.json({
        status: false,
        error: "User Cannot Get Vendor/Driver Profile !",
      });
    }

    userRef
      .child(params.user.user_type + "s")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();

          res.json({
            status: true,
            data: {
              ...user,
              password: null,
            },
          });
        } else {
          res.json({
            status: false,
            error: "No User Profile Found !",
          });
        }
      });
  }
);

// Update vendor_or_driver Profile
router.post(
  "/update_vendor_or_driver_profile",
  verifyTokenFirebase,
  // Check And Upload Profile Image
  (req, res, next) => {
    if (req.files) {
      const { profileImage } = req.files;

      // Uploading Bill of landing
      const profileImage_filename = profileImage.name;
      const profileImage_filetype = profileImage_filename.split(".")[1];
      const profileImage_name = `${req.body.user.user_id}_profile_image`;

      const path = "ProfileImages/";

      fileUpload(
        profileImage,
        profileImage_name,
        path,
        profileImage_filetype,
        (err) => {
          if (err) {
            console.log("err -> ", err);
            next();
          } else if (err == null) {
            next();
          }
        }
      );
    } else {
      next();
    }
  },
  (req, res) => {
    const params = req.body;

    let userType;
    if (params.user.user_type == "vendor") {
      userType = "vendors";
    } else if (params.user.user_type == "driver") {
      userType = "drivers";
    } else {
      res.json({
        status: false,
        error: "User Cannot Get Vendor/Driver Profile",
      });
    }

    userRef
      .child(userType)
      .child(params.user.user_id)
      .update(params)
      .then(() => {
        res.json({
          status: true,
          message: `${params.user.user_type} Profile Updated !`,
        });
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  }
);


// ============= PROFILE (ENDS) =============


// ============= VEHICLE TYPES , LOADING OPTIONS , UNLOADING OPTIONS , MATERIALS (STARTS) =============

// Get Vehicle Types
router.post("/get_vehicle_types", (req, res) => {
  pplSettingsRef.child("vehicle_types").once("value", (snapshot) => {
    if (snapshot.val()) {
      const types = [];

      snapshot.forEach((snap) => {
        types.push(snap.val());
      });

      res.json({
        status: true,
        data: types,
      });
    } else {
      res.json({
        status: false,
        error: "No Vehicle type Found !",
      });
    }
  });
});

// Get Loading Options
router.post("/get_loading_options", (req, res) => {
  pplSettingsRef.child("loading_options").once("value", (snapshot) => {
    if (snapshot.val()) {
      const types = [];

      snapshot.forEach((snap) => {
        types.push(snap.val());
      });

      res.json({
        status: true,
        data: types,
      });
    } else {
      res.json({
        status: false,
        error: "No Loading Options Found !",
      });
    }
  });
});

// Get Unloading Options
router.post("/get_unloading_options", (req, res) => {
  pplSettingsRef.child("unloading_options").once("value", (snapshot) => {
    if (snapshot.val()) {
      const types = [];

      snapshot.forEach((snap) => {
        types.push(snap.val());
      });

      res.json({
        status: true,
        data: types,
      });
    } else {
      res.json({
        status: false,
        error: "No Unloading Options Found !",
      });
    }
  });
});

// Get Materials
router.post("/get_materials", (req, res) => {
  pplSettingsRef.child("material_list").once("value", (snapshot) => {
    if (snapshot.val()) {
      const types = [];

      snapshot.forEach((snap) => {
        types.push(snap.val());
      });

      res.json({
        status: true,
        data: types,
      });
    } else {
      res.json({
        status: false,
        error: "No Unloading Options Found !",
      });
    }
  });
});

// Get All User Vehicle Selections
router.post(
  "/get_vehicle_selections",
  verifyTokenFirebase,
  (req, res, next) => {
    const params = req.body;

    pplUserVehicleSelections
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const selections = snapshot.val();
          const options = [];
          const convert = Object.entries(selections);
          convert.forEach((x) => {
            options.push(x[1]);
          });
          res.json({
            status: true,
            data: options,
          });
        } else {
          res.json({
            status: false,
            error: "No Selection Found !",
          });
        }
      });
  }
);


// ============= VEHICLE TYPES , LOADING OPTIONS , UNLOADING OPTIONS , MATERIALS (ENDS) =============


// Get Vendor Stats
router.post(
  "/get_vendor_stats",
  verifyTokenFirebase,
  // Check User Type
  (req, res, next) => {
    const params = req.body;
    console.log("phone -> ", params.user.user_id);
    switch (params.user.user_type) {
      case "vendor":
        next();
        break;

      default:
        req.json({
          status: false,
          error: `${params.user.user_type} cannot get vendor stats`,
        });
        break;
    }
  },
  // Get Active Orders (transit) For Vendor
  (req, res, next) => {
    const params = req.body;

    // Transit
    pplRequestRef
      .orderByChild("vendor_phone")
      .equalTo(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const requests = [];
          snapshot.forEach((snap) => {
            requests.push(snap.val());
          });

          //  console.log('active requests -> ',requests)

          // Filter Rate Confirmed Requests
          const rateConfirmed = requests.filter((req) => {
            return (
              req.status !== "pending" &&
              req.status !== "cancelled" &&
              req.status !== "rejected"
            );
          });

          req.body.transitActiveOrders = rateConfirmed.length;
          console.log("rateConfirmed.length -> ", rateConfirmed.length);
          next();

          //  console.log('rateConfirmed -> ',rateConfirmed);
        } else {
          req.body.transitActiveOrders = 0;
          next();
        }
      });
  },
  // Get Active Orders (upcountry) For Vendor
  (req, res, next) => {
    const params = req.body;

    // Upcountry
    pplRequestRef
      .orderByChild("request_type")
      .equalTo("upcountry")
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const requests = [];
          snapshot.forEach((snap) => {
            const req = snap.val();
            let checkVendorInSuborders = false;

            req.subOrders.forEach((suborder) => {
              if (suborder.vendor_phone === params.user.user_id) {
                checkVendorInSuborders = true;
              }
            });

            if (checkVendorInSuborders) {
              requests.push(snap.val());
            }
          });

          //  console.log('upcountry requests -> ',requests)

          // Filter Rate Confirmed Requests
          //  const rateConfirmed = requests.filter((req) => {
          //      return req.status !== 'pending' && req.status !== 'cancelled' && req.status !== 'rejected'
          //  })

          req.body.UpcountryActiveOrders = requests.length;
          console.log("requests.length -> ", requests.length);
          next();

          // res.json({
          //   status:true,
          //   data: [...requests,...params.transitActiveOrders,...params.allQoutesAndCounters]
          // })

          //  console.log('rateConfirmed -> ',rateConfirmed);
        } else {
          req.body.UpcountryActiveOrders = 0;
          next();
        }
      });
  },
  // Get Qoutes,User Counter Offers,Vendor Counter Offers
  async (req, res, next) => {
    const params = req.body;

    // Get All Qoutes For Vendor
    const transitQoutesSnap = await pplBiddingsRef
      .child("transit")
      .child("qoutes")
      .orderByChild("phone")
      .equalTo(params.user.user_id)
      .once("value");
    const upcountryQoutesSnap = await pplBiddingsRef
      .child("upcountry")
      .child("qoutes")
      .orderByChild("phone")
      .equalTo(params.user.user_id)
      .once("value");
    // Get All User Counter Offers For Vendor
    // const transitUserCounterSnap = await pplBiddingsRef
    //   .child("transit")
    //   .child("user_counter")
    //   .orderByChild("vendor_phone")
    //   .equalTo(params.user.user_id)
    //   .once("value");
    // const upcountryUserCounterSnap = await pplBiddingsRef
    //   .child("upcountry")
    //   .child("user_counter")
    //   .orderByChild("vendor_phone")
    //   .equalTo(params.user.user_id)
    //   .once("value")
    // Get All Vendor Counter Offers For Vendor
    // const transitVendorCounterSnap = await pplBiddingsRef
    //   .child("transit")
    //   .child("vendor_counter")
    //   .orderByChild("vendor_phone")
    //   .equalTo(params.user.user_id)
    //   .once("value");
    // const upcountryVendorCounterSnap = await pplBiddingsRef
    //   .child("upcountry")
    //   .child("vendor_counter")
    //   .orderByChild("vendor_phone")
    //   .equalTo(params.user.user_id)
    //   .once("value");

    // Qoutes
    const rawtransitQoutes = await transitQoutesSnap.val();
    const rawupcountryQoutes = await upcountryQoutesSnap.val();
    // User Counter Offer
    // const rawtransitUserCounterOffers = await transitUserCounterSnap.val();
    // const rawupcountryUserCounterOffers = await upcountryUserCounterSnap.val();
    // Vendor Counter Offer
    // const rawtransitVendorCounterOffers = await transitVendorCounterSnap.val();
    // const rawupcountryVendorCounterOffers = await upcountryVendorCounterSnap.val();

    const transitQoutes = [];
    const upcountryQoutes = [];
    // const transitUserCounterOffers = [];
    // const upcountryUserCounterOffers = [];
    // const transitVendorCounterOffers = [];
    // const upcountryVendorCounterOffers = [];

    if (rawtransitQoutes !== null) {
      const convert1 = Object.entries(rawtransitQoutes);
      convert1.forEach((x) => {
        transitQoutes.push(x[1]);
      });
    }

    if (rawupcountryQoutes !== null) {
      const convert2 = Object.entries(rawupcountryQoutes);
      convert2.forEach((x) => {
        upcountryQoutes.push(x[1]);
      });
    }

    // if(rawtransitUserCounterOffers !== null){
    //   const convert3 = Object.entries(rawtransitUserCounterOffers);
    //   convert3.forEach((x) => {
    //     transitUserCounterOffers.push(x[1]);
    //   });
    // }

    // if(rawupcountryUserCounterOffers !== null){
    //   const convert4 = Object.entries(rawupcountryUserCounterOffers);
    //   convert4.forEach((x) => {
    //     upcountryUserCounterOffers.push(x[1]);
    //   });
    // }
    // if(rawtransitVendorCounterOffers !== null){
    //   const convert5 = Object.entries(rawtransitVendorCounterOffers);
    //   convert5.forEach((x) => {
    //     transitVendorCounterOffers.push(x[1]);
    //   });
    // }
    // if(rawupcountryVendorCounterOffers !== null){
    //   const convert6 = Object.entries(rawupcountryVendorCounterOffers);
    //   convert6.forEach((x) => {
    //     upcountryVendorCounterOffers.push(x[1]);
    //   });
    // }

    const data = [...transitQoutes, ...upcountryQoutes];

    // const allOrders = data.map((x) => {
    //   return x.orderNo;
    // });

    // TODO: Get Orders From all order numbers
    req.body.allQoutesAndCounters = data.length;
    next();
  },
  // Get Vendor Vehicles
  (req, res, next) => {
    const params = req.body;

    pplVendorVehicleRef
      .orderByChild("vendor_phone")
      .equalTo(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vehicles = snapshot.numChildren();
          req.body.vehicles = vehicles;
          next();
        } else {
          req.body.vehicles = 0;
          next();
        }
      });
  },
  // Get Vendor Invited Drivers
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("drivers")
      .orderByChild("referer")
      .equalTo(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const drivers = snapshot.numChildren();
          req.body.drivers = drivers;
          next();
        } else {
          req.body.drivers = 0;
          next();
        }
      });
  },
  // Throw Data
  (req, res, next) => {
    const params = req.body;

    res.json({
      status: true,
      requests: params.transitActiveOrders + params.UpcountryActiveOrders,
      qoutes: params.allQoutesAndCounters,
      vehicles: params.vehicles,
      drivers: params.drivers,
    });
  }
);

// invite friend by sms (Send Referal Code)
router.post(
  "/invite_friends",
  verifyTokenFirebase,
  // Generate Referel Code User
  (req, res, next) => {
    const params = req.body;

    const code = referralCodes.generate({
      length: 8,
      count: 5,
    });

    referalsRef
      .child(code)
      .set({
        invitedBy: params.user.user_id,
        invitedUser: params.phone,
        code: code,
      })
      .then(() => {
        req.body.code = code;
        next();
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err,
        });
      });
  },
  (req, res) => {
    const params = req.body;
    

    let filterphone = params.phone;
    let transformphone = filterphone.substr(1);
    console.log('filterphone -> ',filterphone)
    console.log('transformphone -> ',transformphone)
    let content = `You have been invited to meribilty app by ${params.user.user_id}. Download the app now`;

    axios.post(`http://bsms.its.com.pk/api.php?key=b23838b9978affdf2aab3582e35278c6&msgdata=${content}&receiver=${transformphone}`).then((response)=>{
    let data = response.data;
    
      if(data.response.status === 'Success') {
        res.json({
          status: true,
          message: "User has been invited !",
        });
      } else {
        res.json({
          status:false,
          data:data
        })
      }
    }).catch((err)=>{
      res.json({
        status:false,
        error: err
      }) 
    })

    // twillio_client.messages
    //   .create(
    //     {
    //       messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
    //       to: params.phone,
    //       from: config.twilio.phone,
    //       body: `You have been invited to meribilty app by ${params.user.user_id}. Download the app now`,
    //     },
    //     (err, resData) => {
    //       if (err) {
    //         return res.json({
    //           status: false,
    //           message: err,
    //         });
    //       } else {
    //         res.json({
    //           status: true,
    //           message: "User has been invited !",
    //         });
    //       }
    //     }
    //   )
    //   .catch((err) => {
    //     res.json({
    //       status: false,
    //       error: err.message,
    //     });
    //   });
  }
);

// user gives rating to order
// {
//   "token": "",
//   "orderNo": "",
//   "rating": 5
// }
router.post(
  "/user_give_rating",
  verifyTokenFirebase,
  // Check User Type (User Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        next();
        break;

      case "pro":
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot add a vehicle selection  !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot add a vehicle selection  !`,
        });
        break;
    }
  },
  // Get Order
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();
        req.body.request = request;
        next();
      } else {
        res.json({
          status: false,
          error: "Cannot Find Request !",
        });
      }
    });
  },
  // Update Order
  async (req, res, next) => {
    const params = req.body;
    var reqOrderNo = pplRequestRef.child(params.orderNo);
    reqOrderNo
      .update({
        user_ratings: params.rating,
        user_experience: params.experience,
      })
      .then(() => {
        reqOrderNo.once("value").then((snap) => {
          if (snap.val()) {
            let vendorInfo = snap.val();

            userRef
              .child("vendors")
              .child(vendorInfo.vendor_phone)
              .once("value")
              .then((vendorDoc) => {
                if (vendorDoc.val()) {
                  let newCount = vendorDoc.val().rating.count++;
                  let newAvg =
                    vendorDoc.val().rating.avg +
                    vendorInfo.user_ratings / newCount;

                  userRef
                    .child("vendors")
                    .child(vendorInfo.vendor_phone)
                    .update({
                      rating: {
                        avg: newAvg,
                        count: newCount,
                      },
                    });
                }
              })
              .catch((err) =>
                res.json({
                  status: false,
                  error: err,
                })
              );
          }
        });
        res.json({
          status: true,
          message: "Your ratings are submitted successfully !",
        });
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err,
        });
      });
  }
);

// Get Cancellation Reasons
router.get("/get_cancellation_reasons", (req, res) => {
  const params = req.body;

  pplCancellationReasonRef.once("value", (snapshot) => {
    if (snapshot.val()) {
      const reasons = snapshot.val();
      const userreasons = reasons.user;
      let container = [];

      for (let key in userreasons) {
        container.push(userreasons[key]);
      }

      res.json({
        status: true,
        data: container,
      });
    } else {
      res.json({
        status: true,
        data: [],
      });
    }
  });
});

// Get Invoice For Order
router.post(
  "/get_invoice_for_order",
  verifyTokenFirebase,
  // Get Invoice For Order
  (req, res) => {
    const params = req.body;

    pplInvoiceRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const invoice = snapshot.val();
        res.json({
          status: true,
          data: invoice,
        });
      } else {
        res.json({
          status: false,
          error: "Invoice Not Found !",
        });
      }
    });
  }
);

// Get Invoice For Bilty
router.post(
  "/get_invoice_for_bilty",
  // Get Invoice For Order
  (req, res, next) => {
    const params = req.body;

    pplInvoiceRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const invoice = snapshot.val();
        req.body.orderInvoice = invoice;
        next();
      } else {
        res.json({
          status: false,
          error: "Invoice Not Found !",
        });
      }
    });
  },
  // Create Bilty Invoice
  (req, res) => {
    const params = req.body;

    let biltyNo = params.biltyNo;

    const transitbilties = params.orderInvoice.bilty;

    if (transitbilties) {
      if (transitbilties.length !== 0) {
        const filterOut = transitbilties.filter((bilty) => {
          return bilty.biltyNo === biltyNo;
        });

        if (filterOut) {
          if (filterOut.length !== 0) {
            const bilty = filterOut[0];
            console.log("bilty -> ", bilty);

            let data = {
              ...bilty,
              payment_method: params.orderInvoice.payment_method,
              point_of_payment: params.orderInvoice.point_of_payment,
              order_accepted_on: params.orderInvoice.order_accepted_on,
              originAddress: params.orderInvoice.originAddress,
              payableAmount: params.orderInvoice.payableAmount,
              payment_approval: params.orderInvoice.payment_approval,
              user_phone: params.orderInvoice.user_phone,
              username: params.orderInvoice.username,
              vendor_name: params.orderInvoice.vendor_name,
              vendor_phone: params.orderInvoice.vendor_phone,
              destinationAddress: params.orderInvoice.destinationAddress,
              containerReturnAddress:
                params.orderInvoice.containerReturnAddress,
              date: params.orderInvoice.date,
              amount: params.orderInvoice.amount,
            };

            res.json({
              status: true,
              data: data,
            });
          } else {
            res.json({
              status: false,
              error: "Bilty Not Found !",
            });
          }
        }
      }
    }
  }
);


// ============= LIVE LOCATION APIS (STARTS) =============


// Update Driver Location
router.post("/update_driver_location", verifyTokenFirebase, 
// Check User Type (User Side)
(req, res, next) => {
  const params = req.body;

  switch (params.user.user_type) {
    case "user":
      res.json({
        status:false,
        error: "user type is user"
      })
      break;

    case "pro":
      res.json({
        status:false,
        error: "user type is pro"
      })
      break;
    case "driver":
      next();
      break;
    default:
      res.json({
        status: false,
        error: `${params.user.user_type} cannot add a vehicle selection  !`,
      });
      break;
  }
},
(req, res) => {
  const UserPhoneNo = req.body.user.user_id;
  // uncomment above two lines for live API
  // router.post("/update_driver_location", (req, res) => {
  //   const UserPhoneNo = "+923059697177";
  // uncomment above two lines for testing
  if (UserPhoneNo !== null && UserPhoneNo !== "undefined") {
    userRef
      .child("drivers")
      .child(UserPhoneNo)
      .update({
        liveLocation: {
          lat: req.body.lat,
          lng: req.body.lng,
        },
      })
      .then((doc) => {
        res.sendStatus(200);
      })
      .catch((e) => res.status(400).json({ error: e }));
  }
});

// Get Driver's Location
router.post("/get_current_Location", (req, res) => {
  const body = req.body; //biltyNo & OrderNo required
  pplRequestRef
    .child(body.orderNo)
    .child("bilty")
    .once("value")
    .then((snapshot) => {
      if (snapshot.val()) {
        const bilties = snapshot.val(); // array of bilty
        const bilty = bilties.filter((bilty) => bilty.biltyNo === body.biltyNo);
        if (bilty[0].driver_phone) {
          userRef
            .child("drivers")
            .child(bilty[0].driver_phone)
            .once("value")
            .then((snapshot) => {
              snapshot.val().liveLocation
                ? res.json({
                    status: true,
                    result: snapshot.val().liveLocation,
                  })
                : res.json({
                    status: false,
                    error: "No live location",
                  });
            })
            .catch((e) =>
              res.json({
                status: false,
                error: `Error caught finding driver + ${e}`,
              })
            );
        } else {
          res.json({
            status: false,
            error: "Driver's isn't allotted",
          });
        }
      } else {
        res.json({
          status: false,
          error: "Request Not Found!",
        });
      }
    })
    .catch((e) =>
      res.json({
        status: false,
        error: `Error caught, Request not found: + ${e}`,
      })
    );
});


// ============= LIVE LOCATION APIS (ENDS) =============


// Get Notifications 
router.post("/get_notifications",
verifyTokenFirebase,
(req,res) => {
  const params = req.body;
  if(params.user.user_type === 'user' || params.user.user_type === 'pro'){
    console.log('params.user.user_id -> ',params.user.user_id);
    notificationsRef.child('users').child(params.user.user_id).once('value', (snapshot) => {
      if(snapshot.val()) {
        let notifications = [];
        snapshot.forEach((x) => {
          notifications.push({
            ...x.val()
          })
        })  

        const sort = notifications.sort(function (a, b) {
          return b.created - a.created;
        });
        
        res.json({
          status:true,
          data:sort
        })
      } else {
        res.json({
          status:false,
          data:[]
        })
      }
   }) 
  } else if (params.user.user_type === 'vendor') {
    notificationsRef.child('vendors').child(params.user.user_id).once('value', (snapshot) => {
      if(snapshot.val()) {
        let notifications = []
        snapshot.forEach((x) => {
          notifications.push({
            ...x.val()
          })
        })  

        const sort = notifications.sort(function (a, b) {
          return b.created - a.created;
        });
        
        res.json({
          status:true,
          data:sort
        })
      } else {
        res.json({
          status:false,
          data:[]
        })
      }
   }) 
  } else if (params.user.user_type === 'driver') {
    notificationsRef.child('drivers').child(params.user.user_id).once('value', (snapshot) => {
      if(snapshot.val()) {
        let notifications = []
        snapshot.forEach((x) => {
          notifications.push({
            ...x.val()
          })
        })  

        const sort = notifications.sort(function (a, b) {
          return b.created - a.created;
        });
        
        
        res.json({
          status:true,
          data:sort
        })
      } else {
        res.json({
          status:false,
          data:[]
        })
      }
   }) 
  }
})

// Update Notification -> Read/Unread
router.post('/read_unread_notification', 
verifyTokenFirebase,
(req,res) => {
  const params = req.body;
  

  if(params.user.user_type === 'user' || params.user.user_type === 'pro'){
    notificationsRef.child('users').child(params.user.user_id).child(params.notificationID).update({
      read: true
    }).then(()=>{
       res.json({
        status:true,
        message: 'Notification Updated !'
       })
    }).catch((err)=>{
      res.json({
        status:false,
        error:err
      })
    })
   
  } else if (params.user.user_type === 'vendor') {
    notificationsRef.child('vendors').child(params.user.user_id).child(params.notificationID).update({
      read: true
    }).then(()=>{
       res.json({
        status:true,
        message: 'Notification Updated !'
       })
    }).catch((err)=>{
      res.json({
        status:false,
        error:err
      })
    })
  } else if (params.user.user_type === 'driver') {
    notificationsRef.child('drivers').child(params.user.user_id).child(params.notificationID).update({
      read: true
    }).then(()=>{
       res.json({
        status:true,
        message: 'Notification Updated !'
       })
    }).catch((err)=>{
      res.json({
        status:false,
        error:err
      })
    })
  }

})

// Get Vendor Qoute Time Limit 
router.post("/get_vendor_quote_time", (req,res,next) => {
  const params = req.body;

  pplSettingsRef.child('vendor_qoute_time').child(0).once('value', (snapshot) => {
    if(snapshot.val()) {
      const vendor_qoute_time = snapshot.val();
      res.json({
        status:true,
        data: {
          minutes: vendor_qoute_time.minutes,
          hour: Math.floor(vendor_qoute_time.minutes/60)
        }
      })
    } else {
      res.json({
        status:false,
        error: "No Time Found !" 
      })
    }
  })
})



router.post("/test", (req, res) => {
  const params = req.body;
  // Send SMS To User Agent

  let filterphone = params.phone;
  let transformphone = filterphone.substr(1);
  console.log('filterphone -> ',filterphone)
  console.log('transformphone -> ',transformphone)

  let content = `You have been invited by To Meribilty App. Login With Your Phone Number ${params.phone}.`;
  axios.post(`http://bsms.its.com.pk/api.php?key=b23838b9978affdf2aab3582e35278c6&msgdata=${content}&to=${transformphone}`).then((response)=>{
  let data = response.data;
  
    if(data.response.status === 'Success') {
      res.json({
        status: true,
        message: "User Agent Added !",
      });
    } else {
      res.json({
        status:false,
        data:data
      })
    }
  }).catch((err)=>{
    res.json({
      status:false,
      error: err
    }) 
  })
})

module.exports = router;

function fileUpload(file, name, dir, filetype, callback) {
  if (typeof file !== "undefined") {
    const img_file = bucket.file(`${dir + name}.${filetype}`);
    const stream = img_file.createWriteStream({
      gzip: true,
      resumable: false,
    });

    stream.on("error", (err) => {
      callback(err);
    });

    stream.on("finish", () => {
      callback(null);
    });

    stream.end(file.data);
  } else {
    callback("Invalid File!");
  }
}
