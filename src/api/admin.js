// *******  LIBRARIES
const express = require("express");
const admin = require("firebase-admin");
const moment = require("moment-timezone");
const config = require("../config/private.json");
const { body, validationResult } = require("express-validator");
const expressFileUpload = require("express-fileupload");
const twillio_client = require("twilio")(
  config.twilio.accountSid,
  config.twilio.authToken
);
const _ = require("lodash");
const {
  e_walletRef,
  subscribed_usersRef,
  pricingRef,
  userRef,
  heavyref,
  heavyvehref,
  promoRef,
  bidRef,
  sessionsRef,
  userReqRef,
  MessagesRef,
  requests_dataRef,
  commissionRef,
  userLiveRequestsRef,
  notificationKeys,
  feedsRef,
  completeReqRef,
  invoicesClientsRef,
  invoicesDriversRef,
  addaListRef,
  onlineDriversRef,
  forgetPasswordOTPRef,
  registrationOTPRef,
  invitedOTPRef,
  walletRef,
  proUserApplicationRef
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
  driverHistoryRef,
  driversRef,
  proRef,
  usersRef,
  vendorsRef,
  fcmTokenRef
} = require("../db/newRef");

const bcrypt = require("bcrypt-nodejs");
const saltRounds = 10;

const {
  verifyToken,
  checkUserExists,
  verifyTokenVendorApp,
  verifyTokenFirebase,
  getCurrentDate,
  getCurrentTimestamp
} = require("../functions/slash");

const {send_notification_to_single_user} = require('../functions/notifications');

const { Storage } = require("@google-cloud/storage");
const storage = new Storage({
  keyFilename: "src/config/serviceAccount.json",
});
const bucket = storage.bucket("meribilty-staging.appspot.com");


const { Client } = require("@googlemaps/google-maps-services-js");
const { user } = require("firebase-functions/v1/auth");
const googleMapsClient = new Client({});
const cloud_message = admin.messaging();

const axios = require('axios');
const router = express.Router();






router.get("/requests_ppl",
  // Send Response With Paginated Data
  async (req, res) => {
    const params = req.query;
    let orders = [];
    let length;

    //   SORT , PAGINATION , SEARCH PARAMS
    let order_status = params.order_status;
    let sort = params.sort;
    let page = (parseInt(params.page) || 1);
    let per_page = (parseInt(params.per_page) || 5);
    let search = params.search;

    // Check Firebase List Length
    await pplRequestRef
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          snapshot.forEach((snap) => {

            if (order_status === "all") {
              orders.push(snap.val());
            }

            if (order_status === "pending") {
              if (snap.val().status === "pending") {
                orders.push(snap.val());
              }
            }

            if (order_status === "accepted") {
              if (snap.val().status === "accepted") {
                orders.push(snap.val());
              }
            }

            if (order_status === "cancelled") {
              if (snap.val().status === "cancelled") {
                orders.push(snap.val());
              }
            }


          })
        } else {
          length = 0;
        }
      })


    // Search if search is passed
    if (search) {
      var lowSearch = search.toLowerCase();
      orders = orders.filter((obj) =>
        Object.values(obj).some((val) =>
          String(val).toLowerCase().includes(lowSearch)
        )
      );
    }


    length = orders.length;

    let from = (page - 1) * per_page + 1;
    let to = (from + per_page) <= length ? (from + per_page - 1) : length;
    console.log('from -> ', from);
    console.log('to -> ', to)
    let current_page = page;
    let last_page = (length % per_page) == 0 ? (length / per_page) : (Math.floor(length / per_page) + 1);
    let total = length;
    let next_page_url;
    if (to < length) {
      next_page_url = `https://api.meribilty.com/admin/requests_ppl?page=${page + 1}&per_page=${per_page}`
    }
    let prev_page_url
    if ((from - 1) != 0) {
      prev_page_url = `https://api.meribilty.com/admin/requests_ppl?page=${page - 1}&per_page=${per_page}`
    }

    // Sort if sort is passed
    if (sort) {
      orders.sort((a, b) => (a[sort] > b[sort]) ? 1 : ((b[sort] > a[sort]) ? -1 : 0));
    }



    orders = orders.slice(from - 1, to);

    const sortedorders = orders.sort(function (a, b) {
      return b.createdAt_timestamp - a.createdAt_timestamp;
    });

    res.json({
      status: true,
      total,
      from,
      to,
      per_page,
      current_page,
      last_page,
      next_page_url,
      prev_page_url,
      items: sortedorders,
    });
  });

router.get("/pro_applications",
  // Send Response With Paginated Data
  async (req, res) => {
    const params = req.query;
    let orders = [];
    let length;

    //   SORT , PAGINATION , SEARCH PARAMS
    let order_status = params.order_status;
    let sort = params.sort;
    let page = (parseInt(params.page) || 1);
    let per_page = (parseInt(params.per_page) || 5);
    let search = params.search;

    // Check Firebase List Length
    await proUserApplicationRef
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          snapshot.forEach((snap) => {

            if (order_status === "all") {
              orders.push(snap.val());
            }

            if (order_status === "pending") {
              if (snap.val().status === "pending") {
                orders.push(snap.val());
              }
            }

            if (order_status === "accepted") {
              if (snap.val().status === "accepted") {
                orders.push(snap.val());
              }
            }

            if (order_status === "cancelled") {
              if (snap.val().status === "cancelled") {
                orders.push(snap.val());
              }
            }


          })
        } else {
          length = 0;
        }
      })


    // Search if search is passed
    if (search) {
      var lowSearch = search.toLowerCase();
      orders = orders.filter((obj) =>
        Object.values(obj).some((val) =>
          String(val).toLowerCase().includes(lowSearch)
        )
      );
    }


    length = orders.length;

    let from = (page - 1) * per_page + 1;
    let to = (from + per_page) <= length ? (from + per_page - 1) : length;
    console.log('from -> ', from);
    console.log('to -> ', to)
    let current_page = page;
    let last_page = (length % per_page) == 0 ? (length / per_page) : (Math.floor(length / per_page) + 1);
    let total = length;
    let next_page_url;
    if (to < length) {
      next_page_url = `https://api.meribilty.com/admin/requests_ppl?page=${page + 1}&per_page=${per_page}`
    }
    let prev_page_url
    if ((from - 1) != 0) {
      prev_page_url = `https://api.meribilty.com/admin/requests_ppl?page=${page - 1}&per_page=${per_page}`
    }

    // Sort if sort is passed
    if (sort) {
      orders.sort((a, b) => (a[sort] > b[sort]) ? 1 : ((b[sort] > a[sort]) ? -1 : 0));
    }



    orders = orders.slice(from - 1, to);

    const sortedorders = orders.sort(function (a, b) {
      return b.submittedOn_timestamp - a.submittedOn_timestamp;
    });

    res.json({
      status: true,
      total,
      from,
      to,
      per_page,
      current_page,
      last_page,
      next_page_url,
      prev_page_url,
      items: sortedorders,
    });
  });

router.get("/user/driver",
  // Send Response With Paginated Data
  async (req, res) => {
    const params = req.query;
    let length;

    //   SORT , PAGINATION , SEARCH PARAMS
    let sort = params.sort;
    let page = (parseInt(params.page) || 1);
    let per_page = (parseInt(params.per_page) || 5);
    let search = params.search;

    // Check Firebase List Length
    await driversRef
      .limitToLast(1)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          length = parseInt(Object.entries(snapshot.val())[0][1].id);
        } else {
          length = 0;
        }
      })

    let from = (page - 1) * per_page + 1;
    let to = (from + per_page) <= length ? (from + per_page - 1) : length;
    let current_page = page;
    let last_page = (length % per_page) == 0 ? (length / per_page) : (Math.floor(length / per_page) + 1);
    let total = length;
    let next_page_url;
    if (to < length) {
      next_page_url = `https://api.meribilty.com/admin/user/driver?page=${page + 1}&per_page=${per_page}`
    }
    let prev_page_url
    if ((from - 1) != 0) {
      prev_page_url = `https://api.meribilty.com/admin/user/driver?page=${page - 1}&per_page=${per_page}`
    }

    // Get User Data
    driversRef
      .orderByChild("id")
      .limitToFirst(per_page)
      .startAt("" + from)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          let requests = [];
          snapshot.forEach(((child) => { requests.push(child.val()) }));

          // Sort if sort is passed
          if (sort) {
            requests.sort((a, b) => (a[sort] > b[sort]) ? 1 : ((b[sort] > a[sort]) ? -1 : 0));
          }

          // Search if search is passed
          if (search) {
            requests = requests.filter((obj) => JSON.stringify(obj).toLowerCase().includes(search.toLowerCase()));
          }

          res.json({
            status: true,
            total,
            from,
            to,
            per_page,
            current_page,
            last_page,
            next_page_url,
            prev_page_url,
            items: requests,
          });
        } else {
          let total = 0;
          let from = 0;
          let to = 0;
          let perPage = 0;
          let lastPage = 0;
          let currentPage = 0;

          res.json({
            status: false,
            items: [],
            total: total,
            from: from,
            to: to,
            perPage: perPage,
            lastPage: lastPage,
            currentPage: currentPage,
          });
        }
      });
  });

router.get("/user/pro",
  // Send Response With Paginated Data
  async (req, res) => {
    const params = req.query;
    let length;

    //   SORT , PAGINATION , SEARCH PARAMS
    let sort = params.sort;
    let page = (parseInt(params.page) || 1);
    let per_page = (parseInt(params.per_page) || 5);
    let search = params.search;

    // Check Firebase List Length
    await proRef
      .limitToLast(1)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          length = parseInt(Object.entries(snapshot.val())[0][1].id);
        } else {
          length = 0;
        }
      })

    let from = (page - 1) * per_page + 1;
    let to = (from + per_page) <= length ? (from + per_page - 1) : length;
    let current_page = page;
    let last_page = (length % per_page) == 0 ? (length / per_page) : (Math.floor(length / per_page) + 1);
    let total = length;
    let next_page_url;
    if (to < length) {
      next_page_url = `https://api.meribilty.com/admin/user/pro?page=${page + 1}&per_page=${per_page}`
    }
    let prev_page_url
    if ((from - 1) != 0) {
      prev_page_url = `https://api.meribilty.com/admin/user/pro?page=${page - 1}&per_page=${per_page}`
    }

    // Get User Data
    proRef
      .orderByChild("id")
      .limitToFirst(per_page)
      .startAt("" + from)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          let requests = [];
          snapshot.forEach(((child) => { requests.push(child.val()) }));

          // Sort if sort is passed
          if (sort) {
            requests.sort((a, b) => (a[sort] > b[sort]) ? 1 : ((b[sort] > a[sort]) ? -1 : 0));
          }

          // Search if search is passed
          if (search) {
            requests = requests.filter((obj) => JSON.stringify(obj).toLowerCase().includes(search.toLowerCase()));
          }

          res.json({
            status: true,
            total,
            from,
            to,
            per_page,
            current_page,
            last_page,
            next_page_url,
            prev_page_url,
            items: requests,
          });
        } else {
          let total = 0;
          let from = 0;
          let to = 0;
          let perPage = 0;
          let lastPage = 0;
          let currentPage = 0;

          res.json({
            status: false,
            items: [],
            total: total,
            from: from,
            to: to,
            perPage: perPage,
            lastPage: lastPage,
            currentPage: currentPage,
          });
        }
      });
  });

router.get("/user/user",
  // Send Response With Paginated Data
  async (req, res) => {
    const params = req.query;
    let length;

    //   SORT , PAGINATION , SEARCH PARAMS
    let sort = params.sort;
    let page = (parseInt(params.page) || 1);
    let per_page = (parseInt(params.per_page) || 5);
    let search = params.search;

    // Check Firebase List Length
    await usersRef
      .limitToLast(1)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          length = parseInt(Object.entries(snapshot.val())[0][1].id);
        } else {
          length = 0;
        }
      })

    let from = (page - 1) * per_page + 1;
    let to = (from + per_page) <= length ? (from + per_page - 1) : length;
    let current_page = page;
    let last_page = (length % per_page) == 0 ? (length / per_page) : (Math.floor(length / per_page) + 1);
    let total = length;
    let next_page_url;
    if (to < length) {
      next_page_url = `https://api.meribilty.com/admin/user/user?page=${page + 1}&per_page=${per_page}`
    }
    let prev_page_url
    if ((from - 1) != 0) {
      prev_page_url = `https://api.meribilty.com/admin/user/user?page=${page - 1}&per_page=${per_page}`
    }

    // Get User Data
    usersRef
      .orderByChild("id")
      .limitToFirst(per_page)
      .startAt("" + from)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          let requests = [];
          snapshot.forEach(((child) => { requests.push(child.val()) }));

          // Sort if sort is passed
          if (sort) {
            requests.sort((a, b) => (a[sort] > b[sort]) ? 1 : ((b[sort] > a[sort]) ? -1 : 0));
          }

          // Search if search is passed
          if (search) {
            requests = requests.filter((obj) => JSON.stringify(obj).toLowerCase().includes(search.toLowerCase()));
          }

          res.json({
            status: true,
            total,
            from,
            to,
            per_page,
            current_page,
            last_page,
            next_page_url,
            prev_page_url,
            items: requests,
          });
        } else {
          let total = 0;
          let from = 0;
          let to = 0;
          let perPage = 0;
          let lastPage = 0;
          let currentPage = 0;

          res.json({
            status: false,
            items: [],
            total: total,
            from: from,
            to: to,
            perPage: perPage,
            lastPage: lastPage,
            currentPage: currentPage,
          });
        }
      });
  });

router.get("/user/vendor",
  // Send Response With Paginated Data
  async (req, res) => {
    const params = req.query;
    let length;

    //   SORT , PAGINATION , SEARCH PARAMS
    let sort = params.sort;
    let page = (parseInt(params.page) || 1);
    let per_page = (parseInt(params.per_page) || 5);
    let search = params.search;

    // Check Firebase List Length
    await vendorsRef
      .limitToLast(1)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          length = parseInt(Object.entries(snapshot.val())[0][1].id);
        } else {
          length = 0;
        }
      })

    let from = (page - 1) * per_page + 1;
    let to = (from + per_page) <= length ? (from + per_page - 1) : length;
    let current_page = page;
    let last_page = (length % per_page) == 0 ? (length / per_page) : (Math.floor(length / per_page) + 1);
    let total = length;
    let next_page_url;
    if (to < length) {
      next_page_url = `https://api.meribilty.com/admin/user/vendor?page=${page + 1}&per_page=${per_page}`
    }
    let prev_page_url
    if ((from - 1) != 0) {
      prev_page_url = `https://api.meribilty.com/admin/user/vendor?page=${page - 1}&per_page=${per_page}`
    }

    // Get User Data
    vendorsRef
      .orderByChild("id")
      .limitToFirst(per_page)
      .startAt("" + from)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          let requests = [];
          snapshot.forEach(((child) => { requests.push(child.val()) }));

          // Sort if sort is passed
          if (sort) {
            requests.sort((a, b) => (a[sort] > b[sort]) ? 1 : ((b[sort] > a[sort]) ? -1 : 0));
          }

          // Search if search is passed
          if (search) {
            requests = requests.filter((obj) => JSON.stringify(obj).toLowerCase().includes(search.toLowerCase()));
          }

          res.json({
            status: true,
            total,
            from,
            to,
            per_page,
            current_page,
            last_page,
            next_page_url,
            prev_page_url,
            items: requests,
          });
        } else {
          let total = 0;
          let from = 0;
          let to = 0;
          let perPage = 0;
          let lastPage = 0;
          let currentPage = 0;

          res.json({
            status: false,
            items: [],
            total: total,
            from: from,
            to: to,
            perPage: perPage,
            lastPage: lastPage,
            currentPage: currentPage,
          });
        }
      });
  });

router.get("/users",
  // Get All Users 
  (req, res, next) => {
    const params = req.query;
    userRef.once('value', (snapshot) => {
      if (snapshot.val()) {
        let allusers = [];
        let id = 1;

        snapshot.forEach((snap) => {
          const usertype = snap.key;

          if (usertype !== 'admin') {
            const rawtype = snap.val();
            for (const key in rawtype) {
              if (Object.hasOwnProperty.call(rawtype, key)) {
                rawtype[key]['id'] = id
                allusers.push(rawtype[key]);
                id++;
              }
            }
          }

        })

        req.body.allusers = allusers;
        next();

      } else {
        res.json({
          status: false,
          error: "No User Found !"
        })
      }
    })
  },
  // Send Response With Paginated Data
  async (req, res) => {
    const params = req.query;
    const body = req.body;
    let users = body.allusers;

    //   SORT , PAGINATION , SEARCH PARAMS
    let sort = params.sort;
    let filter = params.filter;
    let page = (parseInt(params.page) || 1);
    let per_page = (parseInt(params.per_page) || 5);
    let search = params.search;


    users = users.filter((x) => {
      if (filter === 'user') {
        return x.type === 'user'
      }

      if (filter === 'driver') {
        return x.type === 'driver'
      }

      if (filter === 'vendor') {
        return x.type === 'vendor'
      }

      if (filter === 'pro') {
        return x.type === 'pro'
      }

      if (filter === 'all') {
        return x
      }
    })


    if (search) {
      var lowSearch = search.toLowerCase();
      users = users.filter((obj) =>
        Object.values(obj).some((val) =>
          String(val).toLowerCase().includes(lowSearch)
        )
      );
    }

    let length = users.length;


    let from = (page - 1) * per_page + 1;
    let to = (from + per_page) <= length ? (from + per_page - 1) : length;
    let current_page = page;
    let last_page = (length % per_page) == 0 ? (length / per_page) : (Math.floor(length / per_page) + 1);
    let total = length;
    let next_page_url;
    if (to < length) {
      next_page_url = `https://api.meribilty.com/admin/users?page=${page + 1}&per_page=${per_page}`
    }
    let prev_page_url
    if ((from - 1) != 0) {
      prev_page_url = `https://api.meribilty.com/admin/users?page=${page - 1}&per_page=${per_page}`
    }

    // Sort if sort is passed
    if (sort) {
      users.sort((a, b) => (a[sort] > b[sort]) ? 1 : ((b[sort] > a[sort]) ? -1 : 0));
    }




    users = users.slice(from - 1, to);

    res.json({
      status: true,
      total,
      from,
      to,
      per_page,
      current_page,
      last_page,
      next_page_url,
      prev_page_url,
      items: users,
    });
  });

// ============ Admin Auth =============


router.post("/create-admin",
  (req, res) => {
    const params = req.body;

    const salt = bcrypt.genSaltSync(saltRounds);
    const hash = bcrypt.hashSync(params.password, salt);

    userRef.child("admin").set({
      email: params.email,
      password: hash
    }).then(() => {
      res.json({
        status: true,
        message: "Admin Created Successfully"
      })
    }).catch((err) => {
      res.json({
        status: false,
        message: err
      })
    })
  })

router.post("/authenticate-admin",
  // check in database
  (req, res, next) => {
    const params = req.body;

    userRef.child('admin').once('value', (snapshot) => {
      if (snapshot.val()) {
        const user = snapshot.val();

        if (user.email === params.email) {
          const check = bcrypt.compareSync(params.password, user.password);

          if (check) {
            const additionalClaims = {
              user_type: "admin",
            };

            admin.auth().createCustomToken(params.email, additionalClaims).then((customToken) => {
              res.json({
                status: true,
                token: customToken
              })
            })
          } else {
            res.json({
              status: false,
              error: "Invalid Passwords !"
            })
          }

        } else {
          res.json({
            status: false,
            error: "Invalid Email !"
          })
        }
      } else {
        res.json({
          status: false,
          error: "Admin Not Registered"
        })
      }
    })
  }
)

// Request/Order Flow ======================

// /create_request -> (Transit / Upcountry)
router.post(
  "/create_request",
  // Check User 
  (req, res, next) => {
    const params = req.body;
    
    console.log('params->',params)

    if(params.userfound) {
      userRef.child('users').child(params.user_phone).once('value', (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          console.log('user found');
          next();
        } else {
          userRef.child('pro').child(params.user_phone).once('value', (snapshot) => {
            if (snapshot.val()) {
              const user = snapshot.val();
              req.body.user = user;
              console.log('user found');
              next();
            } else {
              res.json({
                status: false,
                error: "User Not Found ! "
              })
            }
          })
        }
      })
    } else {
      console.log('on user creation');
      let newUser = userRef.child("users").push();

      let data = {
        id: newUser.key,
        phone: params.user_phone,
        email: params.user_email,
        fullname: params.user_name,
        type: 'user',
        created: getCurrentDate(),
        created_timestamp: getCurrentTimestamp(),
        verified: true,
        blocked: false,
        pro:false,
        form: "user"
        };

      console.log('check data -> ',data);
      userRef.child("users").child(params.user_phone).set(data).then(() => {
                walletRef
                  .child("users")
                  .child(params.user_phone)
                  .set({
                    amount: "0",
                    type: "cash",
                    transactions: []
                  })
                  .then(() => {
                    console.log('New User Has Been Created !')
                    req.body.user = data;
                    next();
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
  },
  // Check Number Of Requests
  (req, res, next) => {
    pplRequestRef.limitToLast(1).once("value", (snapshot) => {
      if (snapshot.val()) {
        req.body.totalRequests = parseInt(Object.keys(snapshot.val())[0]);
        console.log('num of req checked !');
        next();
      } else {
        req.body.totalRequests = 0;
        next();
      }
    });
  },
  // Get Distance Between Routes 
  (req,res,next) => {
   const params = req.body;

   googleMapsClient
   .directions({
     params: {
       origin: [
         params.orgLat,
         params.orgLng,
       ],
       destination: [params.desLat, params.desLng],
       mode: "driving",
       key: "AIzaSyBtmA2MsfljS60NA3c_ljiVXC5gvv8TIFg",
     },
   })
   .then((Google) => {
     req.body.route = Google.data;
     console.log('params.route.routes[0].legs[0] -> ',params.route.routes[0].legs[0] )
     next();
   })
   .catch((err) => {
     console.log(err);
     res.json({
       status:false,
       error: err
     })
   });
  },
  // Create PPL Request
  (req, res, next) => {
    const params = req.body;

    // Request Phases :
    // "1" => User Sent A Request | No Vendor has accepted the request
    // "2" => Request Is Given To All Vendors
    // "3" => Vendors will give their best offers
    // "4" => Lowest Price Offer Will Be Given To User
    // "5" => User Will Accept/Counter The Offer
    // "6" => Vendors Will Be Given Counter Offer
    // "7" => Vendors Will Be Accept/Counter The Counter Offer
    // "8" => User Will Be Given The Final Counter Offer From Vendor
    // "9" => User Will Accept/Reject The Final Counter Offer From Vendor

    // const newUserRequest = pplRequestRef.push();
    // const reqId = newUserRequest.key;
    const no = (params.totalRequests + 1 < 10) ? `000${params.totalRequests + 1}`
      : (params.totalRequests + 1 < 100) ? `00${params.totalRequests + 1}`
        : (params.totalRequests + 1 < 1000) ? `0${params.totalRequests + 1}`
          : (params.totalRequests + 1);
    req.body.orderNo = no;

    let data = {
      material: null,
      orderNo: no,
      ...params,
      disText: params.route.routes[0].legs[0].distance.text,
      durText: params.route.routes[0].legs[0].duration.text,
      user: null,
      user_id: params.user.id,
      user_phone: params.user.phone,
      user_type: params.user.type,
      username: params.user.fullname,
      selections: params.selections,
      status: "pending",
      request_type: params.type,
      cargo_insurance: params.cargo_insurance || null,
      token: null,
      createdAt: getCurrentDate(),
      createdAt_timestamp: getCurrentTimestamp()
    };

    console.log('request object -> ',data);

    pplRequestRef
        .child(no)
        .set(data)
        .then(() => {
          // Inform All Active Drivers
          // console.log("PPL Transit Cargo Request Created !");
          console.log('request created');
          next();
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;
    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();
        req.body.request = request;
        console.log('got request data ');
        next();
      } else {
        res.json({
          status: false,
          error: "Unexpected Error! Please, Try Again",
        });
      }
    });
  },
  // Create Order Bilties For Upcountry
  (req, res, next) => {
    const params = req.body;
    const selections = params.selections;
    const vehicles = selections.vehicles;
    const loading_options = selections.loading_options;
    const unloading_options = selections.unloading_options;

    console.log('Selections -> ', params.selections);

    if (vehicles.length !== 0) {
      if (vehicles.length >= 1) {
        let allBilties = [];
        let allLoadingOptions = [];
        let allUnloadingOptions = [];
        let numCount = 0;
        const alphabets = "aabcdefghijklmnopqrstuvwxyz".split("");

        vehicles.forEach((vehicle) => {
          if (vehicle.quantity >= 1) {
            for (let i = 0; i < vehicle.quantity; i++) {
              numCount++
              let BiltyNo = `BT${params.request.orderNo}${alphabets[numCount]}${numCount}`;
              let weight = vehicle.weight[i];
              let material = vehicle.material[i];


              let bilty = {
                ...vehicle,
                quantity:1,
                price: null,
                weight: weight,
                material: material ? material : "Not Specified",
                type: 'vehicle',
                status: "pending",
                biltyNo: BiltyNo,
              };

              allBilties.push(bilty);

              if (i == vehicle.quantity) {
                break;
              }
            }
          }
        });

        console.log('vehicles -> ',vehicles);

        if(loading_options && loading_options.length > 0) {
          loading_options.forEach((vehicle) => {

            for (let i = 0; i < vehicle.quantity; i++) {
  
              let takeid = pplRequestRef
                .child(params.request.orderNo)
                .child("bilty").push();
  
              let id = takeid.key;
  
              let weight = vehicle.weight[i];
  
              let bilty = {
                id: id,
                ...vehicle,
                weight:weight,
                price: null,
                quantity: null,
                type: 'loading',
              };
              allLoadingOptions.push(bilty);
            }
  
          });
        }

        if(unloading_options && unloading_options.length > 0) {
          unloading_options.forEach((vehicle) => {

            for (let i = 0; i < vehicle.quantity; i++) {
  
              let takeid = pplRequestRef
                .child(params.request.orderNo)
                .child("bilty").push();
  
              let id = takeid.key;
  
              let weight = vehicle.weight[i];
  
  
              let bilty = {
                id: id,
                ...vehicle,
                weight:weight,
                quantity: null,
                price: null,
                type: 'unloading',
              };
              allUnloadingOptions.push(bilty);
  
            }
          });
        

            let weight = vehicle.weight[i];

            let bilty = {
              id: id,
              
              ...vehicle,
              quantity:1,
              weight:weight,
              price: null,
              quantity: null,
              type: 'loading',
            };
            allLoadingOptions.push(bilty);
        }
        

        console.log('unloading_options -> ',unloading_options);

        unloading_options.forEach((vehicle) => {

          for (let i = 0; i < vehicle.quantity; i++) {

            let takeid = pplRequestRef
              .child(params.request.orderNo)
              .child("bilty").push();

            let id = takeid.key;

            let weight = vehicle.weight[i];


            let bilty = {
              id: id,
              ...vehicle,
              quantity:1,
              weight:weight,
              quantity: null,
              price: null,
              type: 'unloading',
            };
            allUnloadingOptions.push(bilty);

          }
        });

        if (allLoadingOptions.length >= 1 || allUnloadingOptions.length >= 1) {
          numCount++

          let BiltyNo = `BT${params.request.orderNo}${alphabets[numCount]}${numCount}`;

          let loadingUnloadingBilty = {
            biltyNo: BiltyNo,
            loading_options: allLoadingOptions,
            unloading_options: allUnloadingOptions,
            type: 'loading/unloading'
          };

          allBilties.push(loadingUnloadingBilty)
        }
        

        console.log('allBilties -> ',allBilties);
        pplRequestRef
          .child(params.request.orderNo)
          .child("bilty")
          .set(allBilties)
          .catch((err) => console.log(err));

        
        console.log('order bilty done ');
        next();
      } else {
        res.json({
          status: false,
          error: "User Didnt Have Vehicle Selection !"
        })
      }
    
    } else {
      console.log('vehicles -> ',vehicles);
      res.json({
        status: false,
        error: "Vehicle Loop Issue !",
      });
    }
  },
  // Done
  (req, res) => {
    const params = req.body;
    res.json({
      status: true,
      message: `PPL Request Has Been Placed !`,
      orderNo: params.orderNo,
    });
  }
);

// /vendor_send_qoute -> Vendor Will send a qoute for a order
router.post(
  "/vendor_send_qoute",
  // Check Vendor
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("vendors")
      .child(params.vendor_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          console.log('vendor checked !')
          next()

        } else {
          res.json({
            status: false,
            error: "Vendor did not exists !",
          });
        }
      })
  },
  // Check Request 
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();
        req.body.request = request;
        console.log('request checked');
        next();
      } else {
        res.json({
          status: false,
          error: "Request not found !",
        });
      }
    });

  },
  // Check Qoute Bid Existance
  (req, res, next) => {
    const params = req.body;

   
    pplBiddingsRef
    .child(params.request.request_type)
    .child("qoutes")
    .orderByChild("orderNo")
    .equalTo(params.request.orderNo)
    .once("value", (snapshot) => {
      if (snapshot.val()) {
        const rawqoutes = snapshot.val();
        const qoutes = [];
        const convert = Object.entries(rawqoutes);

        convert.forEach((x) => {
          qoutes.push(x[1])
        })

        const filterByPhone = qoutes.filter((q) => {
          return q.phone === params.vendor_phone
        })

        console.log('filterByPhone -> ', filterByPhone)

        if (filterByPhone) {
          if (filterByPhone.length !== 0) {
            res.json({
              status: false,
              error: "Vendor Already Sent Qoute On This Order !"
            })
          } else {
            console.log('Qoute Checked')
            next()
          }
        }
      } else {
        console.log('Qoute Checked')
        next();
      }
    });
  },
  // Check ID
  (req, res, next) => {
    const params = req.body;
    pplBiddingsRef
      .child(req.body.request.request_type)
      .child("qoutes")
      .limitToLast(1)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          req.body.id = (parseInt(Object.entries(snapshot.val())[0][1].id) + 1);
          console.log('Qoute Count Done')
          next();
        } else {
          req.body.id = 1;
          console.log('Qoute Count Done')
          next();
        }
      });
  },
  // Create A Qoute Bid
  (req, res, next) => {
    const params = req.body;

    const newVendorQoute = pplBiddingsRef
      .child(params.request.request_type)
      .child("qoutes")
      .push();
    const qouteKey = newVendorQoute.key;

    console.log('ready to create qoute');


    let data = {
      nature: "Qoute",
      phone: params.vendor.phone || null,
      name: params.vendor.company_name,
      vendor_name: params.vendor.company_name,
      name: params.vendor.company_name || null,
      company_name: params.vendor.company_name || null,
      company_phone: params.vendor.company_phone_landline || null,
      company_address: params.vendor.company_address || null,
      NTN_number: params.vendor.NTN_number || null,
      user_phone: params.request.user_phone || null,
      qouteId: qouteKey || null,
      orderNo: params.request.orderNo || null,
      qoute_amount: params.amount || null,
      qoutedAt: getCurrentDate(),
      qoutedAt_timestamp: getCurrentTimestamp(),
      status: "pending" || null,
      type: params.type || null,
      biltyQuantity: params.request.bilty.length || null,
      bilties: params.request.bilty,
      date: params.request.date,
      desLat: params.request.desLat,
      desLng: params.request.desLng,
      disText: params.request.disText,
      durText: params.request.durText,
      orgLat: params.request.orgLat,
      orgLng: params.request.orgLng,
      originAddress: params.request.originAddress || null,
      destinationAddress: params.request.destinationAddress || null,
      containerReturnAddress: params.request.containerReturnAddress || null,
      request_type: params.request.request_type,
      type: params.request.request_type,
    };



    console.log('data -> ',data);

    newVendorQoute
        .set(data)
        .then(() => {
          res.json({
            status:true,
            message: "Qoute has been sent successfully!"
          })
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
  },
);

// /get_best_vendor_qoutes -> User Will get a qoute for lowest price
router.post(
  "/get_best_vendor_qoutes",
  body("orderNo").isString().withMessage("orderNo must be string"),
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
      case "admin":
        // req.body.vendor = params.user;
        next();
        break;

      default:
        res.json({
          status: false,
          error: `This Service Is Only For Admin !`,
        });
        break;
    }
  },
  // Check Request
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
          error: "PPL Request not found !",
        });
      }
    });
  },
  // Check Qoute Bid Existance
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type === 'transit') {
      pplBiddingsRef
        .child(params.request.request_type)
        .child("qoutes")
        .orderByChild("orderNo")
        .equalTo(params.request.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const rawqoutes = snapshot.val();
            const convert = Object.entries(rawqoutes);
            const qoutes = [];

            convert.forEach((x) => {
              qoutes.push(x[1]);
            });

            const pendingQoutes = qoutes.filter((q) => {
              return q.status === "pending";
            });

            console.log("pendingQoutes -> ", pendingQoutes);

            if (pendingQoutes.length == 0) {
              console.log("Emtpy -> ", pendingQoutes);
            } else {
              // Calculate Lowest Price
              const orderedQoutes = _.orderBy(
                pendingQoutes,
                (qoute) => qoute.qoute_amount
              );

              if (orderedQoutes) {
                if (orderedQoutes.length !== 0) {
                  res.json({
                    status: true,
                    data: orderedQoutes[0]
                  });
                } else {
                  res.json({
                    status: true,
                    data: [],
                    message: "No Vendor Qouted On This Order !"
                  });
                }
              }


            }
          } else {
            res.json({
              status: false,
              error: "No Qoutes Found On This Order !",
            });
          }
        });
    } else {
      pplBiddingsRef
        .child(params.request.request_type)
        .child("qoutes")
        .orderByChild("orderNo")
        .equalTo(params.request.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const rawqoutes = snapshot.val();
            const convert = Object.entries(rawqoutes);
            const qoutes = [];

            convert.forEach((x) => {
              qoutes.push(x[1]);
            });

            const pendingQoutes = qoutes.filter((q) => {
              return q.status === "pending";
            });

            if (pendingQoutes) {
              if (pendingQoutes.length > 0) {
                // Get All SubOrderNos
                req.body.pendingQoutes = pendingQoutes;
                next();

              } else {
                res.json({
                  status: false,
                  error: "There is no pending qoutes on this order !"
                })
              }
            } else {
              res.json({
                status: false,
                error: "problem in pending qoutes filter  !"
              })
            }


          } else {
            res.json({
              status: false,
              error: "No Qoutes Found On This Order !",
            });
          }
        });

    }
  },
  // Check SubOrders
  (req, res, next) => {
    const params = req.body;

    const suborders = params.request.subOrders;

    const getAllSubOrders = suborders.map((x) => {
      return x.subOrderNo
    })

    let best_qoutes_on_suborders = [];


    console.log('params.pendingQoutes->',)

    getAllSubOrders.forEach((suborderno) => {
      // console.log('x -> ',x)
      // params.pendingQoutes.filter((qoute) => {
      //   if(qoute.subOrderNo === suborderno) {
      //     qoute_prices.push(qoute.amount);

      //   }
      // })

      const bestprice = params.pendingQoutes.reduce(function (prev, curr) {
        return prev.amount < curr.amount ? prev : curr;
      });

      if (bestprice.subOrderNo === suborderno) {
        best_qoutes_on_suborders.push(bestprice)
      }

    })


    res.json({
      status: true,
      data: best_qoutes_on_suborders
    })




  }
);

// /user_accept_vendor_qoute -> (User accepts the Vendor Qoute & Its Amount)
router.post(
  "/user_accept_vendor_qoute",
  body("user_phone").isMobilePhone().withMessage("user_phone is not valid"),
  body("vendor_phone").isMobilePhone().withMessage("vendor_phone is not valid"),
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
    console.log('params -> ', params)

    switch (params.user.user_type) {
      case "admin":
        // req.body.vendor = params.user;
        next();
        break;

      default:
        res.json({
          status: false,
          error: `This Service Is Only For Admin !`,
        });
        break;
    }
  },
   // Check Vendor
   (req, res, next) => {
    const params = req.body;

    userRef
      .child("vendors")
      .child(params.vendor_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          console.log('vendor checked !')
          next()

        } else {
          res.json({
            status: false,
            error: "Vendor did not exists !",
          });
        }
      })
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;

    pplRequestRef
    .child(params.orderNo)
    .once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();
        req.body.request = request;
        if (request.status == "pending") {
          console.log("request -> ok ");
          next();
        } else {
          res.json({
            status: false,
            error: `Request has status of ${request.status}`,
          });
        }
      } else {
        res.json({
          status: false,
          error: "No Request data Found !",
        });
      }
    })
    .catch((error) => {
      res.json({
        status: false,
        error: error.message,
      });
    });

  },
  // Check Qoute
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
        .child(params.request.request_type)
        .child("qoutes")
        .child(params.qouteId)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const qoute = snapshot.val();


            if (qoute.status === "pending") {
              req.body.qoute = qoute;
              next();
            } else {
              res.json({
                status: false,
                error: `The Qoute Was ${qoute.status} Already !`,
              });
            }

          } else {
            res.json({
              status: false,
              error: "Qoute did not exists !",
            });
          }
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });

  },
  // Update Qoute
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
      .child(params.request.request_type)
      .child("qoutes")
      .child(params.qouteId)
      .update({
        status: "accepted",
        accepted_on: getCurrentDate(),
      })
      .then(() => {
        console.log('qoute accepted')
        next();
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  },
  // Update Request
  (req, res, next) => {
    const params = req.body;

    let data = {
      status: "qoute_accepted",
      qoute_accepted_on: getCurrentDate(),
      qoute: params.qoute,
      vendor_phone: params.qoute.phone,
      name: params.qoute.company_name,
      vendor_name: params.qoute.company_name,
      company_name: params.qoute.company_name,
      company_phone: params.qoute.company_phone || null,
      company_address: params.qoute.company_address,
      NTN_number: params.qoute.NTN_number,
    };

    console.log('data -> ',data);

    pplRequestRef
          .child(params.orderNo)
          .update(data)
          .then(() => {
             next();
          })
          .catch((error) => {
            res.json({
              status: false,
              error: error.message,
            });
          });
  },
  // Reject All Other Qoutes 
  (req,res) => {
    const params = req.body;

    pplBiddingsRef
        .child(params.request.request_type)
        .child("qoutes")
        .orderByChild("orderNo")
        .equalTo(params.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
           const qoutes = [];
           snapshot.forEach((snap)=>{
             qoutes.push(snap.val())
           })
           
            const otherQoutes = qoutes.filter((q) => {
              return q.qouteId !== params.qoute.qouteId
            })

            console.log('otherQoutes -> ', otherQoutes)

            if (otherQoutes) {
              if (otherQoutes.length !== 0) {
                otherQoutes.forEach((x) => {
                  pplBiddingsRef
                      .child(params.request.request_type)
                      .child("qoutes")
                      .child(x.qouteId)
                      .update({
                        status: "rejected"
                      }).catch(err => console.log(err))
                })
                res.json({
                  status: true,
                  message: `User accepted the qoute for ${req.body.qoute.qoute_amount} PKR`,
                });
               
              } else {
                res.json({
                  status: true,
                  message: `User accepted the qoute for ${req.body.qoute.qoute_amount}`,
                });
              }
            }

          } else {
            res.json({
              status: true,
              message: `User accepted the qoute for ${req.body.qoute.qoute_amount}`,
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

// /user_reject_vendor_qoute -> user rejects the best vendor qoute - user => 1x
router.post(
  "/user_reject_vendor_qoute",
  // Retrieve User
  (req, res, next) => {
    const params = req.body;

      userRef
          .child("users")
          .child(params.user_phone)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              req.body.user = snapshot.val();
              console.log('user type user ')
              next();
            } else {
              userRef
                .child("pro")
                .child(params.user_phone)
                .once("value", (snapshot) => {
                  if (snapshot.val()) {
                    req.body.user = snapshot.val();
                    console.log('pro type user ')
                    next();
                  } else {
                    res.json({
                      status: false,
                      error: "User Not Found in Database !",
                    });
                  }
                })
            }
          })
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;

    console.log('params.orderNo -> ', params.orderNo)
    pplRequestRef
      .child(params.orderNo)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const request = snapshot.val();


          switch (request.status) {
            case "pending":

              req.body.request = request;
              next();

              break;

            case "qoute_accepted":
              res.json({
                status: false,
                error: "You already accepted the qoute !",
              });
              break;
            case "qoute_rejected":
              res.json({
                status: false,
                error: "Qoute is already rejected !",
              });
              break;
            case "user_counter_accepted":
              res.json({
                status: false,
                error:
                  "Cannot Reject Qoute , You accepted the counter to this qoute !",
              });

              break;

            case "user_counter_rejected":
              res.json({
                status: false,
                error:
                  "Cannot Reject Qoute , You rejected the counter to this qoute !",
              });

              break;

            case "vendor_counter_accepted":
              res.json({
                status: false,
                error:
                  "Cannot Reject Qoute , Vendor has accepted your counter offer !",
              });

              break;

            case "vendor_counter_rejected":
              res.json({
                status: false,
                error:
                  "Cannot Reject Qoute , Vendor has rejected your counter offer !",
              });

              break;

            case "accepted":
              res.json({
                status: false,
                error:
                  "Cannot Reject Qoute , Order Has Been Accepted And Placed !",
              });
              break;
            case "rejected":
              res.json({
                status: false,
                error:
                  "Cannot Reject Qoute , Order Has Been Rejected Already !",
              });
              break;

            default:
              break;
          }
        } else {

          res.json({
            status: false,
            error: "Request Not Found !",
          });
        }
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });

  },
  // Check Qoute
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
    .child(params.request.request_type)
    .child("qoutes")
    .orderByChild("orderNo")
    .equalTo(params.orderNo)
    .once("value", (snapshot) => {
      if (snapshot.val()) {
        const rawqoute = snapshot.val();
        const convert = Object.entries(rawqoute);

        const final = [];
        convert.forEach((x) => {
          final.push(x[1]);
        });

        const filterByPhone = final.filter((q) => {
          return q.phone === params.vendor_phone
        })

        console.log('filterByPhone -> ', filterByPhone)

        if (filterByPhone) {
          if (filterByPhone.length !== 0) {
            const qoute = filterByPhone[0];

            if (qoute.status === "pending") {
              req.body.qoute = qoute;
              next();
            } else {
              res.json({
                status: false,
                error: `Your Qoute Was ${qoute.status} Already !`,
              });
            }
          } else {
            res.json({
              status: false,
              error: "Qoute did not exists !",
            });
          }
        }

      } else {
        res.json({
          status: false,
          error: "Qoute did not exists !",
        });
      }
    })
    .catch((err) => {
      res.json({
        status: false,
        error: err.message,
      });
    });


  },
  // Update Qoute
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
      .child(params.request.request_type)
      .child("qoutes")
      .child(params.qoute.qouteId)
      .update({
        status: "rejected",
        rejected_on: getCurrentDate(),
      })
      .then(() => {
        next();
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  },
  // Update Request
  (req, res) => {
    const params = req.body;

    let data = {
      status: "qoute_rejected",
      qoute_rejected_on: getCurrentDate(),
      qoute: params.qoute,
      vendor_phone: params.qoute.phone,
      name: params.qoute.company_name,
      vendor_name: params.qoute.company_name,
      company_name: params.qoute.company_name,
      company_phone: params.qoute.company_phone,
      company_address: params.qoute.company_address,
      NTN_number: params.qoute.NTN_number,
    };
    
    console.log('data -> ',data);
    pplRequestRef
    .child(params.orderNo)
    .update(data)
    .then(() => {
      res.json({
        status: true,
        message: `User rejected the qoute for ${req.body.qoute.qoute_amount}`,
      });
    })
    .catch((error) => {
      res.json({
        status: false,
        error: error.message,
      });
    });
  }
);

// /user_counters_vendor_qoute -> user counters the vendor qoute - user => 1x (first time)
router.post(
  "/user_counters_vendor_qoute",
  body("orderNo").isString().withMessage("amount must be an string"),
  body("user_phone").isMobilePhone().withMessage("user_phone is not valid"),
  body("vendor_phone").isMobilePhone().withMessage("vendor_phone is not valid"),
  body("amount").isString().withMessage("amount must be an string"),
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
      case "admin":
        // req.body.vendor = params.user;
        next();
        break;

      default:
        res.json({
          status: false,
          error: `This Service Is Only For Admin !`,
        });
        break;
    }
  },
  // Retrieve User
  (req, res, next) => {
    const params = req.body;

    userRef
          .child("users")
          .child(params.user_phone)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              req.body.user = snapshot.val();
              next();
            } else {
              userRef
                .child("pro")
                .child(params.user_phone)
                .once("value", (snapshot) => {
                  if (snapshot.val()) {
                    req.body.user = snapshot.val();
                    next();
                  } else {
                    res.json({
                      status: false,
                      error: "User Not Found in Database !",
                    });
                  }
                })
            }
          })
  },
   // Check Vendor
   (req, res, next) => {
    const params = req.body;

    userRef
      .child("vendors")
      .child(params.vendor_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          console.log('vendor checked !')
          next()

        } else {
          res.json({
            status: false,
            error: "Vendor did not exists !",
          });
        }
      })
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      const request = snapshot.val();

      if (request) {
        req.body.request = request;

        if (request.request_type == 'transit') {
          next();
        } else {
          res.json({
            status: false,
            error: 'Request Type Upcountry , Requires Only subOrderNo'
          })
        }

      } else {
        res.json({
          status: false,
          error: "Request Data NOt Found !",
        });
      }
    });
  },
  // Check User Has Countered The Offer Before ?
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
        .child(params.request.request_type)
        .child("user_counter")
        .orderByChild("orderNo")
        .equalTo(params.request.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const rawcounter_offers = snapshot.val();
            const convert = Object.entries(rawcounter_offers);
            const counter_offers = [];

            convert.forEach((x) => {
              counter_offers.push(x[1]);
            });

            const checkUserCounterForThisOrder = counter_offers.filter(
              (offer) => {
                return (
                  offer.orderNo === params.orderNo &&
                  offer.vendor_phone === params.vendor_phone
                );
              }
            );

            if (checkUserCounterForThisOrder) {
              if (checkUserCounterForThisOrder.length !== 0) {
                res.json({
                  status: false,
                  error: "User Already Sent Counter Offer On This Qoute",
                });
              } else {
                next();
              }
            }
          } else {
            next();
          }
        });
  },
  // Check Vendor Qoute
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
        .child(params.request.request_type)
        .child("qoutes")
        .orderByChild("orderNo")
        .equalTo(params.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const rawqoute = snapshot.val();
            const convert = Object.entries(rawqoute);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
            });

            const filterByPhone = final.filter((q) => {
              return q.phone === params.vendor_phone
            })

            console.log('filterByPhone -> ', filterByPhone)

            if (filterByPhone) {
              if (filterByPhone.length !== 0) {
                const qoute = filterByPhone[0];

                if (qoute.status === "pending") {
                  req.body.qoute = qoute;
                  next();
                } else {
                  res.json({
                    status: false,
                    error: `Vendor's Qoute Was ${qoute.status} Already !`,
                  });
                }
              } else {
                res.json({
                  status: false,
                  error: "Qoute did not exists !",
                });
              }
            }

          } else {
            res.json({
              status: false,
              error: "Qoute did not exists !",
            });
          }
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
  },
  // Check ID
  (req, res, next) => {
    pplBiddingsRef
      .child(req.body.request.request_type)
      .child("user_counter")
      .limitToLast(1)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          req.body.id = (parseInt(Object.entries(snapshot.val())[0][1].id) + 1);
          next();
        } else {
          req.body.id = 1;
          next();
        }
      });
  },
  // Create A User Counter Offer
  (req, res, next) => {
    // amount
    // vendor_phone

    const params = req.body;
    console.log("On User Counter OFfer ");

    const newUserCounterOffer = pplBiddingsRef
    .child(params.request.request_type)
    .child("user_counter")
    .push();

  const transitCounterOfferKey = newUserCounterOffer.key;
  req.body.counterId = transitCounterOfferKey;

  newUserCounterOffer
    .set({
      nature: "User Counter Offer",
          biltyQuantity: params.request.bilty.length || null,
          bilties: params.request.bilty,
          date: params.request.date,
          desLat: params.request.desLat,
          desLng: params.request.desLng,
          disText: params.request.disText,
          durText: params.request.durText,
          orgLat: params.request.orgLat,
          orgLng: params.request.orgLng,
          originAddress: params.request.originAddress || null,
          destinationAddress: params.request.destinationAddress || null,
          containerReturnAddress: params.request.containerReturnAddress || null,
          orderNo: params.request.orderNo,
          counterId: transitCounterOfferKey,
          qouteId: params.qoute.qouteId,
          amount: params.amount,
          counteredAt: getCurrentDate(),
          counteredAt_timestamp: getCurrentTimestamp(),
          user_phone: params.user.phone,
          vendor_phone: params.vendor_phone,
          vendor_name: params.qoute.company_name,
          name: params.qoute.company_name || null,
          company_name: params.qoute.company_name || null,
          company_phone: params.qoute.company_phone || null,
          company_address: params.qoute.company_address || null,
          NTN_number: params.qoute.NTN_number || null,
          status: "pending",
          request_type: params.request.request_type,
          type: params.request.request_type,
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
  // Update Vendor Qoute
  (req, res) => {
    const params = req.body;

    pplBiddingsRef
    .child(params.request.request_type)
    .child("qoutes")
    .child(params.qoute.qouteId)
    .update({
      status: "countered",
      counterId: params.counterId,
      countered_at: getCurrentDate(),
    })
    .then(() => {
      res.json({
        status: true,
        message: "User Countered the Offer Successfully",
      });
    })
    .catch((error) => {
      res.json({
        status: false,
        error: error.message,
      });
    });
  }
);

// vendor_reject_user_counter_offer -> Vendor Will reject first counter offer by user
router.post(
  "/vendor_reject_counter_offer",
  body("user_phone").isMobilePhone().withMessage("user_phone is not valid"),
  body("vendor_phone").isMobilePhone().withMessage("vendor_phone is not valid"),
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
      case "admin":
        // req.body.vendor = params.user;
        next();
        break;

      default:
        res.json({
          status: false,
          error: `This Service Is Only For Admin !`,
        });
        break;
    }
  },
  // Check Request Status
  (req, res, next) => {
    const params = req.body;

    pplRequestRef
        .child(params.orderNo)
        .once("value", (snapshot) => {
          const request = snapshot.val();

          if (request.status == "pending") {
            req.body.request = snapshot.val();
            next();
          } else {
            res.json({
              status: false,
              error: "Request is not pending !",
            });
          }
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
  },
  // Check User Counter Offer
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
    .child(params.request.request_type)
    .child("user_counter")
    .orderByChild("orderNo")
    .equalTo(params.orderNo)
    .once("value", (snapshot) => {
      if (snapshot.val()) {
        const user_counter = snapshot.val();

        const convert = Object.entries(user_counter);

        const final = [];
        convert.forEach((x) => {
          final.push(x[1]);
        });

        const filter = final.filter(
          (qoute) => qoute.vendor_phone === params.vendor_phone
        );

        if (filter.length !== 0) {
          if (filter[0].status == "pending") {
            req.body.user_counter = filter[0];
            next();
          } else {
            res.json({
              status: false,
              error: `The user_counter Has A Status -> ${filter[0].status}`,
            });
          }
        } else {
          res.json({
            status: false,
            error: "Problem In user_counter Filter",
          });
        }
      } else {
        res.json({
          status: false,
          error: "user_counter did not exists !",
        });
      }
    })
    .catch((error) => {
      res.json({
        status: false,
        error: error.message,
      });
    });
  },
  // Update User Counter Offer
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
      .child(params.request.request_type)
      .child("user_counter")
      .child(params.user_counter.counterId)
      .update({
        status: "rejected",
        rejected_on: getCurrentDate(),
      })
      .then(() => {
        next();
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  },
  // Update Request
  (req, res) => {
    const params = req.body;

    pplRequestRef
        .child(params.request.orderNo)
        .update({
          status: "user_counter_rejected",
          user_counter_rejected_on: getCurrentDate(),
          user_counter: params.user_counter,
          vendor_phone: params.vendor_phone,
          vendor_name: params.qoute.company_name,
          company_name: params.qoute.company_name,
          company_phone: params.qoute.company_phone,
          company_address: params.qoute.company_address,
          NTN_number: params.qoute.NTN_number,
        })
        .then(() => {
          res.json({
            status: true,
            message: `Vendor rejected user counter offer for ${params.user_counter.amount}`,
          });
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });

  }
);

// /vendor_accept_counter_offer -> Vendor Accepts first User Counter Offer
router.post(
  "/vendor_accept_counter_offer",
   // Check Vendor
   (req, res, next) => {
    const params = req.body;

    userRef
      .child("vendors")
      .child(params.vendor_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          console.log('vendor checked !')
          next()

        } else {
          res.json({
            status: false,
            error: "Vendor did not exists !",
          });
        }
      })
  },
  // Check Request Status
  (req, res, next) => {
    const params = req.body;

    pplRequestRef
        .child(params.orderNo)
        .once("value", (snapshot) => {
          const request = snapshot.val();

          if (request.status == "pending") {
            req.body.request = snapshot.val();
            next();
          } else {
            res.json({
              status: false,
              error: "Request is not pending !",
            });
          }
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
  },
  // Check User Counter Offer
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
    .child(params.request.request_type)
    .child("user_counter")
    .orderByChild("orderNo")
    .equalTo(params.orderNo)
    .once("value", (snapshot) => {
      if (snapshot.val()) {
        const user_counter = snapshot.val();

        const convert = Object.entries(user_counter);

        const final = [];
        convert.forEach((x) => {
          final.push(x[1]);
        });

        const filter = final.filter(
          (qoute) => qoute.vendor_phone === params.vendor_phone
        );

        if (filter.length !== 0) {
          if (filter[0].status == "pending") {
            req.body.user_counter = filter[0];
            next();
          } else {
            res.json({
              status: false,
              error: `The user_counter Has A Status -> ${filter[0].status}`,
            });
          }
        } else {
          res.json({
            status: false,
            error: "Problem In user_counter Filter",
          });
        }
      } else {
        res.json({
          status: false,
          error: "user_counter did not exists !",
        });
      }
    })
    .catch((error) => {
      res.json({
        status: false,
        error: error.message,
      });
    });
  },
  // Update User Counter Offer
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
      .child(params.request.request_type)
      .child("user_counter")
      .child(params.user_counter.counterId)
      .update({
        status: "accepted",
        accepted_on: getCurrentDate(),
      })
      .then(() => {
        next();
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  },
  // Update Request
  (req, res, next) => {
    const params = req.body;

    pplRequestRef
    .child(params.request.orderNo)
    .update({
      status: "user_counter_accepted",
      user_counter: params.user_counter,
      user_counter_accepted_on: getCurrentDate(),
      vendor_phone: params.vendor_phone,
      vendor_name: params.user_counter.company_name,
          company_name: params.user_counter.company_name,
          company_phone: params.user_counter.company_phone,
          company_address: params.user_counter.company_address,
          NTN_number: params.user_counter.NTN_number,
    })
    .then(() => {
      res.json({
        status: true,
        message: `Vendor accepted user counter offer of amount ${params.user_counter.amount}`,
        data: params.user_counter,
      });
    })
    .catch((error) => {
      res.json({
        status: false,
        error: error.message,
      });
    });

  }
);

// /vendor_counters_user_counter_offer -> Vendor Counters The User Counter Offer
router.post(
  "/vendor_counters_user_counter_offer",

  body("amount").isString().withMessage("amount must be a string"),
  body("user_phone").isMobilePhone().withMessage("user_phone is not valid"),
  body("vendor_phone").isMobilePhone().withMessage("vendor_phone is not valid"),
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
      case "admin":
        // req.body.vendor = params.user;
        next();
        break;

      default:
        res.json({
          status: false,
          error: `This Service Is Only For Admin !`,
        });
        break;
    }
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;

    pplRequestRef
        .child(params.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();
            if (request.status == "pending") {
              req.body.request = request;
              next();
            } else {
              res.json({
                status: false,
                error: `Request has status of ${request.status}`,
              });
            }
          } else {
            res.json({
              status: false,
              error: "No Request data Found !",
            });
          }
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
  },
  // Check Vendor
   (req, res, next) => {
    const params = req.body;

    userRef
      .child("vendors")
      .child(params.vendor_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          console.log('vendor checked !')
          next()

        } else {
          res.json({
            status: false,
            error: "Vendor did not exists !",
          });
        }
      })
  },
  // Check Vendor Counter Offer
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
    .child(params.request.request_type)
    .child("vendor_counter")
    .orderByChild("orderNo")
    .equalTo(params.request.orderNo)
    .once("value", (snapshot) => {
      if (snapshot.val()) {
        const vendor_counter = snapshot.val();

        const convert = Object.entries(vendor_counter);

        const final = [];
        convert.forEach((x) => {
          final.push(x[1]);
        });

        const filter = final.filter(
          (offer) =>
            offer.vendor_phone === params.vendor_phone
        );

        console.log("filter -> ", filter);

        if (filter && filter.length !== 0) {
          if (filter[0].status == "pending") {
            req.body.vendor_counter = filter[0];
            next();
          } else {
            res.json({
              status: false,
              error: `The vendor_counter Has A Status -> ${filter[0].status}`,
            });
          }
        } else {
          res.json({
            status: false,
            error: "Problem In vendor_counter Filter",
          });
        }
      } else {
        next();
      }
    })
    .catch((error) => {
      res.json({
        status: false,
        error: error.message,
      });
    });
  },
  // Check User Counter Offer
  (req, res, next) => {
    const params = req.body;


    pplBiddingsRef
    .child(params.request.request_type)
    .child("user_counter")
    .orderByChild("orderNo")
    .equalTo(params.orderNo)
    .once("value", (snapshot) => {
      if (snapshot.val()) {
        const user_counter = snapshot.val();

        const convert = Object.entries(user_counter);

        const final = [];
        convert.forEach((x) => {
          final.push(x[1]);
        });

        const filter = final.filter(
          (offer) =>
            offer.vendor_phone === params.vendor_phone &&
            offer.orderNo === params.orderNo
        );


        if (filter.length !== 0 && filter.length < 2) {
          if (filter[0].status == "pending") {
            req.body.user_counter = filter[0];
            next();
          } else {
            res.json({
              status: false,
              error: `The user_counter Has A Status -> ${filter[0].status}`,
            });
          }
        } else {
          res.json({
            status: false,
            error: "Problem In user_counter Filter",
          });
        }
      } else {
        res.json({
          status: false,
          error: "user_counter did not exists !",
        });
      }
    })
    .catch((error) => {
      res.json({
        status: false,
        error: error.message,
      });
    });
  },
  // Check ID
  (req, res, next) => {
    pplBiddingsRef
      .child(req.body.request.request_type)
      .child("vendor_counter")
      .limitToLast(1)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          req.body.id = (parseInt(Object.entries(snapshot.val())[0][1].id) + 1);
          next();
        } else {
          req.body.id = 1;
          next();
        }
      });
  },
  // Create Vendor Counter Offer
  (req, res, next) => {
    const params = req.body;

    const newVendorCounterOffer = pplBiddingsRef
          .child(params.request.request_type)
          .child("vendor_counter")
          .push();
        const offerKey = newVendorCounterOffer.key;
        req.body.vendorCounterId = offerKey;

        newVendorCounterOffer
          .set({
            nature: "Vendor Counter Offer",
          orderNo: params.orderNo,
          qouteId: params.user_counter.qouteId,
          userCounterId: params.user_counter.counterId,
          vendorCounterId: offerKey,
          vendor_phone: params.user.user_id,
          vendor_name: params.vendor.company_name,
          name: params.user_counter.company_name || null,
          company_name: params.user_counter.company_name || null,
          company_phone: params.user_counter.company_phone || null,
          company_address: params.user_counter.company_address || null,
          NTN_number: params.user_counter.NTN_number || null,
          type: params.request.request_type,
          user_phone: params.user_counter.user_phone,
          vendor_countered_on: getCurrentDate(),
          vendor_countered_on_timestamp: getCurrentTimestamp(),
          amount: params.amount,
          status: "pending",
          biltyQuantity: params.request.bilty.length,
          bilties: params.request.bilty,
          date: params.request.date,
          desLat: params.request.desLat,
          desLng: params.request.desLng,
          disText: params.request.disText,
          durText: params.request.durText,
          orgLat: params.request.orgLat,
          orgLng: params.request.orgLng,
          originAddress: params.request.originAddress || null,
          destinationAddress: params.request.destinationAddress || null,
          containerReturnAddress: params.request.containerReturnAddress || null,
          request_type: params.request.request_type,
          type: params.request.request_type,
          })
          .then(() => {
            next();
          })
          .catch((error) => {
            res.json({
              status: false,
              error: error.message,
            });
          });
  },
  // Update User Counter Offer Status And Request Phase
  (req, res, next) => {
    const params = req.body;
    pplBiddingsRef
      .child(params.request.request_type)
      .child("user_counter")
      .child(params.user_counter.counterId)
      .update({
        status: "countered",
        vendorCounteredAt: getCurrentDate(),
      })
      .then(() => {
        res.json({
          status: true,
          message: "Vendor Countered User Counter Offer Successfully !",
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// /user_accept_vendor_counter_offer -> user accepts vendor counter offer
router.post(
  "/user_accept_vendor_counter_offer",
  body("user_phone").isMobilePhone().withMessage("user_phone is not valid"),
  body("vendor_phone").isMobilePhone().withMessage("vendor_phone is not valid"),
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
      case "admin":
        // req.body.vendor = params.user;
        next();
        break;

      default:
        res.json({
          status: false,
          error: `This Service Is Only For Admin !`,
        });
        break;
    }
  },
  // Check User
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.user_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          next();
        } else {
          userRef
            .child("pro")
            .child(params.user_phone)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                req.body.user = user;
                next();
              } else {
                res.json({
                  status: false,
                  error: "User Not Found in Database !",
                });
              }
            });
        }
      });
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;

    pplRequestRef
        .child(params.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();
            if (request.status == "pending") {
              req.body.request = request;
              next();
            } else {
              res.json({
                status: false,
                error: `Request has status of ${request.status}`,
              });
            }
          } else {
            res.json({
              status: false,
              error: "No Request data Found !",
            });
          }
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
  },
   // Check Vendor
   (req, res, next) => {
    const params = req.body;

    userRef
      .child("vendors")
      .child(params.vendor_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          console.log('vendor checked !')
          next()

        } else {
          res.json({
            status: false,
            error: "Vendor did not exists !",
          });
        }
      })
  },
  // Check Vendor Counter Offer
  (req, res, next) => {
    // orderNo
    // User phone
    // Vendor Phone
    const params = req.body;



    pplBiddingsRef
        .child(params.request.request_type)
        .child("vendor_counter")
        .orderByChild("orderNo")
        .equalTo(params.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const vendor_counter = snapshot.val();

            const convert = Object.entries(vendor_counter);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
            });

            const filter = final.filter(
              (counter) => counter.vendor_phone === params.vendor_phone
            );

            if (filter.length !== 0 && filter.length < 2) {

              if (
                filter[0].status === "pending"
              ) {
                req.body.vendor_counter = filter[0];
                next();
              } else {
                res.json({
                  status: false,
                  error: `The Vendor Counter Has A Status -> ${filter[0].status}`,
                });
              }
            } else {
              res.json({
                status: false,
                error: "Problem In Vendor Counter Filter",
              });
            }
          } else {
            res.json({
              status: false,
              error: "Vendor Counter did not exists !",
            });
          }
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
  },
  // Update Vendor Counter Offer
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
      .child(params.request.request_type)
      .child("vendor_counter")
      .child(params.vendor_counter.vendorCounterId)
      .update({
        status: "accepted",
        accepted_on: getCurrentDate(),
      }).then(() => {
        console.log('Vendor Counter Updated')
        next()
      }).catch((err) => {
        res.json({
          status: false,
          error: err.message
        })
      })
  },
  // Update Request
  (req, res, next) => {
    const params = req.body;
    pplRequestRef
    .child(params.orderNo)
    .update({
      status: "vendor_counter_accepted",
      vendor_phone: params.vendor_counter.vendor_phone,
      vendor_counter: params.vendor_counter,
      vendor_counter_accepted_on: getCurrentDate(),
      vendor_name: params.vendor_counter.company_name,
            company_name: params.vendor_counter.company_name,
            company_phone: params.vendor_counter.company_phone,
            company_address: params.vendor_counter.company_address,
    })
    .then(() => {
      res.json({
        status: true,
        message: `User accepted the vendor counter offer for ${params.vendor_counter.amount}`,
      });
    })
    .catch((error) => {
      res.json({
        status: false,
        error: error.message,
      });
    });

  }
);

// /user_reject_vendor_counter_offer -> user rejects vendor counter offer (No Penalty)
router.post(
  "/user_reject_vendor_counter_offer",
  body("user_phone").isMobilePhone().withMessage("user_phone is not valid"),
  body("vendor_phone").isMobilePhone().withMessage("vendor_phone is not valid"),
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
      case "admin":
        // req.body.vendor = params.user;
        next();
        break;

      default:
        res.json({
          status: false,
          error: `This Service Is Only For Admin !`,
        });
        break;
    }
  },
  // Check User
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.user_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          next();
        } else {
          userRef
            .child("pro")
            .child(params.user_phone)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                req.body.user = user;
                next();
              } else {
                res.json({
                  status: false,
                  error: "User Not Found in Database !",
                });
              }
            });
        }
      });
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;

    pplRequestRef
        .child(params.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();
            if (request.status == "pending") {
              req.body.request = request;
              next();
            } else {
              res.json({
                status: false,
                error: `Request has status of ${request.status}`,
              });
            }
          } else {
            res.json({
              status: false,
              error: "No Request data Found !",
            });
          }
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
  },
  // Check Vendor
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("vendors")
      .child(params.vendor_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          console.log('vendor checked !')
          next()

        } else {
          res.json({
            status: false,
            error: "Vendor did not exists !",
          });
        }
      })
  },
  // Check Vendor Counter Offer
  (req, res, next) => {
    // orderNo
    // User phone
    // Vendor Phone
    const params = req.body;

    pplBiddingsRef
        .child(params.request.request_type)
        .child("vendor_counter")
        .orderByChild("orderNo")
        .equalTo(params.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const vendor_counter = snapshot.val();

            const convert = Object.entries(vendor_counter);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
            });

            const filter = final.filter(
              (counter) => counter.vendor_phone === params.vendor_phone
            );

            if (filter.length !== 0 && filter.length < 2) {
              console.log("ok !");
              if (
                filter[0].status !== "rejected" &&
                filter[0].status !== "accepted"
              ) {
                req.body.vendor_counter = filter[0];
                next();
              } else {
                res.json({
                  status: false,
                  error: `The Vendor Counter Has A Status -> ${filter[0].status}`,
                });
              }
            } else {
              res.json({
                status: false,
                error: "Problem In Vendor Counter Filter",
              });
            }
          } else {
            res.json({
              status: false,
              error: "Vendor Counter did not exists !",
            });
          }
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
  },
  // Update Vendor Counter Offer
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
      .child(params.request.request_type)
      .child("vendor_counter")
      .child(req.body.vendor_counter.vendorCounterId)
      .update({
        status: "rejected",
        rejected_on: getCurrentDate(),
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
  // Update Request
  (req, res, next) => {
    const params = req.body;

    pplRequestRef
    .child(params.orderNo)
    .update({
      status: "vendor_counter_rejected",
      vendor_phone: params.vendor_counter.vendor_phone,
      vendor_counter: params.vendor_counter,
      vendor_counter_rejected_on: getCurrentDate(),
      penalty: false,
      vendor_name: params.vendor_counter.company_name,
      company_name: params.vendor_counter.company_name,
      company_phone: params.vendor_counter.company_phone,
      company_address: params.vendor_counter.company_address,
    })
    .then(() => {
      res.json({
        status: true,
        message: `User Rejected Vendor Counter Offer for ${params.vendor_counter.amount}`,
      });
    })
    .catch((error) => {
      res.json({
        status: false,
        error: error.message,
      });
    });
  }
);

// /user_add_payment_method -> User Will Add Payment Method And Make Payment
router.post(
  "/user_add_payment_method",
  body("orderNo").isString().withMessage("orderNo must be string"),
  body("payment_method").isString().withMessage("type must be string"),
  body("user_phone").isMobilePhone().withMessage("user_phone is not valid"),
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
      case "admin":
        // req.body.vendor = params.user;
        next();
        break;

      default:
        res.json({
          status: false,
          error: `This Service Is Only For Admin !`,
        });
        break;
    }
  },
  // Check User 
  (req, res, next) => {
    const params = req.body;

    userRef.child("users").child(params.user_phone).once('value', (snapshot) => {
      if (snapshot.val()) {
        const user = snapshot.val();
        req.body.user = user;
        next();
      } else {
        userRef.child("pro").child(params.user_phone).once('value', (snapshot) => {
          if (snapshot.val()) {
            const user = snapshot.val();
            req.body.user = user;
            next();
          } else {
            res.json({
              status: false,
              error: "User Not Found In Database !"
            })
          }
        })
      }
    })
  },
  // Check User Type (User Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.type) {
      case "user":
        next();
        break;

      case "pro":
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.type} unknown user type  !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.type} unknown user type  !`,
        });
        break;
    }
  },
  // If Payment Method Is Card
  (req, res, next) => {
    const params = req.body;

    if (params.payment_method === 'card') {
      pplRequestRef
        .child(params.orderNo)
        .update({
          payment_method: "card",
        })
        .then(() => {
          res.json({
            status: true,
            message: "Payment Method - Credit/Debit Card Added !",
          });
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    } else {
      next()
    }
  },
  // If Payment Method Is Credit
  (req, res, next) => {
    const params = req.body;

    if (params.payment_method === 'credit') {
      if (params.user.phone) {
        userRef
          .child("users")
          .child(params.user.phone)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              const user = snapshot.val();
              res.json({
                status: false,
                error: "Under Construction"
              })

            } else {
              userRef
                .child("pro")
                .child(params.user.phone)
                .once("value", (snapshot) => {
                  if (snapshot.val()) {
                    const user = snapshot.val();

                    if (user.type == 'pro') {
                      // Check User Credit 
                      // Upload Request 
                    } else {
                      res.json({
                        status: false,
                        error: "You are not been promoted to Pro Users .!"
                      })
                    }
                  } else {
                    res.json({
                      status: false,
                      error: "This Facility Is Only For Pro Users !"
                    })
                  }
                });
            }
          });
      } else {
        res.json({
          status: false,
          error: "Phone Not Given !",
        });
      }
    } else {
      next()
    }
  },
  // If Payment Method Is Bank
  (req, res, next) => {
    const params = req.body;

    if (params.payment_method === 'bank') {
      if (params.accountNo) {
        // Check Bank Slip

        if (req.files === undefined) {
          res.json({
            status: false,
            error: 'Please upload transfer slip'
          })
        } else {
          const { files } = req.files;

          if (files.transfer_slip) {
            // Upload Transfer Slip
            pplRequestRef
              .child(params.orderNo)
              .update({
                payment_method: "bank",
                accountNo: params.accountNo,
                bank_transfer_slip_upload: true,
                bank_tranfer_slip: "url",
              })
              .then(() => {
                res.json({
                  status: true,
                  message:
                    "Payment Method - bank transfer method - Updated On Request !",
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
              error: "Please Upload A Bank Transfer Slip",
            });
          }
        }



      } else {
        res.json({
          status: false,
          error: "Please Give Bank Account No !"
        })
      }
    } else {
      next()
    }
  },
  // If Payment Method Is Cash On Delivery
  (req, res) => {
    const params = req.body;

    if (params.payment_method === 'cod') {
      if (params.point_of_payment) {
        switch (params.point_of_payment) {
          case "origin":
            pplRequestRef
              .child(params.orderNo)
              .update({
                payment_method: "cod",
                point_of_payment: params.point_of_payment
              })
              .then(() => {
                res.json({
                  status: true,
                  message:
                    "Payment Method - Cash On Delivery - Updated On Request !",
                });
              })
              .catch((error) => {
                res.json({
                  status: false,
                  error: error.message,
                });
              });
            break;

          case "destination":
            pplRequestRef
              .child(params.orderNo)
              .update({
                payment_method: "cod",
                point_of_payment: params.point_of_payment
              })
              .then(() => {
                res.json({
                  status: true,
                  message:
                    "Payment Method - Cash On Delivery - Updated On Request !",
                });
              })
              .catch((error) => {
                res.json({
                  status: false,
                  error: error.message,
                });
              });
            break;

          default:
            res.json({
              status: false,
              error: "Unknown Point Of Payment",
            });
            break;
        }
      } else {
        res.json({
          status: false,
          error: 'Please give point of payment collection'
        })
      }
    } else {
      res.json({
        status: false,
        error: 'Error ! Invalid Payment Method !'
      })
    }

  }
);

// /user_add_contact_person_to_request
router.post(
  "/user_add_contact_person_to_request",
  // Get Request Data
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
          error: "Request not found !",
        });
      }
    });
  },
  // Get Contact Person
  (req, res, next) => {
    const params = req.body;

    if (params.phone) {
      userRef
        .child("users")
        .child(params.phone)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const agent = snapshot.val();
            req.body.agent = agent;
            next();

          } else {
            userRef
              .child("pro")
              .child(params.phone)
              .once("value", (snapshot) => {
                if (snapshot.val()) {
                  const agent = snapshot.val();
                  req.body.agent = agent;
                  next();
                } else {
                  next()
                }
              });
          }
        });
    } else {
      next()
    }

  },
  // Add Contact Person To Request
  (req, res) => {
    const params = req.body;

    if (params.phone) {
      pplRequestRef
        .child(params.request.orderNo)
        .child("contact_person")
        .child(params.phone)
        .set({
          name: params?.agent?.fullname,
          phone: params.phone,
        })
        .then(() => {
          res.json({
            status: true,
            message: "Contact Person Added To Request !",
          });
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    } else {

      pplRequestRef
        .child(params.request.orderNo)
        .child("contact_person")
        .set("self")
        .then(() => {
          res.json({
            status: true,
            message: "Contact Person Added To Request !",
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
);

// Approve Payment Slip For Bank
router.post('/approve-payment-slip', verifyTokenFirebase,
  // Check User Type
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "admin":
        // req.body.vendor = params.user;
        next();
        break;

      default:
        res.json({
          status: false,
          error: `This Service Is Only For Admin !`,
        });
        break;
    }
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();


        switch (request.status) {
          case "qoute_accepted":
            req.body.request = request;
            next();
            break;

          case "qoute_rejected":
            res.json({
              status: false,
              error: `Cannot Accept The Order, The Order#${request.orderNo} has a status ${request.status}`,
            });

            break;

          case "user_counter_accepted":
            req.body.request = request;
            console.log('Request Status Checked');
            next();

            break;

          case "user_counter_rejected":
            res.json({
              status: false,
              error: `Cannot Accept The Order, The Order#${request.orderNo} has a status ${request.status}`,
            });
            break;

          case "vendor_counter_accepted":
            req.body.request = request;
            next();

            break;

          case "vendor_counter_rejected":
            res.json({
              status: false,
              error: `Cannot Accept The Order, The Order#${request.orderNo} has a status ${request.status}`,
            });
            break;

          case "accepted":
            res.json({
              status: false,
              error: `Order#${request.orderNo} has been already accepted`,
            });
            break;

          case "rejected":
            res.json({
              status: false,
              error: `Order#${request.orderNo} , cannot accept a already rejected order`,
            });
            break;


          default:
            res.json({
              status: false,
              error: `Unknown Request Status -> ${request.status}`
            })
            break;
        }


      } else {
        res.json({
          status: false,
          message: "Request Not Found !",
        });
      }
    });
  },
  // Check Payment Method
  (req, res, next) => {
    const params = req.body;

    if (params.request.payment_method) {
      switch (params.request.payment_method) {
        case "bank":
          pplRequestRef.child(params.orderNo).update({
            bank_transfer_slip_status: true,
            bank_transfer_slip_approved_on_timestamp: getCurrentTimestamp()
          }).then(() => {
            next()
          }).catch((err) => {
            res.json({
              status: false,
              error: err
            })
          })
          break;


        default:
          res.json({
            status: false,
            error: "Unknown Payment Method !"
          })
          break;
      }
    } else {
      res.json({
        status: false,
        error: "Payment Method Not Given !",
      });
    }
  },
  // Check Contact Person Attached
  (req, res, next) => {
    const params = req.body;

    if (req.body.request.contact_person) {
      const { request } = req.body;

      if (request.contact_person) {
        const convert = Object.entries(request.contact_person);

        const final = [];
        convert.forEach((x) => {
          final.push(x[1]);
        });

        if (final.length !== 0) {
          console.log("Contact Person Found !");
          next();
        } else {
          res.json({
            status: false,
            message: "Contact Person Not Selected !",
          });
        }
      }
    } else {
      res.json({
        status: false,
        message: "Contact Person Not Selected !",
      });
    }
  },
  // Check Documents Uploaded
  (req, res, next) => {
    const params = req.body;
    if (params.request.documents) {
      next();
    } else {
      next();
    }
  },
  // Update Request
  (req, res, next) => {
    const params = req.body;
    var orders = [];

    userRef
    .child("vendors")
    .child(params.request.vendor_phone)
    .once('value', (snap) => {
      if (snap.val()) {
        if (snap.orders) {
          orders = snap.orders;
        }
        orders.push(params.request.orderNo)

        userRef
          .child("vendors")
          .child(params.request.vendor_phone)
          .update({
            orders: orders
          })
      } else {
        res.json({
          status: false,
          message: "Vendor Not Found !",
        });
      }
    })

    pplRequestRef
      .child(params.orderNo)
      .update({
        status: "accepted",
        order_accepted_on: getCurrentDate(),
        order_accepted_on_timestamp: getCurrentTimestamp(),
        payment_approval: true
      })
      .then(() => {
        res.json({
          status: true,
          message: `OrderNo#${req.body.request.orderNo} has been accepted !`,
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
)

// Reject Payment Slip For Bank
router.post('/reject-payment-slip', verifyTokenFirebase,
  // Check User Type
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "admin":
        // req.body.vendor = params.user;
        next();
        break;

      default:
        res.json({
          status: false,
          error: `This Service Is Only For Admin !`,
        });
        break;
    }
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();


        switch (request.status) {
          case "qoute_accepted":
            req.body.request = request;
            next();
            break;

          case "qoute_rejected":
            res.json({
              status: false,
              error: `Cannot Accept The Order, The Order#${request.orderNo} has a status ${request.status}`,
            });

            break;

          case "user_counter_accepted":
            req.body.request = request;
            console.log('Request Status Checked');
            next();

            break;

          case "user_counter_rejected":
            res.json({
              status: false,
              error: `Cannot Accept The Order, The Order#${request.orderNo} has a status ${request.status}`,
            });
            break;

          case "vendor_counter_accepted":
            req.body.request = request;
            next();

            break;

          case "vendor_counter_rejected":
            res.json({
              status: false,
              error: `Cannot Accept The Order, The Order#${request.orderNo} has a status ${request.status}`,
            });
            break;

          case "accepted":
            req.body.request = request;
            next();
            break;

          case "rejected":
            res.json({
              status: false,
              error: `Order#${request.orderNo} , cannot accept a already rejected order`,
            });
            break;


          default:
            res.json({
              status: false,
              error: `Unknown Request Status -> ${request.status}`
            })
            break;
        }


      } else {
        res.json({
          status: false,
          message: "Request Not Found !",
        });
      }
    });
  },
  // Check Payment Method
  (req, res, next) => {
    const params = req.body;

    if (params.request.payment_method) {
      switch (params.request.payment_method) {
        case "bank":
          pplRequestRef.child(params.orderNo).update({
            bank_transfer_slip_status: false,
            bank_transfer_slip_rejected_on_timestamp: getCurrentTimestamp()
          }).then(() => {
            next()
          }).catch((err) => {
            res.json({
              status: false,
              error: err
            })
          })
          break;


        default:
          res.json({
            status: false,
            error: "Unknown Payment Method !"
          })
          break;
      }
    } else {
      res.json({
        status: false,
        error: "Payment Method Not Given !",
      });
    }
  },
  // Update Request
  (req, res, next) => {
    const params = req.body;
    var orders = [];

    userRef
    .child("vendors")
    .child(params.request.vendor_phone)
    .once('value', (snap) => {
      if (snap.val()) {
        if (snap.orders) {
          orders = snap.orders;
        }
        orders.push(params.request.orderNo)

        userRef
          .child("vendors")
          .child(params.request.vendor_phone)
          .update({
            orders: orders
          })
      } else {
        res.json({
          status: false,
          message: "Vendor Not Found !",
        });
      }
    })

    pplRequestRef
      .child(params.orderNo)
      .update({
        status: "cancelled",
        order_rejected_on: getCurrentDate(),
        order_rejected_on_timestamp: getCurrentTimestamp(),
        payment_approval: false
      })
      .then(() => {
        res.json({
          status: true,
          message: `OrderNo#${req.body.request.orderNo} has been accepted !`,
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
)

// /order_accept -> (User Accept Order)
router.post(
  "/order_accept",
  // Check User
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.user_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          console.log('User Data Received');
          next();
        } else {
          userRef
            .child("pro")
            .child(params.user_phone)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                req.body.user = user;
                console.log('User Data Received');
                next();
              } else {
                res.json({
                  status: false,
                  error: "No User Found !",
                });
              }
            });
        }
      });
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();


        switch (request.status) {
          case "qoute_accepted":
            req.body.request = request;
            next();
            break;

          case "qoute_rejected":
            res.json({
              status: false,
              error: `Cannot Accept The Order, The Order#${request.orderNo} has a status ${request.status}`,
            });

            break;

          case "user_counter_accepted":
            req.body.request = request;
            console.log('Request Status Checked');
            next();

            break;

          case "user_counter_rejected":
            res.json({
              status: false,
              error: `Cannot Accept The Order, The Order#${request.orderNo} has a status ${request.status}`,
            });
            break;

          case "vendor_counter_accepted":
            req.body.request = request;
            next();

            break;

          case "vendor_counter_rejected":
            res.json({
              status: false,
              error: `Cannot Accept The Order, The Order#${request.orderNo} has a status ${request.status}`,
            });
            break;

          case "accepted":
            res.json({
              status: false,
              error: `Order#${request.orderNo} has been already accepted`,
            });
            break;

          case "rejected":
            res.json({
              status: false,
              error: `Order#${request.orderNo} , cannot accept a already rejected order`,
            });
            break;


          default:
            res.json({
              status: false,
              error: `Unknown Request Status -> ${request.status}`
            })
            break;
        }


      } else {
        res.json({
          status: false,
          message: "Request Not Found !",
        });
      }
    });
  },
  // Check Payment Method
  (req, res, next) => {
    const params = req.body;

    if (params.request.payment_method) {
      switch (params.request.payment_method) {
        case "cod":
          walletRef.child("users").child(params.user_phone).once('value', (snapshot) => {
            if (snapshot.val()) {
              const wallet = snapshot.val();
              const amount = parseInt(wallet.amount);
              const transactions = wallet.transactions ? wallet.transactions : [];

              console.log('amount -> ', amount);
              // console.log('amount type -> ',typeof(amount));

               // Check Accepted Amount By User
               if (params.request.qoute) {
                const acceptedAmount = params.request.qoute.qoute_amount;
                console.log('acceptedAmount -> ', acceptedAmount);
                console.log('acceptedAmount type -> ', typeof (acceptedAmount));

                const calculate = Math.ceil(amount - acceptedAmount);

                console.log('Final Calculated Amount -> ', calculate);

                let transaction = {
                  orderNo: params.request.orderNo,
                  previousBalance: amount,
                  acceptedAmount: acceptedAmount,
                  deductedAmount: acceptedAmount,
                  afterDeduction: calculate,
                  time: Date()
                }

                transactions.push(transaction)

                walletRef.child("users").child(params.user_phone).update({
                  amount: calculate,
                  transactions: transactions
                }).then(() => {
                  next();
                }).catch((err) => {
                  res.json({
                    status: false,
                    error: err.message
                  })
                })
              } else if (params.request.user_counter) {
                const acceptedAmount = params.request.user_counter.amount;
                console.log('acceptedAmount -> ', acceptedAmount);
                console.log('acceptedAmount type -> ', typeof (acceptedAmount));

                const calculate = Math.ceil(amount - acceptedAmount);

                console.log('Final Calculated Amount -> ', calculate);

                let transaction = {
                  orderNo: params.request.orderNo,
                  previousBalance: amount,
                  acceptedAmount: acceptedAmount,
                  deductedAmount: acceptedAmount,
                  afterDeduction: calculate,
                  time: Date()
                }

                transactions.push(transaction)

                walletRef.child("users").child(params.user_phone).update({
                  amount: calculate,
                  transactions: transactions
                }).then(() => {
                  next();
                }).catch((err) => {
                  res.json({
                    status: false,
                    error: err.message
                  })
                })
              } else if (params.request.vendor_counter) {
                const acceptedAmount = parseInt(params.request.vendor_counter.amount);
                console.log('acceptedAmount -> ', acceptedAmount);
                console.log('acceptedAmount type -> ', typeof (acceptedAmount));

                const calculate = Math.ceil(amount - acceptedAmount);

                console.log('Final Calculated Amount -> ', calculate);

                let transaction = {
                  orderNo: params.request.orderNo,
                  previousBalance: amount,
                  acceptedAmount: acceptedAmount,
                  deductedAmount: acceptedAmount,
                  afterDeduction: calculate,
                  time: Date()
                }

                transactions.push(transaction)

                walletRef.child("users").child(params.user_phone).update({
                  amount: calculate,
                  transactions: transactions
                }).then(() => {
                  next();
                }).catch((err) => {
                  res.json({
                    status: false,
                    error: err.message
                  })
                })
              }
            } else {
              res.json({
                status: false,
                error: "Wallet Not Found !"
              })
            }
          })
          break;
        case "bank":
          next();
          // TODO
          break;
        case "credit":
          // TODO
          walletRef.child("users").child(params.user_phone).once('value', (snapshot) => {
            if (snapshot.val()) {
              const wallet = snapshot.val();
              const amount = parseInt(wallet.amount);

              console.log('amount -> ', amount);
              // console.log('amount type -> ',typeof(amount));

              // Check Accepted Amount By User
              if (params.request.qoute) {
                const acceptedAmount = params.request.qoute.qoute_amount;
                console.log('acceptedAmount -> ', acceptedAmount);
                console.log('acceptedAmount type -> ', typeof (acceptedAmount));
              } else if (params.request.user_counter) {
                const acceptedAmount = params.request.user_counter.amount;
                console.log('acceptedAmount -> ', acceptedAmount);
                console.log('acceptedAmount type -> ', typeof (acceptedAmount));
              } else if (params.request.vendor_counter) {
                const acceptedAmount = parseInt(params.request.vendor_counter.amount);
                console.log('acceptedAmount -> ', acceptedAmount);
                //  console.log('acceptedAmount type -> ',typeof(acceptedAmount));

                const calculate = Math.ceil(amount - acceptedAmount);

                console.log('Calculated Amount -> ', calculate);

                walletRef.child("users").child(params.user_phone).update({
                  amount: calculate
                }).then(() => {
                  next();
                }).catch((err) => {
                  res.json({
                    status: false,
                    error: err.message
                  })
                })
              }
            } else {
              res.json({
                status: false,
                error: "Wallet Not Found !"
              })
            }
          })
          break;
        case "online":
          // TODO
          break;

        default:
          res.json({
            status: false,
            error: "Unknown Payment Method !"
          })
          break;
      }
    } else {
      res.json({
        status: false,
        error: "Payment Method Not Given !",
      });
    }
  },
  // Check Contact Person Attached
  (req, res, next) => {
    const params = req.body;

    if (req.body.request.contact_person) {
      const { request } = req.body;

      if (request.contact_person) {
        const convert = Object.entries(request.contact_person);

        const final = [];
        convert.forEach((x) => {
          final.push(x[1]);
        });

        if (final.length !== 0) {
          console.log("Contact Person Found !");
          next();
        } else {
          res.json({
            status: false,
            message: "Contact Person Not Selected !",
          });
        }
      }
    } else {
      res.json({
        status: false,
        message: "Contact Person Not Selected !",
      });
    }
  },
   // Generate Bilty (Invoice)
   (req, res, next) => {
    const params = req.body;

    let invoice = {
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
      status: params.request.status,
      createdAt: params.request.createdAt,
      createdAt_timestamp: params.request.createdAt_timestamp,
    }

    console.log('invoice -> ',invoice);

    pplInvoiceRef.child(params.request.orderNo).set(invoice).then(() => {
      next();
    }).catch((err) => {
      res.json({
        status: false,
        error: err.message
      })
    })
  },
  // Check Documents Uploaded
  (req, res, next) => {
    const params = req.body;
    if (params.request.documents) {
      next();
    } else {
      next();
    }
  },
  // Update Request
  (req, res, next) => {
    const params = req.body;
    var orders = [];

    userRef
        .child("vendors")
        .child(params.request.vendor_phone)
        .once('value', (snap) => {
          if (snap.val()) {
            if (snap.val().orders) {
              orders = snap.val().orders;
            }
            if (!(orders.includes(params.request.orderNo))) {
              orders.push(params.request.orderNo)
            }

            userRef
              .child("vendors")
              .child(params.request.vendor_phone)
              .update({
                orders: orders
              })
          } else {
            res.json({
              status: false,
              message: "Vendor Not Found !",
            });
          }
        })

    pplRequestRef
      .child(params.orderNo)
      .update({
        status: "accepted",
        order_accepted_on: getCurrentDate(),
        payment_approval: false
      })
      .then(() => {
        res.json({
          status: true,
          message: `OrderNo#${req.body.request.orderNo} has been accepted !`,
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// /order_reject -> (User Reject Order)
router.post(
  "/order_reject",
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
      case "admin":
        // req.body.vendor = params.user;
        next();
        break;

      default:
        res.json({
          status: false,
          error: `This Service Is Only For Admin !`,
        });
        break;
    }
  },
  // Get Request Data
  (req, res) => {
    const params = req.body;

    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();
        switch (request.status) {
          case "pending":
            pplRequestRef.child(request.orderNo).update({
              cancel_by: "user",
              status: "cancelled",
              order_cancelled_on: getCurrentDate()
            }).then(() => {
              res.json({
                status: true,
                message: "Order has been cancelled by user !"
              })
            }).catch((err) => {
              res.json({
                status: false,
                error: err
              })
            })
            break;

          case "accepted":

            pplRequestRef.child(request.orderNo).update({
              cancel_by: params.cancel_by,
              status: "cancelled",
              order_cancelled_on: getCurrentDate()
            }).then(() => {
              res.json({
                status: true,
                message: "Order has been cancelled by user !"
              })
            }).catch((err) => {
              res.json({
                status: false,
                error: err
              })
            })

            // if (request.request_type === 'transit') {
            //   // Check Bilties 
            //   const bilties = request.bilty;
            //   let checkBiltyPendingStatus = false;

            //   bilties.forEach((bilty) => {
            //     if (bilty.status === 'pending') {
            //       checkBiltyPendingStatus = true;
            //     }
            //   })

            //   if (checkBiltyPendingStatus) {
            //     // Update Bilties Statuses To Cancelled and Order Status To Cancel
            //     const forupdatebilty = request.bilty;
            //     forupdatebilty.forEach((bilty) => {
            //       bilty['status'] = "cancelled"
            //       bilty['bilty_cancelled_on'] = moment()
            //         .tz("Asia/Karachi")
            //         .format("MMMM Do YYYY, h:mm:ss a")
            //     })

            //     // console.log('forupdatebilty -> ',forupdatebilty);



            //   } else {
            //     res.json({
            //       status: false,
            //       error: "You Cannot Cancel Order Now , All Bilties are inprocess !"
            //     })
            //   }
            // } else {
            //   // Check Suborders
            //   res.json({
            //     status: false,
            //     error: "For Upcountry Request , Give biltyNo instead of orderNo."
            //   })
            // }
            break;

          case "rejected":
            res.json({
              status: false,
              error: `Order#${request.orderNo} , cannot accept a already rejected order`,
            });
            break;

          case "cancelled":
            res.json({
              status: false,
              error: `This Order Is Already Cancelled By ${request.cancel_by}`
            })

            break;
          default:
            res.json({
              status: false,
              error: `${request.status} -> Order Cannot be Rejected`,
            });
            break;
        }
      } else {
        res.json({
          status: false,
          message: "Request Not Found !",
        });
      }
    });
  },
);

// user_upload_upcountry_documents -> Local & upcountry Important Documents (After User Accepts Bilty)
router.post(
  "/user_upload_upcountry_documents",
  body("orderNo").isString().withMessage("orderNo must be an string"),
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
      case "admin":
        // req.body.vendor = params.user;
        next();
        break;

      default:
        res.json({
          status: false,
          error: `This Service Is Only For Admin !`,
        });
        break;
    }
  },
  // Check Uploaded Documents
  (req, res, next) => {
    if (req.files.detail_packing_list && req.files.clearing_form) {
      next();
    } else {
      res.json({
        status: false,
        error: "File not found !",
      });
    }
  },
  // Check User
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("users")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          req.body.user = snapshot.val();
          next();
        } else {
          userRef
            .child("pro")
            .child(params.user.user_id)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                req.body.user = snapshot.val();
                next();
              } else {
                res.json({
                  status: false,
                  error: "User Not Found !"
                })
              }

            });
        }
      });
  },
  // Check Request
  (req, res, next) => {
    const params = req.body;
    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        // TODO : ADD REQUEST STATUS CONDITIION
        req.body.request = snapshot.val();
        const request = snapshot.val();
        if (request.request_type == "transit") {
          res.json({
            status: false,
            error:
              "Could Not Upload Documents . Request Type is transit cargo!",
          });
        } else {
          next();
        }
      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });
  },
  // Upload Documents To Google Cloud Storage
  (req, res, next) => {
    const params = req.body;

    const { detail_packing_list } = req.files;
    const { clearing_form } = req.files;

    // Uploading Bill of landing
    const detail_packing_list_filename = detail_packing_list.name;
    const detail_packing_list_filetype = detail_packing_list_filename.split(".")[1];
    const detail_packing_list_name = `${req.body.request.orderNo}_${req.body.user.phone}_detail_packing_list`;

    // Uploading Invoice
    const clearing_form_filename = clearing_form.name;
    const clearing_form_filetype = clearing_form_filename.split(".")[1];
    const clearing_form_name = `${req.body.request.orderNo}_${req.body.user.phone}_clearing_form`;

    const path = "UpcountryDocuments/";

    fileUpload(
      detail_packing_list,
      detail_packing_list_name,
      path,
      detail_packing_list_filetype,
      (err) => {
        if (err) {
          console.log("err -> ", err);
        } else {
          console.log("detail_packing_list uploaded");
          // Invoice Upload
          fileUpload(clearing_form, clearing_form_name, path, clearing_form_filetype, (err) => {
            if (err) {
              console.log("err -> ", err);
            } else {
              console.log("clearing_form uploaded");
              // gd Upload
              if (err) {
                console.log("err -> ", err);
              } else if (err == null) {
                next();
              }
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
      prefix: `UpcountryDocuments/`,
    };

    const [files] = await storage.bucket("meribilty-staging.appspot.com").getFiles(options);
    var uploadImages = [];

    files.forEach((file) => {
      const fileName = file.name;

      if (fileName.includes(params.user.phone)) {
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
  // Update Request
  (req, res) => {
    const params = req.body;
    pplRequestRef
      .child(params.orderNo)
      .update({
        documents: params.documentsUploaded,
        documents_uploaded_on: getCurrentDate(),
      })
      .then(() => {
        res.json({
          status: true,
          message: "Document Uploaded Successfully !",
          documents: params.documentsUploaded
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// user_upload_transit_cargo_documents -> Transit cargo Important Documents (After User Accepts Bilty)
router.post(
  "/user_upload_cargo_documents",
  // Check Uploaded Documents
  (req, res, next) => {
    const params = req.body;

    let bill_of_landing = params.bill_of_landing;
    let invoice = params.invoice;
    let gd = params.gd;
    let demand_letter = params.demand_letter;
    let packaging_list = params.packaging_list;

    console.log('body -> ',params)

    if(bill_of_landing || invoice || gd || demand_letter || packaging_list) {
      next();
    } else {
      res.json({
        status: false,
        error: "Files is missing !",
      });
    }
  },
  // Check User
  (req, res, next) => {
    const params = req.body;

    userRef
        .child("users")
        .child(params.user_phone)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            req.body.user = snapshot.val();
            next();
          } else {
            userRef
              .child("pro")
              .child(params.user_phone)
              .once("value", (snapshot) => {
                if (snapshot.val()) {
                  req.body.user = snapshot.val();
                  next();
                } else {
                  res.json({
                    status: false,
                    error: "Could Not Found User !",
                  });
                }
              });
          }
        });

  },
  // Check Request
  (req, res, next) => {
    const params = req.body;
    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        
        req.body.request = snapshot.val();
        const request = snapshot.val();
        next();
      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });
  },
  // Upload Documents To Google Cloud Storage
  (req, res, next) => {
    const params = req.body;


    let bill_of_landing = params.bill_of_landing;
    let invoice = params.invoice;
    let gd = params.gd;
    let demand_letter = params.demand_letter;
    let packaging_list = params.packaging_list;


    console.log('bill_of_landing.name -> ',bill_of_landing.name)

    if(bill_of_landing) {
        // Uploading Bill of landing
    const bill_of_landing_filename = bill_of_landing.name;
    const bill_of_landing_filetype = bill_of_landing_filename.split(".")[1];
    const bill_of_landing_name = `${req.body.request.orderNo}_${req.body.user_phone}_bill_of_landing`;
    }


   if(invoice) {
      // Uploading Invoice
    const invoice_filename = invoice.name;
    const invoice_filetype = invoice_filename.split(".")[1];
    const invoice_name = `${req.body.request.orderNo}_${req.body.user_phone}_invoice`;
   }

   if(gd) {
      // Uploading gd
    const gd_filename = gd.name;
    const gd_filetype = gd_filename.split(".")[1];
    const gd_name = `${req.body.request.orderNo}_${req.body.user_phone}_gd`;
   }

    
    let path; 

    if(params.request.request_type === "transit") {
      path = "TransitCargoDocuments/";
    } else {
      path = "UpcountryDocuments/";
    }

    // Bill of landing Upload
    fileUpload(
      bill_of_landing,
      bill_of_landing_name,
      path,
      bill_of_landing_filetype,
      (err) => {
        if (err) {
          console.log("err -> ", err);
        } else {
          console.log("bill of landing uploaded");
          // Invoice Upload
          fileUpload(invoice, invoice_name, path, invoice_filetype, (err) => {
            if (err) {
              console.log("err -> ", err);
            } else {
              console.log("Invoice uploaded");
              // gd Upload
              fileUpload(gd, gd_name, path, gd_filetype, (err) => {
                if (err) {
                  console.log("err -> ", err);
                } else if (err == null) {
                  next();
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
      prefix: `TransitCargoDocuments/`,
    };

    const [files] = await storage.bucket("meribilty-staging.appspot.com").getFiles(options);
    var uploadImages = [];

    files.forEach((file) => {
      const fileName = file.name;

      if (fileName.includes(params.user.user_id)) {
        let image = {
          name: file.name,
          url: file.publicUrl(),
        };

        uploadImages.push(image);
        console.log("imae -> ", image);
      }
    });

    req.body.documentsUploaded = uploadImages;

    console.log("uploadImages -> ", uploadImages);

    next();
  },
  // Update Request
  (req, res) => {
    const params = req.body;

    pplRequestRef
      .child(params.orderNo)
      .update({
        documents: params.documentsUploaded,
        documents_uploaded_on: getCurrentDate(),
      })
      .then(() => {
        res.json({
          status: true,
          message: "Document Uploaded Successfully !",
          documentsUploaded: documentsUploaded,
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);


// /vendor_allot_vehicle_and_driver_to_request -> (Vendor Allots Vehicle & Driver To A Bilty)
router.post(
  "/vendor_allot_vehicle_and_driver_to_request",
  // Check Request
  (req, res, next) => {
    const params = req.body;

    let getLength = params.biltyNo.length;
    const getOrderNo = params.biltyNo.slice(2, (getLength - 2));
    console.log('request - !')

    req.body.orderNo = getOrderNo;
    // console.log(getOrderNo);

    pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
      const request = snapshot.val();
      if (request) {
        if (request.status == "accepted") {
          req.body.request = request;
          // console.log("order -> ", request);
          console.log('user type success - !')
          next();
        } else {
          res.json({
            status: false,
            error: `Request has a status -> ${request.status}`,
          });
        }
      } else {
        res.json({
          status: false,
          error: "The Order Does Not Exist !",
        });
      }
    });
  },
  // Check Bilty Status
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
            // console.log("bilty -> ", bilty);
            if (bilty.status == 'pending') {
              req.body.bilty = bilty;
              console.log('check bilty success - !')
              next();
            } else {
              res.json({
                status: false,
                error: `Cannot Allot Vehicle And Driver To Bilty - Bilty Status is ${bilty.status} !`,
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
  // Check Driver
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("drivers")
      .child(params.vehicle_driver)
      .once("value", (snapshot) => {
        const driver = snapshot.val();
        if (driver) {
          if (driver.status === "free") {
            req.body.driver = driver
            console.log('driver success - !')
            next();
          } else {
            res.json({
              status: false,
              error: "driver is busy !",
            });
          }
        } else {
          res.json({
            status: false,
            error: "The Driver Does Not Exist !",
          });
        }
      });
  },
  // Check Vehicle
  (req, res, next) => {
    const params = req.body;
    pplVendorVehicleRef
      .orderByChild("vehicle_number")
      .equalTo(params.vehicle_number)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vehicles = snapshot.val();
          const convert = Object.entries(vehicles);

          const final = [];
          convert.forEach((x) => {
            final.push(x[1]);
          });

          const filter = final.filter(
            (vehicle) => vehicle.vehicle_number === params.vehicle_number
          );

          if (filter.length !== 0 && filter.length < 2) {
            const vehicle = filter[0];
            if (vehicle.available) {
              req.body.vehicle = vehicle;
              console.log('vehicle  success - !')
              next();
            } else {
              res.json({
                status: false,
                error: "Vehicle Is Not Available Right Now !",
              });
            }
          } else {
            res.json({
              status: false,
              error: "Problem In Vendor Counter Filter",
            });
          }
        } else {
          res.json({
            status: false,
            error: "No Vehicle Found In Database !",
          });
        }
      });
  },
  // Check Vehicle & Driver Allotment Status
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type) {

      const transitbilties = params.request.bilty;

      transitbilties.forEach((bilty) => {
        if (bilty["biltyNo"] == params.biltyNo) {
          (bilty["vehicle_number"] = params.vehicle_number),
            (bilty["driver_phone"] = params.vehicle_driver);
          bilty["status"] = "inprocess";
          bilty["driver_name"] = params.driver.fullname;
          bilty["vendor"] = params.request.vendor_phone;
          bilty["vehicle_id"] = params.vehicle.id;
          bilty["driver_alotted_on"] = getCurrentDate();
          bilty['driver_alotted_on_timestamp'] = getCurrentTimestamp()

          console.log('bilty -> ',bilty)

          req.body.bilty = bilty;
        }
      });

      pplRequestRef
        .child(params.request.orderNo)
        .update({
          bilty: transitbilties,
        })
        .then(() => {
          console.log('bilty updated !')
          next();
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    }
    else {
      res.json('unknown request type')
    }
  },
  //  Driver Availabilty
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("drivers")
      .child(params.vehicle_driver)
      .update({
        status: "busy",
        bilty: params.biltyNo,
        request_type: params.request.request_type
      })
      .then(() => {
        pplVendorVehicleRef
          .child(params.vehicle.id)
          .update({
            available: false,
            bilty: params.biltyNo,
          })
          .then(() => {
            console.log('driver update success - !')
            next();
          })
          .catch((err) => {
            res.json({
              status: false,
              error: err.message,
            });
          });
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
    fcmTokenRef.child('drivers').child(params.vehicle_driver).once('value').then(snapshot => {
      send_notification_to_single_user(snapshot.val().fcm_token.token, {
        title: "Driver: Assigned by vendor",
        body: `Dear ${params.driver.fullname}, refering ${params.request.orderNo}, your are assigned with truck registration number ${params.vehicle_number}.`
      })
    })

    fcmTokenRef.child('users').child(params.request.user_phone).once('value').then(snapshot => {
      send_notification_to_single_user(snapshot.val().fcm_token.token, {
        title: "Driver: Assigned by vendor",
        body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} with truck registration number ${params.vehicle_number} has been assigned.`
        , routes: "MyOrders"
      })
    })

    res.json({
      status: true,
      message: `Vendor Alloted Vehicle (${params.vehicle_number}) & Driver (${params.vehicle_driver}) to biltyNo#${params.biltyNo}`,
    });

  }
);

// API-25a
// /vendor_allot_vehicle_and_driver_to_request -> (Vendor Allots Vehicle & Driver To A Bilty)
router.post(
  "/vendor_allot_driver_to_loadingUnloading",
  // Check Request
  (req, res, next) => {
    const params = req.body;

    let getLength = params.biltyNo.length;
    const getOrderNo = params.biltyNo.slice(2, (getLength - 2));

    req.body.orderNo = getOrderNo;
    console.log(getOrderNo);

    pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
      const request = snapshot.val();
      if (request) {
        if (request.status == "accepted") {
          req.body.request = request;
          console.log('request checked !');
          next();
        } else {
          res.json({
            status: false,
            error: `Request has a status -> ${request.status}`,
          });
        }
      } else {
        res.json({
          status: false,
          error: "The Order Does Not Exist !",
        });
      }
    });
  },
  // Check Bilty Status
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type) {
      const transitbilties = params.request.bilty;

      if (transitbilties) {
        if (transitbilties.length !== 0) {
          const filterOut = transitbilties.filter((bilty) => {
            return bilty.biltyNo === params.biltyNo;
          });

          if (filterOut) {
            if (filterOut.length !== 0) {
              const bilty = filterOut[0];
              // console.log("bilty -> ", bilty);

              if (bilty.type === 'loading/unloading') {
                if (!bilty.driver_phone) {
                  req.body.bilty = bilty;
                  console.log('bilty checked !');

                  next();
                } else {
                  res.json({
                    status: false,
                    error: `Driver already alloted on this bilty !`,
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

    }
    else {
      res.json({
        status: false,
        error: "Unknown Type !"
      })
    }



  },  
  // Check Vehicle & Driver Allotment Status
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type) {

      const transitbilties = params.request.bilty;

      console.log('loading/unloading');
      // res.status(200).send('loading/unloading')

      transitbilties.forEach((bilty) => {
        if (bilty["biltyNo"] == params.biltyNo) {

          let loading = bilty.loading_options;
          let unloading = bilty.unloading_options;
          let optionUpdateStatus = false;
          req.body.bilty = bilty;

          console.log('loading -> ', loading);
          console.log('unloading -> ', unloading);

          if (bilty.loading_options) {
            bilty.loading_options.forEach((x, index) => {
              if (x.id === params.option_id) {
                console.log('loading id matched')

                x['driver_name'] = params.vehicle_driver_name
                x['driver_phone'] = params.vehicle_driver
                x["driver_alotted_on"] = getCurrentDate();
                x['driver_alotted_on_timestamp'] = getCurrentTimestamp(),

                  optionUpdateStatus = true;

                req.body.currentOption = x;  

              }
            })
          }

          if (bilty.unloading_options) {
            bilty.unloading_options.forEach((x, index) => {
              if (x.id === params.option_id) {
                console.log('unloading id matched')


                x['driver_name'] = params.driver.vehicle_driver_name
                x['driver_phone'] = params.vehicle_driver
                x["driver_alotted_on"] = getCurrentDate();
                x['driver_alotted_on_timestamp'] = getCurrentTimestamp(),

                  optionUpdateStatus = true;

                req.body.currentOption = x;  

              }
            })
          }

          if (optionUpdateStatus) {
            console.log('updated loading -> ', loading);
            console.log('updated unloading -> ', unloading);
            
          } else {
            console.log('option not found')

            res.status(200).json({
              status: false,
              error: "Option Not Found !"
            })
          }
        }
      });

      pplRequestRef
        .child(params.request.orderNo)
        .update({
          bilty: transitbilties,
        })
        .then(() => {
          console.log('bilty updated !');
          next();
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });



    }
    else {
      res.json('unknown request type')
    }
  },
   // Check Driver
   (req, res, next) => {
    const params = req.body;
    userRef
      .child("drivers")
      .child(params.vehicle_driver)
      .once("value", (snapshot) => {
        console.log('data -> ',snapshot.val())
        if(snapshot.val()) {
          const driver = snapshot.val();

          if (driver.status === "free") {
            req.body.driver = driver
            console.log('driver success - !')
            next();
          } else {
            res.json({
              status: false,
              error: "driver is busy !",
            });
          }
        } else {
          req.body.driver = null;
          next()
        }
      });
  },
  //  Update Driver Availabilty
  (req, res, next) => {
    const params = req.body;
    
    if(params.driver) {
      userRef
      .child("drivers")
      .child(params.vehicle_driver)
      .update({
        status: "busy",
        option_id: params.option_id,
        request_type: params.request.request_type
      })
      .then(() => {
        console.log('driver checked !');
        next()
      })
      .catch((err) => {
        // res.json({
        //   status: false,
        //   error: err.message,
        // });
        console.log('err -> ',err);
        next()
      });
    } else {
       next();
    }
      
  },
  // Update Invoice
  (req, res, next) => {
    const params = req.body;

    pplInvoiceRef.child(params.request.orderNo).update({
      ...params.request
    }).then(() => {
      // req.body.invoice = invoice;
      console.log('invoice updated !');

      next();
    }).catch((err) => {
      res.json({
        status: false,
        error: err
      })
    })
  },
  // Create Driver History
  (req, res, next) => {
    const params = req.body;

    console.log('params -> ', params);
    

    if(params.driver) {
      const newHistory = driverHistoryRef.child(params.vehicle_driver).push();

      if (params.request.request_type) {
        let data = {}
        newHistory.set({
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
          driver_name: params.vehicle_driver_name || "",
          driver_phone: params.vehicle_driver,
          user_type: params.request.user_type,
          username: params.request.username,
          biltyNo: params.biltyNo || null,
          request_created_at: params.request.createdAt,
          driver_alotted_on: getCurrentDate(),
          driver_alotted_on_timestamp: getCurrentTimestamp(),
          paymentMethod: params.request.payment_method,
          contactPerson: params.request.contact_person,
          status: params.request.status,
          vendor_phone: params.vendor.user_id,
          type: params.request.request_type === 'transit' || params.request.request_type === 'upcountry' ? 'ppl' : 'scm',
        }).then(() => {
        console.log('driver history updated !');
  
           next();
        }).catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
      })}
    } else {
      next();
    }


  },
   // Send Notifications
   (req,res) => {
    const params = req.body;

    // send_noti - vendor_allot_vehicle_and_driver_to_request
    if(params.driver) {
      fcmTokenRef.child('drivers').child(params.vehicle_driver).once('value').then(snapshot => {
        send_notification_to_single_user(snapshot.val().fcm_token.token, {
          title: "Driver: Assigned by vendor",
          body: `Dear ${params.driver.fullname}, refering ${params.request.orderNo}, your are assigned to ${req.body.currentOption.type} option - ${params.currentOption.name}.`
        })
      })
    }

    fcmTokenRef.child('users').child(params.request.user_phone).once('value').then(snapshot => {
      send_notification_to_single_user(snapshot.val().fcm_token.token, {
        title: "Driver: Assigned by vendor",
        body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.vehicle_driver_name} with ${req.body.currentOption.type} option - ${params.currentOption.name} has been assigned.`
        , routes: "MyOrders"
      })
    })


    res.json({
      status: true,
      message: `Vendor Alloted Driver (${params.vehicle_driver}) to OptionId#${params.currentOption.id}`,
    });
  }
 
);





// ================= Calculate Insurance (Start) =================

// Calculate Insurance
router.post("/calculate_insurance",
  body("cargo_value").isNumeric().withMessage("cargo_value must be a number"),
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

    pplSettingsRef.child("insurance").once("value", (snapshot) => {
      if (snapshot.val()) {
        const insurance = snapshot.val();
        const load_value = parseInt(params.cargo_value);
        const percent = parseInt(insurance.value);
        console.log('insurance -> ', insurance)

        const total = Math.ceil(load_value / 100 * percent);

        res.json({
          status: true,
          insurance: total
        })


      } else {
        res.json({
          status: false,
          error: "Insurance Percent Not Found In Database !"
        })
      }
    })
  }
)

// ================= Calculate Insurance (End) =================


// ================= Payment Approval (Start) =================

// Vendor/Driver/Admin Approve Payment 
// {
//   "token": "",
//   "orderNo": ""
// }
router.post("/approve_payment",
  verifyTokenFirebase,
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        next();
        break;
      case "driver":
        next();
        break;
      case "admin":
        next();
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot approve payment !`,
        });
        break;
    }
  },
  // Check Request
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.child(params.orderNo).once('value', (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();

        if (request.payment_approved) {
          res.json({
            status: false,
            error: "Payment Already Approved"
          })
        } else {
          next();
        }
      } else {
        res.json({
          status: false,
          error: "Request Not Found !"
        })
      }
    })
  },
  // Update Request
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.child(params.orderNo).update({
      payment_approval: true
    }).then(() => {
      res.json({
        status: true,
        message: `Payment Approved For Order#${params.orderNo}`
      })
    }).catch((err) => {
      res.json({
        status: false,
        error: err.message
      })
    })
  },
)

// ================= Payment Approval (End) =================



// ================= VENDOR DRIVERS  (Start) =================

// /vendor_invite_driver  -> (Vendor Creates A Driver)
router.post(
  "/vendor_invite_driver",
  body("fullname").isString().withMessage("fullname must be string"),
  body("phone").isMobilePhone().withMessage("phone must be valid phone number"),
  // body("cnic")
  //   .isNumeric()
  //   .isLength({ min: 13, max: 13 })
  //   .withMessage("cnic must be valid phone number"),
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
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":

        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot invite driver !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot invite driver !`,
        });
        break;
    }
  },
  // Check Vendor
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("vendors")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          // console.log("vendor -> ", req.body.vendor);
          next();
        } else {
          res.json({
            status: false,
            error: "vendor not found !",
          });
        }
      });
  },
  // Check Driver Exists ?
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("drivers")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          res.json({
            status: false,
            error: "Driver Already Exists !",
          });
        } else {
          next();
        }
      });
  },
  // Generate A Driver (Incomplete)
  (req, res, next) => {
    const params = req.body;
    const newdriver = userRef.child("drivers").push();
    const driverId = newdriver.key;

    userRef
      .child("drivers")
      .child(params.phone)
      .set({
        id: driverId,
        ...params,
        token: null,
        vendor: null,
        referer: params.vendor.phone,
        vendorOrdriver: null,
        created: getCurrentDate(),
        status: "free",
        online: false,
        active: false,
        verified: false,
        type: "driver",
      })
      .then(() => {
        walletRef
          .child("drivers")
          .child(params.phone)
          .set({
            amount: "-100",
            type: "cash",
          }).then(() => {
            next();
          }).catch((err) => {
            res.json({
              status: false,
              error: err.message,
            });
          })

      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  },
  // Send Invite SMS
  (req, res) => {
    const params = req.body;

    let content = `You have been invited by ${params.vendor.company_name} To Meribilty App as a driver. Login With Your Phone Number ${params.phone}.`;
    axios.post(`http://bsms.its.com.pk/api.php?key=b23838b9978affdf2aab3582e35278c6&msgdata=${content}&receiver=${params.phone}`).then((response)=>{
    let data = response.data;
    
      if(data.response.status === 'Success') {
        res.json({
          status: true,
          message: "Driver Has Been Invited !",
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
    //       to: params.phone,
    //       from: config.twilio.phone,
    //       body: `You have been invited by ${params.vendor.company_name} To Meribilty App as a driver. Login With Your Phone Number ${params.phone}.`,
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
    //           message: "Driver Has Been Invited !",
    //         });
    //       }
    //     }
    //   )
    //   .catch((err) => {
    //     res.json({
    //       status: false,
    //       error: err,
    //     });
    //   });
  }
);

// /vendor_edit_driver -> (Vendor Edits A Driver)
router.post(
  "/vendor_edit_driver",
  body("firstname").isString().withMessage("firstname must be string"),
  body("lastname").isString().withMessage("firstname must be string"),
  body("phone").isMobilePhone().withMessage("phone must be valid phone number"),
  body("cnic")
    .isNumeric()
    .isLength({ min: 13, max: 13 })
    .withMessage("cnic must be valid phone number"),
  body("vendor_phone")
    .isMobilePhone()
    .withMessage("vendor_phone must be valid phone number"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.vendorOrdriver.type) {
      case "vendor":
        req.body.vendor = params.vendorOrdriver;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.vendorOrdriver.type} cannot edit invited driver !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.vendorOrdriver.type} cannot edit invited driver !`,
        });
        break;
    }
  },
  // Check Vendor
  (req, res, next) => {
    // enc="Multipart form-data"
    //   {
    //     "firstname": "+923243280234",
    //     "lastname": "+923243254545",
    //     "phone": "Ayaz Bhatti",
    //     "cnic" : "MAZDA CONTAINER 20 FT LOCAL",
    //     "vendor_phone" : "+923243280234"
    //     "profile_image": ,
    //     "cnic_image": ,
    //     "driving_license_image":
    // }

    const params = req.body;
    userRef
      .child("vendors")
      .child(params.vendor_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          // console.log("vendor -> ", req.body.vendor);
          next();
        } else {
          res.json({
            status: false,
            error: "vendor not found !",
          });
        }
      });
  },
  // Check if Vendor driver Exists ?
  (req, res, next) => {
    //   {
    //     "vendor_phone": "+923243280234",
    //     "driver_phone": "+923243254545",
    //     "fullname": "Ayaz Bhatti",
    //     "vehicle_name" : "MAZDA CONTAINER 20 FT LOCAL",
    //     "vehicle_make": "GHK",
    //     "vehicle_model": "1996",
    //     "vehicle_number": "5201 KNG"
    // }
    const params = req.body;

    userRef
      .child("vendor_drivers")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          next();
        } else {
          res.json({
            status: false,
            error: "Vendor Driver Not Found !",
          });
        }
      });
  },
  // Generate A Vendor Driver
  (req, res, next) => {
    const params = req.body;
    const password = generator.generate({
      length: 10,
      numbers: true,
    });
    const newVendordriver = userRef.child("vendor_drivers").push();
    const driverId = newVendordriver.key;
    req.body.vendor_driver_password = password;

    userRef
      .child("vendor_drivers")
      .child(params.phone)
      .update({
        ...params,
      })
      .then(() => {
        next();
      })
      .catch((error) => {
        res.json({
          status: false,
          error,
        });
      });
  },
  // Upload Images
  (req, res, next) => {
    const params = req.body;

    const { profile_image } = req.files;
    const { cnic_image } = req.files;
    const { driving_license_image } = req.files;

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
    const driving_license_image_filetype =
      driving_license_image_filename.split(".")[1];
    const driving_license_image_name = `${params.phone}_driving_license_image`;

    // console.log("filetype -> ", filetype);
    // console.log("documentName -> ", documentName);

    // const bucket = storage.bucket("meribilty-staging.appspot.com");
    // const document = bucket.file("TransitCargoDocuments/" + documentName);
    const path = "VendorDrivers/";

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
                      // next();
                      res.json({
                        status: true,
                        message: "Vendor Driver Created Successfully",
                      });
                    }
                  }
                );
              }
            }
          );
        }
      }
    );
  },
  // Get Images Links
  async (req, res, next) => {
    const params = req.body;

    let options = {
      prefix: `VendorDrivers/`,
    };

    const [files] = await storage.bucket("meribilty-staging.appspot.com").getFiles(options);
    var uploadImages = [];

    files.forEach((file) => {
      const fileName = file.name;

      if (fileName.includes(params.phone)) {
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
  // Update Vendor Driver
  (req, res) => {
    const params = req.body;

    userRef
      .child("vendor_drivers")
      .child()
      .update({
        documents: documentsUploaded,
      })
      .then(() => {
        res.json({
          status: true,
          message: "Vendor Driver Created Successfully !",
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

// /vendor_remove_driver -> (Vendor Removes A driver)
router.post(
  "/vendor_remove_driver",
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;
    switch (params.vendorOrdriver.type) {
      case "vendor":
        req.body.vendor = params.vendorOrdriver;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.vendorOrdriver.type} cannot remove invited driver !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.vendorOrdriver.type} cannot remove invited driver !`,
        });
        break;
    }
  },
  // Check Vendor
  (req, res, next) => {
    //   {
    //     "token": "",
    //     "phone": "",
    //  }

    const params = req.body;
    userRef
      .child("vendors")
      .child(params.vendor.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          console.log("vendor -> ", req.body.vendor);
          next();
        } else {
          res.json({
            status: false,
            error: "vendor not found !",
          });
        }
      });
  },
  // Check if Vendor driver Exists ?
  (req, res, next) => {
    //   {
    //     "driver_phone": "+923243254545",
    //     "fullname": "Ayaz Bhatti",
    //     "vehicle_name" : "MAZDA CONTAINER 20 FT LOCAL",
    //     "vehicle_make": "GHK",
    //     "vehicle_model": "1996",
    //     "vehicle_number": "5201 KNG"
    // }
    const params = req.body;

    userRef
      .child("vendor_drivers")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          res.json({
            status: false,
            error: "Vendor Driver Already Exists !",
          });
        } else {
          next();
        }
      });
  },
  // Remove A Vendor Driver
  (req, res, next) => {
    const params = req.body;
    const newVendordriver = userRef.child("vendor_drivers").push();

    userRef.child("vendor_drivers").child(params.phone);
    remove()
      .then(() => {
        next();
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  },
  // Send SMS To User Agent
  (req, res) => {
    const params = req.body;
    // Send SMS To User Agent
    let content = `You have been removed as a vendor driver. To Meribilty Driver App.`;
    axios.post(`http://bsms.its.com.pk/api.php?key=b23838b9978affdf2aab3582e35278c6&msgdata=${content}&receiver=${params.phone}`).then((response)=>{
    let data = response.data;
    
      if(data.response.status === 'Success') {
        res.json({
          status: true,
          message: "Vendor Driver Added !",
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
    //       to: params.phone,
    //       from: twilioCred.phone,
    //       body: "You have been removed as a vendor driver. To Meribilty Driver App.",
    //     },
    //     (err, resData) => {
    //       if (err) {
    //         return res.json({
    //           status: false,
    //           message: err,
    //         });
    //       }
    //       res.json({
    //         status: true,
    //         message: "Vendor Driver Added !",
    //       });
    //     }
    //   )
    //   .catch((err) => {
    //     res.json({
    //       status: false,
    //       error: err,
    //     });
    //   });
  }
);

// /vendor_make_driver_offline -> (Vendor Makes His Vehicle Offline if not busy)
router.post(
  "/vendor_make_driver_offline",
  body("phone").isString().withMessage("vehicle_number must be string"),
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
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;
    switch (params.user.user_type) {
      case "vendor":
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make driver offline !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make driver offline !`,
        });
        break;
    }
  },
  // Check Vendor
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("vendors")
      .child(params.vendor.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          console.log("vendor -> ", req.body.vendor);
          next();
        } else {
          res.json({
            status: false,
            error: "vendor not found !",
          });
        }
      });
  },
  // check vendor vehicle
  (req, res, next) => {
    const params = req.body;

    pplVendorVehicleRef
      .orderByChild("vehicle_number")
      .equalTo(params.vehicle_number)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          snapshot.forEach((childSnapshot) => {
            const { key } = childSnapshot;
            req.body.vehicleId = key;
            console.log("key -> ", key);
            next();
          });
        } else {
          res.json({
            status: false,
            error: "Vehicle Not Found !",
          });
        }
      });
  },
  // Update Vendor Vehicle
  (req, res) => {
    pplVendorVehicleRef
      .child(req.body.vehicleId)
      .update({
        available: false,
      })
      .then(() => {
        res.json({
          status: true,
          message: "Vendor Vehicle Is Offline !",
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// /vendor_make_driver_online -> (Vendor Makes His Vehicle Online if not online)
router.post(
  "/vendor_make_driver_online",
  body("phone")
    .isMobilePhone()
    .withMessage("Vendor Driver Phone Number Must Be Valid"),
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
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;
    switch (params.user.user_type) {
      case "vendor":
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make driver online !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make driver online !`,
        });
        break;
    }
  },
  // Check Vendor
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("vendors")
      .child(params.vendor.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          console.log("vendor -> ", req.body.vendor);
          next();
        } else {
          res.json({
            status: false,
            error: "vendor not found !",
          });
        }
      });
  },
  // check vendor driver
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("vendor_drivers")
      .orderByChild("vendor_phone")
      .equalTo(params.vendor.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const rawdrivers = snapshot.val();
          const drivers = [];
          const convert = Object.entries(rawdrivers);
          convert.forEach((x) => {
            drivers.push(x[1]);
          });

          const filterOut = drivers.filter((driver) => {
            return driver.phone === params.phone;
          });

          if (filterOut) {
            if (filterOut.length !== 0) {
              req.body.driver = filterOut[0];
              next();
            }
          }
        } else {
          res.json({
            status: false,
            error: "Driver Not Found !",
          });
        }
      });
  },
  // Update Vendor Vehicle
  (req, res) => {
    const params = req.body;
    userRef
      .child("vendor_drivers")
      .child(params.driver.phone)
      .update({
        available: true,
      })
      .then(() => {
        res.json({
          status: true,
          message: "Vendor Vehicle Is online !",
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// ================= VENDOR DRIVERS  (Ends) =================




// ================= ESTIMATED RATES FOR ROUTES  (Start) =================

router.post('/add_route', (req,res) => {
  const params = req.body;
  
  let data = {
    vehicle_type: params.vehicletype,
    origin: 'karachi',
    destinations: {
      torkham: "250000",
      jalalabad: "300000",
      kabul: '370000',
      chaman: '200000',
      kandahar: '290000'
    }
  }

  pplSettingsRef.child('transit_routes').child(params.vehicletype).set(data).then(()=>{
     res.json({
      status:true
     })
  }).catch((err)=>{
    console.log('err -> ',err);
  })
});

// ================= ESTIMATED RATES FOR ROUTES  (End) =================












// ================= VENDOR VEHICLE (Start) =================

// /vendor_add_vehicle -> (Vendor Creates His Vehicle With The Given Vehicle Type)
router.post(
  "/vendor_add_vehicle",
  body("vehicle_name").isString().withMessage("vehicle_name must be string"),
  body("vehicle_make").isString().withMessage("vehicle_make must be string"),
  body("vehicle_model").isString().withMessage("vehicle_model must be string"),
  body("vehicle_number")
    .isString()
    .withMessage("vehicle_number must be string"),
  body("vehicle_type").isString().withMessage("vehicle_type must be string"),
  body("available").isBoolean().withMessage("available must be boolean"),

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
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        // req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot add vehicle !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot add vehicle !`,
        });
        break;
    }
  },
  // Check Vendor
  (req, res, next) => {
    // {
    //   "token": "",
    //   "vehicle_name" : "BOWSER 20 FT",
    //   "vehicle_make": "FORD",
    //   "vehicle_model": "2000",
    //   "vehicle_number": "ASD-213",
    //   "vehicle_type": "Container",
    //   "available" : true
    // }

    const params = req.body;
    userRef
      .child("vendors")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          next();
        } else {
          res.json({
            status: false,
            error: "vendor not found !",
          });
        }
      });
  },
  // Get Vehicle Types
  (req, res, next) => {
    const params = req.body;

    pplSettingsRef
      .child("vehicle_types")
      .child(params.vehicle_type)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          next();
        } else {
          res.json({
            status: false,
            message: "Vehicle Type Not Found In Database !",
          });
        }
      });
  },
  // Add Vendor Vehicle
  (req, res) => {
    const params = req.body;

    const newVendorVehicle = pplVendorVehicleRef.push();
    const vehicleId = newVendorVehicle.key;

    newVendorVehicle
      .set({
        id: vehicleId,
        vehicle_make: params.vehicle_make,
        vehicle_model: params.vehicle_model,
        vehicle_name: params.vehicle_name,
        vehicle_number: params.vehicle_number,
        vendor_phone: params.vendor.phone,
        vehicle_type: params.vehicle_type,
        available: true,
        added_on: getCurrentDate(),
      })
      .then(() => {
        res.json({
          status: true,
          message: "Vendor Vehicle Added Successfully",
        });
      })
      .catch((err) => {
        res.json({
          status: false,
          message: err.message,
        });
      });
  }
);

// /vendor_edit_vehicle -> (Vendor Edits His Vehicle)
router.post(
  "/vendor_edit_vehicle",
  body("id").isString().withMessage("id must be string"),
  body("vehicle_name").isString().withMessage("vehicle_name must be string"),
  body("vehicle_make").isString().withMessage("vehicle_make must be string"),
  body("vehicle_model").isString().withMessage("vehicle_model must be string"),
  body("vehicle_number")
    .isString()
    .withMessage("vehicle_number must be string"),
  body("vehicle_type").isString().withMessage("vehicle_type must be string"),
  body("available").isBoolean().withMessage("available must be boolean"),
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
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":

        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot edit vehicle !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot edit vehicle !`,
        });
        break;
    }
  },
  // check vendor vehicle
  (req, res, next) => {
    const params = req.body;
    pplVendorVehicleRef.child(params.id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          next();
        } else {
          res.json({
            status: false,
            error: "Vehicle Not Found !",
          });
        }
      });
  },
  // Edit Vendor Vehicle
  (req, res, next) => {
    const params = req.body;


    pplVendorVehicleRef
      .child(params.id)
      .update({
        vehicle_make: params.vehicle_make,
        vehicle_model: params.vehicle_model,
        vehicle_name: params.vehicle_name,
        vehicle_number: params.vehicle_number,
        vendor_phone: params.user.user_id,
        vehicle_type: params.vehicle_type,
        available: true,
      })
      .then(() => {
        res.json({
          status: true,
          message: "Vendor Vehicle Updated Successfully",
        });
      })
      .catch((err) => {
        res.json({
          status: false,
          message: err.message,
        });
      });
  }
);

// /vendor_remove_vehicle -> (Vendor Removes His Vehicle)
router.post(
  "/vendor_remove_vehicle",
  body("id").isString().withMessage("id must be string"),

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
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot remove vehicle !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot remove vehicle !`,
        });
        break;
    }
  },
  // check vendor vehicle
  (req, res, next) => {
    const params = req.body;

    pplVendorVehicleRef.child(params.id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          next();
        } else {
          res.json({
            status: false,
            error: "Vehicle Not Found !",
          });
        }
      });
  },
  // Remove Vendor Vehicle
  (req, res) => {
    pplVendorVehicleRef
      .child(req.body.id)
      .remove()
      .then(() => {
        res.json({
          status: true,
          message: "Vendor Vehicle Is Removed Successfully !",
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// /vendor_make_vehicle_offline -> (Vendor Makes His Vehicle Offline if not busy)
router.post(
  "/vendor_make_vehicle_offline",
  body("vehicle_number")
    .isString()
    .withMessage("vehicle_number must be string"),
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
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make vehicle offline!`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make vehicle offline!`,
        });
        break;
    }
  },
  // check vendor vehicle
  (req, res, next) => {
    const params = req.body;

    pplVendorVehicleRef
      .orderByChild("vehicle_number")
      .equalTo(params.vehicle_number)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          snapshot.forEach((childSnapshot) => {
            const { key } = childSnapshot;
            req.body.vehicleId = key;
            console.log("key -> ", key);
            next();
          });
        } else {
          res.json({
            status: false,
            error: "Vehicle Not Found !",
          });
        }
      });
  },
  // Update Vendor Vehicle
  (req, res) => {
    pplVendorVehicleRef
      .child(req.body.vehicleId)
      .update({
        available: false,
      })
      .then(() => {
        res.json({
          status: true,
          message: "Vendor Vehicle Is Offline !",
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// /vendor_make_vehicle_online -> (Vendor Makes His Vehicle Online if not online)
router.post(
  "/vendor_make_vehicle_online",
  body("vehicle_number")
    .isString()
    .withMessage("vehicle_number must be string"),
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
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make vehicle online!`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make vehicle online!`,
        });
        break;
    }
  },
  // check vendor vehicle
  (req, res, next) => {
    const params = req.body;

    pplVendorVehicleRef
      .orderByChild("vehicle_number")
      .equalTo(params.vehicle_number)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          snapshot.forEach((childSnapshot) => {
            const { key } = childSnapshot;
            req.body.vehicleId = key;
            console.log("key -> ", key);
            next();
          });
        } else {
          res.json({
            status: false,
            error: "Vehicle Not Found !",
          });
        }
      });
  },
  // Update Vendor Vehicle
  (req, res) => {
    pplVendorVehicleRef
      .child(req.body.vehicleId)
      .update({
        available: true,
      })
      .then(() => {
        res.json({
          status: true,
          message: "Vendor Vehicle Is online !",
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error,
        });
      });
  }
);



// =================================  DRIVER STATUSES =========================================


// "5" => Driver Reached To The Origin Location
// /reached_origin
// {
//    "token": "",
//    "biltyNo": "",
//    "type" : "" (scm,ppl)
// }
router.post(
  "/reached_origin",
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
      send_notification_to_single_user(snapshot.val().fcm_token.token, {
        title: "Driver: Reached To Origin Location",
        body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} has reached to origin location.`
        , routes: "MyOrders"
      })
    })


    res.json({
      status: true,
      error: "Driver reached successfully!",
    });

  }
);

// "6" => Driver Picked Up The Load
// /driver_picked_up_load
// {
//    "token": "",
//    "biltyNo": "",
//    "type" : "" (scm,ppl)
// }
router.post(
  "/picked_up_load",
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
    // Request Id Required
    const params = req.body;
    let getLength = params.biltyNo.length;
    const getOrderNo = params.biltyNo.slice(2, getLength - 2);

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
          title: "Driver: Picked Up The Load",
          body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} has Picked Up The Load.`
          , routes: "MyOrders"
        }).then(()=>{
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

// "7" => Driver Delivered
// /driver_delivered
// {
//    "token": "",
//    "biltyNo": "",
//    "type" : "" (scm,ppl)
// }
router.post(
  "/driver_delivered",
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
                  // console.log("bilty -> ", bilty);

                  if (bilty.status == "driver_pickup") {
                    req.body.bilty = bilty;
                    console.log('bilty checked');
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
        console.log('bilties updated !')
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

    let data ={
      ...params.request,
      orderNo: getOrderNo,
      biltyNo: params.biltyNo,
      driver_alotted_on: params.bilty.driver_alotted_on || null,
      driver_reached_on: params.bilty.driver_reached_on || null,
      driver_pickup_on: params.bilty.driver_pickup_on || null,
      driver_delivered_on: params.bilty.driver_delivered_on || null,
      status: "delivered",
      type: params.request.request_type,
    }
    // console.log('data -> ',data);
    driverHistoryRef
      .child(params.driver_phone)
      .child(params.biltyNo)
      .set(data)
      .then(() => {
        console.log('driver history ref updated !')
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
      send_notification_to_single_user(snapshot.val().fcm_token.token, {
        title: "Driver: Driver Delivered The Load",
        body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} has Driver Delivered The Load.`
        , routes: "MyOrders"
      })
    })


    res.json({
      status: true,
      error: "PPL : Driver Delivered The Load Successfully !",
    });
  }
);


// "7" => Driver Unloading Complete
// /unloading_complete
// {
//    "token": "",
//    "biltyNo": "",
//    "type" : "" (ppl)
// }
router.post(
  "/unloading_complete",
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
    const getOrderNo = params.biltyNo.slice(2, params.biltyNo.length - 2);

    driverHistoryRef
      .child(params.driver_phone)
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

// "8" => Driver Returning Container
// /driver_returning_container
// {
//    "token": "",
//    "biltyNo": "",
//    "type" : "" (scm,ppl)
// }
router.post(
  "/driver_returning_container",
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
    const params = req.body;

    const getOrderNo = params.biltyNo.slice(2, params.biltyNo.length - 2);

    pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();
        req.body.request = request;
        console.log('rqeuest found !');
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
            console.log('bilty updated !');
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
            console.log('driver history updated !');
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
                .child(params.request.orderNo)
                .update({
                  status: "completed",
                  order_completed_on: getCurrentDate(),
                })
                .then(() => {
                  console.log('bilty completed !');
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
        console.log('updated driver !');
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

    console.log('params.bilty.vehicle_id -> ',params.bilty.vehicle_id);


    pplVendorVehicleRef
      .child(params.bilty.vehicle_id)
      .update({
        available: true,
        bilty: null,
        option_id: null,
      })
      .then(() => {
        console.log('updated Vehicle !');
        next();
      })
      .catch((err) => {
        next();
      });

    // pplVendorVehicleRef.orderByChild('vehicle_number').equalTo(params.vehicle_number).then((snapshot) => {
    //   if (snapshot.val()) {
    //     const vehicle = [];
    //     snapshot.forEach((snap) => {
    //       vehicle.push(snap.val())
    //     })
    //     if (vehicle.length > 0) {

    //     } else {
    //       next()
    //     }
    //   } else {
    //     next()
    //   }
    // }).catch((err) => {
    //   res.json({
    //     status: false,
    //     error: err
    //   })
    // })
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
          title: "Driver: Empty Container Returned",
          body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} has returned the empty container.`
          , routes: "MyOrders"
        })
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



























































// =================================  SETTINGS / VARIABLES ETC =========================================

// PPL Vehicle Type Pricing + Loading Options
router.post("/add_vehicle_type",
  (req, res, next) => {
    const params = req.body;

    console.log('request -> ', req);
    console.log('req.body -> ', req.body);


    pplSettingsRef.child('vehicle_types').child(params.vehicleType).set({
      vehicle_image: params.vehicle_image,
      vehicle_type: params.vehicleType,
      weights: this.weightRanges
    })
      .then(() => {
        res.json({
          status: true,
          message: "Vehicle Type Added Successfully",
        });
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  },
);

// Get Vehicle Types 
router.get("/vehicle_types", (req, res) => {
  const params = req.query;


  pplSettingsRef.child('vehicle_types')
    .once("value", (snapshot) => {
      if (snapshot.val()) {
        let types = [];

        snapshot.forEach((snap) => {
          types.push(snap.val())
        })

        let length = types.length;
        let page = (parseInt(params.page) || 1);
        let per_page = (parseInt(params.per_page) || 5);

        let from = (page - 1) * per_page + 1;
        let to = (from + per_page) <= length ? (from + per_page - 1) : length;
        let current_page = page;
        let last_page = (length % per_page) == 0 ? (length / per_page) : (Math.floor(length / per_page) + 1);
        let total = length;
        let next_page_url;
        if (to < length) {
          next_page_url = `https://api.meribilty.com/admin/vehicle_types?page=${page + 1}&per_page=${per_page}`
        }
        let prev_page_url
        if ((from - 1) != 0) {
          prev_page_url = `https://api.meribilty.com/admin/vehicle_types?page=${page - 1}&per_page=${per_page}`
        }

        types = types.slice(from - 1, to);



        res.json({
          status: true,
          total,
          from,
          to,
          per_page,
          current_page,
          last_page,
          next_page_url,
          prev_page_url,
          data: types,
        });
      } else {
        res.json({
          status: false,
          error: "Vehicle Types Not Found !",
        });
      }
    });
});

// Get Loading Options 
router.get("/loading_options", (req, res) => {
  const params = req.query;


  pplSettingsRef.child('loading_options')
    .once("value", (snapshot) => {
      if (snapshot.val()) {
        let types = [];

        snapshot.forEach((snap) => {
          types.push(snap.val())
        })

        let length = types.length;
        let page = (parseInt(params.page) || 1);
        let per_page = (parseInt(params.per_page) || 5);

        let from = (page - 1) * per_page + 1;
        let to = (from + per_page) <= length ? (from + per_page - 1) : length;
        let current_page = page;
        let last_page = (length % per_page) == 0 ? (length / per_page) : (Math.floor(length / per_page) + 1);
        let total = length;
        let next_page_url;
        if (to < length) {
          next_page_url = `https://api.meribilty.com/admin/vehicle_types?page=${page + 1}&per_page=${per_page}`
        }
        let prev_page_url
        if ((from - 1) != 0) {
          prev_page_url = `https://api.meribilty.com/admin/vehicle_types?page=${page - 1}&per_page=${per_page}`
        }

        types = types.slice(from - 1, to);



        res.json({
          status: true,
          total,
          from,
          to,
          per_page,
          current_page,
          last_page,
          next_page_url,
          prev_page_url,
          data: types,
        });
      } else {
        res.json({
          status: false,
          error: "Vehicle Types Not Found !",
        });
      }
    });
});

// Get Unloading Options 
router.get("/unloading_options", (req, res) => {
  const params = req.query;


  pplSettingsRef.child('unloading_options')
    .once("value", (snapshot) => {
      if (snapshot.val()) {
        let types = [];

        snapshot.forEach((snap) => {
          types.push(snap.val())
        })

        let length = types.length;
        let page = (parseInt(params.page) || 1);
        let per_page = (parseInt(params.per_page) || 5);

        let from = (page - 1) * per_page + 1;
        let to = (from + per_page) <= length ? (from + per_page - 1) : length;
        let current_page = page;
        let last_page = (length % per_page) == 0 ? (length / per_page) : (Math.floor(length / per_page) + 1);
        let total = length;
        let next_page_url;
        if (to < length) {
          next_page_url = `https://api.meribilty.com/admin/vehicle_types?page=${page + 1}&per_page=${per_page}`
        }
        let prev_page_url
        if ((from - 1) != 0) {
          prev_page_url = `https://api.meribilty.com/admin/vehicle_types?page=${page - 1}&per_page=${per_page}`
        }

        types = types.slice(from - 1, to);



        res.json({
          status: true,
          total,
          from,
          to,
          per_page,
          current_page,
          last_page,
          next_page_url,
          prev_page_url,
          data: types,
        });
      } else {
        res.json({
          status: false,
          error: "Vehicle Types Not Found !",
        });
      }
    });
});

// Get Material Options 
router.get("/materials", (req, res) => {
  const params = req.query;


  pplSettingsRef.child('material_list')
    .once("value", (snapshot) => {
      if (snapshot.val()) {
        let types = [];

        snapshot.forEach((snap) => {
          types.push(snap.val())
        })

        let length = types.length;
        let page = (parseInt(params.page) || 1);
        let per_page = (parseInt(params.per_page) || 5);

        let from = (page - 1) * per_page + 1;
        let to = (from + per_page) <= length ? (from + per_page - 1) : length;
        let current_page = page;
        let last_page = (length % per_page) == 0 ? (length / per_page) : (Math.floor(length / per_page) + 1);
        let total = length;
        let next_page_url;
        if (to < length) {
          next_page_url = `https://api.meribilty.com/admin/materials?page=${page + 1}&per_page=${per_page}`
        }
        let prev_page_url
        if ((from - 1) != 0) {
          prev_page_url = `https://api.meribilty.com/admin/materials?page=${page - 1}&per_page=${per_page}`
        }

        types = types.slice(from - 1, to);



        res.json({
          status: true,
          total,
          from,
          to,
          per_page,
          current_page,
          last_page,
          next_page_url,
          prev_page_url,
          data: types,
        });
      } else {
        res.json({
          status: false,
          error: "Materials Not Found !",
        });
      }
    });
});


router.post("/add_route_estimation", (req, res) => {
  // {
  //     "origin": "karachi",
  //     "destination": "lahore",
  //     "high": "135000",
  //     "low": "100000"
  // }

  const params = req.body;

  const newRouteEstimation = pplRoutesEstimation.push();
  const estimationId = newRouteEstimation.key;

  newRouteEstimation
    .set({
      ...params,
      id: estimationId,
    })
    .then(() => {
      res.json({
        status: true,
        message: "Route Estimation Added Successfully",
      });
    })
    .catch((err) => {
      res.json({
        status: false,
        error: err.message,
      });
    });
});


//  Update Commission Percentage
router.post("/update_commission", (req, res) => {
  const { commission } = req.body;

  pplCommission
    .set({
      value: commission,
      updatedAt: getCurrentDate(),
    })
    .then(() => {
      res.json({
        status: true,
        message: "Commission Updated Successfully",
      });
    })
    .catch((error) => {
      res.json({
        status: false,
        error,
      });
    });
});


// Add User Cancellation Reason
router.post("/add_user_cancellation_reason", (req, res) => {
  const params = req.body;

  // const translatedText = await translateText(name, "ur");
  pplCancellationReasonRef
    .child("user")
    .child(params.name)
    .set(params.name)
    .then(() => {
      res.json({
        status: true,
        reason: "Reason Added Successfully",
      });
    })
    .catch((err) => {
      res.json({
        status: false,
        reason: err,
      });
    });
});


// Add A Unloading Option To Options List
router.post("/add_vendor_cancellation_reason", (req, res) => {
  const params = req.body;

  // const translatedText = await translateText(name, "ur");
  pplCancellationReasonRef
    .child("vendor")
    .child(params.name)
    .set(params.name)
    .then(() => {
      res.json({
        status: true,
        reason: "Reason Added Successfully",
      });
    })
    .catch((err) => {
      res.json({
        status: false,
        reason: err,
      });
    });
});


// Add Insurance Percent
router.post("/add_insurance_percent", (req, res) => {
  const params = req.body;
  // percent

  pplSettingsRef
    .child("insurance")
    .update({
      value: params.percent,
      updatedOn: getCurrentDate(),
    })
    .then(() => {
      res.json({
        status: true,
        reason: "Insurance Percent Updated Successfully",
      });
    })
    .catch((err) => {
      res.json({
        status: false,
        reason: err,
      });
    });
});


// For Charts And Graphs
router.get('/new-users', (req, res, next) => {
  const params = req.body;
})
router.get('/new-vendors', (req, res, next) => {

})
router.get('/new-orders', (req, res, next) => {

})


// Create User
router.post('/create-user',
  // Check User In Database 
  (req, res, next) => {
    const params = req.body;

    switch (params.type) {
      case "user":
        userRef
          .child("users")
          .child(params.phone)
          .once('value', (snapshot) => {
            if (snapshot.val()) {
              res.json({
                status: false,
                message: "User Already Exists On This Phone Number !",
              });
            } else {
              next();
            }
          })
          .catch((error) => {
            res.json({
              status: false,
              error: error.message,
            });
          });
        break;

      case "pro-unverified":
        userRef
          .child("pro")
          .child(params.phone)
          .once('value', (snapshot) => {
            if (snapshot.val()) {
              res.json({
                status: false,
                message: "User Already Exists On This Phone Number !",
              });
            } else {
              next();
            }
          })
          .catch((error) => {
            res.json({
              status: false,
              error: error.message,
            });
          });

        break;

      case "pro-verified":
        userRef
          .child("pro")
          .child(params.phone)
          .once('value', (snapshot) => {
            if (snapshot.val()) {
              res.json({
                status: false,
                message: "User Already Exists On This Phone Number !",
              });
            } else {
              next();
            }
          })
          .catch((error) => {
            res.json({
              status: false,
              error: error.message,
            });
          });
        break;

      case "driver":
        userRef
          .child("drivers")
          .child(params.phone)
          .once('value', (snapshot) => {
            if (snapshot.val()) {
              res.json({
                status: false,
                message: "User Already Exists On This Phone Number !",
              });
            } else {
              next();
            }
          })
          .catch((error) => {
            res.json({
              status: false,
              error: error.message,
            });

          })
        break;

      case "vendor":
        userRef
          .child("vendors")
          .child(params.phone)
          .once('value', (snapshot) => {
            if (snapshot.val()) {
              res.json({
                status: false,
                message: "User Already Exists On This Phone Number !",
              });
            } else {
              next();
            }
          })
          .catch((error) => {
            res.json({
              status: false,
              error: error.message,
            });
          })

        break;



      default:
        res.json({
          status: false,
          error: "Unknown User Type"
        });
        break;
    }
  },
  // Save Images In Database
  (req, res, next) => {
    const params = req.body;


    switch (params.type) {
      case "user":

        break;

      case "pro-unverified":

        break;

      case "pro-verified":

        break;

      case "driver":

        break;

      case "vendor":

        break;

      default:
        res.json({
          status: false,
          error: "Unknown User Type"
        })
        break;
    }
  },
  // Save User In Database
  (req, res, next) => {
    const params = req.body;

    const salt = bcrypt.genSaltSync(saltRounds);
    const hash = bcrypt.hashSync(params.password, salt);

    switch (params.type) {
      case "user":
        userRef.child('users').child(params.phone).set({
          ...params,
          password: hash,
          type: "user",
          verified: true,
          application_status: false,
          created: getCurrentDate(),
        }).then(() => {
          next();
        }).catch((err) => {
          res.json({
            status: false,
            error: err
          })
        })
        break;

      case "pro-unverified":
        userRef.child('pro').child(params.phone).set({
          ...params,
          password: hash,
          type: "user",
          verified: true,
          application_status: false,
          created: getCurrentDate(),
        }).then(() => {
          next();
        }).catch((err) => {
          res.json({
            status: false,
            error: err
          })
        })

        break;

      case "pro-verified":
        userRef.child('pro').child(params.phone).set({
          ...params,
          password: hash,
          type: "pro",
          verified: true,
          application_status: true,
          created: getCurrentDate(),
        }).then(() => {
          next();
        }).catch((err) => {
          res.json({
            status: false,
            error: err
          })
        })
        break;

      case "driver":
        userRef.child('driver').child(params.phone).set({
          ...params,
          password: hash,
          type: "driver",
          verified: true,
          created: getCurrentDate(),
        }).then(() => {
          next();
        }).catch((err) => {
          res.json({
            status: false,
            error: err
          })
        })
        break;

      case "vendor":
        userRef.child('vendor').child(params.phone).set({
          ...params,
          password: hash,
          type: "vendor",
          verified: true,
          created: getCurrentDate(),
        }).then(() => {
          next();
        }).catch((err) => {
          res.json({
            status: false,
            error: err
          })
        })
        break;

      default:
        res.json({
          status: false,
          error: "Unknown User Type"
        })
        break;
    }
  },
  // Create Wallet
  (req, res) => {
    const params = req.body;

    switch (params.type) {
      case "user":
        walletRef
          .child("users")
          .child(params.phone)
          .set({
            amount: "0",
            type: "cash",
            transactions: []
          })
          .then(() => {
            res.json({
              status: true,
              message: "User is created successfully"
            })
          })
          .catch((error) => {
            res.json({
              status: false,
              error: error.message,
            });
          });
        break;

      case "pro-unverified":
        walletRef
          .child("users")
          .child(params.phone)
          .set({
            amount: "0",
            type: "cash",
            transactions: []
          })
          .then(() => {
            res.json({
              status: true,
              message: "User is created successfully"
            })
          })
          .catch((error) => {
            res.json({
              status: false,
              error: error.message,
            });
          });
        break;

      case "pro-verified":
        walletRef
          .child("users")
          .child(params.phone)
          .set({
            amount: "0",
            type: "cash",
            transactions: []
          })
          .then(() => {
            res.json({
              status: true,
              message: "User is created successfully"
            })
          })
          .catch((error) => {
            res.json({
              status: false,
              error: error.message,
            });
          });
        break;

      case "driver":
        walletRef
          .child("drivers")
          .child(params.phone)
          .set({
            amount: "0",
            type: "cash",
            transactions: []
          })
          .then(() => {
            res.json({
              status: true,
              message: "Driver is created successfully"
            })
          })
          .catch((error) => {
            res.json({
              status: false,
              error: error.message,
            });
          });
        break;

      case "vendor":
        walletRef
          .child("vendors")
          .child(params.phone)
          .set({
            amount: "0",
            type: "cash",
            transactions: []
          })
          .then(() => {
            res.json({
              status: true,
              message: "Vendor is created successfully"
            })
          })
          .catch((error) => {
            res.json({
              status: false,
              error: error.message,
            });
          });
        break;

      default:
        res.json({
          status: false,
          error: "Unknown User Type"
        })
        break;
    }

  }
)








// get_cancellation_reasons
router.get("/get_cancellation_reasons",
  // Get All Users 
  (req, res, next) => {
    const params = req.query;

    pplSettingsRef.child('cancellation_reasons').child(params.filter).once('value', (snapshot) => {
      if (snapshot.val()) {
        let allusers = [];
        let id = 1;

        snapshot.forEach((snap) => {
           allusers.push(snap.val())
        })

       
        req.body.allusers = allusers;
        next();

      } else {
        res.json({
          status: false,
          error: "No User Found !"
        })
      }
    })
  },
  // Send Response With Paginated Data
  async (req, res) => {
    const params = req.query;
    const body = req.body;
    let users = body.allusers;

    //   SORT , PAGINATION , SEARCH PARAMS
    let sort = params.sort;
    let filter = params.filter;
    let page = (parseInt(params.page) || 1);
    let per_page = (parseInt(params.per_page) || 5);
    let search = params.search;
   


    if (search) {
      users = users.filter((obj) => JSON.stringify(obj).toLowerCase().includes(search.toLowerCase()));
    }

    // if (search) {
    //   var lowSearch = search.toLowerCase();
    //   users = users.filter((obj) =>
    //     Object.values(obj).some((val) =>
    //       String(val).toLowerCase().includes(lowSearch)
    //     )
    //   );
    // }

    let length = users.length;


    let from = (page - 1) * per_page + 1;
    let to = (from + per_page) <= length ? (from + per_page - 1) : length;
    let current_page = page;
    let last_page = (length % per_page) == 0 ? (length / per_page) : (Math.floor(length / per_page) + 1);
    let total = length;
    let next_page_url;
    if (to < length) {
      next_page_url = `https://api.meribilty.com/admin/get_cancellation_reasons?page=${page + 1}&per_page=${per_page}`
    }
    let prev_page_url
    if ((from - 1) != 0) {
      prev_page_url = `https://api.meribilty.com/admin/get_cancellation_reasons?page=${page - 1}&per_page=${per_page}`
    }

    // Sort if sort is passed
    if (sort) {
      users.sort((a, b) => (a[sort] > b[sort]) ? 1 : ((b[sort] > a[sort]) ? -1 : 0));
    }


    users = users.slice(from - 1, to);

 

    res.json({
      status: true,
      total,
      from,
      to,
      per_page,
      current_page,
      last_page,
      next_page_url,
      prev_page_url,
      items: users,
    });
});



// Check User Exists
router.post('/checkUserExists', 
// Check User in Users/Pro
 // Check User
 (req, res, next) => {
  const params = req.body;

  userRef
    .child("users")
    .child(params.user_phone)
    .once("value", (snapshot) => {
      if (snapshot.val()) {
        const user = snapshot.val();
        req.body.user = user;
        console.log('user -> ',user);
        next();
      } else {
        userRef
          .child("pro")
          .child(params.user_phone)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              const user = snapshot.val();
              req.body.user = user;
              console.log('user -> ',user);
              next();
            } else {
              res.json({
                status: false,
                error: "User Not Found in Database !",
              });
            }
          });
      }
    });
},
// If User Exists 
(req,res,next) => {
  const params = req.body;



  if(params.user) {
    res.json({
      status:true,
      data: params.user,
      message: "User found !"
    })
  } else {
    res.json({
      status:false,
      error: "User Not found !"
    })
  }
},
// Create User If Not Exist
(req,res,next) => {

},
)



// Pro User Applications
router.post('/accept-pro-application', 
(req,res,next)=>{
  const params = req.body;

  console.log()

  proUserApplicationRef.child(params.phone).once('value', (snapshot) => {
    if(snapshot.val()) { 
        const application = snapshot.val();
        if(application.status === 'pending') {
          console.log('Application Status Checked !');
          next();
        } else {
          res.json({
            status:false,
            error: `Application has status -> ${application.status}`
          })
        }
    } else {
       res.json({
         status:false,
         error: "Application Not Found !"
       })
    }

  })
},
(req,res,next) => {
  const params = req.body;

  userRef.child('pro').child(params.phone).once('value', (snapshot) => {
    if(snapshot.val()){
       const user = snapshot.val();
       console.log('user -> ',user);

       proUserApplicationRef.child(user.phone).update({
          status: "accepted",
          accepted_on: getCurrentDate(),
          accepted_on_timestamp: getCurrentTimestamp(),
       }).then(()=>{
        userRef.child('pro').child(user.phone).update({
          type: "pro",
          user_type: "pro",
          NTN:params.NTN,
          bussiness_address: params.bussiness_address,
          bussiness_name: params.bussiness_name,
          cargo_volumne_per_month: params.cargo_volumne_per_month,
          credit_duration: params.credit_duration,
          credit_requirement_per_month: params.credit_requirement_per_month,
          landline:params.landline,
          owner:params.owner,
          point_of_contact: params.point_of_contact
        }).then(()=>{
            res.json({
              status:true,
              message: "Application Has Been Accepted"
            })
        }).catch((err)=>{
          res.json({
            status:false,
            error:err
          })
        })
       }).catch((err)=>{
         res.json({
           status:false,
           error:err
         })
       })

      //  

    } else {
      res.json({
        status:false,
        error: "User Not Found"
      })
    }
  })
})



router.post('/reject-pro-application', 
(req,res,next)=>{
  const params = req.body;

  proUserApplicationRef.child(params.phone).once('value', (snapshot) => {
    if(snapshot.val()) { 
        const application = snapshot.val();
        if(application.status === 'pending') {
          next();
        } else {
          res.json({
            status:false,
            error: `Application has status -> ${application.status}`
          })
        }
    } else {
       res.json({
         status:false,
         error: "Application Not Found !"
       })
    }

  })
},
(req,res,next) => {
  const params = req.body;

  userRef.child('pro').child(params.phone).once('value', (snapshot) => {
    if(snapshot.val()){
       const user = snapshot.val();
       console.log('user -> ',user);

       proUserApplicationRef.child(user.phone).update({
          status: "rejected",
          rejected_on: getCurrentDate(),
          rejected_on_timestamp: getCurrentTimestamp(),
       }).then(()=>{
        res.json({
          status:true,
          message: "Application Has Been Rejected !"
        })
       }).catch((err)=>{
         res.json({
           status:false,
           error:err
         })
       })

      //  

    } else {
      res.json({
        status:false,
        error: "User Not Found"
      })
    }
  })
})



router.post("/get_vendor_quote_time", (req,res,next) => {
  const params = req.body;

  pplSettingsRef.child('vendor_quote_time').once('value', (snapshot) => {
    if(snapshot.val()) {
      const vendor_qoute_time = snapshot.val();
      res.json({
        status:true,
        data: vendor_qoute_time
      })
    } else {
      res.json({
        status:false,
        error: "No Time Found !" 
      })
    }
  })
})


router.post("/save_vendor_quote_time", (req,res,next) => {
  const params = req.body;

  pplSettingsRef.child('vendor_quote_time').set({
    minutes: params.minutes
  }).then(()=>{
    res.json({
      status:true,
      message: "Time Updated !"
    })
  }).catch((err)=>{
    res.json({
      status:false,
      error: err
    })
  })
})



// Free Driver 
router.post('/free-driver',
// Get Request
(req,res,next) => {
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
// Check Bilty 
(req,res,next) => {
  const params = req.body;

  let bilties = params.request.bilty;
  let bilty_found = false;
  let driverMatched = false;

  bilties.forEach((bilty) => {
     if(bilty.biltyNo === params.biltyNo) {
      bilty_found = true;

      if(bilty.driver_phone === params.phone) {
        driverMatched = true;

        req.body.bilty = bilty;
      }
     } 
  })

  if(bilty_found) {
    if(driverMatched) {
      next();
    } else {
      res.json({
        status:false,
        error: 'Driver Mismatched'
      })
    }
    
  } else {
    res.json({
      status:false,
      error: 'Bilty Not FOund !'
    })
  }


},
// Free Driver 
(req,res,next) => {
  const params = req.body; 
} 
)



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