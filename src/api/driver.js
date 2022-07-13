const express = require("express");
// const config = require("../config/private.json");

// Scheduled Tasks
const _ = require("lodash");

// let SID = "ACdf3c9dd58c5c293af6a30ec1ea212d50";
// let SECRET = "aba225227762b749ebf386a142c2d23c";

// Twilio Client
// const twillio_client = require("twilio")(
//   config.twilio.accountSid,
//   config.twilio.authToken
// );


const { Client } = require("@googlemaps/google-maps-services-js");
const { body, validationResult } = require("express-validator");
const { send_notification_to_single_user } = require("../functions/notifications")

const {
  driverHistoryRef,
  pplRequestRef,
  pplVendorVehicleRef,
  fcmTokenRef,
  notificationsRef
} = require("../db/newRef");

const { userRef} = require("../db/ref");

const {
  verifyTokenFirebase,
  getCurrentDate,
  getCurrentTimestamp
} = require("../functions/slash");


const router = express.Router();


// Get Driver's Active Orders 
// /driver_active_order
// {
//    "token": "",
// }
router.post(
  "/driver_active_order",
  body("token").isString().withMessage("token required !"),
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
        res.json({
          status: false,
          error: `${params.user.user_type} cannot add a vehicle selection  !`,
        });
        break;

      case "pro":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot add a vehicle selection  !`,
        });
        break;
      case "driver":
        req.body.driver = params.user;
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
  // Get Driver Profile
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("drivers")
      .child(params.driver.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const driver = snapshot.val();
          req.body.driver = driver;
          next();
        } else {
          res.json({
            status: false,
            error: "Driver Not Found !",
          });
        }
      });
  },
  // Get Active Order
  (req, res, next) => {
    const params = req.body;
    if (params.driver.status === "free") {
      console.log("Driver Does Not Have Active Order");
      req.body.activeorder = [];
      next();
    } else {
      const biltyNo = params.driver.bilty;
      const type = params.driver.request_type;

      if (type === "transit" || type === "upcountry") {
        const getOrderNo = biltyNo.slice(2, biltyNo.length - 2);

        pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();

            if (request.request_type) {
              const bilties = request.bilty;

              if (bilties) {
                if (bilties.length !== 0) {
                  const filterOut = bilties.filter((bilty) => {
                    return bilty.biltyNo === biltyNo;
                  });

                  if (filterOut) {
                    if (filterOut.length > 0) {
                      const bilty = filterOut[0];
                      console.log("bilty -> ", bilty);
                      const activeorders = [];

                      const data = {
                        cargo_insurance: request.cargo_insurance,
                        date: request.date,
                        orderNo: request.orderNo,
                        orgLat: request.orgLat,
                        orgLng: request.orgLng,
                        desLat: request.desLat,
                        desLng: request.desLng,
                        disText: request.disText,
                        durText: request.durText,
                        originAddress: request.originAddress || null,
                        destinationAddress: request.destinationAddress || null,
                        containerReturnAddress:
                          request.containerReturnAddress || null,
                        security_deposit: request.security_deposit || null,
                        user_id: request.user_id,
                        user_phone: request.user_phone,
                        vendor_phone: request.vendor_phone,
                        vendor_name: request.vendor_name,
                        user_type: request.user_type,
                        username: request.username,
                        request_type: request.request_type,
                        status: request.status,
                        createdAt: request.createdAt,
                        bilty: bilty,
                      };
                      if (request.payment_method) {
                        if (request.payment_method === "cod") {
                          data["payment_method"] = request.payment_method;
                          data["point_of_payment"] = request.point_of_payment;
                        } else {
                          data["payment_method"] = request.payment_method;
                        }
                      }
                      activeorders.push(data);
                      req.body.activeorder = activeorders;

                      next();
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

            // if (request.request_type === "upcountry") {
            //   const suborders = request.subOrders;
            //   let upcountrybiltydata;

            //   suborders.forEach((suborder) => {
            //     console.log("suborder -> ", suborder);
            //     suborder.bilty.forEach((bilty) => {
            //       console.log("bilty -> ", bilty);
            //       if (bilty.biltyNo === biltyNo) {
            //         console.log("found bilty");
            //         upcountrybiltydata = {
            //           ...bilty,
            //           materials: suborder.material,
            //           vehicle_type: suborder.type,
            //           option: suborder.option,
            //           option_quantity: suborder.option_quantity,
            //           subOrderNo: suborder.subOrderNo,
            //           user_phone: suborder.user_phone,
            //           vendor_phone: suborder.vendor_phone || null,
            //           vendor_name: suborder.vendor_name || null,
            //           weight: suborder.weight,
            //           cargo_insurance: request.cargo_insurance,
            //           date: request.date,
            //           orderNo: request.orderNo,
            //           orgLat: request.orgLat,
            //           orgLng: request.orgLng,
            //           desLat: request.desLat,
            //           desLng: request.desLng,
            //           disText: request.disText,
            //           durText: request.durText,
            //           originAddress: request.originAddress || null,
            //           destinationAddress: request.destinationAddress || null,
            //           containerReturnAddress:
            //             request.containerReturnAddress || null,
            //           security_deposit: request.security_deposit || null,
            //           user_id: request.user_id,
            //           user_phone: request.user_phone,
            //           user_type: request.user_type,
            //           username: request.username,
            //           request_type: request.request_type,
            //           status: request.status,
            //           createdAt: request.createdAt,
            //         };
            //       }
            //     });
            //   });

            //   if (upcountrybiltydata) {
            //     if (request.payment_method) {
            //       if (request.payment_method === "cod") {
            //         upcountrybiltydata["payment_method"] =
            //           request.payment_method;
            //         upcountrybiltydata["point_of_payment"] =
            //           request.point_of_payment;
            //       } else {
            //         upcountrybiltydata["payment_method"] =
            //           request.payment_method;
            //       }
            //     }
            //     req.body.activeorder = [upcountrybiltydata];
            //     next();
            //   } else {
            //     console.log("upcountry issue");
            //     req.body.activeorder = [];
            //     next();
            //   }
            // }
          } else {
            res.json({
              status: false,
              error: "Could Not Found request !",
            });
          }
        });
      }
    }
  },
  // Get Completed Order
  async (req, res, next) => {
    const params = req.body;

    const pplHistorySnap = await driverHistoryRef
      .child(params.driver.phone)
      .once("value");
    

    const rawpplHistory = await pplHistorySnap.val();


    const pplHistory = [];

    if (rawpplHistory !== null) {
      const convert3 = Object.entries(rawpplHistory);
      convert3.forEach((x) => {
        pplHistory.push(x[1]);
      });
    }


    const allhistories = [...pplHistory];

    // Get Rejected
    const rejectedOrders = allhistories.filter((history) => {
      return history.status === "rejected";
    });

    // Get Completed
    const completedOrders = allhistories.filter((history) => {
      return history.status === "completed";
    });

    res.json({
      status: true,
      active: [...params.activeorder],
      rejected: [...rejectedOrders],
      completed: [...completedOrders],
    });
  }
);

// "1" => Driver Reached To The Origin Location
// /reached_origin
// {
//    "token": "",
//    "biltyNo": "",
// }
router.post(
  "/reached_origin",
  body("token").isString().withMessage("token required !"),
  body("biltyNo")
    .isString()
    .withMessage("biltyNo Required Format -> BT0003a1!"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  // Verify Firebase idToken Give User Object
  verifyTokenFirebase,
  // Check User Type
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        res.json({
          status: false,
          error: "users can not accept bilty ! only drivers can !",
        });
        break;
      case "pro":
        res.json({
          status: false,
          error: "users can not accept bilty ! only drivers can !",
        });
        break;
      case "vendor":
        res.json({
          status: false,
          error: "Vendors can not accept bilty ! only drivers can !",
        });
        break;
      case "driver":
        req.body.driver = params.user;
        next();
        break;

      default:
        res.json({
          status: false,
          error: "Unknown Type",
        });
        break;
    }
  },
  // Check Driver / Get Driver Data
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("drivers")
      .child(params.driver.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const driver = snapshot.val();
          if(driver.blocked === false || driver.blocked === 'false') {
          req.body.driver = driver;
          console.log("Driver Data Added");
          next();
          }else {
            res.json({
              status:false,
              error: "Blocked Drivers Cant Perform Any Actions !"
            })
          }
        } else {
          res.json({
            status: false,
            error: "Driver Not Found !",
          });
        }
      });
  },
  // Get Request Data
  (req, res, next) => {
    // Driver Phone Required
    // Request Id Required
    const params = req.body;

    let getLength = params.biltyNo.length;
      const getOrderNo = params.biltyNo.slice(2, getLength - 2);

      pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
        if (snapshot.val()) {
          // TODO : ADD REQUEST STATUS CONDITIION
          const request = snapshot.val();
          req.body.request = request;
          console.log("-Request Data Received");
          next();
        } else {
          res.json({
            status: false,
            error: "Could Not Found request !",
          });
        }
      });
  },
  // Check Bilty Status 
  (req, res, next) => {
    const params = req.body;
    
     //  FOR PPL REQUESTS
     const transitbilties = params.request.bilty;

     if (transitbilties) {
       if (transitbilties.length !== 0) {
         const filterOut = transitbilties.filter((bilty) => {
           return bilty.biltyNo === params.biltyNo;
         });

         if (filterOut) {
           if (filterOut.length !== 0) {
             const bilty = filterOut[0];
             console.log("bilty -> ", bilty);
             if (bilty.type === "vehicle") {
               if (bilty.status == "inprocess") {
                 req.body.bilty = bilty;
                 next();
               } else {
                 res.json({
                   status: false,
                   error: `Cannot Update Bilty - Bilty Status is ${bilty.status} !`,
                 });
               }
             } else if (bilty.type === "loading/unloading") {
               if (!bilty.driver_reached_on) {
                 req.body.bilty = bilty;
                 next();
               } else {
                 res.json({
                   status: false,
                   error: `Cannot Update Bilty - Bilty Status is ${bilty.status} !`,
                 });
               }
             }
           } else {
             res.json({
               status: false,
               error: "Bilty Not Found !",
             });
           }
         }
       }
     }
  },
  // Update Bilty
  (req, res, next) => {
    const params = req.body;

    const getOrderNo = params.biltyNo.slice(2, params.biltyNo.length - 2);
    const transitbilties = params.request.bilty;

    if (params.bilty.type === "vehicle") {
      transitbilties.forEach((bilty) => {
        if (bilty["biltyNo"] == params.biltyNo) {
          console.log("params.driver.phone -> ", params.driver.phone);

          if (
            bilty.driver_phone &&
            bilty.driver_phone === params.driver.phone
          ) {
            bilty["status"] = "driver_reached";
            bilty["driver_reached_on"] = getCurrentDate();
          } else {
            res.json({
              status: false,
              error: "Driver Allotted On Bilty Does Not Match With You !",
            });
          }
        }
      });
    } else if (params.bilty.type === "loading/unloading") {
      transitbilties.forEach((bilty) => {
        if (bilty["biltyNo"] == params.biltyNo) {
          let loading = bilty.loading_options;
          let unloading = bilty.unloading_options;
          let optionUpdateStatus = false;
          req.body.currentBilty = bilty;

          console.log("loading -> ", loading);
          console.log("unloading -> ", unloading);

          if (bilty.loading_options.length >= 1) {
            bilty.loading_options.forEach((x, index) => {
              if (x.id === params.option_id) {
                console.log("loading id matched");

                x["driver_name"] = params.driver.fullname;
                x["driver_phone"] = params.vehicle_driver;
                x["driver_alotted_on"] = getCurrentDate();
                optionUpdateStatus = true;
              }
            });
          }

          if (bilty.unloading_options.length >= 1) {
            bilty.unloading_options.forEach((x, index) => {
              if (x.id === params.option_id) {
                console.log("unloading id matched");

                x["driver_name"] = params.driver.fullname;
                x["driver_phone"] = params.vehicle_driver;
                x["driver_alotted_on"] = getCurrentDate();
                optionUpdateStatus = true;
              }
            });
          }

          if (optionUpdateStatus) {
            console.log("updated loading -> ", loading);
            console.log("updated unloading -> ", unloading);
          } else {
            console.log("option not found");
          }
        }
      });
    }

    pplRequestRef
      .child(getOrderNo)
      .update({
        bilty: transitbilties,
      })
      .then(() => {
        next();
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  },
   // Send Notifications & Save In Database
  (req,res) => {
    const params = req.body;

    fcmTokenRef.child('users').child(params.request.user_phone).once('value').then(snapshot => {
      send_notification_to_single_user(snapshot.val().fcm_token.token, {
        title: "Driver: Reached To Origin Location",
        body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} has reached to origin location.`
        , routes: "MyOrders"
      })


      let newNotification = notificationsRef.child('users').child(params.request.user_phone).push();
      let AdminNotification = notificationsRef.child('admin').push();
      newNotification.set({
        id: newNotification.key,
        title: "Driver: Reached To Origin Location",
        body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} has reached to origin location.`,
        created: getCurrentTimestamp(),
        read: false
      }).catch(err => console.log('err -> ',err))

      AdminNotification.set({
        id: AdminNotification.key,
        title: `Driver(${params.driver.fullname}) Reached To Origin Location`,
        body: `Driver(${params.driver.fullname}) Has Reached To Origin Location On OrderNo#${params.request.orderNo}.`,
        created: getCurrentTimestamp(),
        read: false
      }).catch(err => console.log('err -> ',err))
   
    })


    res.json({
      status: true,
      error: "Driver reached successfully!",
    });

  }
);

// "2" => Driver Picked Up The Load
// /driver_picked_up_load
// {
//    "token": "",
//    "biltyNo": "",
// }
router.post(
  "/picked_up_load",
  body("token").isString().withMessage("token required !"),
  body("biltyNo").isString().withMessage("biltyNo Required Format -> BT0003a1!"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  // Verify Firebase idToken Give User Object
  verifyTokenFirebase,
  // Check User Type
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        res.json({
          status: false,
          error:
            "Vendors can not accept bilty ! only driver or vendor driver can !",
        });
        break;
      case "driver":
        req.body.driver = params.user;
        next();
        break;

      default:
        res.json({
          status: false,
          error: "Unknown User Type !",
        });
        break;
    }
  },
  // Get Request Data
  (req, res, next) => {
    // Order No Required
    const params = req.body;

    let getLength = params.biltyNo.length;
    const getOrderNo = params.biltyNo.slice(2, getLength - 2);

    pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();
        req.body.request = request;
        next();
      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });
  },
  // Check Bilty Status 
  (req, res, next) => {
    const params = req.body;
    //  FOR PPL REQUESTS
    const transitbilties = params.request.bilty;

    if (transitbilties) {
      if (transitbilties.length !== 0) {
        const filterOut = transitbilties.filter((bilty) => {
          return bilty.biltyNo === params.biltyNo;
        });

        if (filterOut) {
          if (filterOut.length !== 0) {
            const bilty = filterOut[0];
            console.log("bilty -> ", bilty);

            if (bilty.status == "driver_reached") {
              req.body.bilty = bilty;
              next();
            } else {
              res.json({
                status: false,
                error: `Cannot Update Bilty - Bilty Status is ${bilty.status} !`,
              });
            }
          } else {
            res.json({
              status: false,
              error: "Bilty Not Found !",
            });
          }
        }
      }
    }

  },
  // Update Bilty & Order
  (req, res, next) => {
    const params = req.body;

    const getOrderNo = params.biltyNo.slice(2, params.biltyNo.length - 2);

      const transitbilties = params.request.bilty;

      transitbilties.forEach((bilty) => {
        if (bilty["biltyNo"] == params.biltyNo) {
          if (
            bilty.driver_phone &&
            bilty.driver_phone === params.driver.user_id
          ) {
            bilty["status"] = "driver_pickup";
            bilty["driver_pickup_on"] = getCurrentDate();
          } else {
            res.json({
              status: false,
              error: "Driver Allotted On Bilty Does Not Match With You !",
            });
          }
        }
      });

      pplRequestRef
        .child(getOrderNo)
        .update({
          bilty: transitbilties,
        })
        .then(() => {
          next();
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
  },
   // Send Notifications & Save In Database
   (req,res) => {
    const params = req.body;

    let getLength = params.biltyNo.length;
    const getOrderNo = params.biltyNo.slice(2, getLength - 2);

    fcmTokenRef.child('users').child(params.request.user_phone).once('value').then(snapshot => {
      if(snapshot.val()) {
        send_notification_to_single_user(snapshot.val().fcm_token.token, {
          title: "Driver: Picked Up The Load",
          body: `Dear ${params.request.username}, refering ${getOrderNo}, ${params.driver.fullname} has Picked Up The Load.`
          , routes: "MyOrders"
        }).then(()=>{
          let newNotification = notificationsRef.child('users').child(params.request.user_phone).push();
          let AdminNotification = notificationsRef.child('admin').push();
          newNotification.set({
            id: newNotification.key,
            title: "Driver: Picked Up The Load",
          body: `Dear ${params.request.username}, refering ${getOrderNo}, ${params.driver.fullname} has Picked Up The Load.`,
            created: getCurrentTimestamp(),
            read: false
          }).catch(err => console.log('err -> ',err))

          AdminNotification.set({
            id: AdminNotification.key,
            title: `Driver(${params.driver.fullname}) Picked Up The Load`,
            body: `Driver(${params.driver.fullname}) Has Picked Up The Load On OrderNo#${getOrderNo}.`,
            created: getCurrentTimestamp(),
            read: false
          }).catch(err => console.log('err -> ',err))
          res.json({
            status: true,
            error: "PPL : Driver Picked Up The Load Successfully !",
            notification:true
          });
        })
      } else {
        res.json({
          status: true,
          error: "PPL : Driver Picked Up The Load Successfully !",
          notification:false
        });
      }
    })
   
  }
);

// "3" => Driver Delivered
// /driver_delivered
// {
//    "token": "",
//    "biltyNo": "",
// }
router.post(
  "/driver_delivered",
  body("token").isString().withMessage("token required !"),
  body("biltyNo").isString().withMessage("biltyNo Required Format -> BT0003a1!"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  // Verify Firebase idToken Give User Object
  verifyTokenFirebase,
  // Check User Type
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        res.json({
          status: false,
          error: "Vendors set driver delivered ! only driver can !",
        });
        break;
      case "driver":
        req.body.driver = params.user;
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
  // Get Request Data
  (req, res, next) => {
    // Driver Phone Required
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
          error: "Could Not Found request !",
        });
      }
    });
  },
  // Get User Data
  (req, res, next) => {
    const params = req.body;

    userRef
    .child("users")
    .child(params.request.user_phone)
    .once("value", (snapshot) => {
      if (snapshot.val()) {
        const user = snapshot.val();
        req.body.user = user;
        console.log("User Data Added !");
        next();
      } else {
        userRef
          .child("pro")
          .child(params.request.user_phone)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              const user = snapshot.val();
              req.body.user = user;
              console.log("User Data Added !");
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
  // Check Bilty Status
  (req, res, next) => {
    const params = req.body;
    
     //  FOR PPL REQUESTS
     const transitbilties = params.request.bilty;

     if (transitbilties) {
       if (transitbilties.length !== 0) {
         const filterOut = transitbilties.filter((bilty) => {
           return bilty.biltyNo === params.biltyNo;
         });

         if (filterOut) {
           if (filterOut.length !== 0) {
             const bilty = filterOut[0];
             console.log("bilty -> ", bilty);

             if (bilty.status == "driver_pickup") {
               req.body.bilty = bilty;
               next();
             } else {
               res.json({
                 status: false,
                 error: `Cannot Update Bilty - Bilty Status is ${bilty.status} !`,
               });
             }
           } else {
             res.json({
               status: false,
               error: "Bilty Not Found !",
             });
           }
         }
       }
     }
  },
  // Update Bilty 
  (req, res, next) => {
    const params = req.body;
    
    const transitbilties = params.request.bilty;

      transitbilties.forEach((bilty) => {
        if (bilty["biltyNo"] == params.biltyNo) {
          if (
            bilty.driver_phone &&
            bilty.driver_phone === params.driver.user_id
          ) {
            bilty["status"] = "driver_delivered";
            bilty["driver_delivered_on"] = getCurrentDate();
          } else {
            res.json({
              status: false,
              error: "Driver Allotted On Bilty Does Not Match With You !",
            });
          }
        }
      });

      let getLength = params.biltyNo.length;
      const getOrderNo = params.biltyNo.slice(2, getLength - 2);

      pplRequestRef
        .child(getOrderNo)
        .update({
          bilty: transitbilties,
        })
        .then(() => {
          next();
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
  },
  // Create Driver History
  (req, res, next) => {
    const params = req.body;

    const getOrderNo = params.biltyNo.slice(2, params.biltyNo.length - 2);

      driverHistoryRef
        .child(params.driver.user_id)
        .child(params.biltyNo)
        .set({
          ...params.request,
          orderNo: getOrderNo,
          biltyNo: params.biltyNo,
          driver_alotted_on: params.bilty.driver_alotted_on,
          driver_reached_on: params.bilty.driver_reached_on,
          driver_pickup_on: params.bilty.driver_pickup_on,
          driver_delivered_on: params.bilty.driver_delivered_on,
          status: "delivered",
          type: `${params.request.request_type}`,
        })
        .then(() => {
          next();
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
  },
   // Send Notifications And Save In Database
   (req,res) => {
    const params = req.body;

    fcmTokenRef.child('users').child(params.request.user_phone).once('value').then(snapshot => {
      send_notification_to_single_user(snapshot.val().fcm_token.token, {
        title: "Driver: Driver Delivered The Load",
        body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} has Driver Delivered The Load.`
        , routes: "MyOrders"
      })

      let newNotification = notificationsRef.child('users').child(params.request.user_phone).push();
      let AdminNotification = notificationsRef.child('admin').push();
      newNotification.set({
        id: newNotification.key,
        title: "Driver: Driver Delivered The Load",
        body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} has Driver Delivered The Load.`,
        created: getCurrentTimestamp(),
        read: false
      }).catch(err => console.log('err -> ',err))

      AdminNotification.set({
        id: AdminNotification.key,
        title: `Driver(${params.driver.fullname}) Driver Delivered The Load`,
        body: `Driver(${params.driver.fullname}) Has Driver Delivered The Load On OrderNo#${params.request.orderNo}.`,
        created: getCurrentTimestamp(),
        read: false
      }).catch(err => console.log('err -> ',err))
    })


    res.json({
      status: true,
      error: "PPL : Driver Delivered The Load Successfully !",
    });
  }
);


// "4" => Driver Unloading Complete
// /unloading_complete
// {
//    "token": "",
//    "biltyNo": "",
// }
router.post(
  "/unloading_complete",
  body("token").isString().withMessage("token required !"),
  body("biltyNo").isString().withMessage("biltyNo Required Format -> BT0003a1!"),
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
  // Check User Type
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        res.json({
          status: false,
          error: "Vendors set driver delivered ! only driver can !",
        });
        break;
      case "driver":
        req.body.driver = params.user;
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
  // Get Request Data
  (req, res, next) => {
    // Driver Phone Required
    // Request Id Required
    const params = req.body;

    const getOrderNo = params.biltyNo.slice(2, params.biltyNo.length - 2);

    pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        // TODO : ADD REQUEST STATUS CONDITIION
        const request = snapshot.val();
        req.body.request = request;
        next();
      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });
  },
  // Get User Data
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.request.user_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          console.log("User Data Added !");
          next();
        } else {
          userRef
            .child("pro")
            .child(params.request.user_phone)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                req.body.user = user;
                console.log("User Data Added !");
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
  // Check Bilty Status For PPL
  (req, res, next) => {
    const params = req.body;

    const transitbilties = params.request.bilty;

    if (transitbilties) {
      if (transitbilties.length !== 0) {
        const filterOut = transitbilties.filter((bilty) => {
          return bilty.biltyNo === params.biltyNo;
        });

        if (filterOut) {
          if (filterOut.length !== 0) {
            const bilty = filterOut[0];
            console.log("bilty -> ", bilty);

            if (bilty.status == "driver_delivered") {
              req.body.bilty = bilty;
              next();
            } else {
              res.json({
                status: false,
                error: `Cannot Update Bilty - Bilty Status is ${bilty.status} !`,
              });
            }
          } else {
            res.json({
              status: false,
              error: "Bilty Not Found !",
            });
          }
        }
      }
    }
  },
  // Update Bilty For PPL
  (req, res, next) => {
    const params = req.body;

    const transitbilties = params.request.bilty;

    transitbilties.forEach((bilty) => {
      if (bilty["biltyNo"] == params.biltyNo) {
        if (
          bilty.driver_phone &&
          bilty.driver_phone === params.driver.user_id
        ) {
          bilty["status"] = "unloading_complete";
          bilty["unloading_complete_on"] = getCurrentDate();
        } else {
          res.json({
            status: false,
            error: "Driver Allotted On Bilty Does Not Match With You !",
          });
        }
      }
    });

    let getLength = params.biltyNo.length;
    const getOrderNo = params.biltyNo.slice(2, getLength - 2);

    pplRequestRef
      .child(getOrderNo)
      .update({
        bilty: transitbilties,
      })
      .then(() => {
        next();
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  },
  // Create Driver History
  (req, res, next) => {
    const params = req.body;
    const getOrderNo = params.biltyNo.slice(2, params.biltyNo.length - 2);
    req.body.orderNo = orderNo;

    driverHistoryRef
      .child(params.driver.user_id)
      .child(params.biltyNo)
      .set({
        ...params.request,
        orderNo: getOrderNo,
        biltyNo: params.biltyNo,
        driver_alotted_on: params.bilty.driver_alotted_on,
        driver_reached_on: params.bilty.driver_reached_on,
        driver_pickup_on: params.bilty.driver_pickup_on,
        driver_delivered_on: params.bilty.driver_delivered_on,
        unloading_complete_on: getCurrentDate(),
        status: "unloading_complete",
        type: `${params.request.request_type}`,
      })
      .then(() => {
        next();
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  },
   // Send Notifications
   (req,res) => {
    const params = req.body;

    // send_noti - vendor_allot_vehicle_and_driver_to_request
    // fcmTokenRef.child('drivers').child(params.driver.phone).once('value').then(snapshot => {
    //   send_notification_to_single_user(snapshot.val().fcm_token.token, {
    //     title: "Driver: Assigned by vendor",
    //     body: `Dear ${params.driver.fullname}, refering ${params.request.orderNo}, your are assigned to ${req.body.currentOption.type} option - ${params.currentOption.name}.`
    //   })
    // })

    fcmTokenRef.child('users').child(params.request.user_phone).once('value').then(snapshot => {
      if(snapshot.val()) {
        send_notification_to_single_user(snapshot.val().fcm_token.token, {
          title: "Driver: Unloading Completed",
          body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} has completed the unloading process.`
          , routes: "MyOrders"
        })


        let newNotification = notificationsRef.child('users').child(params.request.user_phone).push();
        let AdminNotification = notificationsRef.child('admin').push();
        newNotification.set({
          id: newNotification.key,
          title: "Driver: Unloading Completed",
          body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} has completed the unloading process.`,
          created: getCurrentTimestamp(),
          read: false
        }).catch(err => console.log('err -> ',err))

        AdminNotification.set({
          id: AdminNotification.key,
          title: `Driver(${params.driver.fullname}) Unloading Completed`,
          body: `Driver(${params.driver.fullname}) Has Unloading Completed On OrderNo#${params.request.orderNo}.`,
          created: getCurrentTimestamp(),
          read: false
        }).catch(err => console.log('err -> ',err))
      } else {
        res.json({
          status: true,
          error: "PPL : Driver Unloading Completed Successfully !",
          notification:true
        });
      }
    })


    res.json({
      status: true,
      error: "PPL : Driver Unloading Completed Successfully !",
      notification:false
    });
  }
);

// "5" => Driver Returning Container
// /driver_returning_container
// {
//    "token": "",
//    "biltyNo": "",
// }
router.post(
  "/driver_returning_container",
  body("token").isString().withMessage("token required !"),
  body("biltyNo").isString().withMessage("biltyNo Required Format -> BT0003a1!"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  // Verify Firebase idToken Give User Object
  verifyTokenFirebase,
  // Check User Type
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        res.json({
          status: false,
          error: "Vendors can not accept bilty ! only driver can !",
        });
        break;
      case "driver":
        req.body.driver = params.user;
        next();
        break;

      default:
        res.json({
          status: false,
          error: "Unknown Type !",
        });
        break;
    }
  },
  // Get Request Data
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
          error: "Could Not Found request !",
        });
      }
    });
  },
  // Check Bilty Status For PPL
  (req, res, next) => {
    const params = req.body;

    const transitbilties = params.request.bilty;

    if (transitbilties) {
      if (transitbilties.length !== 0) {
        const filterOut = transitbilties.filter((bilty) => {
          return bilty.biltyNo === params.biltyNo;
        });

        if (filterOut) {
          if (filterOut.length !== 0) {
            const bilty = filterOut[0];
            console.log("bilty -> ", bilty);

            if (bilty.status == "unloading_complete") {
              req.body.bilty = bilty;
              next();
            } else {
              res.json({
                status: false,
                error: `Cannot Update Bilty - Bilty Status is ${bilty.status} !`,
              });
            }
          } else {
            res.json({
              status: false,
              error: "Bilty Not Found !",
            });
          }
        }
      }
    }
  },
  // Update Bilty For PPL
  (req, res, next) => {
    const params = req.body;

    const transitbilties = params.request.bilty;

    

    transitbilties.forEach((bilty) => {
      if (bilty["biltyNo"] == params.biltyNo) {
        if (
          bilty.driver_phone &&
          bilty.driver_phone === params.driver.user_id
        ) {
          bilty["status"] = "container_returned";
          bilty["container_returned_on"] = getCurrentDate();
          req.body.vehicle_number =
            bilty["vehicle"] || bilty["vehicle_number"];
        } else {
          res.json({
            status: false,
            error: "Driver Allotted On Bilty Does Not Match With You !",
          });
        }
      }
    });

    // console.log('transitbilties -> ',transitbilties);

    let getLength = params.biltyNo.length;
    const getOrderNo = params.biltyNo.slice(2, getLength - 2);
    console.log('getOrderNo -> ',getOrderNo)
    pplRequestRef
      .child(getOrderNo)
      .update({
        bilty: transitbilties,
      })
      .then(() => {
        console.log('bilties updated')
        next();
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  },
  // Check If All Bilties Are Completed
  (req, res, next) => {
    const params = req.body;

    const transitbilties = params.request.bilty;
    let biltyCompletionChecker = true;

    if (transitbilties) {
      if (transitbilties.length !== 0) {
        transitbilties.forEach((bilty) => {
          if (bilty.status && bilty.type === 'vehicle') {
            if (bilty.status !== "container_returned") {
              biltyCompletionChecker = false;
            }
          }
        });
      }
    }

    // console.log('transitbilties -> ',transitbilties);

    if (biltyCompletionChecker) {
      // Order Completed
      pplRequestRef
        .child(params.request.orderNo)
        .update({
          status: "completed",
          order_completed_on: getCurrentDate(),
        })
        .then(() => {
          console.log('bilty completed')
          next();
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    } else {
      console.log('bilty not completed')
      next();
    }
  },
  // Create Driver History
  (req, res, next) => {
    const params = req.body;

    console.log('on driver history');

    let data = {
      ...params.request,
      biltyNo: params.biltyNo,
      ...params.bilty,
      bilty_status: params.bilty.status,
      status: "completed",
      type: `${params.request.request_type}`,
    }
    
     
    console.log('params.driver.user_id -> ',params.driver.user_id)
    console.log('params.biltyNo -> ',params.biltyNo);
    driverHistoryRef
      .child(params.driver.user_id)
      .child(params.biltyNo)
      .set(data)
      .then(() => {
        console.log('driver history updated');
        next();
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  },  
  // Update Driver
  (req, res, next) => {
    const params = req.body;

    console.log('params.driver.user_id -> ',params.driver.user_id)

    userRef
      .child("drivers")
      .child(params.driver.user_id)
      .update({
        bilty: null,
        request_type: null,
        option_id: null,
        status: "free",
      })
      .then(() => {
        next();
      })
      .catch((err) => {
        res.json({
          status: false,
          error: "",
        });
      });
  },
  // Update Vehicle
  (req, res, next) => {
    const params = req.body;

    console.log('params.bilty.vehicle_id -> ',params.bilty.vehicle_id)

    pplVendorVehicleRef
      .child(params.bilty.vehicle_id)
      .update({
        available: true,
        bilty: null,
        option_id: null,
      })
      .then(() => {
        next();
      })
      .catch((err) => {
        next();
      });
  },
  // Send Notifications & Save In Database
  (req,res) => {
    const params = req.body;

    fcmTokenRef.child('users').child(params.request.user_phone).once('value').then(snapshot => {
      if(snapshot.val()) {
        send_notification_to_single_user(snapshot.val().fcm_token.token, {
          title: "Driver: Empty Container Returned",
          body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} has returned the empty container.`
          , routes: "MyOrders"
        })


        let newNotification = notificationsRef.child('users').child(params.request.user_phone).push();
        let AdminNotification = notificationsRef.child('admin').push();
        newNotification.set({
          id: newNotification.key,
          title: "Driver: Empty Container Returned",
          body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} has returned the empty container.`,
          created: getCurrentTimestamp(),
          read: false
        }).catch(err => console.log('err -> ',err))

        AdminNotification.set({
          id: AdminNotification.key,
          title: `Driver(${params.driver.fullname}) Empty Container Returned`,
          body: `Driver(${params.driver.fullname}) Has Empty Container Returned On OrderNo#${params.request.orderNo}.`,
          created: getCurrentTimestamp()
        }).catch(err => console.log('err -> ',err))
      } else {
        res.json({
          status: true,
          error: "PPL : Empty Container Returned Successfully !",
          notification:true
        });
      }
    })

    res.json({
      status: true,
      error: "PPL : Empty Container Returned Successfully !",
      notification:false
    });
  }
);

// Vendor Update Status On Driver's Behalf

// "6" => Driver Reached To The Origin Location by Vendor
// /vendor_updates_reached_origin
// {
//    "token": "",
//    "biltyNo": "",
//    "driver_phone" : ""
// }
router.post(
  "/vendor_updates_reached_origin",
  body("token").isString().withMessage("token required !"),
  body("biltyNo").isString().withMessage("biltyNo Required Format -> BT0003a1!"),

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
  // Check User Type
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        res.json({
          status: false,
          error: "users can not accept bilty ! only drivers can !",
        });
        break;
      case "pro":
        res.json({
          status: false,
          error: "users can not accept bilty ! only drivers can !",
        });
        break;
      case "vendor":
        req.body.vendor = params.vendor;
        next();

        break;
      case "driver":
        res.json({
          status: false,
          error: "Driver can not use this service ! only vendors can !",
        });
        break;

      default:
        res.json({
          status: false,
          error: "Unknown Type",
        });
        break;
    }
  },
  // Get Request Data
  (req, res, next) => {
    // Driver Phone Required
    // Request Id Required
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
          error: "Could Not Found request !",
        });
      }
    });
  },
  // Get User Data
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.request.user_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          console.log("User Data Added !");
          next();
        } else {
          userRef
            .child("pro")
            .child(params.request.user_phone)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                req.body.user = user;
                console.log("User Data Added !");
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
   // Get Driver Data
   (req, res, next) => {
    const params = req.body;

    userRef
      .child("drivers")
      .child(params.driver_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.driver = user;
          console.log("Driver Data Added !");
          next();
        } else {
          res.json({
            status:false,
            error: "Driver Not Found !"
          })
        }
      });
  },
  // Check Driver / Get Driver Data
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("drivers")
      .child(params.driver_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const driver = snapshot.val();
          req.body.driver = driver;
          console.log("Driver Data Added");
          next();
        } else {
          res.json({
            status: false,
            error: "Driver Not Found !",
          });
        }
      });
  },
  // Get Request Data
  (req, res, next) => {
    // Driver Phone Required
    // Order No Required
    const params = req.body;

    let getLength = params.biltyNo.length;
    const getOrderNo = params.biltyNo.slice(2, getLength - 2);

    pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();
        req.body.request = request;
        console.log("-Request Data Received");
        next();
      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });
  },
  // Check Bilty Status For PPL
  (req, res, next) => {
    const params = req.body;
    const transitbilties = params.request.bilty;

    if (transitbilties) {
      if (transitbilties.length !== 0) {
        const filterOut = transitbilties.filter((bilty) => {
          return bilty.biltyNo === params.biltyNo;
        });

        if (filterOut) {
          if (filterOut.length !== 0) {
            const bilty = filterOut[0];
            console.log("bilty -> ", bilty);
            if (bilty.type === "vehicle") {
              if (bilty.status == "inprocess") {
                req.body.bilty = bilty;
                next();
              } else {
                res.json({
                  status: false,
                  error: `Cannot Update Bilty - Bilty Status is ${bilty.status} !`,
                });
              }
            } else if (bilty.type === "loading/unloading") {
              if (!bilty.driver_reached_on) {
                req.body.bilty = bilty;
                next();
              } else {
                res.json({
                  status: false,
                  error: `Cannot Update Bilty - Bilty Status is ${bilty.status} !`,
                });
              }
            }
          } else {
            res.json({
              status: false,
              error: "Bilty Not Found !",
            });
          }
        }
      }
    }
  },
  // Update Bilty For PPL
  (req, res, next) => {
    const params = req.body;

    const getOrderNo = params.biltyNo.slice(2, params.biltyNo.length - 2);
    const transitbilties = params.request.bilty;

    if (params.bilty.type === "vehicle") {
      transitbilties.forEach((bilty) => {
        if (bilty["biltyNo"] == params.biltyNo) {
          console.log("params.driver.phone -> ", params.driver.phone);

          if (
            bilty.driver_phone &&
            bilty.driver_phone === params.driver.phone
          ) {
            bilty["status"] = "driver_reached";
            bilty["driver_reached_on"] = getCurrentDate();
          } else {
            res.json({
              status: false,
              error: "Driver Allotted On Bilty Does Not Match With You !",
            });
          }
        }
      });
    } else if (params.bilty.type === "loading/unloading") {
      transitbilties.forEach((bilty) => {
        if (bilty["biltyNo"] == params.biltyNo) {
          let loading = bilty.loading_options;
          let unloading = bilty.unloading_options;
          let optionUpdateStatus = false;
          req.body.currentBilty = bilty;

         // console.log("loading -> ", loading);
         // console.log("unloading -> ", unloading);

          if (bilty.loading_options.length >= 1) {
            bilty.loading_options.forEach((x, index) => {
              if (x.id === params.option_id) {
              //  console.log("loading id matched");

                x["driver_name"] = params.driver.fullname;
                x["driver_phone"] = params.vehicle_driver;
                x["driver_alotted_on"] = getCurrentDate();
                optionUpdateStatus = true;
              }
            });
          }

          if (bilty.unloading_options.length >= 1) {
            bilty.unloading_options.forEach((x, index) => {
              if (x.id === params.option_id) {
               // console.log("unloading id matched");

                x["driver_name"] = params.driver.fullname;
                x["driver_phone"] = params.vehicle_driver;
                x["driver_alotted_on"] = getCurrentDate();
                optionUpdateStatus = true;
              }
            });
          }

          if (optionUpdateStatus) {
            //console.log("updated loading -> ", loading);
           // console.log("updated unloading -> ", unloading);
          } else {
           // console.log("option not found");
          }
        }
      });
    }

    pplRequestRef
      .child(getOrderNo)
      .update({
        bilty: transitbilties,
      })
      .then(() => {
        next();
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  },
  // Send Notifications
  (req,res) => {
    const params = req.body;

    fcmTokenRef.child('users').child(params.request.user_phone).once('value').then(snapshot => {
      send_notification_to_single_user(snapshot.val().fcm_token.token, {
        title: "Driver: Reached To Origin Location",
        body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} has reached to origin location.`
        , routes: "MyOrders"
      })


      let newNotification = notificationsRef.child('users').child(params.request.user_phone).push();
      let AdminNotification = notificationsRef.child('admin').push();
      newNotification.set({
        id: newNotification.key,
        title: "Driver: Reached To Origin Location",
        body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} has reached to origin location.`,
        created: getCurrentTimestamp(),
        read: false
      }).catch(err => console.log('err -> ',err))

      AdminNotification.set({
        id: AdminNotification.key,
        title: `Driver(${params.driver.fullname}) Reached To Origin Location`,
        body: `Driver(${params.driver.fullname}) Has Reached To Origin Location On OrderNo#${params.request.orderNo}.`,
        created: getCurrentTimestamp(),
        read: false
      }).catch(err => console.log('err -> ',err))
   
    })


    res.json({
      status: true,
      error: "Driver reached successfully!",
    });
  }
);

// "7" => Driver Picked Up The Load
// /vendor_updates_picked_up_load
// {
//    "token": "",
//    "biltyNo": "",
//    "driver_phone" : ""
// }
router.post(
  "/vendor_updates_picked_up_load",
  body("token").isString().withMessage("token required !"),
  body("biltyNo").isString().withMessage("biltyNo Required Format -> BT0003a1!"),

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
  // Check User Type
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        res.json({
          status: false,
          error: "users can not accept bilty ! only drivers can !",
        });
        break;
      case "pro":
        res.json({
          status: false,
          error: "users can not accept bilty ! only drivers can !",
        });
        break;
      case "vendor":
        req.body.vendor = params.vendor;
        next();

        break;
      case "driver":
        res.json({
          status: false,
          error: "Driver can not use this service ! only vendors can !",
        });
        break;

      default:
        res.json({
          status: false,
          error: "Unknown Type",
        });
        break;
    }
  },
  // Get Request Data
  (req, res, next) => {
    // Driver Phone Required
    // Request Id Required
    const params = req.body;

    let getLength = params.biltyNo.length;
    const getOrderNo = params.biltyNo.slice(2, getLength - 2);

    pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();
        req.body.request = request;
        next();
      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });
  },
  // Get User Data
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.request.user_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          console.log("User Data Added !");
          next();
        } else {
          userRef
            .child("pro")
            .child(params.request.user_phone)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                req.body.user = user;
                console.log("User Data Added !");
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
  // Get Driver Data
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("drivers")
      .child(params.driver_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.driver = user;
          console.log("Driver Data Added !");
          next();
        } else {
          res.json({
            status:false,
            error: "Driver Not Found !"
          })
        }
      });
  },
  // Check Bilty Status For PPL
  (req, res, next) => {
    const params = req.body;
    const transitbilties = params.request.bilty;

    if (transitbilties) {
      if (transitbilties.length !== 0) {
        const filterOut = transitbilties.filter((bilty) => {
          return bilty.biltyNo === params.biltyNo;
        });

        if (filterOut) {
          if (filterOut.length !== 0) {
            const bilty = filterOut[0];
            console.log("bilty -> ", bilty);

            if (bilty.status == "driver_reached") {
              req.body.bilty = bilty;
              next();
            } else {
              res.json({
                status: false,
                error: `Cannot Update Bilty - Bilty Status is ${bilty.status} !`,
              });
            }
          } else {
            res.json({
              status: false,
              error: "Bilty Not Found !",
            });
          }
        }
      }
    }
  },
  // Update Bilty For PPL
  (req, res, next) => {
    const params = req.body;

    const getOrderNo = params.biltyNo.slice(2, params.biltyNo.length - 2);

    const transitbilties = params.request.bilty;

    transitbilties.forEach((bilty) => {
      if (bilty["biltyNo"] == params.biltyNo) {
        if (
          bilty.driver_phone &&
          bilty.driver_phone === params.driver_phone
        ) {
          bilty["status"] = "driver_pickup";
          bilty["driver_pickup_on"] = getCurrentDate();
        } else {
          res.json({
            status: false,
            error: "Driver Allotted On Bilty Does Not Match With You !",
          });
        }
      }
    });

    pplRequestRef
      .child(getOrderNo)
      .update({
        bilty: transitbilties,
      })
      .then(() => {
        next();
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  },
  // Send Notifications
  (req,res) => {
    const params = req.body;

    let getLength = params.biltyNo.length;
      const getOrderNo = params.biltyNo.slice(2, getLength - 2);


    fcmTokenRef.child('users').child(params.request.user_phone).once('value').then(snapshot => {
      if(snapshot.val()) {
        send_notification_to_single_user(snapshot.val().fcm_token.token, {
          title: "Driver: Picked Up The Load",
          body: `Dear ${params.request.username}, refering ${getOrderNo}, ${params.driver.fullname} has Picked Up The Load.`
          , routes: "MyOrders"
        }).then(()=>{
          let newNotification = notificationsRef.child('users').child(params.request.user_phone).push();
          let AdminNotification = notificationsRef.child('admin').push();
          newNotification.set({
            id: newNotification.key,
            title: "Driver: Picked Up The Load",
          body: `Dear ${params.request.username}, refering ${getOrderNo}, ${params.driver.fullname} has Picked Up The Load.`,
            created: getCurrentTimestamp(),
            read: false
          }).catch(err => console.log('err -> ',err))

          AdminNotification.set({
            id: AdminNotification.key,
            title: `Driver(${params.driver.fullname}) Picked Up The Load`,
            body: `Driver(${params.driver.fullname}) Has Picked Up The Load On OrderNo#${getOrderNo}.`,
            created: getCurrentTimestamp(),
            read: false
          }).catch(err => console.log('err -> ',err))
          res.json({
            status: true,
            error: "PPL : Driver Picked Up The Load Successfully !",
            notification:true
          });
        })
      } else {
        res.json({
          status: true,
          error: "PPL : Driver Picked Up The Load Successfully !",
          notification:false
        });
      }
    })


   
  }
);

// "8" => Driver Delivered
// /vendor_updates_driver_delivered
// {
//    "token": "",
//    "biltyNo": "",
//    "driver_phone" : ""
// }
router.post(
  "/vendor_updates_driver_delivered",
  body("token").isString().withMessage("token required !"),
  body("biltyNo").isString().withMessage("biltyNo Required Format -> BT0003a1!"),

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
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        res.json({
          status: false,
          error: "users can not accept bilty ! only drivers can !",
        });
        break;
      case "pro":
        res.json({
          status: false,
          error: "users can not accept bilty ! only drivers can !",
        });
        break;
      case "vendor":
        req.body.vendor = params.vendor;
        next();

        break;
      case "driver":
        res.json({
          status: false,
          error: "Driver can not use this service ! only vendors can !",
        });
        break;

      default:
        res.json({
          status: false,
          error: "Unknown Type",
        });
        break;
    }
  },
  // Get Request Data
  (req, res, next) => {
    // Driver Phone Required
    // OrderNo Required
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
          error: "Could Not Found request !",
        });
      }
    });
  },
  // Get User Data
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.request.user_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          console.log("User Data Added !");
          next();
        } else {
          userRef
            .child("pro")
            .child(params.request.user_phone)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                req.body.user = user;
                console.log("User Data Added !");
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
    // Get Driver Data
  (req, res, next) => {
      const params = req.body;
  
      userRef
        .child("drivers")
        .child(params.driver_phone)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const user = snapshot.val();
            req.body.driver = user;
            console.log("User Data Added !");
            next();
          } else {
            res.json({
              status:false,
              error: "Driver Not Found !"
            })
          }
        });
  },
  // Check Bilty Status For PPL
  (req, res, next) => {
    const params = req.body;
    const transitbilties = params.request.bilty;

    if (transitbilties) {
      if (transitbilties.length !== 0) {
        const filterOut = transitbilties.filter((bilty) => {
          return bilty.biltyNo === params.biltyNo;
        });

        if (filterOut) {
          if (filterOut.length !== 0) {
            const bilty = filterOut[0];
            console.log("bilty -> ", bilty);

            if (bilty.status == "driver_pickup") {
              req.body.bilty = bilty;
              next();
            } else {
              res.json({
                status: false,
                error: `Cannot Update Bilty - Bilty Status is ${bilty.status} !`,
              });
            }
          } else {
            res.json({
              status: false,
              error: "Bilty Not Found !",
            });
          }
        }
      }
    }
  },
  // Update Bilty For PPL
  (req, res, next) => {
    const params = req.body;

    const transitbilties = params.request.bilty;

    transitbilties.forEach((bilty) => {
      if (bilty["biltyNo"] == params.biltyNo) {
        if (
          bilty.driver_phone &&
          bilty.driver_phone === params.driver_phone
        ) {
          bilty["status"] = "driver_delivered";
          bilty["driver_delivered_on"] = getCurrentDate();
        } else {
          res.json({
            status: false,
            error: "Driver Allotted On Bilty Does Not Match With You !",
          });
        }
      }
    });

    let getLength = params.biltyNo.length;
    const getOrderNo = params.biltyNo.slice(2, getLength - 2);

    pplRequestRef
      .child(getOrderNo)
      .update({
        bilty: transitbilties,
      })
      .then(() => {
        next();
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  },
  // Create Driver History
  (req, res, next) => {
    const params = req.body;
    // FOR PPL REQUEST

    const getOrderNo = params.biltyNo.slice(2, params.biltyNo.length - 2);

    driverHistoryRef
      .child(params.driver_phone)
      .child(params.biltyNo)
      .set({
        ...params.request,
        orderNo: getOrderNo,
        biltyNo: params.biltyNo,
        paymentMethod: params.request.payment_method || null,
        driver_alotted_on: params.bilty.driver_alotted_on || null,
        driver_reached_on: params.bilty.driver_reached_on || null,
        driver_pickup_on: params.bilty.driver_pickup_on || null,
        driver_delivered_on: params.bilty.driver_delivered_on || null,  
        status: "delivered",
        type: `${params.request.request_type}`,
      })
      .then(() => {
        next();
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  },
   // Send Notifications
   (req,res) => {
    const params = req.body;


    fcmTokenRef.child('users').child(params.request.user_phone).once('value').then(snapshot => {
      send_notification_to_single_user(snapshot.val().fcm_token.token, {
        title: "Driver: Driver Delivered The Load",
        body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} has Driver Delivered The Load.`
        , routes: "MyOrders"
      })

      let newNotification = notificationsRef.child('users').child(params.request.user_phone).push();
      let AdminNotification = notificationsRef.child('admin').push();
      newNotification.set({
        id: newNotification.key,
        title: "Driver: Driver Delivered The Load",
        body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} has Driver Delivered The Load.`,
        created: getCurrentTimestamp(),
        read: false
      }).catch(err => console.log('err -> ',err))

      AdminNotification.set({
        id: AdminNotification.key,
        title: `Driver(${params.driver.fullname}) Driver Delivered The Load`,
        body: `Driver(${params.driver.fullname}) Has Driver Delivered The Load On OrderNo#${params.request.orderNo}.`,
        created: getCurrentTimestamp(),
        read: false
      }).catch(err => console.log('err -> ',err))
    })


    res.json({
      status: true,
      error: "PPL : Driver Delivered The Load Successfully !",
    });
  }
);



// "9" => Vendor Updates Driver Unloading Complete
// /vendor_updates_driver_delivered
// {
//    "token": "",
//    "biltyNo": "",
//    "driver_phone" : ""
// }
router.post(
  "/vendor_updates_unloading_complete",
  body("token").isString().withMessage("token required !"),
  body("biltyNo").isString().withMessage("biltyNo Required Format -> BT0003a1!"),

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
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        res.json({
          status: false,
          error: "users can not accept bilty ! only drivers can !",
        });
        break;
      case "pro":
        res.json({
          status: false,
          error: "users can not accept bilty ! only drivers can !",
        });
        break;
      case "vendor":
        req.body.vendor = params.vendor;
        next();

        break;
      case "driver":
        res.json({
          status: false,
          error: "Driver can not use this service ! only vendors can !",
        });
        break;

      default:
        res.json({
          status: false,
          error: "Unknown Type",
        });
        break;
    }
  },
  // Get Request Data
  (req, res, next) => {
    // Driver Phone Required
    // Order No Required
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
          error: "Could Not Found request !",
        });
      }
    });
  },
  // Get User Data
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.request.user_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          console.log("User Data Added !");
          next();
        } else {
          userRef
            .child("pro")
            .child(params.request.user_phone)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                req.body.user = user;
                console.log("User Data Added !");
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
   // Get Driver Data
  (req, res, next) => {
      const params = req.body;
  
      userRef
        .child("drivers")
        .child(params.driver_phone)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const user = snapshot.val();
            req.body.driver = user;
            console.log("User Data Added !");
            next();
          } else {
            res.json({
              status:false,
              error: "Driver Not Found !"
            })
          }
        });
  },
  // Check Bilty Status For PPL
  (req, res, next) => {
    const params = req.body;
    //  FOR PPL REQUESTS
    const transitbilties = params.request.bilty;

    if (transitbilties) {
      if (transitbilties.length !== 0) {
        const filterOut = transitbilties.filter((bilty) => {
          return bilty.biltyNo === params.biltyNo;
        });

        if (filterOut) {
          if (filterOut.length !== 0) {
            const bilty = filterOut[0];
            console.log("bilty -> ", bilty);

            if (bilty.status == "driver_delivered") {
              req.body.bilty = bilty;
              next();
            } else {
              res.json({
                status: false,
                error: `Cannot Update Bilty - Bilty Status is ${bilty.status} !`,
              });
            }
          } else {
            res.json({
              status: false,
              error: "Bilty Not Found !",
            });
          }
        }
      }
    }
  },
  // Update Bilty For PPL
  (req, res, next) => {
    const params = req.body;

    const transitbilties = params.request.bilty;

    transitbilties.forEach((bilty) => {
      if (bilty["biltyNo"] == params.biltyNo) {
        if (
          bilty.driver_phone &&
          bilty.driver_phone === params.driver_phone
        ) {
          bilty["status"] = "unloading_complete";
          bilty["unloading_complete_on"] = getCurrentDate();
        } else {
          res.json({
            status: false,
            error: "Driver Allotted On Bilty Does Not Match With You !",
          });
        }
      }
    });

    let getLength = params.biltyNo.length;
    const getOrderNo = params.biltyNo.slice(2, getLength - 2);

    pplRequestRef
      .child(getOrderNo)
      .update({
        bilty: transitbilties,
      })
      .then(() => {
        next();
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  },
  // Create Driver History
  (req, res, next) => {
    const params = req.body;
    // FOR PPL REQUEST

    const getOrderNo = params.biltyNo.slice(2, params.biltyNo.length - 2);

    driverHistoryRef
      .child(params.driver_phone)
      .child(params.biltyNo)
      .set({
        ...params.request,
        orderNo: getOrderNo,
        biltyNo: params.biltyNo,
        paymentMethod: params.request.payment_method || null,
        driver_alotted_on: params.bilty.driver_alotted_on || null,
        driver_reached_on: params.bilty.driver_reached_on || null,
        driver_pickup_on: params.bilty.driver_pickup_on || null,
        driver_delivered_on: params.bilty.driver_delivered_on || null,
        unloading_complete_on: getCurrentDate(),
        status: "unloading_complete",
        type: `${params.request.request_type}`,
      })
      .then(() => {
        next();
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  },
  // Send Notifications
  (req,res) => {
    const params = req.body;

    fcmTokenRef.child('users').child(params.request.user_phone).once('value').then(snapshot => {
      if(snapshot.val()) {
        send_notification_to_single_user(snapshot.val().fcm_token.token, {
          title: "Driver: Unloading Completed",
          body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} has completed the unloading process.`
          , routes: "MyOrders"
        })


        let newNotification = notificationsRef.child('users').child(params.request.user_phone).push();
        let AdminNotification = notificationsRef.child('admin').push();
        newNotification.set({
          id: newNotification.key,
          title: "Driver: Unloading Completed",
          body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} has completed the unloading process.`,
          created: getCurrentTimestamp(),
          read: false
        }).catch(err => console.log('err -> ',err))

        AdminNotification.set({
          id: AdminNotification.key,
          title: `Driver(${params.driver.fullname}) Unloading Completed`,
          body: `Driver(${params.driver.fullname}) Has Unloading Completed On OrderNo#${params.request.orderNo}.`,
          created: getCurrentTimestamp(),
          read: false
        }).catch(err => console.log('err -> ',err))
      } else {
        res.json({
          status: true,
          error: "PPL : Driver Unloading Completed Successfully !",
          notification:true
        });
      }
    })


    res.json({
      status: true,
      error: "PPL : Driver Unloading Completed Successfully !",
      notification:false
    });
  }
);

// "10" => Vendor Updates Driver Returning Container
// /vendor_updates_driver_returning_container
// {
//    "token": "",
//    "biltyNo": "",
//    "driver_phone" : "",
// }
router.post(
  "/vendor_updates_driver_returning_container",
  body("token").isString().withMessage("token required !"),
  body("biltyNo").isString().withMessage("biltyNo Required Format -> BT0003a1!"),

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
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        res.json({
          status: false,
          error: "users can not accept bilty ! only drivers can !",
        });
        break;
      case "pro":
        res.json({
          status: false,
          error: "users can not accept bilty ! only drivers can !",
        });
        break;
      case "vendor":
        req.body.vendor = params.vendor;
        next();

        break;
      case "driver":
        res.json({
          status: false,
          error: "Driver can not use this service ! only vendors can !",
        });
        break;

      default:
        res.json({
          status: false,
          error: "Unknown Type",
        });
        break;
    }
  },
  // Get Request Data
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
          error: "Could Not Found request !",
        });
      }
    });
  },
  // Get User Data
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.request.user_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          console.log("User Data Added !");
          next();
        } else {
          userRef
            .child("pro")
            .child(params.request.user_phone)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                req.body.user = user;
                console.log("User Data Added !");
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
  // Get Driver Data
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("drivers")
      .child(params.driver_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.driver = user;
          console.log("User Data Added !");
          next();
        } else {
          res.json({
            status:false,
            error: "Driver Not Found !"
          })
        }
      });
  },
  // Check Bilty Status For PPL
  (req, res, next) => {
    const params = req.body;

    const transitbilties = params.request.bilty;

    if (transitbilties) {
      if (transitbilties.length !== 0) {
        const filterOut = transitbilties.filter((bilty) => {
          return bilty.biltyNo === params.biltyNo;
        });

        if (filterOut) {
          if (filterOut.length !== 0) {
            const bilty = filterOut[0];
            console.log("bilty -> ", bilty);

            if (bilty.status == "unloading_complete") {
              req.body.bilty = bilty;
              next();
            } else {
              res.json({
                status: false,
                error: `Cannot Update Bilty - Bilty Status is ${bilty.status} !`,
              });
            }
          } else {
            res.json({
              status: false,
              error: "Bilty Not Found !",
            });
          }
        }
      }
    }

  },
  // Update Bilty For PPL
  (req, res, next) => {
    const params = req.body;

    const transitbilties = params.request.bilty;

    transitbilties.forEach((bilty) => {
      if (bilty["biltyNo"] == params.biltyNo) {
        if (
          bilty.driver_phone &&
          bilty.driver_phone === params.driver_phone
        ) {
          bilty["status"] = "container_returned";
          bilty["container_returned_on"] = getCurrentDate();
          req.body.vehicle_number =
            bilty["vehicle"] || bilty["vehicle_number"];
        } else {
          res.json({
            status: false,
            error: "Driver Allotted On Bilty Does Not Match With You !",
          });
        }
      }
    });

    let getLength = params.biltyNo.length;
    const getOrderNo = params.biltyNo.slice(2, getLength - 2);

    pplRequestRef
      .child(getOrderNo)
      .update({
        bilty: transitbilties,
      })
      .then(() => {
        next();
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  },
  // Create Driver History
  (req, res, next) => {
    const params = req.body;

    driverHistoryRef
      .child(params.driver_phone)
      .child(params.biltyNo)
      .set({
        ...params.request,
        biltyNo: params.biltyNo,
        ...params.bilty,
        bilty_status: params.bilty.status,
        status: "completed",
        type: `${params.request.request_type}`,
      })
      .then(() => {
        next();
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  },
  // Check If All Bilties Are Completed
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.child(params.request.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();

        const transitbilties = request.bilty;
        let biltyCompletionChecker = true;

        if (transitbilties) {
          if (transitbilties.length !== 0) {
            transitbilties.forEach((bilty) => {
              if (bilty.status) {
                if (bilty.status !== "container_returned") {
                  biltyCompletionChecker = false;
                }
              }
            });
          }
        }

        if (biltyCompletionChecker) {
          // Order Completed
          pplRequestRef
            .child(request.orderNo)
            .update({
              status: "completed",
              order_completed_on: getCurrentDate(),
            })
            .then(() => {
              next();
            })
            .catch((err) => {
              res.json({
                status: false,
                error: err.message,
              });
            });
        } else {
          next();
        }
      } else {
        res.json({
          status: false,
          error: "Bilties Check Error !",
        });
      }
    });
  },
  // Update Driver
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("drivers")
      .child(params.driver_phone)
      .update({
        bilty: null,
        request_type: null,
        option_id: null,
        status: "free",
      })
      .then(() => {
        next();
      })
      .catch((err) => {
        res.json({
          status: false,
          error: "",
        });
      });
  },
  // Update Vehicle
  (req, res, next) => {
    const params = req.body;

    pplVendorVehicleRef
      .child(params.bilty.vehicle_id)
      .update({
        available: true,
        bilty: null,
        option_id: null,
      })
      .then(() => {
        next();
      })
      .catch((err) => {
        next();
      });

  },
   // Send Notifications
   (req,res) => {
    const params = req.body;

    fcmTokenRef.child('users').child(params.request.user_phone).once('value').then(snapshot => {
      if(snapshot.val()) {
        send_notification_to_single_user(snapshot.val().fcm_token.token, {
          title: "Driver: Empty Container Returned",
          body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} has returned the empty container.`
          , routes: "MyOrders"
        })


        let newNotification = notificationsRef.child('users').child(params.request.user_phone).push();
        let AdminNotification = notificationsRef.child('admin').push();
        newNotification.set({
          id: newNotification.key,
          title: "Driver: Empty Container Returned",
          body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} has returned the empty container.`,
          created: getCurrentTimestamp(),
          read: false
        }).catch(err => console.log('err -> ',err))

        AdminNotification.set({
          id: AdminNotification.key,
          title: `Driver(${params.driver.fullname}) Empty Container Returned`,
          body: `Driver(${params.driver.fullname}) Has Empty Container Returned On OrderNo#${params.request.orderNo}.`,
          created: getCurrentTimestamp(),
          read: false
        }).catch(err => console.log('err -> ',err))
      } else {
        res.json({
          status: true,
          error: "PPL : Empty Container Returned Successfully !",
          notification:true
        });
      }
    })

    res.json({
      status: true,
      error: "PPL : Empty Container Returned Successfully !",
      notification:false
    });
  }
);



// Update Driver's Position In Driver's Object In Database
// /update_driver_position
// {
//   "token": ""
// }
router.post("/update_driver_position", (req, res) => {
  const params = req.body;

  userRef
    .child("drivers")
    .child(params.phone)
    .update({
      current_position: {
        lat: params.lat,
        lng: params.lng,
      },
    })
    .then(() => {
      res.json({
        status: true,
        message: "Position Updated",
      });
    })
    .catch((error) => {
      res.json({
        status: false,
        error: error.message,
      });
    });
});

// Get Single Bilty
// /get_single_bilty
// {
//   "token": ""
// }
router.post(
  "/get_single_bilty",
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

    const bilties = params.request.bilty;

    const currentBilty = bilties.filter((bilty) => {
      return bilty.biltyNo === params.biltyNo;
    });

    let biltydata;

    if (currentBilty) {
      biltydata = {
        ...currentBilty[0],
        orderNo: params.request.orderNo,
        user_phone: params.request.user_phone,
        vendor_phone: params.request.vendor_phone || null,
        name: params.request.company_name || null,
        vendor_name: params.request.company_name || null,
        company_name: params.request.company_name || null,
        company_phone: params.request.company_phone || null,
        company_address: params.request.company_address || null,
        NTN_number: params.request.NTN_number || null,
        vendor_name: params.request.vendor_name || null,
        cargo_insurance: params.request.cargo_insurance || null,
        date: params.request.date,
        orderNo: params.request.orderNo,
        orgLat: params.request.orgLat,
        orgLng: params.request.orgLng,
        desLat: params.request.desLat,
        desLng: params.request.desLng,
        disText: params.request.disText,
        durText: params.request.durText,
        originAddress: params.request.originAddress || null,
        destinationAddress: params.request.destinationAddress || null,
        containerReturnAddress: params.request.containerReturnAddress || null,
        security_deposit: params.request.security_deposit || null,
        user_id: params.request.user_id,
        user_phone: params.request.user_phone,
        user_type: params.request.user_type,
        username: params.request.username,
        request_type: params.request.request_type,
        createdAt: params.request.createdAt,
        documents: params.request.documents,
      };
    }

    res.json({
      status: true,
      data: biltydata,
    });
  }
);

// Get Completed Bilty
// /get_completed_bilty
// {
//   "token": ""
// }
router.post(
  "/get_completed_bilty",
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

    if (params.request.request_type === "transit") {
      const bilties = params.request.bilty;

      const currentBilty = bilties.filter((bilty) => {
        return bilty.biltyNo === params.biltyNo;
      });

      let biltydata = {
        ...currentBilty,
        orderNo: params.request.subOrderNo,
        user_phone: params.request.user_phone,
        vendor_phone: params.request.vendor_phone || null,
        vendor_name: params.request.vendor_name || null,
        cargo_insurance: params.request.cargo_insurance || null,
        date: params.request.date,
        orderNo: params.request.orderNo,
        orgLat: params.request.orgLat,
        orgLng: params.request.orgLng,
        desLat: params.request.desLat,
        desLng: params.request.desLng,
        disText: params.request.disText,
        durText: params.request.durText,
        originAddress: params.request.originAddress || null,
        destinationAddress: params.request.destinationAddress || null,
        containerReturnAddress: params.request.containerReturnAddress || null,
        security_deposit: params.request.security_deposit || null,
        user_id: params.request.user_id,
        user_phone: params.request.user_phone,
        user_type: params.request.user_type,
        username: params.request.username,
        request_type: params.request.request_type,
        createdAt: params.request.createdAt,
        documents: params.request.documents,
      };

      res.json({
        status: true,
        data: biltydata,
      });
    } else if (params.request.request_type === "upcountry") {
      const bilties = params.request.bilty;

      const currentBilty = bilties.filter((bilty) => {
        return bilty.biltyNo === params.biltyNo;
      });

      let biltydata = {
        ...currentBilty,
        orderNo: params.request.subOrderNo,
        user_phone: params.request.user_phone,
        vendor_phone: params.request.vendor_phone || null,
        vendor_name: params.request.vendor_name || null,
        cargo_insurance: params.request.cargo_insurance || null,
        date: params.request.date,
        orderNo: params.request.orderNo,
        orgLat: params.request.orgLat,
        orgLng: params.request.orgLng,
        desLat: params.request.desLat,
        desLng: params.request.desLng,
        disText: params.request.disText,
        durText: params.request.durText,
        originAddress: params.request.originAddress || null,
        destinationAddress: params.request.destinationAddress || null,
        containerReturnAddress: params.request.containerReturnAddress || null,
        security_deposit: params.request.security_deposit || null,
        user_id: params.request.user_id,
        user_phone: params.request.user_phone,
        user_type: params.request.user_type,
        username: params.request.username,
        request_type: params.request.request_type,
        createdAt: params.request.createdAt,
        documents: params.request.documents,
      };

      res.json({
        status: true,
        data: biltydata,
      });
    }
  }
);

module.exports = router;
