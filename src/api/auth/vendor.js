// *******  LIBRARIES
const express = require("express");
const admin = require("firebase-admin");
const {
  userRef,
  registrationOTPRef,
  walletRef,
  sessionsRef,
} = require("../../db/ref");
const { vendorsRef } = require("../../db/newRef");
const bcrypt = require("bcrypt-nodejs");
const saltRounds = 10;
const config = require("../../config/private.json");
const moment = require("moment-timezone");
const { body, validationResult } = require("express-validator");

// Twilio Client
const twillio_client = require("twilio")(
  config.twilio.accountSid,
  config.twilio.authToken
);

// Storage For File Uploads
const { Storage } = require("@google-cloud/storage");

const storage = new Storage({
  keyFilename: "src/config/serviceAccount.json",
});

const bucket = storage.bucket("meribilty-files");

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
const axios = require('axios');
const router = express.Router();

// *********** VENDOR AUTHENTICATION - POST REQUESTS ***********
// {   
//   "company_name" : "Ahmed Company",
//   "cnic" : "",  
//   "phone" : "+923352640168", 
//   "email" : "ahmed@gmail.com",
//   "password" : "ahmed123",
//   "confirm_password" : "ahmed123",
//   "work_on_same_city_movement" : false, 
//   "work_in_different_cities_provinces" : false,
//   "do_cargo_movement_out_of_pak" : true, 
//   "source_labor_cranes_lifters" : false ,
//   "company_address": "",
//   "company_phone_landline": "",
//   "owner_name": "",
//   "owner_phone": "",
//   "owner_email": "",
//   "operations_head_name": "",
//   "operations_head_phone": "",
//   "operations_head_email": "",
//   "account_manager_phone": "",
//   "account_manager_name": "",
//   "account_manager_email": "",
//   "NTN_number": ""
//   owner_cnic_image
//   ntn_scan_image
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
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  checkUserExistsVendorApp,
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
  // Upload Documents To Google Cloud Storage
  (req, res, next) => {
    const params = req.body;

    const { owner_cnic_image } = req.files;
    const { ntn_scan_image } = req.files;


    // Uploading Bill of landing
    const owner_cnic_image_filename = owner_cnic_image.name;
    const owner_cnic_image_filetype = owner_cnic_image_filename.split(".")[1];
    const owner_cnic_image_name = `${params.phone}_owner_cnic`;

    // Uploading Invoice
    const ntn_scan_image_filename = ntn_scan_image.name;
    const ntn_scan_image_filetype = ntn_scan_image_filename.split(".")[1];
    const ntn_scan_image_name = `${params.phone}_ntn_scan`;


    const path = "Profiles/";

    // Bill of landing Upload
    fileUpload(
      owner_cnic_image,
      owner_cnic_image_name,
      path,
      owner_cnic_image_filetype,
      (err) => {
        if (err) {
          console.log("err -> ", err);
        } else {
          console.log("bill of landing uploaded");
          // Invoice Upload
          fileUpload(ntn_scan_image, ntn_scan_image_name, path, ntn_scan_image_filetype, (err) => {
            if (err) {
              console.log("err -> ", err);
            } else {
              next();
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
        console.log("image -> ", image);
      }
    });

    req.body.profileImages = uploadImages;

    console.log("uploadImages -> ", uploadImages);

    next();
  },
  // Save Data
  (req, res, next) => {
    const params = req.body;

    // Check If Vendor Exist
    userRef
      .child("vendors")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.exists()) {
          res.json({
            status: false,
            message: "A Vendor Already Exists With This Phone Number !",
          });
        } else {
          //  Send Code
          const code = Math.floor(Math.random() * 9000) + 1000;
          let filterphone = params.phone;
          let transformphone = filterphone.substr(1);
          console.log('filterphone -> ',filterphone)
          console.log('transformphone -> ',transformphone)

          let content = `Welcome To Meribilty, Your Vendor Register OTP Code is ${code}`;

            axios.post(`http://bsms.its.com.pk/api.php?key=b23838b9978affdf2aab3582e35278c6&msgdata=${content}&to=${transformphone}`).then((response)=>{
            let data = response.data;
            
              if(data.response.status === 'Success') {
                  // Bcrypt The Password Here ....
                  const salt = bcrypt.genSaltSync(saltRounds);
                  const hash = bcrypt.hashSync(params.password, salt);
  
                  const data = {
                    user: {
                      ...params, 
                      profile_images: params.profileImages,
                      password: hash,
                      created: getCurrentDate(),
                      created_timestamp: getCurrentTimestamp(),
                      verified: false,
                      filer:false,
                      user_type: "vendor",
                      type: "vendor",
                      blocked: false,
                      rating: {
                        avg: 0,
                        count: 0
                      }
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
                      res.json({
                        status: true,
                        message: "Vendor Has Been Registered Successfully",
                        otp: code,
                        data: { ...params, otp: null },
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
          //       body: `Welcome To Meribilty, Your Vendor Register OTP Code is ${code}`,
          //     },
          //     (err, resData) => {
          //       if (err) {
          //         return res.json({
          //           status: false,
          //           message: err.message,
          //         });
          //       }
          //       // Bcrypt The Password Here ....
          //       const salt = bcrypt.genSaltSync(saltRounds);
          //       const hash = bcrypt.hashSync(params.password, salt);

          //       const data = {
          //         user: {
          //           ...params, profile_images: params.profileImages,
          //           password: hash,
          //           created: getCurrentDate(),
          //           created_timestamp: getCurrentTimestamp(),
          //           verified: false,
          //           user_type: "vendor",
          //           type: "vendor",
          //           blocked: false,
          //           rating: {
          //             avg: 0,
          //             count: 0
          //           }
          //         },
          //         messageID: resData.sid,
          //         createdAt: getCurrentDate(),
          //         createdAt_timestamp: getCurrentTimestamp(),
          //         to: params.phone,
          //         code,
          //         status: "queued",
          //         retry: 0,
          //       };

          //       const addsms = registrationOTPRef.child(code);
          //       addsms
          //         .set(data)
          //         .then(() => {
          //           req.body.otp = code;
          //           res.json({
          //             status: true,
          //             message: "Vendor Has Been Registered Successfully",
          //             otp: code,
          //             data: { ...params, otp: null },
          //           });
          //         })
          //         .catch((err) => {
          //           res.json({
          //             status: false,
          //             error: err.message,
          //           });
          //         });
          //     }
          //   )
          //   .catch((err) => {
          //     res.json({
          //       status: false,
          //       error: err.message,
          //     });
          //   });
        }
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });

    // Send OTP SMS To Vendor

    // twillio_client.lookups.v1
    //   .phoneNumbers(params.phone)
    //   .fetch()
    //   .then(() => {

    //   })
    //   .catch((err) => {
    //     res.json({
    //       status: false,
    //       message: err,
    //     });
    //   });
  }
);


// OTP Verification / OTP Record Remove / User Creation
router.post(
  "/register_after_otp",
  body("otp").isNumeric().withMessage("otp is not a valid otp"),
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
    // {
    //   "otp":"77754",
    // }
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
          let uid = 1;

          await vendorsRef
            .limitToLast(1)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                uid = ((parseInt(Object.entries(snapshot.val())[0][1].id)) + 1);
              }
            })

          userRef
            .child("vendors")
            .child(userData.phone)
            .set({
              ...userData,
              id: uid,
              created: getCurrentDate(),
              created_timestamp: getCurrentTimestamp(),
              verified: true,
            })
            .then(() => {
              walletRef
                .child("vendors")
                .child(userData.phone)
                .set({
                  amount: "-100",
                  type: "cash",
                  transactions: []
                })
                .then(() => {

                  const additionalClaims = {
                    user_type: "vendor",
                  };

                  admin.auth()
                    .createCustomToken(userData.phone, additionalClaims)
                    .then((customToken) => {

                      sessionsRef
                        .child("vendors")
                        .child(userData.phone)
                        .set({
                          phone: userData.phone,
                          type: "vendor",
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
                                message: "Vendor Created Successfully ! ",
                                active: true,
                                type: "vendor",
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

// phone
// company_address
// company_phone_landline
// owner_name
// owner_phone
// owner_email
// operations_head_name
// operations_head_phone
// operations_head_email
// account_manager_phone
// account_manager_name
// account_manager_email
// NTN_number
// owner_CNIC_Photo
// NTN_Scan_Photo

router.post(
  "/register_step_2",
  body("company_address")
    .isString()
    .withMessage("company_address must be a string !"),
  body("company_phone_landline")
    .isMobilePhone()
    .withMessage("company_phone_landline Is Invalid !"),
  body("owner_name")
    .isString()
    .isLength({ max: 20 })
    .withMessage("owner_name must be string and not more than 20 characters !"),
  body("owner_phone").isMobilePhone().withMessage("owner_phone Is Invalid !"),
  body("owner_email").isEmail().withMessage("owner_email Is Invalid !"),
  body("operations_head_name")
    .isString()
    .isLength({ max: 20 })
    .withMessage(
      "operations_head_name must be string and not more than 20 characters !"
    ),
  body("operations_head_phone")
    .isMobilePhone()
    .withMessage("operations_head_phone Is Invalid !"),
  body("operations_head_email")
    .isEmail()
    .withMessage("operations_head_email Is Invalid !"),
  body("account_manager_phone")
    .isMobilePhone()
    .withMessage("account_manager_phone Is Invalid !"),
  body("account_manager_name")
    .isString()
    .isLength({ max: 20 })
    .withMessage(
      "account_manager_name must be string and not more than 20 characters !"
    ),
  body("account_manager_email")
    .isEmail()
    .withMessage("account_manager_email Is Invalid !"),

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
    userRef
      .child("vendors")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          next();
        } else {
          res.json({
            status: false,
            error:
              "No Vendor Exists With This Phone Number. Fill the step 1 registration form first !",
          });
        }
      });
  }, // Upload Images
  (req, res, next) => {
    const params = req.body;

    if (req.files.owner_cnic && req.files.ntn_scan) {
      const { owner_cnic } = req.files;
      const { ntn_scan } = req.files;

      // Uploading Profile Image
      const owner_cnic_filename = owner_cnic.name;
      const owner_cnic_filetype = owner_cnic_filename.split(".")[1];
      const owner_cnic_name = `${params.user.user_id}_owner_cnic`;

      // CNIC Invoice
      const ntn_scan_filename = ntn_scan.name;
      const ntn_scan_filetype = ntn_scan_filename.split(".")[1];
      const ntn_scan_name = `${params.user.user_id}_ntn_scan`;

      const path = "Vendors/";

      // profile_image Upload
      fileUpload(
        owner_cnic,
        owner_cnic_name,
        path,
        owner_cnic_filetype,
        (err) => {
          if (err) {
            console.log("err -> ", err);
          } else {
            console.log("profile_image uploaded");
            // cnic_image Upload
            fileUpload(
              ntn_scan,
              ntn_scan_name,
              path,
              ntn_scan_filetype,
              (err) => {
                if (err) {
                  console.log("err -> ", err);
                } else {
                  console.log("cnic_image uploaded");
                  // driving_license_image Upload
                  // res.json({
                  //   status: true,
                  //   otp: req.body.otp,
                  // });
                  next();
                }
              }
            );
          }
        }
      );
    } else {
      res.json({
        status: false,
        error: "cnic and ntn images missing !",
      });
    }
  },
  async (req, res, next) => {
    const params = req.body;

    let options = {
      prefix: `Vendors/`,
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
      .child("vendors")
      .child(params.user.user_id)
      .update({
        ...params,
        verified: true
      })
      .then(() => {
        res.json({
          status: true,
          message: "Vendor Updated Successfully !",
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

module.exports = router;

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
