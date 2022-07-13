// *******  LIBRARIES
const express = require("express");
const fs = require("fs");
const admin = require("firebase-admin");
const bcrypt = require("bcrypt-nodejs");

const saltRounds = 10;
const config = require("../../config/private.json");
const moment = require("moment-timezone");
const expressFileUpload = require("express-fileupload");
// Twilio Client
const twilioCred = config.twilio;
const twillio_client = require("twilio")(
  twilioCred.accountSid,
  twilioCred.authToken
);
const axios = require('axios');

// Storage For File Uploads

const { Storage } = require("@google-cloud/storage");
const {
  userRef,
  forgetPasswordOTPRef,
  registrationOTPRef,
  walletRef,
  sessionsRef,
} = require("../../db/ref");

const { driversRef } = require("../../db/newRef");


const storage = new Storage({
  keyFilename: "src/config/serviceAccount.json",
});

const bucket = storage.bucket("meribilty-files");


const { body, validationResult } = require("express-validator");
const {
  NotificationContext,
} = require("twilio/lib/rest/api/v2010/account/call/notification");



// Helper Functions
const {
  checkUserExistsVendorApp,
  verifyTokenFirebase,
  getCurrentDate,
  getCurrentTimestamp
} = require("../../functions/slash");

const JWT_SECRET =
  "sdjkfh8923yhjdksbfma@#*(&@*!^#&@bhjb2qiuhesdbhjdsfg839ujkdhfjk";
const jwt = require("jsonwebtoken");

const router = express.Router();

// *********** DRIVER AUTHENTICATION - POST REQUESTS ***********

// { 
// fullname": "Rizwan Qadri", 
// cnic": "4220196318289", 
// phone": "+923243280234", 
// email": "omair@4slash.com", 
// password": "omair123", 
// work_on_same_city_movement" : true, 
// work_in_different_cities_provinces" : false, 
// do_cargo_movement_out_of_pak" : false, 
// source_labor_cranes_lifters" : false ,
// vehicle_type: 'Suzuki'
// vehicle_model_year: '2015',
// vehicle_number: '3545687515245',
// vehicle_make: 'Honda',
// vehicle_owner: false,
// profile_image,
// cnic_image,
// driving_license_image,
// vehicle_registration_image
// }

router.post(
  "/send_register_otp",
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
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  checkUserExistsVendorApp,
  // Upload Documents To Google Cloud Storage
  (req, res, next) => {
    const params = req.body;

    const { profile_image } = req.files;
    const { cnic_image } = req.files;
    const { driving_license_image } = req.files;
    const { vehicle_registration_image } = req.files;

    // Uploading Bill of landing
    const profile_image_filename = profile_image.name;
    const profile_image_filetype = profile_image_filename.split(".")[1];
    const profile_image_name = `${params.phone}_profile_image`;

    // Uploading Invoice
    const cnic_image_filename = cnic_image.name;
    const cnic_image_filetype = cnic_image_filename.split(".")[1];
    const cnic_image_name = `${params.phone}_cnic_image`;

    // Uploading gd
    const driving_license_image_filename = driving_license_image.name;
    const driving_license_image_filetype = driving_license_image_filename.split(".")[1];
    const driving_license_image_name = `${params.phone}_driving_license_image`;

    // Uploading Demand Letter 
    const vehicle_registration_image_filename = vehicle_registration_image.name;
    const vehicle_registration_image_filetype = vehicle_registration_image_filename.split(".")[1];
    const vehicle_registration_image_name = `${params.phone}_vehicle_registration_image`;

    const path = "Profiles/";

    // Bill of landing Upload
    fileUpload(
      profile_image,
      profile_image_name,
      path,
      profile_image_filetype,
      (err) => {
        if (err) {
          console.log("err -> ", err);
        } else {
          console.log("bill of landing uploaded");
          // Invoice Upload
          fileUpload(cnic_image, cnic_image_name, path, cnic_image_filetype, (err) => {
            if (err) {
              console.log("err -> ", err);
            } else {
              console.log("Invoice uploaded");
              // gd Upload
              fileUpload(driving_license_image, driving_license_image_name, path, driving_license_image_filetype, (err) => {
                if (err) {
                  console.log("err -> ", err);
                } else if (err == null) {

                  fileUpload(vehicle_registration_image, vehicle_registration_image_name, path, vehicle_registration_image_filetype, (err) => {
                    if (err) {
                      console.log("err -> ", err);
                    } else if (err == null) {
                      next();
                    }
                  });
                }
              });
            }
          });
        }
      }
    );
  },
  // Get Images Links
  async (req, res, next) => {
    const params = req.body;

    let options = {
      prefix: `Profiles/`,
    };

    const [files] = await storage.bucket("meribilty-files").getFiles(options);
    var uploadImages = [];

    files.forEach((file) => {
      const fileName = file.name;

      if (fileName.includes(params.phone)) {
        let image = {
          name: file.name,
          url: file.publicUrl(),
        };

        uploadImages.push(image);
        console.log("imae -> ", image);
      }
    });

    req.body.profileImages = uploadImages;

    console.log("uploadImages -> ", uploadImages);

    next();
  },
  // Send Registration OTP
  (req, res, next) => {
    const params = req.body;
    const code = Math.floor(Math.random() * 9000) + 1000;
    const salt = bcrypt.genSaltSync(saltRounds);
    const hash = bcrypt.hashSync(params.password, salt);

    const data = {
      user: {
        created: getCurrentDate(),
        created_timestamp: getCurrentTimestamp(),
        password: hash,
        ...params,
        status: "free",
        online: false,
        user_type: "driver",
        type: "driver",
        profileImages: null,
        profile_images: params.profileImages,
        verified: false,
        blocked: false
      },
      createdAt: getCurrentDate(),
      createdAt_timestamp: getCurrentTimestamp(),
      to: params.phone,
      code,
      status: "queued",
      retry: 0,
    };

    const addsms = registrationOTPRef.child(code);

    addsms
      .set(data)
      .then(() => {
        req.body.otp = code;

        let content = `Welcome To Meribilty, Your Driver Register OTP Code is ${code}`;
        let filterphone = params.phone;
        let transformphone = filterphone.substr(1);
        console.log('filterphone -> ',filterphone)
        console.log('transformphone -> ',transformphone)

        axios.post(`http://bsms.its.com.pk/api.php?key=b23838b9978affdf2aab3582e35278c6&msgdata=${content}&to=${transformphone}`).then((response)=>{
        let data = response.data;
        
          if(data.response.status === 'Success') {
            res.json({
              status: true,
              message: "OTP code has been sent to driver's mobile !",
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
        //   .create({
        //     messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
        //     to: params.phone,
        //     from: config.twilio.phone,
        //     body: `Welcome To Meribilty, Your Driver Register OTP Code is ${code}`,
        //   })
        //   .then((message) => {
        //     res.json({
        //       status: true,
        //       message: "OTP code has been sent to driver's mobile !",
        //       otp: code,
        //     });
        //   })
        //   .catch((err) => {
        //     res.json({
        //       status: false,
        //       error: err.message,
        //     });
        //   });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// OTP Verification / OTP Record Remove / User Creation
router.post(
  "/register_after_otp",
  body("otp").isNumeric().withMessage("otp must be a valid otp"),
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
    //  @Data in Request Body
    //   {
    //     "otp":"77754",
    //   }
    const { otp } = req.body;

    registrationOTPRef
      .child(parseInt(otp))
      .once("value", async (snapshot) => {
        const data = snapshot.val();
        if (data == null) {
          res.json({
            status: false,
            message: "Verification Failed !",
          });
        } else {
          // console.log("User Is -> ", data);
          const userData = data.user;
          // console.log("This is user data -> ", userData);
          const salt = bcrypt.genSaltSync(saltRounds);
          const hash = bcrypt.hashSync(userData.password, salt);
          let uid = 1;

          await driversRef
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                uid = snapshot.numChildren();
              }
            })

          console.log('uid -> ', uid);

          userRef
            .child("drivers")
            .child(userData.phone)
            .set({
              ...userData,
              id: uid,
              password: hash,
              created: getCurrentDate(),
        created_timestamp: getCurrentTimestamp(),
              verified: true,
            })
            .then(() => {
              walletRef
                .child("drivers")
                .child(userData.phone)
                .set({
                  amount: "-100",
                  type: "cash",
                  transactions: []
                })
                .then(() => {

                  const additionalClaims = {
                    user_type: "driver",
                  };

                  admin.auth()
                    .createCustomToken(userData.phone, additionalClaims)
                    .then((customToken) => {
                      sessionsRef
                        .child("drivers")
                        .child(userData.phone)
                        .set({
                          phone: userData.phone,
                          type: "driver",
                          lastLogin: getCurrentDate(),
                          created: getCurrentDate(),
                          lastLogin_timestamp: getCurrentTimestamp(),
                          active: true,
                        })
                        .then(() => {
                          registrationOTPRef
                            .child(parseInt(otp))
                            .remove()
                            .then(() => {
                              res.json({
                                status: true,
                                message: "Driver Created Successfully ! ",
                                type: "driver",
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
        }
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  }
);

// token: ""
// vehicle_type: 'Suzuki'
// vehicle_model_year: '2015',
// vehicle_number: '3545687515245',
// vehicle_make: 'Honda',
// vehicle_owner: false,
// profile_image,
// cnic_image,
// driving_license_image,
// vehicle_registration_image

router.post(
  "/register_step_2",
  body("vehicle_type")
    .isString()
    .withMessage("vehicle_type must be a string !"),
  body("vehicle_model_year")
    .isString()
    .withMessage("vehicle_model_year Is Invalid !"),
  body("vehicle_number")
    .isString()
    .isLength({ max: 20 })
    .withMessage(
      "vehicle_number must be string and not more than 20 characters !"
    ),
  body("vehicle_make").isString().withMessage("vehicle_make Is Invalid !"),
  body("vehicle_owner")
    .isBoolean()
    .withMessage("vehicle_owner must be boolean!"),

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
  // Check In Vendor
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("vendors")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          next();
          res.json({
            status: false,
            error: "A Vendor is Already Registered On This Phone Number !",
          });
        } else {
          next();
        }
      });
  },
  // Check Driver Exists ?
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("drivers")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          next();
        } else {
          res.json({
            status: false,
            error:
              "The Driver Doest Not Exist . Fill The Step 1 Registration Form First !",
          });
        }
      });
  },
  // Check Documents 
  (req, res, next) => {
    if (!req.files) {
      res.json({
        status: false,
        error: "Please upload required images !"
      })
    } else {
      next();
    }
  },
  // Upload Images
  (req, res, next) => {
    const params = req.body;

    if (
      req.files.profile_image &&
      req.files.cnic_image &&
      req.files.driving_license_image &&
      req.files.vehicle_registration_image
    ) {
      const { profile_image } = req.files;
      const { cnic_image } = req.files;
      const { driving_license_image } = req.files;
      const { vehicle_registration_image } = req.files;

      // Uploading Profile Image
      const profile_image_filename = profile_image.name;
      const profile_image_filetype = profile_image_filename.split(".")[1];
      const profile_image_name = `${params.user.user_id}_profile_image`;

      // CNIC Invoice
      const cnic_image_filename = cnic_image.name;
      const cnic_image_filetype = cnic_image_filename.split(".")[1];
      const cnic_image_name = `${params.user.user_id}_cnic_image`;

      // Uploading _driving_license_image
      const driving_license_image_filename = driving_license_image.name;
      const driving_license_image_filetype =
        driving_license_image_filename.split(".")[1];
      const driving_license_image_name = `${params.user.user_id}_driving_license_image`;

      // Uploading vehicle_registration_image
      const vehicle_registration_image_filename =
        vehicle_registration_image.name;
      const vehicle_registration_image_filetype =
        vehicle_registration_image_filename.split(".")[1];
      const vehicle_registration_image_name = `${params.user.user_id}_vehicle_registration_image`;

      const path = "Drivers/";

      // profile_image Upload
      fileUpload(
        profile_image,
        profile_image_name,
        path,
        profile_image_filetype,
        (err) => {
          if (err) {
            console.log("err -> ", err);
          } else {
            console.log("profile_image uploaded");
            // cnic_image Upload
            fileUpload(
              cnic_image,
              cnic_image_name,
              path,
              cnic_image_filetype,
              (err) => {
                if (err) {
                  console.log("err -> ", err);
                } else {
                  console.log("cnic_image uploaded");
                  // driving_license_image Upload
                  fileUpload(
                    driving_license_image,
                    driving_license_image_name,
                    path,
                    driving_license_image_filetype,
                    (err) => {
                      if (err) {
                        console.log("err -> ", err);
                      } else if (err == null) {
                        fileUpload(
                          vehicle_registration_image,
                          vehicle_registration_image_name,
                          path,
                          vehicle_registration_image_filetype,
                          (err) => {
                            if (err) {
                              console.log("err -> ", err);
                            } else if (err == null) {
                              next();
                            }
                          }
                        );
                      }
                    }
                  );
                }
              }
            );
          }
        }
      );
    } else {
      res.json({
        status: false,
        error: "Please Upload All 4 Images !",
      });
    }
  },
  // Get Images Links
  async (req, res, next) => {
    const params = req.body;

    let options = {
      prefix: `Drivers/`,
    };

    const [files] = await storage.bucket("meribilty-files").getFiles(options);
    var uploadImages = [];

    files.forEach((file) => {
      const fileName = file.name;

      if (fileName.includes(params.user.user_id)) {
        let image = {
          name: file.name,
          url: file.publicUrl(),
        };

        uploadImages.push(image);
      }
    });

    req.body.documentsUploaded = uploadImages;
    next();
  },
  (req, res) => {
    const params = req.body;

    userRef
      .child("drivers")
      .child(params.user.user_id)
      .update({
        ...params,
        verified: true,
      })
      .then(() => {
        res.json({
          status: true,
          message: "Driver Updated Successfully !",
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

function filesCheck(obj, errors) {
  const filesKeys = Object.keys(obj);
  const filesLength = filesKeys.length;
  for (let i = 0; i < filesLength; i++) {
    let err = {};
    if (typeof obj[filesKeys[i]].file === "undefined") {
      err = {
        param: filesKeys[i],
        msg: `${obj[filesKeys[i]].title} is required!`,
      };
      errors.push(err);
    }
  }
}

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

module.exports = router;
