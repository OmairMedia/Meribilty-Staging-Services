/* eslint max-len: ["error", { "ignoreComments": true }] */

const express = require("express");
const generator = require("generate-password");
const config = require("../../config/private.json");
const moment = require("moment-timezone");
const moment2 = require("moment");
const { Storage } = require("@google-cloud/storage");
const storage = new Storage({
  keyFilename: "src/config/serviceAccount.json",
});
const {
  send_notification_to_single_user,
} = require("../../functions/notifications");

const _ = require("lodash");
const bucket = storage.bucket("meribilty-files");
const orderNo = require("order-no");
const { remove, update, isArray } = require("lodash");
const { Client } = require("@googlemaps/google-maps-services-js");
const twillio_client = require("twilio")(
  config.twilio.accountSid,
  config.twilio.authToken
);

const axios = require('axios');
const { body, validationResult } = require("express-validator");
const {
  notificationsRef,
  pplRequestRef,
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
  fcmTokenRef,
} = require("../../db/newRef");
const { userRef, vendorRef, walletRef } = require("../../db/ref");
const {
  verifyTokenFirebase,
  getCurrentDate,
  getCurrentTimestamp,
} = require("../../functions/slash");

const googleMapsClient = new Client({});
const router = express.Router();



const { ToWords } = require('to-words');


// ============== POST REQUESTS START HERE ==============

// API-1
// Get Estimated Price
// router.post(
//   "/test123", (req, res) => {
//     console.log('chala');
//     send_notification_to_single_user("logout", {
//       title: "fcm test",
//       body: `test 123`,}
//     )

// res.send("OK")
//   }
// )

router.post(
  "/estimated_price",
  body("material").isArray().withMessage("material must be an array"),
  body("desLat").isString().withMessage("desLat must be an string"),
  body("desLng").isString().withMessage("desLng must be an string"),
  body("desText").isString().withMessage("desText must be an string"),
  body("disText").isString().withMessage("disText must be an string"),
  body("durText").isString().withMessage("durText must be an string"),
  body("orgLat").isString().withMessage("orgLat must be an string"),
  body("orgLng").isString().withMessage("orgLng must be an string"),
  body("orgText").isString().withMessage("orgText must be an string"),
  body("emptyLat").isString().withMessage("emptyLat must be an string"),
  body("emptyLng").isString().withMessage("emptyLng must be an string"),
  body("emptyText").isString().withMessage("emptyText must be an string"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  // Get Loading List
  (req, res, next) => {
    const params = req.body;

    if (params.loading.length !== 0) {
      pplSettingsRef.child("loading_options").once("value", (snapshot) => {
        if (snapshot.val()) {
          const loading_options = snapshot.val();
          const convert = Object.entries(loading_options);

          const final = [];
          convert.forEach((x) => {
            final.push(x[1]);
          });
          req.body.loading_options_pricing = final;
          next();
        } else {
          res.json({
            status: false,
            error: "Loading Option Pricing Not Found !",
          });
        }
      });
    } else {
      req.body.loading_options_pricing = [];
      next();
    }
  },
  // Unloading List
  (req, res, next) => {
    const params = req.body;

    if (params.unloading.length !== 0) {
      pplSettingsRef.child("unloading_options").once("value", (snapshot) => {
        if (snapshot.val()) {
          const unloading_option = snapshot.val();
          const convert = Object.entries(unloading_option);

          const final = [];
          convert.forEach((x) => {
            final.push(x[1]);
          });
          req.body.unloading_options_pricing = final;
          // console.log(
          //   "req.body.unloading_options_pricing -> ",
          //   req.body.unloading_options_pricing
          // );
          next();
        }
      });
    } else {
      req.body.unloading_options_pricing = [];
      next();
    }
  },
  // Get Pricing Data
  (req, res, next) => {
    const params = req.body;

    if (params.vehicle_type) {
      // Get Vehicle Type
      pplSettingsRef
        .child("vehicle_types")
        .child(params.vehicle_type)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const pricing = snapshot.val();
            req.body.pricingData = pricing;
            // console.log("Pricing added ", req.body.pricingData);

            pplCommission.once("value", (snapshot) => {
              const commission = snapshot.val();
              if (commission) {
                req.body.CommissionPercent = commission.value;
                if (
                  params.cargo_value &&
                  params.cargo_value !== "0" &&
                  params.cargo_value !== 0
                ) {
                  pplSettingsRef
                    .child("insurance")
                    .once("value", (snapshot) => {
                      if (snapshot.val()) {
                        const insurance = snapshot.val();
                        req.body.insurance = insurance;
                        next();
                      }
                    });
                } else {
                  req.body.insurance = null;
                  next();
                }
              } else {
                res.json({
                  status: false,
                  message: "Commission Data Missing From DB",
                });
              }
            });
          } else {
            res.json({
              status: false,
              error: "Vehicle Type Not Found !",
            });
          }
        });
    } else {
      req.body.pricingData = null;
    }
  },
  // Check Promo Code
  (req, res, next) => {
    const params = req.body;
    if (params.promo) {
      pplSettingsRef.child("promocodes").once("value", (snapshot) => {
        if (snapshot.val()) {
          const promocodes = snapshot.val();
          const convert = Object.entries(promocodes);

          const final = [];
          convert.forEach((x) => {
            final.push(x[1]);
          });

          const findThePromo = final.filter(
            (promo) => promo.code == params.promo
          );

          console.log("findThePromo -> ", findThePromo);

          if (findThePromo.length !== 0) {
            // res.json({
            //   status: false,
            //   error: "Promocode is valid !",
            // });
            if (findThePromo[0].active) {
              req.body.discount = findThePromo[0].discount;
              console.log("discount -> ", req.body.discount);
              next();
            } else {
              res.json({
                status: false,
                error: `The Promocode ${params.promo} is not active any more !`,
              });
            }
          } else {
            res.json({
              status: false,
              error: "Promocode is invalid !",
            });
            // console.log("findThePromo -> ", findThePromo);
          }
        } else {
          // error
          res.json({
            status: false,
            error: "Promo Data Not Found",
          });
        }
      });
    } else {
      next();
    }
  },
  // Set Pricing - Working On It
  (req, res, next) => {
    // user
    // request
    // pricingData
    // CommissionPercent
    const params = req.body;

    if (params.pricingData !== null) {
      // Get Directions
      googleMapsClient
        .directions({
          params: {
            origin: [params.start_location.lat, params.start_location.lng],
            destination: [params.end_location.lat, params.end_location.lng],
            mode: "driving",
            key: "AIzaSyDDTYs0JX_8BEC62oRGKLZTJac3Xd2nx74",
          },
        })
        .then((Google) => {
          const DriverDistance = Google.data.routes[0].legs[0];
          // console.log("Driver Distance -> ", DriverDistance);

          // Calculate Arrival Price
          // Calculate Departure Price
          // Calculate Time Price

          const { distance } = DriverDistance;
          const { duration } = DriverDistance;
          const { start_address } = DriverDistance;
          const { end_address } = DriverDistance;
          //  distance in meter
          //  duration in seconds

          // Calculation Arrival Price
          // console.log("DriverDistance -> ", DriverDistance);
          console.log("distance.value  -> ", distance.text);
          console.log("duration.value  -> ", duration.text);
          console.log("start_address -> ", start_address);
          console.log("end_address  -> ", end_address);

          let arrivalPrice = 0;

          if (distance.value <= params.pricingData.minimumEmptyDistance) {
            arrivalPrice = params.pricingData.minimumEmptyPrice;
          } else {
            const inKM = distance.value / 1000;
            arrivalPrice = Math.ceil(
              inKM * params.pricingData.minimumEmptyPrice
            );
          }

          arrivalPrice = parseInt(arrivalPrice);

          let departurePrice = 0;
          if (distance.value <= params.pricingData.minimumLoadedDistance) {
            departurePrice = params.pricingData.minimumLoadedPrice;
          } else {
            const inKM = distance.value / 1000;
            departurePrice = Math.ceil(
              inKM * params.pricingData.minimumLoadedPrice
            );
          }

          departurePrice = parseInt(departurePrice);

          const timePrice = Math.ceil(
            params.pricingData.minimumPricePerMinute * (duration.value / 60)
          );

          // =====================  Calculating Loading And Unloading Prices Start ============================
          const loadingFilter = params.loading || [];
          const unloadingFilter = params.unloading || [];

          const pricingForLoadingOption = params.loading_options_pricing;
          const pricingForUnloadingOption = params.unloading_options_pricing;
          let loading_price = 0;
          let unloading_price = 0;

          // Loop Loading Option
          if (loadingFilter.length !== 0) {
            if (loadingFilter.length > 1) {
              loadingFilter.forEach((option) => {
                const getPricingForALoadingOption =
                  pricingForLoadingOption.filter((x) => x.name == option.name);
                const price =
                  getPricingForALoadingOption[0].price * option.quantity;
                loading_price += price;
                // console.log(`Price For ${option.name} -> `, price);
              });
            } else if ((loadingFilter.length = 1)) {
              const getPricingForALoadingOption =
                pricingForLoadingOption.filter(
                  (x) => x.name == loadingFilter[0].name
                );
              const price =
                getPricingForALoadingOption[0].price *
                loadingFilter[0].quantity;
              loading_price += price;
              // console.log(`Price For ${loadingFilter[0]} -> `, price);
            }
          }

          // Loop Unloading Option
          if (unloadingFilter.length !== 0) {
            if (unloadingFilter.length > 1) {
              unloadingFilter.forEach((option) => {
                const getPricingForAUnloadingOption =
                  pricingForUnloadingOption.filter(
                    (x) => x.name == option.name
                  );
                const price =
                  getPricingForAUnloadingOption[0].price * option.quantity;
                unloading_price += price;
                // console.log(`Price For ${option.name} -> `, price);
              });
            } else if ((unloadingFilter.length = 1)) {
              const getPricingForAUnloadingOption =
                pricingForUnloadingOption.filter(
                  (x) => x.name == unloadingFilter[0].name
                );
              const price =
                getPricingForAUnloadingOption[0].price *
                unloadingFilter[0].quantity;
              unloading_price += price;
              // console.log(`Price For ${unloadingFilter[0].name} -> `, price);
            }
          }
          // =====================  Calculating Loading And Unloading Prices End ============================

          // =====================  Calculating Insurance Start ============================
          let insuranceCost = 0;
          if (params.insurance !== null) {
            const insurancePercent = parseInt(params.insurance.value);
            console.log("insurancePercent -> ", insurancePercent);
            const insuranceAmount = Math.ceil(
              (parseInt(params.cargo_value) / 100) * insurancePercent
            );
            console.log("insuranceAmount -> ", insuranceAmount);
            insuranceCost = insuranceAmount;
          }

          console.log("insuranceCost -> ", insuranceCost);

          // =====================  Calculating Insurance  End ============================

          // =====================  Calculating All Prices Start ============================

          const totalServices = Math.ceil(loading_price + unloading_price);

          let floorPrice = Math.ceil(
            params.pricingData.pricePerFloor * params.floors
          );

          floorPrice = parseInt(floorPrice);

          console.log(
            `departurePrice -> ${departurePrice} + arrivalPrice -> ${arrivalPrice}`
          );
          console.log(`= ${departurePrice + arrivalPrice}`);
          const driverPrice = Math.ceil(departurePrice + arrivalPrice);
          const othersPrice = Math.ceil(totalServices + floorPrice);
          const totalPrice = Math.ceil(othersPrice + driverPrice + timePrice);
          const commissionPrice = Math.ceil(
            totalPrice * (params.CommissionPercent / 100)
          );

          // =====================  Calculating All Prices End ============================

          // =====================  Calculating Discount Prices Start ============================

          const discountPercent = params.discount || 0;

          // =====================  Calculating Discount Prices End ============================

          if (discountPercent !== 0) {
            const discountAmount = (totalPrice / 100) * discountPercent;
            var netTotalPrice = totalPrice - discountAmount;
            netTotalPrice += commissionPrice;
          } else {
            var netTotalPrice = totalPrice;
            netTotalPrice += commissionPrice;
          }

          netTotalPrice += insuranceCost;

          const bill = {
            arrivalPrice: parseInt(arrivalPrice),
            loadingServices: loading_price,
            unloadingServices: unloading_price,
            commissionPrice,
            departurePrice: parseInt(departurePrice),
            discountPercent: parseInt(discountPercent),
            insuranceCost,
            driverPrice,
            floorPrice,
            netTotalPrice,
            timePrice,
            totalPrice,
          };

          console.log("bill -> ", bill);
          req.body.bill = bill;
          next();
        })
        .catch((error) => {
          console.log("Google Map Client Error -> ", error);
          res.json({
            status: false,
            error,
          });
        });
    }
  },
  // Response Done
  (req, res) => {
    const params = req.body;

    if (params.bill) {
      // Estimate High And Low
      const low = params.bill.netTotalPrice;
      const calculate40percent = Math.ceil((low / 1000) * 40);
      console.log("calculate10percent -> ", calculate40percent);
      const high = Math.ceil(low + calculate40percent);

      res.json({
        status: true,
        high,
        low,
      });
    } else {
      res.json({
        status: false,
        error: "Bill data missing",
      });
    }
  }
);

// ===================  Create A PPL Request Services (Start) ======================

// API-2
// /create_request -> (Transit / Upcountry)
router.post(
  "/create_request",
  body("type").isString().withMessage("type must be an string"),
  body("date").isISO8601().isAfter().withMessage("date must be valid"),
  body("desLat").isString().withMessage("desLat must be an string"),
  body("desLng").isString().withMessage("desLng must be an string"),
  body("disText").isString().withMessage("disText must be an string"),
  body("durText").isString().withMessage("durText must be an string"),
  body("orgLat").isString().withMessage("orgLat must be an string"),
  body("orgLng").isString().withMessage("orgLng must be an string"),
  body("originAddress")
    .isString()
    .withMessage("originAddress must be an string"),
  body("destinationAddress")
    .isString()
    .withMessage("originAddress must be an string"),
  body("containerReturnAddress")
    .isString()
    .withMessage("originAddress must be an string"),
  // Validator
  (req, res, next) => {
    const params = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      if (params.type == "transit" || params.type == "upcountry") {
        next();
      } else {
        res.json({
          status: false,
          error: "Invalid Request Type ! Type must be - transit / upcountry",
        });
      }
    }
  },
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        userRef
          .child("users")
          .child(params.user.user_id)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              const user = snapshot.val();
              if(user.blocked === true || user.blocked === 'true') {
                res.json({
                  status:false,
                  error: 'Blocked Users Can No Longer Perform Any Actions !'
                })
              } else {
                req.body.user = user;
                next();
              }
              
            } else {
              userRef
                .child("pro")
                .child(params.user.user_id)
                .once("value", (snapshot) => {
                  if (snapshot.val()) {
                    const user = snapshot.val();
                    if (user.type === "user") {
                      req.body.user = user;
                      console.log("pro user -> user ");
                      next();
                    } else {
                      res.json({
                        status: false,
                        error:
                          "User Not Found in Database - level get pro user!",
                      });
                    }
                  } else {
                    res.json({
                      status: false,
                      error: "User Not Found in Database - level get user!",
                    });
                  }
                });
            }
          });
        break;

      case "pro":
        userRef
          .child("pro")
          .child(params.user.user_id)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              const user = snapshot.val();
              if(user.blocked === true || user.blocked === 'true') {
                res.json({
                  status:false,
                  error: 'Blocked Users Can No Longer Perform Any Actions !'
                })
              } else {
              req.body.user = user;
              next();
              }
            } else {
              res.json({
                status: false,
                error: "User Not Found in Database !",
              });
            }
          });
        break;

      case "driver":
        res.json({
          status: false,
          error: "Driver cannot create request !",
        });
        break;

      case "vendor":
        res.json({
          status: false,
          error: "Vendor cannot create request !",
        });
        break;
      default:
        res.json({
          status: false,
          error: "Unknown Type !",
        });
        break;
    }
  },
  // Check Number Of Requests
  (req, res, next) => {
    pplRequestRef.limitToLast(1).once("value", (snapshot) => {
      if (snapshot.val()) {
        req.body.totalRequests = parseInt(Object.keys(snapshot.val())[0]);
        console.log("num of req checked !");
        next();
      } else {
        req.body.totalRequests = 0;
        next();
      }
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
    const no =
      params.totalRequests + 1 < 10
        ? `000${params.totalRequests + 1}`
        : params.totalRequests + 1 < 100
        ? `00${params.totalRequests + 1}`
        : params.totalRequests + 1 < 1000
        ? `0${params.totalRequests + 1}`
        : params.totalRequests + 1;
    req.body.orderNo = no;

    if (params.type) {
      pplRequestRef
        .child(no)
        .set({
          material: null,
          orderNo: no,
          ...params,
          user: null,
          user_id: params.user.id,
          user_phone: params.user.phone,
          user_type: params.user.type,
          username: params.user.fullname,
          selections: params.selections,
          status: "pending",
          request_type: params.type,
          token: null,
          createdAt: getCurrentDate(),
          createdAt_timestamp: getCurrentTimestamp(),
        })
        .then(() => {
          // Inform All Active Drivers
          // console.log("PPL Transit Cargo Request Created !");
          console.log("request created");
          next();
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    }
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;
    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();
        req.body.request = request;
        console.log("got request data ");
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
    const materials = selections.materials;
    //console.log('materials -> ',vehicle);

    if (params.type) {
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
                numCount++;
                let BiltyNo = `BT${params.request.orderNo}${alphabets[numCount]}${numCount}`;
                numCount--;
                let bilty = {
                  ...vehicle,
                  price: null,
                  type: "vehicle",
                  status: "pending",
                  biltyNo: BiltyNo,
                  material: materials[numCount],
                };
                numCount++;
                allBilties.push(bilty);
                if (i == vehicle.quantity) {
                  break;
                }
              }
            }
          });

          loading_options.forEach((vehicle) => {
            for (let i = 0; i < vehicle.quantity; i++) {
              let takeid = pplRequestRef
                .child(params.request.orderNo)
                .child("bilty")
                .push();

              let id = takeid.key;

              let bilty = {
                id: id,
                ...vehicle,
                price: null,
                quantity: null,
                type: "loading",
              };
              allLoadingOptions.push(bilty);
            }
          });

          unloading_options.forEach((vehicle) => {
            for (let i = 0; i < vehicle.quantity; i++) {
              let takeid = pplRequestRef
                .child(params.request.orderNo)
                .child("bilty")
                .push();

              let id = takeid.key;

              let bilty = {
                id: id,
                ...vehicle,
                quantity: null,
                price: null,
                type: "unloading",
              };
              allUnloadingOptions.push(bilty);
            }
          });

          if (
            allLoadingOptions.length >= 1 ||
            allUnloadingOptions.length >= 1
          ) {
            numCount++;

            let BiltyNo = `BT${params.request.orderNo}${alphabets[numCount]}${numCount}`;

            let loadingUnloadingBilty = {
              biltyNo: BiltyNo,
              loading_options: allLoadingOptions,
              unloading_options: allUnloadingOptions,
              type: "loading/unloading",
            };

            allBilties.push(loadingUnloadingBilty);
          }

          pplRequestRef
            .child(params.request.orderNo)
            .child("bilty")
            .set(allBilties)
            .catch((err) => console.log(err));

          // console.log('allBilties -> ', allBilties);
          // console.log('order bilty done ');
          next();
        } else {
          res.json({
            status: false,
            error: "User Didnt Have Vehicle Selection !",
          });
        }
      } else {
        res.json({
          status: false,
          error: "Vehicle Loop Issue !",
        });
      }
    }
  },
  // Get Estimated Rates If Any
  (req, res, next) => {
    const params = req.body;

    let estimateRef = pplSettingsRef.child("estimation");
    console.log("Get  Estimate  done ");
    // next();

    estimateRef
      .orderByChild("origin")
      .equalTo(params.originAddress)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const places = [];

          snapshot.forEach((snap) => {
            places.push(snap.val());
          });

          if (places) {
            if (places.length > 0) {
              res.json({
                status: true,
                message: `PPL ${params.type} Request Has Been Placed !`,
                request: params.request,
                estimate: true,
                high: places[0].high,
                low: places[0].low,
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
  // Done
  (req, res) => {
    const params = req.body;
    console.log("All  done ");
    res.json({
      status: true,
      message: `PPL ${params.type} Request Has Been Placed !`,
      orderNo: params.orderNo,
      request: params.request,
      estimate: false,
    });
  }
);

// ===================  Create A PPL Request Services (Ends) ======================

// ===================  Qoute Services (Start) ======================

// API-3
// /vendor_send_qoute -> Vendor Will send a qoute for a order
router.post(
  "/vendor_send_qoute",
  body("amount").isString().withMessage("amount must be string"),
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
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make bilty request !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make bilty request !`,
        });
        break;
    }
  },
  // Check Vendor
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("vendors")
      .child(params.vendor.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          if(vendor.blocked === true || vendor.blocked === 'true') {
            res.json({
              status:false,
              error: 'Blocked Vendors Can No Longer Perform Any Actions !'
            })
          } else {
            req.body.vendor = vendor;
            console.log("vendor checked !");
            next();
          }
        } else {
          res.json({
            status: false,
            error: "Vendor did not exists !",
          });
        }
      });
  },
  // Check Request
  (req, res, next) => {
    const params = req.body;
    if (params.orderNo) {
      pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
        if (snapshot.val()) {
          const request = snapshot.val();
          if (request.request_type) {
            if (request.status !== "cancelled") {
              req.body.request = request;
              next();
            } else {
              res.json({
                status: false,
                error: `This Order Is Cancelled By ${request.cancel_by}`,
              });
            }
          }
        } else {
          res.json({
            status: false,
            error: "Request not found !",
          });
        }
      });
    }
  },
  // Check Quotes On This Order
  (req,res,next) => {
    const params = req.body;

    pplBiddingsRef.child(params.request.request_type).child('qoutes').orderByChild("orderNo").equalTo(params.request.orderNo).once('value', (snapshot) => {
      if(snapshot.val()) {
        let count = snapshot.numChildren();
        if(count > 0) {
          req.body.qouteFound = true;
          next()
        } else {
          req.body.qouteFound = false;
          next()
        }
      } else {
        req.body.qouteFound = false;
        next();
      }
    })
  },
  // Get Qoute Time
  (req,res,next) => {
    const params = req.body;

    pplSettingsRef.child('vendor_qoute_time').child(0).once('value', (snapshot) => {
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
  // Check Timeout
  (req, res, next) => {
    const params = req.body;

    let now = getCurrentTimestamp();
    let requestCreationTime = params.request.createdAt_timestamp;

    let datediff = difference2Parts(requestCreationTime - now);
    console.log("datediff.minutes -> ", datediff.minutes);
    if (datediff.minutes > params.time.minutes) {
      res.json({
        status: false,
        error: "Too late to qoute !",
      });
    } else {
      next();
    }
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
            qoutes.push(x[1]);
          });

          const filterByPhone = qoutes.filter((q) => {
            return q.phone === params.vendor.phone;
          });

          console.log("filterByPhone -> ", filterByPhone);

          if (filterByPhone) {
            if (filterByPhone.length !== 0) {
              res.json({
                status: false,
                error: "Vendor Already Sent Qoute On This Order !",
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
  // Check ID
  (req, res, next) => {
    pplBiddingsRef
      .child(req.body.request.request_type)
      .child("qoutes")
      .limitToLast(1)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          req.body.id = parseInt(Object.entries(snapshot.val())[0][1].id) + 1;
          next();
        } else {
          req.body.id = 1;
          next();
        }
      });
  },
  // Create A Qoute Bid
  async (req, res,next) => {
    const params = req.body;

    const newVendorQoute = await pplBiddingsRef
      .child(params.request.request_type)
      .child("qoutes")
      .push();
    const qouteKey = newVendorQoute.key;

    console.log("qouteKey -> ", qouteKey);
    console.log("params -> ", params);

    if (params.request.request_type) {
      newVendorQoute
        .set({
          nature: "Qoute",
          phone: params.vendor.phone || null,
          name: params.vendor.company_name,
          vendor_name: params.vendor.company_name,
          name: params.vendor.company_name || null,
          company_name: params.vendor.company_name || null,
          company_phone: params.vendor.company_phone || null,
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
          rating: params.vendor.rating.avg,
          request_type: params.request.request_type,
          type: params.request.request_type,
          orrderCreationTime: params.request.createdAt_timestamp
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
    }
  },
  // Send Notifications 
  (req,res) => {
    const params = req.body;

     //  Vendor
     fcmTokenRef
     .child("vendors")
     .child(params.vendor.phone)
     .once("value", (snapshot) => {
       if (snapshot.val()) {
         send_notification_to_single_user(
           snapshot.val().fcm_token.token,
           {
             title: "Quote Sent",
             body: `Thank you for your quote. This order will conclude in ${params.time.minutes} mins. We wish you good luck.`,
             
           }
         );

         let newNotification = notificationsRef.child('vendors').child(params.vendor.phone).push();
         let AdminNotification = notificationsRef.child('admin').push();
         newNotification.set({
           id: newNotification.key,
           title: "Quote Sent",
           body: `Thank you for your quote. This order will conclude in ${params.time.minutes} mins. We wish you good luck.`,
           created: getCurrentTimestamp(),
           read: false
         }).catch(err => console.log('err -> ',err))

         AdminNotification.set({
           id: AdminNotification.key,
           title: `Vendor(${params.vendor.company_name}) Sent A Qoute`,
           body: `Vendor(${params.vendor.company_name}) Has Qouted On OrderNo#${params.orderNo} for amount = ${params.amount}`,
           created: getCurrentTimestamp(),
           read: false
         }).catch(err => console.log('err -> ',err))
       }
     });

 // User
   fcmTokenRef
     .child("users")
     .child(params.request.user_phone)
     .once("value", (snapshot) => {
       if (snapshot.val()) {
         
          if(params.qouteFound) {     
            send_notification_to_single_user(
              snapshot.val().fcm_token.token,
              {
                title: "Qoute Received",
                body: `Congratulations, we have got a better offer for you on OrderNo#${params.amount} !`,
                route: 'tncpage',
                orderNo: params.orderNo,
                createdAt: params.request.createdAt,
                createdAt_timestamp: params.request.createdAt_timestamp
              }
            );
   
            let newNotification = notificationsRef.child('users').child(params.request.user_phone).push();
            let AdminNotification = notificationsRef.child('admin').push();
   
            newNotification.set({
              id: newNotification.key,
              title: "Qoute Received",
              body: `Congratulations, you have got your first offer on OrderNo#${params.amount}!`,
              created: getCurrentTimestamp(),
              read: false
            }).catch(err => console.log('err -> ',err))
          } else {
            send_notification_to_single_user(
              snapshot.val().fcm_token.token,
              {
                title: "Qoute Received",
                body: `Congratulations, you have got your first offer on OrderNo#${params.amount}!`,
              }
            );
   
            let newNotification = notificationsRef.child('users').child(params.request.user_phone).push();
            let AdminNotification = notificationsRef.child('admin').push();
   
            newNotification.set({
              id: newNotification.key,
              title: "Qoute Received",
              body: `Congratulations, you have got your first offer on OrderNo#${params.orderNo}!`,
              created: getCurrentTimestamp(),
              read: false
            }).catch(err => console.log('err -> ',err))
   
          }


          send_notification_to_single_user(
            snapshot.val().fcm_token.token,
            {
              title: "Qoute Received",
              body: `Please refresh to see if more better qoutes have been received on the order.`,
              route: 'tncpage',
              orderNo: params.orderNo,
              createdAt: params.request.createdAt,
              createdAt_timestamp: params.request.createdAt_timestamp
            }
          );
 
          newNotification.set({
            id: newNotification.key,
            title: "Qoute Received",
            body: `Please refresh to see if more better qoutes have been received on the order.`,
            created: getCurrentTimestamp(),
            read: false
          }).catch(err => console.log('err -> ',err))
 
 
          send_notification_to_single_user(
            snapshot.val().fcm_token.token,
            {
              title: `OrderNo#${params.orderNo} Active For ${params.time.minutes} mins`,
              body: `This offer or request will remain alive or active for ${params.time.minutes} mins only.`,
              route: 'tncpage',
              orderNo: params.orderNo,
              createdAt: params.request.createdAt,
              createdAt_timestamp: params.request.createdAt_timestamp
            }
          );
 
          newNotification.set({
            id: newNotification.key,
            title: `OrderNo#${params.orderNo} Active For ${params.time.minutes} mins`,
            body: `This offer or request will remain alive or active for ${params.time.minutes} mins only.`,
            created: getCurrentTimestamp(),
            read: false
          }).catch(err => console.log('err -> ',err))
       }
     });
    
     
     res.json({
      status: true,
      message: "Qoute Submitted!",
    });
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

// API-4
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
          error: `${params.user.user_type} cannot get best qoutes !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot get best qoutes!`,
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
        if (request.status !== "cancelled") {
          req.body.request = request;
          next();
        } else {
          res.json({
            status: false,
            error: `This Order Is Cancelled By ${request.cancel_by}`,
          });
        }
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

    if (params.request.request_type) {
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
              console.log("Empty -> ", pendingQoutes);
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
                    data: orderedQoutes[0],
                  });
                } else {
                  res.json({
                    status: true,
                    data: [],
                    message: "No Vendor Qouted On This Order !",
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
    }
  },
  // Check SubOrders
  (req, res, next) => {
    const params = req.body;

    const suborders = params.request.subOrders;

    const getAllSubOrders = suborders.map((x) => {
      return x.subOrderNo;
    });

    let best_qoutes_on_suborders = [];

    console.log("params.pendingQoutes->");

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
        best_qoutes_on_suborders.push(bestprice);
      }
    });

    res.json({
      status: true,
      data: best_qoutes_on_suborders,
    });
  }
);

// API-5
// /request_qoute_again
router.post(
  "/request_qoute_again",
  body("subOrderNo").isString().withMessage("subOrderNo must be string"),
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
          error: `${params.user.user_type} cannot get best qoutes !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot get best qoutes!`,
        });
        break;
    }
  }
);

// API-6
// /user_accept_vendor_qoute -> (User accepts the Vendor Qoute & Its Amount)
router.post(
  "/user_accept_vendor_qoute",
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
  // Check User Type (User Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        req.body.user = params.user;
        next();
        break;

      case "pro":
        req.body.user = params.user;
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
  // Check User
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();

          if(user.blocked === true || user.blocked === 'true') {
            res.json({
              status:false,
              error: 'Blocked Users Can No Longer Perform Any Actions !'
            })
          } else {
            req.body.user = user;
            next();
          }
         
        } else {
          userRef
            .child("pro")
            .child(params.user.user_id)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                if(user.blocked === true || user.blocked === 'true') {
                  res.json({
                    status:false,
                    error: 'Blocked Users Can No Longer Perform Any Actions !'
                  })
                } else {
                  req.body.user = user;
                  next();
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
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;

    if (params.orderNo) {
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
    } else {
      if (params.subOrderNo) {
        let getLength = params.subOrderNo.length;
        const getOrderNo = params.subOrderNo.slice(2, getLength - 1);

        pplRequestRef
          .child(getOrderNo)
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
      } else {
        res.json({
          status: false,
          error:
            "Please Provide orderNo for transit / subOrderNo for upcountry !",
        });
      }
    }
  },
  // Check Qoute
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type) {
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
              return q.phone === params.vendor_phone;
            });

            console.log("filterByPhone -> ", filterByPhone);

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
    }
  },
  // Get Vendor
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("vendors")
      .child(params.qoute.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          next();
        } else {
          res.json({
            status: false,
            error: "Vendor Not Found !",
          });
        }
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
        status: "accepted",
        accepted_on: getCurrentDate(),
        accepted_on_timestamp: getCurrentTimestamp(),
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

    if (params.request.request_type) {
      pplRequestRef
        .child(params.orderNo)
        .update({
          status: "qoute_accepted",
          qoute_accepted_on: getCurrentDate(),
          qoute_accepted_on_timestamp: getCurrentTimestamp(),
          qoute: params.qoute,
          amount: params.qoute.qoute_amount,
          vendor_phone: params.qoute.phone,
          vendor_name: params.vendor.company_name,
          name: params.vendor.company_name || null,
          company_name: params.vendor.company_name || null,
          company_phone: params.vendor.company_phone || null,
          company_address: params.vendor.company_address || null,
          NTN_number: params.vendor.NTN_number || null,
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
    } else {
      res.json({
        status: false,
        error: "Unknown Type !",
      });
    }
  },
  // Reject All Other Qoutes
  (req, res) => {
    const params = req.body;

    pplBiddingsRef
      .child(params.request.request_type)
      .child("qoutes")
      .orderByChild("orderNo")
      .equalTo(params.orderNo)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const qoutes = [];
          snapshot.forEach((snap) => {
            qoutes.push(snap.val());
          });

          const otherQoutes = qoutes.filter((q) => {
            return q.qouteId !== params.qoute.qouteId;
          });

          console.log("otherQoutes -> ", otherQoutes);

          if (otherQoutes) {
            if (otherQoutes.length !== 0) {
              otherQoutes.forEach((x) => {
                pplBiddingsRef
                  .child(params.request.request_type)
                  .child("qoutes")
                  .child(x.qouteId)
                  .update({
                    status: "rejected",
                  })
                  .catch((err) => console.log(err));
              });
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

// API-7
// /user_reject_vendor_qoute -> user rejects the best vendor qoute - user => 1x
router.post(
  "/user_reject_vendor_qoute",
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
  // Check User Type (User Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        req.body.user = params.user;
        console.log("step-1");
        next();
        break;

      case "pro":
        req.body.user = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot reject qoute  !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot reject qoute !`,
        });
        break;
    }
  },
  // Retrieve User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        userRef
          .child("users")
          .child(params.user.user_id)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              if(snapshot.val().blocked === true || snapshot.val().blocked === 'true') {
                res.json({
                  status:false,
                  error: 'Blocked Users Can No Longer Perform Any Actions !'
                })
              } else {
                req.body.user = snapshot.val();
                console.log("user type user ");
                next();
              }
             
            } else {
              userRef
                .child("pro")
                .child(params.user.user_id)
                .once("value", (snapshot) => {
                  if (snapshot.val()) {
                    if(snapshot.val().blocked === true || snapshot.val().blocked === 'true') {
                      res.json({
                        status:false,
                        error: 'Blocked Users Can No Longer Perform Any Actions !'
                      })
                    } else {
                      req.body.user = snapshot.val();
                      console.log("pro type user ");
                      next();
                    }
                  } else {
                    res.json({
                      status: false,
                      error: "User Not Found in Database !",
                    });
                  }
                });
            }
          });
        break;

      case "pro":
        userRef
          .child("pro")
          .child(params.user.user_id)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              if(snapshot.val().blocked === true || snapshot.val().blocked === 'true') {
                res.json({
                  status:false,
                  error: 'Blocked Users Can No Longer Perform Any Actions !'
                })
              } else {
              req.body.user = snapshot.val();
              next();
              }
            } else {
              res.json({
                status: false,
                error: "User Not Found in Database !",
              });
            }
          });
        break;

      default:
        res.json({
          status: false,
          error: `User Not Found in Database ! ${params.user.type}`,
        });
        break;
    }
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;

    console.log("params.orderNo -> ", params.orderNo);
    pplRequestRef
      .child(params.orderNo)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const request = snapshot.val();

          if (request.request_type == "transit") {
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
              case "cancelled":
                res.json({
                  status: false,
                  error: `This Order Is Cancelled By ${request.cancel_by}`,
                });
                break;

              default:
                res.json({
                  status: false,
                  error: "Unknown Request Status !",
                });
                break;
            }
          } else {
            req.body.request = request;
            next();
          }
        } else {
          res.json({
            status: false,
            error: "Request Not Found (Transit)!",
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
            return q.phone === params.vendor_phone;
          });

          console.log("filterByPhone -> ", filterByPhone);

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
        rejected_on_timestamp: getCurrentTimestamp(),
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

    if (params.request.request_type) {
      pplRequestRef
        .child(params.orderNo)
        .update({
          status: "qoute_rejected",
          qoute_rejected_on: getCurrentDate(),
          qoute_rejected_on_timestamp: getCurrentTimestamp(),
          qoute: params.qoute,
          amount: params.qoute.qoute_amount,
          vendor_phone: params.qoute.phone,
          vendor_name: params.qoute.company_name,
          name: params.qoute.company_name || null,
          company_name: params.qoute.company_name || null,
          company_phone: params.qoute.company_phone || null,
          company_address: params.qoute.company_address || null,
          NTN_number: params.qoute.NTN_number || null,
        })
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
    } else {
      res.json({
        status: false,
        error: "Unknown Type",
      });
    }
  },
  // Reject All Other Qoutes
  (req, res) => {
    const params = req.body;

    pplBiddingsRef
      .child(params.request.request_type)
      .child("qoutes")
      .orderByChild("orderNo")
      .equalTo(params.orderNo)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const qoutes = [];
          snapshot.forEach((snap) => {
            qoutes.push(snap.val());
          });

          const otherQoutes = qoutes.filter((q) => {
            return q.qouteId !== params.qoute.qouteId;
          });

          console.log("otherQoutes -> ", otherQoutes);

          if (otherQoutes) {
            if (otherQoutes.length !== 0) {
              otherQoutes.forEach((x) => {
                pplBiddingsRef
                  .child(params.request.request_type)
                  .child("qoutes")
                  .child(x.qouteId)
                  .update({
                    status: "rejected",
                  })
                  .catch((err) => console.log(err));
              });
              res.json({
                status: true,
                message: `User rejected the qoute for ${req.body.qoute.qoute_amount}`,
              });
            } else {
              res.json({
                status: true,
                message: `User rejected the qoute for ${req.body.qoute.qoute_amount}`,
              });
            }
          }
        } else {
          res.json({
            status: true,
            message: `User rejected the qoute for ${req.body.qoute.qoute_amount}`,
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

// API-8
// /user_counters_vendor_qoute -> user counters the vendor qoute - user => 1x (first time)
router.post(
  "/user_counters_vendor_qoute",
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
  // Check User Type (User Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        req.body.user = params.user;
        next();
        break;

      case "pro":
        req.body.user = params.user;
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
  // Retrieve User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        userRef
          .child("users")
          .child(params.user.user_id)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              if(snapshot.val().blocked === true || snapshot.val().blocked === 'true') {
                res.json({
                  status:false,
                  error: 'Blocked Users Can No Longer Perform Any Actions !'
                })
              } else {
              req.body.user = snapshot.val();
              next();
              }
            } else {
              userRef
                .child("pro")
                .child(params.user.user_id)
                .once("value", (snapshot) => {
                  if (snapshot.val()) {
                    if(snapshot.val().blocked === true || snapshot.val().blocked === 'true') {
                      res.json({
                        status:false,
                        error: 'Blocked Users Can No Longer Perform Any Actions !'
                      })
                    } else {
                    req.body.user = snapshot.val();
                    next();
                    }
                  } else {
                    res.json({
                      status: false,
                      error: "User Not Found in Database !",
                    });
                  }
                });
            }
          });
        break;

      case "pro":
        userRef
          .child("pro")
          .child(params.user.user_id)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              if(snapshot.val().blocked === true || snapshot.val().blocked === 'true') {
                res.json({
                  status:false,
                  error: 'Blocked Users Can No Longer Perform Any Actions !'
                })
              } else {
                req.body.user = snapshot.val();
                next();
              } 
            } else {
              res.json({
                status: false,
                error: "User Not Found in Database !",
              });
            }
          });
        break;

      default:
        res.json({
          status: false,
          error: "User Not Found in Database !",
        });
        break;
    }
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      const request = snapshot.val();

      if (request) {
        req.body.request = request;

        //if (request.request_type == 'transit') {
        if (request.request_type) {
          if (request.status !== "cancelled") {
            req.body.request = request;
            next();
          } else {
            res.json({
              status: false,
              error: `This Order Is Cancelled By ${request.cancel_by}`,
            });
          }
        } else {
          req.body.request = request;
          next();
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

    if (params.request.request_type) {
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
    }
  },
  // Check Vendor Qoute
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type) {
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
              return q.phone === params.vendor_phone;
            });

            console.log("filterByPhone -> ", filterByPhone);

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
    }
  },
  // Check ID
  (req, res, next) => {
    pplBiddingsRef
      .child(req.body.request.request_type)
      .child("user_counter")
      .limitToLast(1)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          req.body.id = parseInt(Object.entries(snapshot.val())[0][1].id) + 1;
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

    if (params.request.request_type) {
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
          orrderCreationTime: params.request.createdAt_timestamp
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
    }
  },
  // Update Vendor Qoute
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
      .child(params.request.request_type)
      .child("qoutes")
      .child(params.qoute.qouteId)
      .update({
        status: "countered",
        counterId: params.counterId,
        countered_at: getCurrentDate(),
        countered_at_timestamp: getCurrentTimestamp(),
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
  // Reject All Other Qoutes
  (req, res) => {
    const params = req.body;

    pplBiddingsRef
      .child(params.request.request_type)
      .child("qoutes")
      .orderByChild("orderNo")
      .equalTo(params.orderNo)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const qoutes = [];
          snapshot.forEach((snap) => {
            qoutes.push(snap.val());
          });

          const otherQoutes = qoutes.filter((q) => {
            return q.qouteId !== params.qoute.qouteId;
          });

          console.log("otherQoutes -> ", otherQoutes);

          if (otherQoutes) {
            if (otherQoutes.length !== 0) {
              otherQoutes.forEach((x) => {
                pplBiddingsRef
                  .child(params.request.request_type)
                  .child("qoutes")
                  .child(x.qouteId)
                  .update({
                    status: "rejected",
                  })
                  .catch((err) => console.log(err));
              });

              // send_notification
              fcmTokenRef
                .child("vendors")
                .child(params.vendor_phone)
                .once("value")
                .then((snapshot) => {
                  send_notification_to_single_user(
                    snapshot.val().fcm_token.token,
                    {
                      title: "Counter Offer: Received from vendor",
                      body: `Dear ${params.qoute.company_name}, refering ${params.orderNo} Counter offer has been received.`,
                      routes: "MyOrder",
                    }
                  );

                let newNotification = notificationsRef.child('vendors').child(params.vendor_phone).push();
                let AdminNotification = notificationsRef.child('admin').push();
                newNotification.set({
                  id: newNotification.key,
                  title: "Counter Offer: Received from vendor",
                  body: `Dear ${params.qoute.company_name}, refering ${params.qoute.orderNo} Counter offer has been received.`,
                  created: getCurrentTimestamp(),
                  read: false
                }).catch(err => console.log('err -> ',err))

                AdminNotification.set({
                  id: AdminNotification.key,
                  title: `Vendor(${params.qoute.company_name}) Countered An Offer`,
                  body: `Vendor(${params.qoute.company_name}) Has Countered The Offer On OrderNo#${params.qoute.orderNo} for amount = ${params.amount}`,
                  created: getCurrentTimestamp(),
                  read: false
                }).catch(err => console.log('err -> ',err))
                })
                .catch((e) => console.log("catch: ", e));
              res.json({
                status: true,
                message: "User Countered the Offer Successfully",
              });
            } else {
              res.json({
                status: true,
                message: "User Countered the Offer Successfully",
              });
            }
          }
        } else {
          res.json({
            status: true,
            message: "User Countered the Offer Successfully",
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

// API-9
// vendor_reject_user_counter_offer -> Vendor Will reject first counter offer by user
router.post(
  "/vendor_reject_counter_offer",
  body("user_phone")
    .isMobilePhone()
    .withMessage("user_phone must be a valid number"),
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
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot reject counter offers !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot reject counter offers !`,
        });
        break;
    }
  },
  // Get Vendor
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("vendors")
      .child(params.vendor.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          if(vendor.blocked === true || vendor.blocked === 'true') {
            res.json({
              status:false,
              error: 'Blocked Vendors Can No Longer Perform Any Actions !'
            })
          } else {
            req.body.vendor = vendor;
            next();
          }
         
        } else {
          res.json({
            status: false,
            error: "Vendor Not Found",
          });
        }
      });
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
            (qoute) => qoute.vendor_phone === params.vendor.user_id
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
              error: "Counter Offer Does Not Contain Your Phone Number",
            });
          }
        } else {
          res.json({
            status: false,
            error: "User Counter Offer did not exists !",
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
        rejected_on_timestamp: getCurrentTimestamp(),
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
        user_counter_rejected_on_timestamp: getCurrentTimestamp(),
        user_counter: params.user_counter,
        amount: params.user_counter.amount,
        vendor_phone: params.vendor.user_id,
        vendor_name: params.user_counter.company_name,
        name: params.user_counter.company_name || null,
        company_name: params.user_counter.company_name || null,
        company_phone: params.user_counter.company_phone || null,
        company_address: params.user_counter.company_address || null,
        NTN_number: params.user_counter.NTN_number || null,
      })
      .then(() => {
        res.json({
          status: true,
          message: `Vendor rejected user counter offer for ${params.user_counter.amount}`,
        });
        // send_noti user_reject_vendor's counter_offer
        fcmTokenRef
          .child("users")
          .child(params.user_phone)
          .once("value")
          .then((snapshot) => {
            send_notification_to_single_user(snapshot.val().fcm_token.token, {
              title: `Counter Offer: Rejected by vendor`,
              body: `Dear ${params.user.user_id}, refering ${params.orderNo}, has been rejected.`,
            });

            let newNotification = notificationsRef.child('users').child(params.user_phone).push();
                let AdminNotification = notificationsRef.child('admin').push();
                newNotification.set({
                  id: newNotification.key,
                  title: `Counter Offer: Rejected by vendor`,
                  body: `Dear ${params.user.user_id}, refering ${params.orderNo},your offer has been rejected.`,
                  created: getCurrentTimestamp(),
                  read: false
                }).catch(err => console.log('err -> ',err))

                AdminNotification.set({
                  id: AdminNotification.key,
                  title: `Vendor(${params.user_counter.company_name}) Rejected An Offer`,
                  body: `Vendor(${params.user_counter.company_name}) Has Countered The Offer On OrderNo#${params.orderNo} for amount = ${params.user_counter.amount}`,
                  created: getCurrentTimestamp(),
                  read: false
                }).catch(err => console.log('err -> ',err))
          })
          .catch((e) => console.log("catch: ", e));
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// API-10
// /vendor_accept_counter_offer -> Vendor Accepts first User Counter Offer
router.post(
  "/vendor_accept_counter_offer",
  body("user_phone")
    .isMobilePhone()
    .withMessage("user_phone must be valid phone number"),
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
  // Check User (Vendor Side)
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
          error: `${params.user.user_type} cannot counter offer !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot counter offer !`,
        });
        break;
    }
  },
  // Get Vendor
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("vendors")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          if(vendor.blocked === true || vendor.blocked === 'true') {
            res.json({
              status:false,
              error: 'Blocked Vendors Can No Longer Perform Any Actions !'
            })
          } else {
            req.body.vendor = vendor;
            next();
          }
         
        } else {
          res.json({
            status: false,
            error: "Vendor Not Found",
          });
        }
      });
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

    if (params.request.request_type) {
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
              (qoute) => qoute.vendor_phone === params.vendor.phone
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
    }
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
        accepted_on_timestamp: getCurrentTimestamp(),
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

    if (params.request.request_type) {
      pplRequestRef
        .child(params.request.orderNo)
        .update({
          status: "user_counter_accepted",
          user_counter: params.user_counter,
          amount: params.user_counter.amount,
          user_counter_accepted_on: getCurrentDate(),
          user_counter_accepted_on_timestamp: getCurrentTimestamp(),
          vendor_phone: params.vendor.phone,
          vendor_name: params.vendor.company_name,
          name: params.vendor.company_name || null,
          company_name: params.vendor.company_name || null,
          company_phone: params.vendor.company_phone || null,
          company_address: params.vendor.company_address || null,
          NTN_number: params.vendor.NTN_number || null,
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
  }
);

// API-11
// vendor_counters_user_counter_offer -> Vendor Counters The User Counter Offer
router.post(
  "/vendor_counters_user_counter_offer",
  body("amount").isString().withMessage("amount must be a string"),
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
  // Check User (Vendor Side)
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
          error: `${params.user.user_type} cannot counter user counter offer !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot counter user counter offer !`,
        });
        break;
    }
  },
   // Get Vendor
   (req, res, next) => {
    const params = req.body;

    userRef
      .child("vendors")
      .child(params.vendor.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          if(vendor.blocked === true || vendor.blocked === 'true') {
            res.json({
              status:false,
              error: 'Blocked Vendors Can No Longer Perform Any Actions !'
            })
          } else {
            req.body.vendor = vendor;
            next();
          }
         
        } else {
          res.json({
            status: false,
            error: "Vendor Not Found",
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
  // Check Vendor Counter Offer
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type) {
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
              (offer) => offer.vendor_phone === params.user.user_id
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
    }
  },
  // Check User Counter Offer
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type) {
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
                offer.vendor_phone === params.vendor.phone &&
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
    }
  },
  // Check ID
  (req, res, next) => {
    pplBiddingsRef
      .child(req.body.request.request_type)
      .child("vendor_counter")
      .limitToLast(1)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          req.body.id = parseInt(Object.entries(snapshot.val())[0][1].id) + 1;
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

    if (params.request.request_type) {
      const newVendorCounterOffer = pplBiddingsRef
        .child(params.request.request_type)
        .child("vendor_counter")
        .push();
      const offerKey = newVendorCounterOffer.key;
      req.body.vendorCounterId = offerKey;
      console.log(params);
      newVendorCounterOffer
        .set({
          nature: "Vendor Counter Offer",
          orderNo: params.orderNo,
          qouteId: params.user_counter.qouteId,
          userCounterId: params.user_counter.counterId,
          vendorCounterId: offerKey,
          vendor_phone: params.vendor.phone,
          vendor_name: params.user_counter.company_name,
          name: params.user_counter.name || null,
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
          orrderCreationTime: params.request.createdAt_timestamp
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
    }
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
        vendorCounteredAt_timestamp: getCurrentTimestamp(),
      })
      .then(() => {
        res.json({
          status: true,
          message: "Vendor Countered User Counter Offer Successfully !",
        });
        // send_noti - vendor_counters_user_counter_offer
        fcmTokenRef
          .child("users")
          .child(params.user_counter.user_phone)
          .once("value")
          .then((snapshot) => {
            send_notification_to_single_user(snapshot.val().fcm_token.token, {
              title: "Vendor Countered User Counter Offer",
              body: `Dear ${params.request.username}, refering ${params.orderNo}, you recieved counter offer from ${params.user_counter.company_name}`,
              routes: "MyOffers",
            });

            let newNotification = notificationsRef.child('users').child(params.user_counter.user_phone).push();
                let AdminNotification = notificationsRef.child('admin').push();
                newNotification.set({
                  id: newNotification.key,
                  title: "Vendor Countered User Counter Offer",
                  body: `Dear ${params.request.username}, refering ${params.orderNo}, you recieved counter offer from ${params.user_counter.company_name}`,
                  created: getCurrentTimestamp(),
                  read: false
                }).catch(err => console.log('err -> ',err))

                AdminNotification.set({
                  id: AdminNotification.key,
                  title: `Vendor(${params.user_counter.company_name}) Countered User Counter Offer`,
                  body: `Vendor(${params.user_counter.company_name}) Has Countered The User Counter Offer On OrderNo#${params.orderNo} for amount = ${params.user_counter.amount}`,
                  created: getCurrentTimestamp(),
                  read: false
                }).catch(err => console.log('err -> ',err))
          })
          .catch((e) => console.log("catch: ", e));
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// API-12
// /user_accept_vendor_counter_offer -> user accepts vendor counter offer
router.post(
  "/user_accept_vendor_counter_offer",
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
  // Check User Type (User Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        req.body.user = params.user;
        next();
        break;

      case "pro":
        req.body.user = params.user;
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
  // Check User
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          next();
        } else {
          userRef
            .child("pro")
            .child(params.user.user_id)
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
  // Check Vendor Counter Offer
  (req, res, next) => {
    // orderNo
    // User phone
    // Vendor Phone
    const params = req.body;

    if (params.request.request_type) {
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
              if (filter[0].status === "pending") {
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
    }
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
        accepted_on_timestamp: getCurrentTimestamp(),
      })
      .then(() => {
        console.log("Vendor Counter Updated");
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

    if (params.request.request_type) {
      pplRequestRef
        .child(params.orderNo)
        .update({
          status: "vendor_counter_accepted",
          vendor_phone: params.vendor_counter.vendor_phone,
          name: params.vendor_counter.company_name || null,
          company_name: params.vendor_counter.company_name || null,
          company_phone: params.vendor_counter.company_phone || null,
          company_address: params.vendor_counter.company_address || null,
          NTN_number: params.vendor_counter.NTN_number || null,
          vendor_counter: params.vendor_counter,
          amount: params.vendor_counter.amount,
          vendor_counter_accepted_on: getCurrentDate(),
          vendor_counter_accepted_on_timestamp: getCurrentTimestamp(),
        })
        .then(() => {
          res.json({
            status: true,
            message: `User accepted the vendor counter offer for ${params.vendor_counter.amount}`,
          });
          // send_noti
          fcmTokenRef
            .child("vendors")
            .child(params.vendor_phone)
            .once("value")
            .then((snapshot) => {
              send_notification_to_single_user(snapshot.val().fcm_token.token, {
                title: `Counter Offer: Accepted by vendor`,
                body: `Dear ${params.user.user_id}, refering ${params.orderNo}, Counter offer has been accepted.`,
              });

              let newNotification = notificationsRef.child('vendors').child(params.vendor_phone).push();
              let AdminNotification = notificationsRef.child('admin').push();
              newNotification.set({
                id: newNotification.key,
                title: `Counter Offer: Accepted by vendor`,
                body: `Dear ${params.user.user_id}, refering ${params.orderNo}, Counter offer has been accepted.`,
                created: getCurrentTimestamp(),
                read: false
              }).catch(err => console.log('err -> ',err))

              AdminNotification.set({
                id: AdminNotification.key,
                title: `Vendor(${params.vendor_counter.company_name}) Accepted User Counter Offer`,
                body: `Vendor(${params.vendor_counter.company_name}) Has Accepted The User Counter Offer On OrderNo#${params.orderNo} for amount = ${params.vendor_counter.amount}`,
                created: getCurrentTimestamp(),
                read: false
              }).catch(err => console.log('err -> ',err))
            })
            .catch((e) => console.log("catch: ", e));
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    }
  }
);

// API-13
// /user_reject_vendor_counter_offer -> user rejects vendor counter offer (No Penalty)
router.post(
  "/user_reject_vendor_counter_offer",
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
  // Check User
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          if(user.blocked === true || user.blocked === 'true') {
            res.json({
              status:false,
              error: 'Blocked Users Can No Longer Perform Any Actions !'
            })
          } else {
            req.body.user = user;
            next();
          }
        } else {
          userRef
            .child("pro")
            .child(params.user.user_id)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                if(user.blocked === true || user.blocked === 'true') {
                  res.json({
                    status:false,
                    error: 'Blocked Users Can No Longer Perform Any Actions !'
                  })
                } else {
                  req.body.user = user;
                  next();
                }
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
        rejected_on_timestamp: getCurrentTimestamp(),
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

    if (params.request.request_type) {
      pplRequestRef
        .child(params.orderNo)
        .update({
          status: "vendor_counter_rejected",
          vendor_phone: params.vendor_counter.vendor_phone,
          name: params.vendor_counter.company_name || null,
          company_name: params.vendor_counter.company_name || null,
          company_phone: params.vendor_counter.company_phone || null,
          company_address: params.vendor_counter.company_address || null,
          NTN_number: params.vendor_counter.NTN_number || null,
          vendor_counter: params.vendor_counter,
          amount: params.vendor_counter.amount,
          vendor_counter_rejected_on: getCurrentDate(),
          vendor_counter_rejected_on_timestamp: getCurrentTimestamp(),
          penalty: false,
        })
        .then(() => {
          res.json({
            status: true,
            message: `User Rejected Vendor Counter Offer for ${params.vendor_counter.amount}`,
          });
          // send_noti user_reject_vendor's counter_offer
          fcmTokenRef
            .child("vendors")
            .child(params.vendor_phone)
            .once("value")
            .then((snapshot) => {
              send_notification_to_single_user(snapshot.val().fcm_token.token, {
                title: `Counter Offer: Rejected by user`,
                body: `Dear ${params.vendor_counter.company_phone}, refering ${params.orderNo}, has been rejected.`,
              });

              let newNotification = notificationsRef.child('vendors').child(params.vendor_phone).push();
              let AdminNotification = notificationsRef.child('admin').push();
              newNotification.set({
                id: newNotification.key,
                title: `Counter Offer: Rejected by User`,
                body: `Dear ${params.vendor_counter.company_phone}, refering ${params.orderNo} has been rejected.`,
                created: getCurrentTimestamp(),
                read: false
              }).catch(err => console.log('err -> ',err))

              AdminNotification.set({
                id: AdminNotification.key,
                title: `User(${params.user.fullname}) Rejected Vendor Counter Offer`,
                body: `User(${params.user.fullname}) Has Rejected The Vendor Counter Offer On OrderNo#${params.orderNo} for amount = ${params.vendor_counter.amount}`,
                created: getCurrentTimestamp(),
                read: false
              }).catch(err => console.log('err -> ',err))
            })
            .catch((e) => console.log("catch: ", e));
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    }
  }
);

// ===================  Qoute Services (Ends) ======================

// ======================  PAYMENT METHOD (start) =========================

// API-14
// /user_add_payment_method -> User Will Add Payment Method And Make Payment
router.post(
  "/user_add_payment_method",
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
  // Check User
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          if(user.blocked === true || user.blocked === 'true') {
            res.json({
              status:false,
              error: 'Blocked Users Can No Longer Perform Any Actions !'
            })
          } else {
            req.body.user = user;
            next();
          }
        } else {
          userRef
            .child("pro")
            .child(params.user.user_id)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                if(user.blocked === true || user.blocked === 'true') {
                  res.json({
                    status:false,
                    error: 'Blocked Users Can No Longer Perform Any Actions !'
                  })
                } else {
                  req.body.user = user;
                  next();
                }
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
  // Check Order
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();
        if (request.status !== "cancelled") {
          req.body.request = request;
          next();
        } else {
          res.json({
            status: false,
            error: `This Order Is Cancelled By ${request.cancel_by}`,
          });
        }
      } else {
        res.json({
          status: false,
          error: "No request found !",
        });
      }
    });
  },
  // If Payment Method Is Card
  (req, res, next) => {
    const params = req.body;

    if (params.payment_method === "card") {
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
      next();
    }
  },
  // If Payment Method Is Credit
  (req, res, next) => {
    const params = req.body;

    if (params.payment_method === "credit") {
      if (params.user.phone) {
        userRef
          .child("users")
          .child(params.user.phone)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              const user = snapshot.val();
            } else {
              userRef
                .child("pro")
                .child(params.user.phone)
                .once("value", (snapshot) => {
                  if (snapshot.val()) {
                    const user = snapshot.val();

                    if (user.type == "pro") {
                      // Check User Credit
                      // Upload Request
                    } else {
                      res.json({
                        status: false,
                        error: "You are not been promoted to Pro Users .!",
                      });
                    }
                  } else {
                    res.json({
                      status: false,
                      error: "This Facility Is Only For Pro Users !",
                    });
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
      next();
    }
  },
  // If Payment Method Is Bank
  (req, res, next) => {
    const params = req.body;

    if (params.payment_method === "bank") {
      if (params.accountNo) {
        // Check Bank Slip

        if (!req.files) {
          res.json({
            status: false,
            error: "Please upload transfer slip",
          });
        } else {
          console.log("files -> ", req.files);

          next();
        }
      } else {
        res.json({
          status: false,
          error: "Please Give Bank Account No !",
        });
      }
    } else {
      next();
    }
  },
  // Upload Documents To Google Cloud Storage (BANK)
  (req, res, next) => {
    const params = req.body;

    if (params.payment_method === "bank") {
      const { transfer_slip } = req.files;

      // Uploading Bill of landing
      const transfer_slip_filename = transfer_slip.name;
      const transfer_slip_filetype = transfer_slip_filename.split(".")[1];
      const transfer_slip_name = `${params.orderNo}_payment_slip`;

      const path = "BankPaymentSlips/";

      // Bill of landing Upload
      fileUpload(
        transfer_slip,
        transfer_slip_name,
        path,
        transfer_slip_filetype,
        (err) => {
          if (err) {
            console.log("err -> ", err);
          } else {
            console.log("payment slip uploaded");
            next();
          }
        }
      );
    } else {
      next();
    }
  },
  // Get Images Links (BANK)
  async (req, res, next) => {
    const params = req.body;

    if (params.payment_method === "bank") {
      let options = {
        prefix: `BankPaymentSlips/`,
      };

      const [files] = await storage.bucket("meribilty-files").getFiles(options);
      var uploadImages = [];

      files.forEach((file) => {
        const fileName = file.name;

        if (fileName.includes(params.orderNo)) {
          let image = {
            name: file.name,
            url: file.publicUrl(),
          };

          uploadImages.push(image);
          console.log("imae -> ", image);
        }
      });

      req.body.paymentSlip = uploadImages;

      console.log("uploadImages -> ", uploadImages);

      next();
    } else {
      next();
    }
  },
  // Upload Payment Slip Link To Database
  (req, res, next) => {
    const params = req.body;
    if (params.payment_method === "bank") {
      pplRequestRef
        .child(params.orderNo)
        .update({
          payment_method: "bank",
          accountNo: params.accountNo,
          bank_transfer_slip_upload: true,
          bank_tranfer_slip: params.paymentSlip,
          bank_tranfer_slip_status: false,
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
      next();
    }
  },
  // If Payment Method Is Cash On Delivery
  (req, res) => {
    const params = req.body;

    if (params.payment_method === "cod") {
      if (params.point_of_payment) {
        switch (params.point_of_payment) {
          case "origin":
            pplRequestRef
              .child(params.orderNo)
              .update({
                payment_method: "cod",
                point_of_payment: params.point_of_payment,
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
                point_of_payment: params.point_of_payment,
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
          error: "Please give point of payment collection",
        });
      }
    } else {
      res.json({
        status: false,
        error: "Error ! Invalid Payment Method !",
      });
    }
  }
);

// ======================  PAYMENT METHOD (end) =========================

// ======================  Contact Person Services (Start) =========================

// API-15
// /user_create_contact_person -> User Will Create A Contact Person Or User Agent
router.post(
  "/user_invites_a_user",
  body("fullname").isString().withMessage("fullname must be an string"),
  body("email").isEmail().withMessage("email must be an valid email"),
  body("phone").isMobilePhone().withMessage("phone is not valid"),
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
        // req.body.user = params.user;
        next();
        break;

      case "pro":
        // req.body.user = params.user;
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
  // Check User Data
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("users")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          if(user.blocked === true || user.blocked === 'true') {
            res.json({
              status:false,
              error: 'Blocked Users Can No Longer Perform Any Actions !'
            })
          } else {
          req.body.user = user;
          console.log("User -> ", req.body.user);
          next();
          }
        } else {
          userRef
            .child("pro")
            .child(params.user.user_id)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                if(user.blocked === true || user.blocked === 'true') {
                  res.json({
                    status:false,
                    error: 'Blocked Users Can No Longer Perform Any Actions !'
                  })
                } else {
                req.body.user = user;
                console.log("User -> ", req.body.user);
                next();
                }
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
  // Check User Already Invited ?
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();

          res.json({
            status: false,
            error: `${user.fullname} already exists !`,
          });
        } else {
          userRef
            .child("pro")
            .child(params.phone)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();

                res.json({
                  status: false,
                  error: `${user.fullname} already exists !`,
                });
              } else {
                next();
              }
            });
        }
      });
  },
  // Generate A User
  (req, res, next) => {
    const params = req.body;
    const newUser = userRef.child("users").push();
    const userId = newUser.key;
    // req.body.agent_password = password;

    userRef
      .child("users")
      .child(params.phone)
      .set({
        referer: params.user.phone,
        id: userId,
        fullname: params.fullname,
        email: params.email,
        phone: params.phone,
        created: getCurrentDate(),
        created_timestamp: getCurrentTimestamp(),
        verified: false,
        blocked:false,
        type: "user",
      })
      .then(() => {
        walletRef
          .child("users")
          .child(params.phone)
          .set({
            amount: "0",
            type: "cash",
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

    let filterphone = params.phone;
    let transformphone = filterphone.substr(1);
    console.log('filterphone -> ',filterphone)
    console.log('transformphone -> ',transformphone)

    let content = `You have been invited by ${params.user.fullname} To Meribilty App. Login With Your Phone Number ${params.phone}.`;
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

    // twillio_client.messages
    //   .create(
    //     {
    //       messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
    //       to: params.phone,
    //       from: config.twilio.phone,
    //       body: `You have been invited by ${params.user.fullname} To Meribilty App. Login With Your Phone Number ${params.phone}.`,
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
    //           message: "User Agent Added !",
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

// API-16
// user_edit_contact_person -> User Will Update A Contact Person Or User Agent
router.post(
  "/user_edit_contact_person",
  body("fullname").isString().withMessage("fullname must be an string"),
  body("email").isEmail().withMessage("email must be an valid email"),
  body("phone").isMobilePhone().withMessage("phone is not valid"),
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
        // req.body.user = params.user;
        next();
        break;

      case "pro":
        // req.body.user = params.user;
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
  // User Data
  (req, res, next) => {
    const params = req.body;
    if (params.user.user_type !== "user_agent") {
      userRef
        .child("users")
        .child(params.user.user_id)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const user = snapshot.val();

            // Check Invited User
            req.body.user = user;
            console.log("User -> ", req.body.user);
            next();
          } else {
            userRef
              .child("pro")
              .child(params.user.user_id)
              .once("value", (snapshot) => {
                if (snapshot.val()) {
                  const user = snapshot.val();
                  req.body.user = user;
                  console.log("User -> ", req.body.user);
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
    } else {
      res.json({
        status: false,
        error: "User Agent Cannot Add User Agent/ Clearing Agent",
      });
    }
  },
  // Update A User Agent
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.agent_phone)
      .update({
        agent_for: params.user_phone,
        name: params.fullname,
        email: params.email,
        phone: params.agent_phone,
      })
      .then(() => {
        res.json({
          status: true,
          message: "User agent updated successfully",
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

// API-17
// user_remove_contact_person -> User Will Remove A Contact Person Or User Agent
router.post(
  "/user_remove_contact_person",
  body("agent_phone").isMobilePhone().withMessage("agent_phone is not valid"),
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
        // req.body.user = params.user;
        next();
        break;

      case "pro":
        // req.body.user = params.user;
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
  // Get User Data
  (req, res, next) => {
    const params = req.body;
    if (params.user.type !== "user_agent") {
      userRef
        .child("users")
        .child(params.user.user_id)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const user = snapshot.val();
            req.body.user = user;
            console.log("User -> ", req.body.user);
            next();
          } else {
            userRef
              .child("pro")
              .child(params.user.user_id)
              .once("value", (snapshot) => {
                if (snapshot.val()) {
                  const user = snapshot.val();
                  req.body.user = user;
                  console.log("User -> ", req.body.user);
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
    } else {
      res.json({
        status: false,
        error: "User Agent Cannot Add User Agent/ Clearing Agent",
      });
    }
  },
  // Check if User Agent Exists ?
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("users")
      .child(params.agent_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const agent = snapshot.val();
          req.body.agent = agent;
          next();
          // console.log("agent -> ", agent);
        } else {
          res.json({
            status: false,
            error: "User Agent Not Found !",
          });
        }
      });
  },
  // Delete A User Agent
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.agent_phone)
      .remove()
      .then(() => {
        res.json({
          status: true,
          message: "User agent updated successfully",
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

// API-18
// /user_add_contact_person_to_request
router.post(
  "/user_add_contact_person_to_request",
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
  // Check User Type (User Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        req.body.user = params.user;
        next();
        break;

      case "pro":
        req.body.user = params.user;
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
  // Check User
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          if(user.blocked === true || user.blocked === 'true') {
            res.json({
              status:false,
              error: 'Blocked Users Can No Longer Perform Any Actions !'
            })
          } else {
          req.body.user = user;
          console.log("User -> ", req.body.user);
          next();
          }
        } else {
          userRef
            .child("pro")
            .child(params.user.user_id)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                if(user.blocked === true || user.blocked === 'true') {
                  res.json({
                    status:false,
                    error: 'Blocked Users Can No Longer Perform Any Actions !'
                  })
                } else {
                req.body.user = user;
                console.log("User -> ", req.body.user);
                next();
                }
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
  // Add Contact Person To Request
  (req, res) => {
    const params = req.body;

    if (params.phone) {
      pplRequestRef
        .child(params.request.orderNo)
        .child("contact_person")
        .child(params.phone)
        .set({
          phone: params.phone,
        })
        .then(() => {
          let filterphone = params.phone;
          let transformphone = filterphone.substr(1);
          console.log('filterphone -> ',filterphone)
          console.log('transformphone -> ',transformphone)
          let content = `You have been added to OrderNo#${params.request.orderNo} as contact person / clearing agent by ${params.user.fullname}`;
          axios.post(`http://bsms.its.com.pk/api.php?key=b23838b9978affdf2aab3582e35278c6&msgdata=${content}&to=${transformphone}`).then((response)=>{
          let data = response.data;
          
            if(data.response.status === 'Success') {
              res.json({
                status: true,
                message: "Contact Person Added To Request !",
              });
            } else {
              res.json({
                status: true,
                message: "Contact Person Added To Request !",
              });
              // res.json({
              //   status:false,
              //   data:data
              // })
            console.log('data -> ',data);

            }
          }).catch((err)=>{
            res.json({
              status: true,
              message: "Contact Person Added To Request !",
            });
            // res.json({
            //   status:false,
            //   error: err
            // }) 
            console.log('err -> ',err);
          })
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

// API-19
// get all contact persons for user
router.post(
  "/get_contact_persons",
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
  // User Data
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;

          next();
        } else {
          userRef
            .child("pro")
            .child(params.user.user_id)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                req.body.user = user;

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
  // Get Invited Users
  (req, res, next) => {
    const params = req.body;

    console.log(params.user.user_id);

    userRef
      .child("users")
      .orderByChild("referer")
      .equalTo(params.user.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const contactPersons = [];
          snapshot.forEach((snap) => {
            contactPersons.push(snap.val());
          });

          req.body.contact_persons_users = [...contactPersons];
          next();
        } else {
          req.body.contact_persons_users = [];
          next();
        }
      });
  },
  // Get Invited Pro Users
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("pro")
      .orderByChild("referer")
      .equalTo(params.user.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const contactPersons = [];
          snapshot.forEach((snap) => {
            contactPersons.push(snap.val());
          });
          req.body.contact_persons_pro = contactPersons;
          next();
        } else {
          req.body.contact_persons_pro = [];
          next();
        }
      });
  },
  // Throw data
  (req, res) => {
    const params = req.body;

    res.json({
      status: true,
      data: [...params.contact_persons_pro, ...params.contact_persons_users],
    });
  }
);

// ======================  Contact Person Services (End) =========================

// API-20
// /order_accept -> (User Accept Order)
router.post(
  "/order_accept",
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
  // Check User Type (User Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        req.body.user = params.user;
        next();
        break;

      case "pro":
        req.body.user = params.user;
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
  // Check User
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          if(user.blocked === true || user.blocked === 'true') {
            res.json({
              status:false,
              error: 'Blocked Users Can No Longer Perform Any Actions !'
            })
          } else {
          req.body.user = user;
          console.log("User Data Received");
          next();
          }
        } else {
          userRef
            .child("pro")
            .child(params.user.user_id)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                if(user.blocked === true || user.blocked === 'true') {
                  res.json({
                    status:false,
                    error: 'Blocked Users Can No Longer Perform Any Actions !'
                  })
                }  else {
                req.body.user = user;
                console.log("User Data Received");
                next();
                }
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

        if (request.request_type) {
          switch (request.status) {
            // case "pending":
            //   req.body.request = request;
            //   next();

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
              console.log("Request Status Checked");
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
            case "cancelled":
              res.json({
                status: false,
                error: `This Order Is Cancelled By ${request.cancel_by}`,
              });
              break;

            default:
              res.json({
                status: false,
                error: `Order Accept APi - Unknown Request Status -> ${request.status}`,
              });
              break;
          }
        } else {
          res.json({
            status: false,
            error: "Unknown Request Type !",
          });
        }
      } else {
        res.json({
          status: false,
          message: "Request Not Found !",
        });
      }
    });
  },
  // Get Vendor Data 
  (req,res,next) => {
    const params = req.body;

    userRef.child('vendors').child(params.request.vendor_phone).once('value', (snapshot) => {
      if(snapshot.val()) {
        const vendor = snapshot.val();
        req.body.vendor = vendor;
        next();
      } else {
        res.json({
          status:false,
          error:'Vendor Not Found !'
        })
      }
    })
  },
  // Check Payment Method
  (req, res, next) => {
    const params = req.body;

    if (params.request.payment_method) {
      switch (params.request.payment_method) {
        case "cod":
          walletRef
            .child("users")
            .child(params.user.phone)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const wallet = snapshot.val();
                const amount = parseInt(wallet.amount);
                const transactions = wallet.transactions
                  ? wallet.transactions
                  : [];

                console.log("amount -> ", amount);
                // console.log('amount type -> ',typeof(amount));

                if (params.request.request_type) {
                  // Check Accepted Amount By User
                  if (params.request.qoute) {
                    const acceptedAmount = params.request.qoute.qoute_amount;
                    console.log("acceptedAmount -> ", acceptedAmount);
                    console.log(
                      "acceptedAmount type -> ",
                      typeof acceptedAmount
                    );

                    const calculate = Math.ceil(amount - acceptedAmount);

                    console.log("Final Calculated Amount -> ", calculate);

                    let currentDate = new Date().toLocaleString("en-US", {
                      timeZone: "Asia/Karachi",
                    });

                    let transaction = {
                      orderNo: params.request.orderNo,
                      originAddress: params.request.originAddress,
                      destinationAddress: params.request.destinationAddress,
                      containerReturnAddress:
                        params.request.containerReturnAddress,
                      request_type: params.request.request_type,
                      payment_method: params.request.payment_method,
                      previousBalance: amount,
                      acceptedAmount: acceptedAmount,
                      deductedAmount: acceptedAmount,
                      afterDeduction: calculate,
                      time: currentDate,
                    };

                    transactions.push(transaction);

                    walletRef
                      .child("users")
                      .child(params.user.phone)
                      .update({
                        amount: calculate,
                        transactions: transactions,
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
                  } else if (params.request.user_counter) {
                    const acceptedAmount = params.request.user_counter.amount;
                    console.log("acceptedAmount -> ", acceptedAmount);
                    console.log(
                      "acceptedAmount type -> ",
                      typeof acceptedAmount
                    );

                    const calculate = Math.ceil(amount - acceptedAmount);

                    console.log("Final Calculated Amount -> ", calculate);
                    let currentDate = new Date().toLocaleString("en-US", {
                      timeZone: "Asia/Karachi",
                    });

                    let transaction = {
                      orderNo: params.request.orderNo,
                      originAddress: params.request.originAddress,
                      destinationAddress: params.request.destinationAddress,
                      containerReturnAddress:
                        params.request.containerReturnAddress,
                      request_type: params.request.request_type,
                      payment_method: params.request.payment_method,
                      previousBalance: amount,
                      acceptedAmount: acceptedAmount,
                      deductedAmount: acceptedAmount,
                      afterDeduction: calculate,
                      time: currentDate,
                    };

                    transactions.push(transaction);

                    walletRef
                      .child("users")
                      .child(params.user.phone)
                      .update({
                        amount: calculate,
                        transactions: transactions,
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
                  } else if (params.request.vendor_counter) {
                    const acceptedAmount = parseInt(
                      params.request.vendor_counter.amount
                    );
                    console.log("acceptedAmount -> ", acceptedAmount);
                    console.log(
                      "acceptedAmount type -> ",
                      typeof acceptedAmount
                    );

                    const calculate = Math.ceil(amount - acceptedAmount);

                    console.log("Final Calculated Amount -> ", calculate);
                    let currentDate = new Date().toLocaleString("en-US", {
                      timeZone: "Asia/Karachi",
                    });

                    let transaction = {
                      orderNo: params.request.orderNo,
                      originAddress: params.request.originAddress,
                      destinationAddress: params.request.destinationAddress,
                      containerReturnAddress:
                        params.request.containerReturnAddress,
                      request_type: params.request.request_type,
                      payment_method: params.request.payment_method,
                      previousBalance: amount,
                      acceptedAmount: acceptedAmount,
                      deductedAmount: acceptedAmount,
                      afterDeduction: calculate,
                      time: currentDate,
                    };

                    transactions.push(transaction);

                    walletRef
                      .child("users")
                      .child(params.user.phone)
                      .update({
                        amount: calculate,
                        transactions: transactions,
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
                  }
                } else {
                  res.json({
                    status: false,
                    error: "Unknown Request Type !",
                  });
                }
              } else {
                res.json({
                  status: false,
                  error: "Wallet Not Found !",
                });
              }
            });
          break;
        case "bank":
          if (params.request.bank_tranfer_slip_status) {
            next();
          } else {
            next();
            // res.json({
            //   status: false,
            //   error: "Bank Payment Slip Is Not Approved !"
            // })
          }
          // TODO
          break;
        case "credit":
          // TODO
          walletRef
            .child("users")
            .child(params.user.phone)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const wallet = snapshot.val();
                const amount = parseInt(wallet.amount);

                console.log("amount -> ", amount);
                // console.log('amount type -> ',typeof(amount));

                // Check Accepted Amount By User
                if (params.request.qoute) {
                  const acceptedAmount = params.request.qoute.qoute_amount;
                  console.log("acceptedAmount -> ", acceptedAmount);
                  console.log("acceptedAmount type -> ", typeof acceptedAmount);
                } else if (params.request.user_counter) {
                  const acceptedAmount = params.request.user_counter.amount;
                  console.log("acceptedAmount -> ", acceptedAmount);
                  console.log("acceptedAmount type -> ", typeof acceptedAmount);
                } else if (params.request.vendor_counter) {
                  const acceptedAmount = parseInt(
                    params.request.vendor_counter.amount
                  );
                  console.log("acceptedAmount -> ", acceptedAmount);
                  //  console.log('acceptedAmount type -> ',typeof(acceptedAmount));

                  const calculate = Math.ceil(amount - acceptedAmount);

                  console.log("Calculated Amount -> ", calculate);

                  walletRef
                    .child("users")
                    .child(params.user.phone)
                    .update({
                      amount: calculate,
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
                }
              } else {
                res.json({
                  status: false,
                  error: "Wallet Not Found !",
                });
              }
            });
          break;
        case "online":
          next();
          break;

        default:
          res.json({
            status: false,
            error: "Unknown Payment Method !",
          });
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
        console.log("Contact Person Found !");
        next();
      } else {
        res.json({
          status: false,
          message: "Contact Person Not Selected !",
        });
      }

      // const convert = Object.entries(request.contact_person);

      // const final = [];
      // convert.forEach((x) => {
      //   final.push(x[1]);
      // });

      // if (final.length !== 0) {

      // } else {

      // }
      // }
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
  // Get Latest Commission
  (req,res,next) => {
  pplSettingsRef.child("commission").once('value', (snapshot) => {
    if(snapshot.val()) {
      let commissions = [];
      snapshot.forEach((x)=>{
        commissions.push(x.val())
      })
  
      const sortedpendingOffers1 = commissions.sort(function (a, b) {
        return b.timestamp - a.timestamp;
      });
  
      let latestCommission = sortedpendingOffers1[0];
      req.body.commission = latestCommission;
      next();
    } else {
      req.body.commission = {
          value: 0
      }
      next();
    }
  });
  },
  // Get Service Charges
  (req,res,next) => {
  pplSettingsRef.child("service_charges").once('value', (snapshot) => {
    if(snapshot.val()) {
      let service_charges_data = snapshot.val();
      pplSettingsRef.child("on_no_province_found").once('value', (snapshot2) => {
        if(snapshot2.val()) {
          req.body.onNoProvinceFound = snapshot2.val();
          
          
            let userservicecharges = [];
            let vendorservicecharges = [];

            let user = service_charges_data.user;
            let vendor = service_charges_data.vendor;

            for(let key in user) {
              userservicecharges.push(user[key]);
            }

            for(let key in vendor) {
              vendorservicecharges.push(vendor[key]);
            }
          
            console.log('userservicecharges-> ',userservicecharges);
            console.log('vendorservicecharges-> ',vendorservicecharges)

            req.body.userservicecharges = userservicecharges;
            req.body.vendorservicecharges = vendorservicecharges;
            next();
        } else {
          req.body.onNoProvinceFound = {
            value: 13
          };
        }
      })
      
    } else {
      req.body.userservicecharges = [];
      req.body.vendorservicecharges = [];
      next();
    }
  });
  },
  // Get Tax 
  (req,res,next) => {
    pplSettingsRef.child("tax").once('value', (snapshot) => {
      if(snapshot.val()) {
        req.body.tax = snapshot.val();
        next();
      } else {
        req.body.tax = null;
        next();
      }
    });
  },
  // Get Withholding Tax 
  (req,res,next) => {
  pplSettingsRef.child("withholding_tax").once('value', (snapshot) => {
    if(snapshot.val()) {
      req.body.withholding_tax = snapshot.val();
      next();
    } else {
      req.body.withholding_tax = null;
      next();
    }
  });
  },
  // Generate Invoice (User)
  (req, res, next) => {
    const params = req.body;
    const invoice_number = Math.floor(Math.random() * 900000) + 100000; 
    const booking_number = Math.floor(Math.random() * 900000) + 100000; 

    let invoice = {
         Date:	params.request.createdAt,
        'Invoice Number':	`MB-INV-${invoice_number}-${params.request.orderNo}`,
        'Booking Number':	`MB-REF-${booking_number}-${params.request.orderNo}`,
        'Customer ID':	params.request.user_phone,
        'Vendor ID': params.request.vendor_phone,
        'From (Origin)':	params.request.from.city,
        'To: (Destination)': params.request.to.city,	
        'Sender Name': params.request.from.name,
        'Sender Address':	params.request.from.address,
        'Receiver Name':	params.request.to.name,
        'Receiver Address':	params.request.to.address,
        'Cargo Insurance': params.request.cargo_insurance,
        'Order Scheduled For': params.request.date,
        'Order No': params.request.orderNo,
        'Discount': 0,
        orgLat: params.request.orgLat,
        orgLng: params.request.orgLng,
        desLat: params.request.desLat,
        desLng: params.request.desLng,
        disText: params.request.disText,
        durText: params.request.durText,
        originAddress: params.request.originAddress || null,
        destinationAddress: params.request.destinationAddress || null,
        containerReturnAddress: params.request.containerReturnAddress || null,
        user_phone: params.request.user_phone,
        user_type: params.request.user_type,
        username: params.request.username,
        request_type: params.request.request_type,
        status: params.request.status,
        createdAt: params.request.createdAt,
    };

    // If Qoute Is Accepted 
    if(params.request.qoute) {
      invoice['rates_decided'] = parseInt(params.request.qoute.qoute_amount);
      invoice['rates_decided_on'] = params.request.qoute.qoutedAt;
      invoice['rates_type'] = 'Qoute Accepted';
    }

    if(params.request.user_counter) {
      invoice['rates_decided'] = parseInt(params.request.user_counter.amount);
      invoice['rates_decided_on'] = params.request.user_counter.counteredAt;
      invoice['rates_type'] = 'User Counter Accepted';
    }

    if(params.request.vendor_counter) {
      invoice['rates_decided'] = parseInt(params.request.vendor_counter.amount);
      invoice['rates_decided_on'] = params.request.vendor_counter.vendor_countered_on;
      invoice['rates_type'] = 'Vendor Counter Accepted';
    }

    let serviceCharges;
    let salesTax;
    let provinceAuthority;

    let taxData = params.tax;
    let userServiceChargesList = params.userservicecharges;

    userServiceChargesList.filter((x)=>{
      if(invoice['rates_decided'] >> parseInt(x.min) && invoice['rates_decided'] << parseInt(x.max)) {
        console.log('Service Slab Found !')
        serviceCharges = parseInt(x.value);
        
      } else {
        console.log('Service Slab Not Found !')
        serviceCharges = params.onNoProvinceFound.value;
      }
    })

    for(let key in taxData) {
      if(params.request.to.province === taxData[key].provinceLongname) {
        salesTax = taxData[key].value;
        provinceAuthority = taxData[key].provinceShortname;
      } else {
        salesTax = params.onNoProvinceFound.value; 
      }
    } 
    
    console.log('serviceCharges -> ',serviceCharges);
    invoice['serviceCharges'] = parseInt(serviceCharges);
    invoice['fuelAndOtherCharges'] = Math.floor(invoice['rates_decided'] - parseInt(serviceCharges));
    // invoice['taxLocation'] = provinceAuthority;
  


    // Calculate Sales Tax
    let taxValue = Math.floor(parseInt(serviceCharges) * salesTax / 100)
    
    invoice['salesTax'] = taxValue;

    if(params.request.security_deposit) {
      invoice['security_deposit'] = parseInt(params.request.security_deposit);
    }
    
    if(params.request.cargo_value) {
      invoice['cargo_value'] = parseInt(params.request.cargo_value);
    }

    let bilties = params.request.bilty;

    bilties.map((bilty,index) => {
      if(bilty.type === 'vehicle') {
        invoice[`Bilty ${index}`] = bilty.biltyNo;
        invoice[`Vehicle Type ${index}`] = bilty.name;
        invoice[`Weight ${index}`] = bilty.weight;
        invoice[`Material ${index}`] = bilty.material;
        
        if(bilty.vehicle_number) {
        invoice[`Vehicle Registration ${index}`] = bilty.vehicle_number;
        }
  
        if(bilty.vehicle_number) {
          invoice[`Vehicle Registration ${index}`] = bilty.vehicle_number;
        }
      }

      if(bilty.type === 'loading/unloading') { 
        invoice[`Bilty ${index}`] = bilty.biltyNo;
        
        if(bilty.loading_options && bilty.loading_options.length > 0) {
          bilty.loading_options.map((loading,index)=>{
            invoice[`Loading Option ${index}`] = loading.name;
            invoice[`Weight ${index}`] = loading.weight;
          })
        }

        if(bilty.unloading_options && bilty.unloading_options.length > 0) {
          bilty.unloading_options.map((unloading,index)=>{
            invoice[`Unloading Option ${index}`] = unloading.name;
            invoice[`Weight ${index}`] = unloading.weight;
          }) 
        }
      }
      
    })

    console.log('serviceCharges -> ',invoice['serviceCharges'])
    console.log('salesTax -> ',invoice['salesTax'])
    console.log('fuelAndOtherCharges -> ',invoice['fuelAndOtherCharges'])

    let total = Math.floor(invoice['serviceCharges'] + invoice['salesTax'] + invoice['fuelAndOtherCharges']  + parseInt(invoice['cargo_value']));
    console.log('total -> ',total);

    const toWords = new ToWords();
    let totalInWords = toWords.convert(total, { currency: true });

    invoice['total'] = total;
    invoice['totalInWords'] = totalInWords;

    req.body.customerInvoice = invoice;
    next();
  
  },
  // Generate Invoice (Vendor)
  (req, res, next) => {
    const params = req.body;


    let vendorInvoice = {
      ...params.customerInvoice,
      'Transporter Name': params.request.company_name,
      'Transporter Address': params.request.company_address,
      'Transporter Contact': params.request.vendor_phone,
    }

    vendorInvoice['invoiceAmount'] = vendorInvoice['rates_decided'];

    let serviceCharges;


    let vendorServiceChargesList = params.vendorservicecharges;

    vendorServiceChargesList.filter((x)=>{
      if(vendorInvoice['rates_decided'] >> parseInt(x.min) && vendorInvoice['rates_decided'] << parseInt(x.max)) {
        console.log('Service Slab Found !')
        serviceCharges = parseInt(x.value);
      } else {
        console.log('Service Slab Not Found !')
        serviceCharges = params.onNoProvinceFound.value;
      }
    })

    vendorInvoice['serviceCharges'] = parseInt(serviceCharges);
    vendorInvoice['fuelAndOtherCharges'] = Math.floor(vendorInvoice['rates_decided'] - parseInt(serviceCharges));


    // invoice['Commission Percent'] = params.commission.value;
    vendorInvoice['Commission'] = Math.floor(vendorInvoice['rates_decided'] * parseInt(params.commission.value) / 100);

    // Withholding Tax
    console.log('withholding_tax -> ',params.withholding_tax);
    let withholdingTax;

    if(params.vendor.filer) {
      withholdingTax = params.withholding_tax.filer.value
    } else {
      withholdingTax = params.withholding_tax.nonfiler.value
    }
  
    console.log('withholdingTax -> ',withholdingTax);

    vendorInvoice['withholdingTax'] = parseInt(withholdingTax);
    vendorInvoice['withholdingTaxValue'] = Math.floor(parseInt(withholdingTax) * parseInt(serviceCharges) / 100);
    
    vendorInvoice['total'] = Math.floor(vendorInvoice['fuelAndOtherCharges'] - vendorInvoice['serviceCharges'] - vendorInvoice['Commission'] - vendorInvoice['withholdingTaxValue']);
    const toWords = new ToWords();
    let totalInWords = toWords.convert(vendorInvoice['total'], { currency: true });
    
    vendorInvoice['totalInWords'] = totalInWords;


    req.body.vendorInvoice = vendorInvoice;
    next();
    
  },
  // Save Invoice 
  (req,res,next) => {
    const params = req.body;

    console.log('params.customerInvoice -> ',params.customerInvoice)
    console.log('params.vendorInvoice -> ',params.vendorInvoice)

    pplInvoiceRef
      .child(params.request.orderNo)
      .set({
        user: params.customerInvoice,
        vendor: params.vendorInvoice
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
    var orders = [];

    if (params.request.request_type) {
      userRef
        .child("vendors")
        .child(params.request.vendor_phone)
        .once("value", (snap) => {
          if (snap.val()) {
            if (snap.val().orders) {
              orders = snap.val().orders;
            }
            if (!orders.includes(params.request.orderNo)) {
              orders.push(params.request.orderNo);
            }

            userRef.child("vendors").child(params.request.vendor_phone).update({
              orders: orders,
            });
          } else {
            res.json({
              status: false,
              message: "Vendor Not Found !",
            });
          }
        });
    }

    pplRequestRef
      .child(params.orderNo)
      .update({
        status: "accepted",
        order_accepted_on: getCurrentDate(),
        order_accepted_on_timestamp: getCurrentTimestamp(),
        payment_approval: false,
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


// Invoice Testing 
router.post('/test-invoice', 
 // Get Request Data
  (req, res, next) => {
  const params = req.body;

  pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
    if (snapshot.val()) {
      const request = snapshot.val();

      req.body.request = request;
      console.log("Request Status Checked");
      next();
    } else {
      res.json({
        status: false,
        message: "Request Not Found !",
      });
    }
  });
  },
 // Get Latest Commission
  (req,res,next) => {
    pplSettingsRef.child("commission").once('value', (snapshot) => {
      if(snapshot.val()) {
        let commissions = [];
        snapshot.forEach((x)=>{
          commissions.push(x.val())
        })
    
        const sortedpendingOffers1 = commissions.sort(function (a, b) {
          return b.timestamp - a.timestamp;
        });
    
        let latestCommission = sortedpendingOffers1[0];
        req.body.commission = latestCommission;
        next();
      } else {
        req.body.commission = {
            value: 0
        }
        next();
      }
    });
  },
  // Get Service Charges
  (req,res,next) => {
  pplSettingsRef.child("service_charges").once('value', (snapshot) => {
    if(snapshot.val()) {
      let service_charges_data = snapshot.val();
      pplSettingsRef.child("on_no_province_found").once('value', (snapshot2) => {
        if(snapshot2.val()) {
           req.body.onNoProvinceFound = snapshot2.val();
           
           
            let userservicecharges = [];
            let vendorservicecharges = [];

            let user = service_charges_data.user;
            let vendor = service_charges_data.vendor;

            for(let key in user) {
              userservicecharges.push(user[key]);
            }

            for(let key in vendor) {
              vendorservicecharges.push(vendor[key]);
            }
          
            console.log('userservicecharges-> ',userservicecharges);
            console.log('vendorservicecharges-> ',vendorservicecharges)

            req.body.userservicecharges = userservicecharges;
            req.body.vendorservicecharges = vendorservicecharges;
            next();
        } else {
           req.body.onNoProvinceFound = {
            value: 13
           };
        }
      })
      
    } else {
      req.body.userservicecharges = [];
      req.body.vendorservicecharges = [];
      next();
    }
  });
  },
  // Get Tax 
  (req,res,next) => {
  pplSettingsRef.child("tax").once('value', (snapshot) => {
    if(snapshot.val()) {
      req.body.tax = snapshot.val();
      next();
    } else {
      req.body.tax = null;
      next();
    }
  });
  },
  // Get Withholding Tax 
  (req,res,next) => {
  pplSettingsRef.child("withholding_tax").once('value', (snapshot) => {
    if(snapshot.val()) {
      req.body.withholding_tax = snapshot.val();
      next();
    } else {
      req.body.withholding_tax = null;
      next();
    }
  });
  },
  // Generate Invoice (User)
  (req, res, next) => {
    const params = req.body;
    const invoice_number = Math.floor(Math.random() * 900000) + 100000; 
    const booking_number = Math.floor(Math.random() * 900000) + 100000; 

    let invoice = {
         Date:	params.request.createdAt,
        'Invoice Number':	`MB-INV-${invoice_number}-${params.request.orderNo}`,
        'Booking Number':	`MB-REF-${booking_number}-${params.request.orderNo}`,
        'Customer ID':	params.request.user_phone,
        'Vendor ID': params.request.vendor_phone,
        'From (Origin)':	params.request.from.city,
        'To: (Destination)': params.request.to.city,	
        'Sender Name': params.request.from.name,
        'Sender Address':	params.request.from.address,
        'Receiver Name':	params.request.to.name,
        'Receiver Address':	params.request.to.address,
        'Cargo Insurance': params.request.cargo_insurance,
        'Order Scheduled For': params.request.date,
        'Order No': params.request.orderNo,
        'Discount': 0,
         orgLat: params.request.orgLat,
         orgLng: params.request.orgLng,
         desLat: params.request.desLat,
         desLng: params.request.desLng,
         disText: params.request.disText,
         durText: params.request.durText,
         originAddress: params.request.originAddress || null,
         destinationAddress: params.request.destinationAddress || null,
         containerReturnAddress: params.request.containerReturnAddress || null,
         user_phone: params.request.user_phone,
         user_type: params.request.user_type,
         username: params.request.username,
         request_type: params.request.request_type,
         status: params.request.status,
         createdAt: params.request.createdAt,
    };

    // If Qoute Is Accepted 
    if(params.request.qoute) {
      invoice['rates_decided'] = parseInt(params.request.qoute.qoute_amount);
      invoice['rates_decided_on'] = params.request.qoute.qoutedAt;
      invoice['rates_type'] = 'Qoute Accepted';
    }

    if(params.request.user_counter) {
      invoice['rates_decided'] = parseInt(params.request.user_counter.amount);
      invoice['rates_decided_on'] = params.request.user_counter.counteredAt;
      invoice['rates_type'] = 'User Counter Accepted';
    }

    if(params.request.vendor_counter) {
      invoice['rates_decided'] = parseInt(params.request.vendor_counter.amount);
      invoice['rates_decided_on'] = params.request.vendor_counter.counteredAt;
      invoice['rates_type'] = 'Vendor Counter Accepted';
    }

   


    let serviceCharges;
    let salesTax;
    let provinceAuthority;

    let taxData = params.tax;
    let userServiceChargesList = params.userservicecharges;

    userServiceChargesList.filter((x)=>{
      if(invoice['rates_decided'] >> parseInt(x.min) && invoice['rates_decided'] << parseInt(x.max)) {
        console.log('Service Slab Found !')
        serviceCharges = parseInt(x.value);
        
      } else {
        console.log('Service Slab Not Found !')
        serviceCharges = params.onNoProvinceFound.value;
      }
    })

    for(let key in taxData) {
       if(params.request.to.province === taxData[key].provinceLongname) {
        salesTax = taxData[key].value;
        provinceAuthority = taxData[key].provinceShortname;
       } else {
        salesTax = params.onNoProvinceFound.value; 
       }
    } 
    
    console.log('serviceCharges -> ',serviceCharges);
    invoice['serviceCharges'] = parseInt(serviceCharges);
    invoice['fuelAndOtherCharges'] = Math.floor(invoice['rates_decided'] - parseInt(serviceCharges));
    // invoice['taxLocation'] = provinceAuthority;
   


     // Calculate Sales Tax
    let taxValue = Math.floor(parseInt(serviceCharges) * salesTax / 100)
    
    invoice['salesTax'] = taxValue;

    if(params.request.security_deposit) {
      invoice['security_deposit'] = parseInt(params.request.security_deposit);
    }
    
    if(params.request.cargo_value) {
      invoice['cargo_value'] = parseInt(params.request.cargo_value);
    }

    let bilties = params.request.bilty;

    bilties.forEach((bilty,index) => {
      invoice[`Bilty ${index}`] = bilty.biltyNo;
      invoice[`Vehicle Type ${index}`] = bilty.name;
      invoice[`Weight ${index}`] = bilty.weight;
      invoice[`Material ${index}`] = bilty.material;
      
      if(bilty.vehicle_number) {
      invoice[`Vehicle Registration ${index}`] = bilty.vehicle_number;
      }

      if(bilty.vehicle_number) {
        invoice[`Vehicle Registration ${index}`] = bilty.vehicle_number;
      }
    })

    console.log('serviceCharges -> ',invoice['serviceCharges'])
    console.log('salesTax -> ',invoice['salesTax'])
    console.log('fuelAndOtherCharges -> ',invoice['fuelAndOtherCharges'])

    let total = Math.floor(invoice['serviceCharges'] + invoice['salesTax'] + invoice['fuelAndOtherCharges']  + parseInt(invoice['cargo_value']));
    console.log('total -> ',total);

    const toWords = new ToWords();
    let totalInWords = toWords.convert(total, { currency: true });

    invoice['total'] = total;
    invoice['totalInWords'] = totalInWords;

    req.body.customerInvoice = invoice;
    next();
    // res.json({
    //   status:true,
    //   invoice: invoice
    // })

    // pplInvoiceRef
    //   .child(params.request.orderNo)
    //   .set(invoice)
    //   .then(() => {
    //     next();
    //   })
    //   .catch((err) => {
    //     res.json({
    //       status: false,
    //       error: err.message,
    //     });
    //   });
  },
  // Generate Invoice (Vendor)
  (req, res, next) => {
    const params = req.body;

    
    

    let vendorInvoice = {
      ...params.customerInvoice,
      'Transporter Name': params.request.vendor_name,
      'Transporter Address': params.request.company_address,
      'Transporter Contact': params.request.vendor_phone,
    }

    vendorInvoice['invoiceAmount'] = vendorInvoice['rates_decided'];

    let serviceCharges;


    let vendorServiceChargesList = params.vendorservicecharges;

    vendorServiceChargesList.filter((x)=>{
      if(vendorInvoice['rates_decided'] >> parseInt(x.min) && vendorInvoice['rates_decided'] << parseInt(x.max)) {
        console.log('Service Slab Found !')
        serviceCharges = parseInt(x.value);
      } else {
        console.log('Service Slab Not Found !')
        serviceCharges = params.onNoProvinceFound.value;
      }
    })

    vendorInvoice['serviceCharges'] = parseInt(serviceCharges);
    vendorInvoice['fuelAndOtherCharges'] = Math.floor(vendorInvoice['rates_decided'] - parseInt(serviceCharges));


    // invoice['Commission Percent'] = params.commission.value;
    vendorInvoice['Commission'] = Math.floor(vendorInvoice['rates_decided'] * parseInt(params.commission.value) / 100);

    // Withholding Tax
    console.log('withholding_tax -> ',params.withholding_tax);
    let withholdingTax;

    if(params.vendor.filer) {
      withholdingTax = params.withholding_tax.filer.value
    } else {
      withholdingTax = params.withholding_tax.nonfiler.value
    }
   
     console.log('withholdingTax -> ',withholdingTax);

     vendorInvoice['withholdingTax'] = parseInt(withholdingTax);
     vendorInvoice['withholdingTaxValue'] = Math.floor(parseInt(withholdingTax) * parseInt(serviceCharges) / 100);
     
     vendorInvoice['total'] = Math.floor(vendorInvoice['fuelAndOtherCharges'] - vendorInvoice['serviceCharges'] - vendorInvoice['Commission'] - vendorInvoice['withholdingTaxValue']);
     const toWords = new ToWords();
     let totalInWords = toWords.convert(vendorInvoice['total'], { currency: true });
     
     vendorInvoice['totalInWords'] = totalInWords;


     req.body.vendorInvoice = vendorInvoice;
     next();
    
  },
  // Save Invoice 
  (req,res,next) => {
    const params = req.body;

    pplInvoiceRef
      .child(params.request.orderNo)
      .set({
        user: params.customerInvoice,
        vendor: params.vendorInvoice
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
  }
)

// API-21
// /order_reject -> (User Reject Order)
router.post(
  "/order_reject",
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
  // Check User Type (User Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        req.body.user = params.user;
        next();
        break;

      case "pro":
        req.body.user = params.user;
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
  // Check User
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("users")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          console.log("User -> ", req.body.user);
          next();
        } else {
          res.json({
            status: false,
            error: "No User Found !",
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
            req.body.penalty = false;
            next();
            break;

          case "qoute_rejected":
            req.body.request = request;
            req.body.penalty = false;
            next();

            break;

          case "user_counter_accepted":
            req.body.request = request;
            req.body.penalty = true;
            next();

            break;

          case "user_counter_rejected":
            req.body.request = request;
            req.body.penalty = false;
            next();
            break;

          case "vendor_counter_accepted":
            req.body.request = request;
            req.body.penalty = false;
            next();

            break;

          case "vendor_counter_rejected":
            req.body.request = request;
            req.body.penalty = false;
            next();
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
              error: `Order Cannot be Rejected`,
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
  // Update Request
  (req, res, next) => {
    const params = req.body;
    pplRequestRef
      .child(params.orderNo)
      .update({
        status: "rejected",
        penalty: params.penalty,
        order_accepted_on: getCurrentDate(),
        order_accepted_on_timestamp: getCurrentTimestamp(),
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

// API-22
// /order_reject_2 -> (User Reject Order)
router.post(
  "/order_reject_2",
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
      case "admin":
        req.body.user = params.user;
        next();
        break;

      case "pro":
        req.body.user = params.user;
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
  // Get Request Data
  (req, res) => {
    const params = req.body;

    if (params.orderNo) {
      pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
        if (snapshot.val()) {
          const request = snapshot.val();
          switch (request.status) {
            case "cancelled":
              res.json({
                status: false,
                error: `This Order Is Already Cancelled By ${request.cancel_by}`,
              });
              break;

            case "pending":
              if (request.request_type) {
                // Check Bilties
                const bilties = request.bilty;
                let checkBiltyPendingStatus = false;

                bilties.forEach((bilty) => {
                  if (bilty.status === "pending") {
                    checkBiltyPendingStatus = true;
                  }
                });

                if (checkBiltyPendingStatus) {
                  // Update Bilties Statuses To Cancelled and Order Status To Cancel
                  const forupdatebilty = request.bilty;
                  forupdatebilty.forEach((bilty) => {
                    bilty["status"] = "cancelled";
                    bilty["bilty_cancelled_on"] = getCurrentDate();
                    bilty["bilty_cancelled_on_timestamp"] =
                      getCurrentTimestamp();
                  });

                  // console.log('forupdatebilty -> ',forupdatebilty);

                  pplRequestRef
                    .child(request.orderNo)
                    .update({
                      bilty: forupdatebilty,
                      status: "cancelled",
                      order_cancelled_on: getCurrentDate(),
                      order_cancelled_on_timestamp: getCurrentTimestamp(),
                    })
                    .then(() => {
                      if(request.vendor_phone) {
                        fcmTokenRef
                        .child("vendors")
                        .child(request.vendor_phone)
                        .once("value")
                        .then((snapshot) => {
                          send_notification_to_single_user(snapshot.val().fcm_token.token, {
                            title: "Order Rejected",
                            body: `OrderNo#${request.orderNo} has been rejected.`,
                            routes: "MyOrders",
                          });
              
                            let newNotification = notificationsRef.child('vendors').child(request.vendor_phone).push();
                            let AdminNotification = notificationsRef.child('admin').push();
                            newNotification.set({
                              id: newNotification.key,
                              title: "Order Rejected",
                              body: `OrderNo#${request.orderNo} has been rejected.`,
                              created: getCurrentTimestamp(),
                              read: false
                            }).catch(err => console.log('err -> ',err))
              
                            AdminNotification.set({
                              id: AdminNotification.key,
                              title: `User(${request.username}) Rejected The Order`,
                              body: `User(${request.username}) Rejected The Order - OrderNo#${request.orderNo}`,
                              created: getCurrentTimestamp(),
                              read: false
                            }).catch(err => console.log('err -> ',err))
  
  
                            res.json({
                              status: true,
                              message: "Order has been cancelled by user !",
                            });
                        })
                        .catch((e) => console.log("catch: ", e));
                      }


                      if(request.user_phone) {
                        fcmTokenRef
                        .child("users")
                        .child(request.user_phone)
                        .once("value")
                        .then((snapshot) => {
                          send_notification_to_single_user(snapshot.val().fcm_token.token, {
                            title: "Order Rejected",
                            body: `Dear ${request.username},  OrderNo#${request.orderNo} has been rejected.`,
                            routes: "MyOrders",
                          });
              
                            let newNotification = notificationsRef.child('users').child(request.user_phone).push();
                            let AdminNotification = notificationsRef.child('admin').push();
                            newNotification.set({
                              id: newNotification.key,
                              title: "Order Rejected",
                              body: `Dear ${request.username},  OrderNo#${request.orderNo} has been rejected.`,
                              created: getCurrentTimestamp(),
                              read: false
                            }).catch(err => console.log('err -> ',err))
              
                            AdminNotification.set({
                              id: AdminNotification.key,
                              title: `User(${request.username}) Rejected The Order`,
                              body: `User(${request.username}) Rejected The Order - OrderNo#${request.orderNo}`,
                              created: getCurrentTimestamp(),
                              read: false
                            }).catch(err => console.log('err -> ',err))
  
  
                            res.json({
                              status: true,
                              message: "Order has been cancelled by user !",
                            });
                        })
                        .catch((e) => console.log("catch: ", e));
                      }
 
                    })
                    .catch((err) => {
                      res.json({
                        status: false,
                        error: err,
                      });
                    });
                } else {
                  res.json({
                    status: false,
                    error:
                      "You Cannot Cancel Order Now , All Bilties are inprocess !",
                  });
                }
              } else {
                // Check Suborders
                res.json({
                  status: false,
                  error:
                    "For Upcountry Request , Give biltyNo instead of orderNo.",
                });
              }
              break;

            case "accepted":
              if (request.request_type) {
                // Check Bilties
                const bilties = request.bilty;
                let checkBiltyPendingStatus = false;

                bilties.forEach((bilty) => {
                  if (bilty.status === "pending") {
                    checkBiltyPendingStatus = true;
                  }
                });

                if (checkBiltyPendingStatus) {
                  // Update Bilties Statuses To Cancelled and Order Status To Cancel
                  const forupdatebilty = request.bilty;
                  forupdatebilty.forEach((bilty) => {
                    bilty["status"] = "cancelled";
                    bilty["bilty_cancelled_on"] = getCurrentDate();
                    bilty["bilty_cancelled_on_timestamp"] =
                      getCurrentTimestamp();
                  });

                  // console.log('forupdatebilty -> ',forupdatebilty);

                  pplRequestRef
                    .child(request.orderNo)
                    .update({
                      bilty: forupdatebilty,
                      status: "cancelled",
                      order_cancelled_on: getCurrentDate(),
                      order_cancelled_on_timestamp: getCurrentTimestamp(),
                    })
                    .then(() => {
                      res.json({
                        status: true,
                        message: "Order has been cancelled by user !",
                      });
                    })
                    .catch((err) => {
                      res.json({
                        status: false,
                        error: err,
                      });
                    });
                } else {
                  res.json({
                    status: false,
                    error:
                      "You Cannot Cancel Order Now , All Bilties are inprocess !",
                  });
                }
              } else {
                // Check Suborders
                res.json({
                  status: false,
                  error:
                    "For Upcountry Request , Give biltyNo instead of orderNo.",
                });
              }
              break;

            case "qoute_accepted":
              if (request.request_type) {
                // Check Bilties
                const bilties = request.bilty;
                let checkBiltyPendingStatus = false;

                bilties.forEach((bilty) => {
                  if (bilty.status === "pending") {
                    checkBiltyPendingStatus = true;
                  }
                });

                if (checkBiltyPendingStatus) {
                  // Update Bilties Statuses To Cancelled and Order Status To Cancel
                  const forupdatebilty = request.bilty;
                  forupdatebilty.forEach((bilty) => {
                    bilty["status"] = "cancelled";
                    bilty["bilty_cancelled_on"] = getCurrentDate();
                    bilty["order_cancelled_on_timestamp"] =
                      getCurrentTimestamp();
                  });

                  // console.log('forupdatebilty -> ',forupdatebilty);

                  pplRequestRef
                    .child(request.orderNo)
                    .update({
                      bilty: forupdatebilty,
                      status: "cancelled",
                      order_cancelled_on: getCurrentDate(),
                      order_cancelled_on_timestamp: getCurrentTimestamp(),
                    })
                    .then(() => {
                      res.json({
                        status: true,
                        message: "Order has been cancelled by user !",
                      });
                    })
                    .catch((err) => {
                      res.json({
                        status: false,
                        error: err,
                      });
                    });
                } else {
                  res.json({
                    status: false,
                    error:
                      "You Cannot Cancel Order Now , All Bilties are inprocess !",
                  });
                }
              } else {
                // Check Suborders
                res.json({
                  status: false,
                  error:
                    "For Upcountry Request , Give biltyNo instead of orderNo.",
                });
              }
              break;

            case "user_counter_accepted":
              if (request.request_type) {
                // Check Bilties
                const bilties = request.bilty;
                let checkBiltyPendingStatus = false;

                bilties.forEach((bilty) => {
                  if (bilty.status === "pending") {
                    checkBiltyPendingStatus = true;
                  }
                });

                if (checkBiltyPendingStatus) {
                  // Update Bilties Statuses To Cancelled and Order Status To Cancel
                  const forupdatebilty = request.bilty;
                  forupdatebilty.forEach((bilty) => {
                    bilty["status"] = "cancelled";
                    bilty["bilty_cancelled_on"] = getCurrentDate();
                    bilty["bilty_cancelled_on_timestamp"] =
                      getCurrentTimestamp();
                  });

                  // console.log('forupdatebilty -> ',forupdatebilty);

                  pplRequestRef
                    .child(request.orderNo)
                    .update({
                      bilty: forupdatebilty,
                      status: "cancelled",
                      order_cancelled_on: getCurrentDate(),
                      order_cancelled_on_timestamp: getCurrentTimestamp(),
                    })
                    .then(() => {
                      res.json({
                        status: true,
                        message: "Order has been cancelled by user !",
                      });
                    })
                    .catch((err) => {
                      res.json({
                        status: false,
                        error: err,
                      });
                    });
                } else {
                  res.json({
                    status: false,
                    error:
                      "You Cannot Cancel Order Now , All Bilties are inprocess !",
                  });
                }
              } else {
                // Check Suborders
                res.json({
                  status: false,
                  error:
                    "For Upcountry Request , Give biltyNo instead of orderNo.",
                });
              }
              break;

            case "vendor_counter_accepted":
              if (request.request_type) {
                // Check Bilties
                const bilties = request.bilty;
                let checkBiltyPendingStatus = false;

                bilties.forEach((bilty) => {
                  if (bilty.status === "pending") {
                    checkBiltyPendingStatus = true;
                  }
                });

                if (checkBiltyPendingStatus) {
                  // Update Bilties Statuses To Cancelled and Order Status To Cancel
                  const forupdatebilty = request.bilty;
                  forupdatebilty.forEach((bilty) => {
                    bilty["status"] = "cancelled";
                    bilty["bilty_cancelled_on"] = getCurrentDate();
                    bilty["bilty_cancelled_on_timestamp"] =
                      getCurrentTimestamp();
                  });

                  // console.log('forupdatebilty -> ',forupdatebilty);

                  pplRequestRef
                    .child(request.orderNo)
                    .update({
                      bilty: forupdatebilty,
                      status: "cancelled",
                      order_cancelled_on: getCurrentDate(),
                      order_cancelled_on_timestamp: getCurrentTimestamp(),
                    })
                    .then(() => {
                      res.json({
                        status: true,
                        message: "Order has been cancelled by user !",
                      });
                    })
                    .catch((err) => {
                      res.json({
                        status: false,
                        error: err,
                      });
                    });
                } else {
                  res.json({
                    status: false,
                    error:
                      "You Cannot Cancel Order Now , All Bilties are inprocess !",
                  });
                }
              } else {
                // Check Suborders
                res.json({
                  status: false,
                  error:
                    "For Upcountry Request , Give biltyNo instead of orderNo.",
                });
              }
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
                error: `Order Cannot be Rejected -> ${request.status}`,
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
    } else if (params.biltyNo) {
      const getOrderNo = params.biltyNo.slice(2, params.biltyNo.length - 2);

      pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
        if (snapshot.val()) {
          const request = snapshot.val();

          const suborders = request.subOrders;

          suborders.forEach((suborder) => {
            console.log("suborder -> ", suborder.subOrderNo);
            suborder.bilty.forEach((bilty) => {
              if (bilty.biltyNo === params.biltyNo) {
                if (bilty.status === "pending") {
                  bilty["status"] = "cancelled";
                  bilty["bilty_cancelled_on"] = getCurrentDate();
                  bilty["bilty_cancelled_on_timestamp"] = getCurrentTimestamp();
                }
              }
            });
          });

          // Check If All Bilties Of Suborder is cancelled
          let checkAllCancelled = true;

          const convertBiltyNoToSubOrderNo = `SO${params.biltyNo.slice(
            2,
            params.biltyNo.length - 1
          )}`;

          suborders.forEach((suborder) => {
            if (suborder.subOrderNo === convertBiltyNoToSubOrderNo) {
              suborder.bilty.forEach((bilty) => {
                if (bilty.status !== "cancelled") {
                  checkAllCancelled = false;
                  console.log("bilty -> ", bilty);
                }
              });
            }
          });

          console.log("checkAllCancelled -> ", checkAllCancelled);

          if (!checkAllCancelled) {
            pplRequestRef
              .child(request.orderNo)
              .update({
                subOrders: suborders,
              })
              .then(() => {
                res.json({
                  status: true,
                  message: "Bilty has been cancelled by user !",
                });
              })
              .catch((err) => {
                res.json({
                  status: false,
                  error: err.message,
                });
              });
          } else {
            const convertBiltyNoToSubOrderNo = `SO${params.biltyNo.slice(
              2,
              params.biltyNo.length - 1
            )}`;

            suborders.forEach((suborder) => {
              if (suborder.subOrderNo === convertBiltyNoToSubOrderNo) {
                suborder["status"] = "cancelled";
                suborder["suborder_cancelled_on"] = getCurrentDate();
                suborder["suborder_cancelled_on_timestamp"] =
                  getCurrentTimestamp();
              }
            });

            pplRequestRef
              .child(request.orderNo)
              .update({
                subOrders: suborders,
              })
              .then(() => {
                res.json({
                  status: true,
                  message: "Bilty and Suborder has been cancelled by user !",
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
          res.json({
            status: false,
            error: "Request Data Not Found !",
          });
        }
      });
    } else {
      res.json({
        status: false,
        error: "OrderNo / biltyNo not given !",
      });
    }
  }
);

// ======================  Upload Documents (Start) =========================

// API-23
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
  // Check User Type (User Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        // req.body.user = params.user;
        next();
        break;

      case "pro":
        // req.body.user = params.user;
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
  // Check Uploaded Documents
  (req, res, next) => {
    // if (req.files.bill_of_landing && req.files.invoice && req.files.gd) {
    //   next();
    // } else {
    //   res.json({
    //     status: false,
    //     error: "Files is missing !",
    //   });
    // }
    // console.log(req.files);
    next();
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
                  error: "Could Not Found User !",
                });
              }
            });
        }
      });
  },
  // Get FCM Token
  (req, res, next) => {
    const params = req.body;

    if (params.user.type === "user") {
      fcmTokenRef
        .child("users")
        .child(params.user.phone)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const token = snapshot.val();
            req.body.token = token.fcm_token.token;
            next();
          } else {
            // next();
            res.json({
              status: false,
              error: "Couldnt Find FCM Token",
            });
          }
        });
    } else {
      next();
    }
  },
  // Check Request
  (req, res, next) => {
    const params = req.body;
    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        // TODO : ADD REQUEST STATUS CONDITIION
        req.body.request = snapshot.val();
        const request = snapshot.val();
        if (request.request_type) {
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
  // Get Images Links
  async (req, res, next) => {
    const params = req.body;
    var fileNames = [];

    let options = {
      prefix: `UpcountryDocuments/${params.orderNo}/`,
    };

    const [files] = await storage.bucket(`meribilty-files`).getFiles(options);

    files.forEach((file, i) => {
      if (`UpcountryDocuments/${params.orderNo}/` !== file.name) {
        fileNames.push(file.name);
      }
    });
    req.body.fileNames = fileNames;
    next();
  },
  // Upload Documents To Google Cloud Storage
  (req, res, next) => {
    const alreadyUploadedDocs = req.body.fileNames;
    var currentUploadingDocs = [];
    const path = `UpcountryDocuments/${req.body.orderNo}/`;
    const bucket = storage.bucket(`meribilty-files`);

    // Uploading Bill of landing
    if (req.files.bill_of_landing) {
      const { bill_of_landing } = req.files;

      const bill_of_landing_filename = bill_of_landing.name;
      const bill_of_landing_filetype = bill_of_landing_filename.split(".")[1];
      const bill_of_landing_name = `${req.body.request.orderNo}_bill_of_landing`;

      var toBeUpdated = null;
      alreadyUploadedDocs.forEach((alreadyDoc) => {
        if (path + bill_of_landing_name === alreadyDoc.split(".")[0]) {
          toBeUpdated = alreadyDoc;
        }
      });
      toBeUpdated !== null
        ? bucket
            .file(toBeUpdated)
            .delete()
            .then((doc) => {
              fileUpload(
                bill_of_landing,
                bill_of_landing_name,
                path,
                bill_of_landing_filetype,
                (err) => {
                  if (err) {
                    console.log("err -> ", err);
                  } else {
                    console.log("bill of landing Updated!");
                    currentUploadingDocs.push({
                      name: `${path}${bill_of_landing_name}.${bill_of_landing_filetype}`,
                      url: `https://storage.googleapis.com/meribilty-files/${path}${bill_of_landing_name}.${bill_of_landing_filetype}`,
                    });
                  }
                }
              );
            })
            .catch((e) => {
              if (e.code === 404) {
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
                      currentUploadingDocs.push({
                        name: `${path}${bill_of_landing_name}.${bill_of_landing_filetype}`,
                        url: `https://storage.googleapis.com/meribilty-files/${path}${bill_of_landing_name}.${bill_of_landing_filetype}`,
                      });
                    }
                  }
                );
              }
            })
        : fileUpload(
            bill_of_landing,
            bill_of_landing_name,
            path,
            bill_of_landing_filetype,
            (err) => {
              if (err) {
                console.log("err -> ", err);
              } else {
                console.log("bill of landing uploaded");
                currentUploadingDocs.push({
                  name: `${path}${bill_of_landing_name}.${bill_of_landing_filetype}`,
                  url: `https://storage.googleapis.com/meribilty-files/${path}${bill_of_landing_name}.${bill_of_landing_filetype}`,
                });
              }
            }
          );
    }

    // Uploading Invoice
    if (req.files.detail_packing_list) {
      const { detail_packing_list } = req.files;

      const detail_packing_list_filename = detail_packing_list.name;
      const detail_packing_list_filetype =
        detail_packing_list_filename.split(".")[1];
      const detail_packing_list_name = `${req.body.request.orderNo}_detail_packing_list`;

      var toBeUpdated = null;
      alreadyUploadedDocs.forEach((alreadyDoc) => {
        if (path + detail_packing_list === alreadyDoc.split(".")[0]) {
          toBeUpdated = alreadyDoc;
        }
      });
      toBeUpdated !== null
        ? bucket
            .file(toBeUpdated)
            .delete()
            .then(() => {
              fileUpload(
                detail_packing_list,
                detail_packing_list_name,
                path,
                detail_packing_list_filetype,
                (err) => {
                  if (err) {
                    console.log("err -> ", err);
                  } else {
                    console.log("bill of landing Updated!");
                    currentUploadingDocs.push({
                      name: `${path}${detail_packing_list_name}.${detail_packing_list_filetype}`,
                      url: `https://storage.googleapis.com/meribilty-files/${path}${detail_packing_list_name}.${detail_packing_list_filetype}`,
                    });
                  }
                }
              );
            })
            .catch((e) => {
              if (e.code === 404) {
                fileUpload(
                  detail_packing_list,
                  detail_packing_list_name,
                  path,
                  detail_packing_list_filetype,
                  (err) => {
                    if (err) {
                      console.log("err -> ", err);
                    } else {
                      console.log("detail packing list uploaded");
                      currentUploadingDocs.push({
                        name: `${path}${detail_packing_list_name}.${detail_packing_list_filetype}`,
                        url: `https://storage.googleapis.com/meribilty-files/${path}${detail_packing_list_name}.${detail_packing_list_filetype}`,
                      });
                    }
                  }
                );
              }
            })
        : fileUpload(
            detail_packing_list,
            detail_packing_list_name,
            path,
            detail_packing_list_filetype,
            (err) => {
              if (err) {
                console.log("err -> ", err);
              } else {
                console.log("detail packing list uploaded");
                currentUploadingDocs.push({
                  name: `${path}${detail_packing_list_name}.${detail_packing_list_filetype}`,
                  url: `https://storage.googleapis.com/meribilty-files/${path}${detail_packing_list_name}.${detail_packing_list_filetype}`,
                });
              }
            }
          );
    }

    const myTimer = setInterval(() => {
      if (currentUploadingDocs.length.toString() === req.body.docLength) {
        req.body.currentUploadingDocs = currentUploadingDocs;
        clearInterval(myTimer);

        next();
      }
    }, 2000);
  },
  // Update Request
  (req, res) => {
    const params = req.body;
    pplRequestRef
      .child(params.orderNo)
      .update({
        documents: params.currentUploadingDocs,
        documents_uploaded_on: getCurrentDate(),
        documents_uploaded_on_timestamp: getCurrentTimestamp(),
      })
      .then(() => {
        res.json({
          status: true,
          message: "Document Uploaded Successfully !",
          documentsUploaded: params.currentUploadingDocs,
        });
        fcmTokenRef
          .child("vendors")
          .child(params.vendor_phone)
          .once("value")
          .then((snapshot) => {
            send_notification_to_single_user(snapshot.val().fcm_token.token, {
              title: "Documents uploaded",
              body: `Dear ${params.vendor_name}, refering ${params.orderNo}, documents have been submitted.`,
              routes: "MyOrders",
            });

              let newNotification = notificationsRef.child('vendors').child(params.vendor_phone).push();
              let AdminNotification = notificationsRef.child('admin').push();
              newNotification.set({
                id: newNotification.key,
                title: "Documents uploaded",
                body: `Dear ${params.vendor_name}, refering ${params.orderNo}, documents have been submitted.`,
                created: getCurrentTimestamp(),
                read: false
              }).catch(err => console.log('err -> ',err))

              AdminNotification.set({
                id: AdminNotification.key,
                title: `User(${params.user.fullname}) Uploaded Documents`,
                body: `User(${params.user.fullname}) Uploaded Documents On OrderNo#${params.orderNo}`,
                created: getCurrentTimestamp(),
                read: false
              }).catch(err => console.log('err -> ',err))
          })
          .catch((e) => console.log("catch: ", e));
      })

      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// API-24
// user_upload_transit_cargo_documents -> Transit cargo Important Documents (After User Accepts Bilty)
router.post(
  "/user_upload_transit_cargo_documents",
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
  // Check User Type (User Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        // req.body.user = params.user;
        next();
        break;

      case "pro":
        // req.body.user = params.user;
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
  // Check Uploaded Documents
  (req, res, next) => {
    // if (req.files.bill_of_landing && req.files.invoice && req.files.gd) {
    //   next();
    // } else {
    //   res.json({
    //     status: false,
    //     error: "Files is missing !",
    //   });
    // }
    // console.log(req.files);
    next();
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
                  error: "Could Not Found User !",
                });
              }
            });
        }
      });
  },
  // Get FCM Token
  (req, res, next) => {
    const params = req.body;

    if (params.user.type === "user") {
      fcmTokenRef
        .child("users")
        .child(params.user.phone)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const token = snapshot.val();
            req.body.token = token.fcm_token.token;
            next();
          } else {
            // next();
            res.json({
              status: false,
              error: "Couldnt Find FCM Token",
            });
          }
        });
    } else {
      next();
    }
  },
  // Check Request
  (req, res, next) => {
    const params = req.body;
    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        // TODO : ADD REQUEST STATUS CONDITIION
        req.body.request = snapshot.val();
        const request = snapshot.val();
        if (request.request_type) {
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
  // Get Images Links
  async (req, res, next) => {
    const params = req.body;
    var fileNames = [];

    let options = {
      prefix: `TransitCargoDocuments/${params.orderNo}/`,
    };

    const [files] = await storage.bucket(`meribilty-files`).getFiles(options);

    files.forEach((file, i) => {
      if (`TransitCargoDocuments/${params.orderNo}/` !== file.name) {
        fileNames.push(file.name);
      }
    });
    req.body.fileNames = fileNames;
    next();
  },
  // Upload Documents To Google Cloud Storage
  (req, res, next) => {
    const alreadyUploadedDocs = req.body.fileNames;
    var currentUploadingDocs = [];
    const path = `TransitCargoDocuments/${req.body.orderNo}/`;
    const bucket = storage.bucket(`meribilty-files`);

    // Uploading Bill of landing
    if (req.files.bill_of_landing) {
      const { bill_of_landing } = req.files;

      const bill_of_landing_filename = bill_of_landing.name;
      const bill_of_landing_filetype = bill_of_landing_filename.split(".")[1];
      const bill_of_landing_name = `${req.body.request.orderNo}_bill_of_landing`;

      var toBeUpdated = null;
      alreadyUploadedDocs.forEach((alreadyDoc) => {
        if (path + bill_of_landing_name === alreadyDoc.split(".")[0]) {
          toBeUpdated = alreadyDoc;
        }
      });
      toBeUpdated !== null
        ? bucket
            .file(toBeUpdated)
            .delete()
            .then((doc) => {
              fileUpload(
                bill_of_landing,
                bill_of_landing_name,
                path,
                bill_of_landing_filetype,
                (err) => {
                  if (err) {
                    console.log("err -> ", err);
                  } else {
                    console.log("bill of landing Updated!");
                    currentUploadingDocs.push({
                      name: `${path}${bill_of_landing_name}.${bill_of_landing_filetype}`,
                      url: `https://storage.googleapis.com/meribilty-files/${path}${bill_of_landing_name}.${bill_of_landing_filetype}`,
                    });
                  }
                }
              );
            })
            .catch((e) => {
              if (e.code === 404) {
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
                      currentUploadingDocs.push({
                        name: `${path}${bill_of_landing_name}.${bill_of_landing_filetype}`,
                        url: `https://storage.googleapis.com/meribilty-files/${path}${bill_of_landing_name}.${bill_of_landing_filetype}`,
                      });
                    }
                  }
                );
              }
            })
        : fileUpload(
            bill_of_landing,
            bill_of_landing_name,
            path,
            bill_of_landing_filetype,
            (err) => {
              if (err) {
                console.log("err -> ", err);
              } else {
                console.log("bill of landing uploaded");
                currentUploadingDocs.push({
                  name: `${path}${bill_of_landing_name}.${bill_of_landing_filetype}`,
                  url: `https://storage.googleapis.com/meribilty-files/${path}${bill_of_landing_name}.${bill_of_landing_filetype}`,
                });
              }
            }
          );
    }

    // Uploading Invoice
    if (req.files.invoice) {
      const { invoice } = req.files;

      const invoice_filename = invoice.name;
      const invoice_filetype = invoice_filename.split(".")[1];
      const invoice_name = `${req.body.request.orderNo}_invoice`;

      var toBeUpdated = null;
      alreadyUploadedDocs.forEach((alreadyDoc) => {
        if (path + invoice_name === alreadyDoc.split(".")[0]) {
          toBeUpdated = alreadyDoc;
        }
      });
      toBeUpdated !== null
        ? bucket
            .file(toBeUpdated)
            .delete()
            .then((doc) => {
              fileUpload(
                invoice,
                invoice_name,
                path,
                invoice_filetype,
                (err) => {
                  if (err) {
                    console.log("err -> ", err);
                  } else {
                    console.log("bill of landing Updated!");
                    currentUploadingDocs.push({
                      name: `${path}${invoice_name}.${invoice_filetype}`,
                      url: `https://storage.googleapis.com/meribilty-files/${path}${invoice_name}.${invoice_filetype}`,
                    });
                  }
                }
              );
            })
            .catch((e) => {
              if (e.code === 404) {
                fileUpload(
                  invoice,
                  invoice_name,
                  path,
                  invoice_filetype,
                  (err) => {
                    if (err) {
                      console.log("err -> ", err);
                    } else {
                      console.log("bill of landing uploaded");
                      currentUploadingDocs.push({
                        name: `${path}${invoice_name}.${invoice_filetype}`,
                        url: `https://storage.googleapis.com/meribilty-files/${path}${invoice_name}.${invoice_filetype}`,
                      });
                    }
                  }
                );
              }
            })
        : fileUpload(invoice, invoice_name, path, invoice_filetype, (err) => {
            if (err) {
              console.log("err -> ", err);
            } else {
              console.log("bill of landing uploaded");
              currentUploadingDocs.push({
                name: `${path}${invoice_name}.${invoice_filetype}`,
                url: `https://storage.googleapis.com/meribilty-files/${path}${invoice_name}.${invoice_filetype}`,
              });
            }
          });
    }

    // Uploading gd
    if (req.files.gd) {
      const { gd } = req.files;

      const gd_filename = gd.name;
      const gd_filetype = gd_filename.split(".")[1];
      const gd_name = `${req.body.request.orderNo}_gd`;

      var toBeUpdated = null;
      alreadyUploadedDocs.forEach((alreadyDoc) => {
        if (path + gd_name === alreadyDoc.split(".")[0]) {
          toBeUpdated = alreadyDoc;
        }
      });
      toBeUpdated !== null
        ? bucket
            .file(toBeUpdated)
            .delete()
            .then((doc) => {
              fileUpload(gd, gd_name, path, gd_filetype, (err) => {
                if (err) {
                  console.log("err -> ", err);
                } else {
                  console.log("gd of landing uploaded");
                  currentUploadingDocs.push({
                    name: `${path}${gd_name}.${gd_filetype}`,
                    url: `https://storage.googleapis.com/meribilty-files/${path}${gd_name}.${gd_filetype}`,
                  });
                }
              });
            })
            .catch((e) => {
              if (e.code === 404) {
                fileUpload(gd, gd_name, path, gd_filetype, (err) => {
                  if (err) {
                    console.log("err -> ", err);
                  } else {
                    console.log("gd of landing uploaded");
                    currentUploadingDocs.push({
                      name: `${path}${gd_name}.${gd_filetype}`,
                      url: `https://storage.googleapis.com/meribilty-files/${path}${gd_name}.${gd_filetype}`,
                    });
                  }
                });
              }
            })
        : fileUpload(gd, gd_name, path, gd_filetype, (err) => {
            if (err) {
              console.log("err -> ", err);
            } else {
              console.log("gd of landing uploaded");
              currentUploadingDocs.push({
                name: `${path}${gd_name}.${gd_filetype}`,
                url: `https://storage.googleapis.com/meribilty-files/${path}${gd_name}.${gd_filetype}`,
              });
            }
          });
    }

    // Uploading Demand Letter
    if (req.files.demand_letter) {
      const { demand_letter } = req.files;

      const demand_letter_filename = demand_letter.name;
      const demand_letter_filetype = demand_letter_filename.split(".")[1];
      const demand_letter_name = `${req.body.request.orderNo}_demand_letter`;

      var toBeUpdated = null;
      alreadyUploadedDocs.forEach((alreadyDoc) => {
        if (path + demand_letter_name === alreadyDoc.split(".")[0]) {
          toBeUpdated = alreadyDoc;
        }
      });
      toBeUpdated !== null
        ? bucket
            .file(toBeUpdated)
            .delete()
            .then((doc) => {
              fileUpload(
                demand_letter,
                demand_letter_name,
                path,
                demand_letter_filetype,
                (err) => {
                  if (err) {
                    console.log("err -> ", err);
                  } else {
                    console.log("demand_letter of landing uploaded");
                    currentUploadingDocs.push({
                      name: `${path}${demand_letter_name}.${demand_letter_filetype}`,
                      url: `https://storage.googleapis.com/meribilty-files/${path}${demand_letter_name}.${demand_letter_filetype}`,
                    });
                  }
                }
              );
            })
            .catch((e) => {
              if (e.code === 404) {
                fileUpload(
                  demand_letter,
                  demand_letter_name,
                  path,
                  demand_letter_filetype,
                  (err) => {
                    if (err) {
                      console.log("err -> ", err);
                    } else {
                      console.log("demand_letter of landing uploaded");
                      currentUploadingDocs.push({
                        name: `${path}${demand_letter_name}.${demand_letter_filetype}`,
                        url: `https://storage.googleapis.com/meribilty-files/${path}${demand_letter_name}.${demand_letter_filetype}`,
                      });
                    }
                  }
                );
              }
            })
        : fileUpload(
            demand_letter,
            demand_letter_name,
            path,
            demand_letter_filetype,
            (err) => {
              if (err) {
                console.log("err -> ", err);
              } else {
                console.log("demand_letter of landing uploaded");
                currentUploadingDocs.push({
                  name: `${path}${demand_letter_name}.${demand_letter_filetype}`,
                  url: `https://storage.googleapis.com/meribilty-files/${path}${demand_letter_name}.${demand_letter_filetype}`,
                });
              }
            }
          );
    }
    // Uploading Packaging List
    if (req.files.packaging_list) {
      const { packaging_list } = req.files;

      const packaging_list_filename = packaging_list.name;
      const packaging_list_filetype = packaging_list_filename.split(".")[1];
      const packaging_list_name = `${req.body.request.orderNo}_packaging_list`;

      var toBeUpdated = null;
      alreadyUploadedDocs.forEach((alreadyDoc) => {
        if (path + packaging_list_name === alreadyDoc.split(".")[0]) {
          toBeUpdated = alreadyDoc;
        }
      });
      toBeUpdated !== null
        ? bucket
            .file(toBeUpdated)
            .delete()
            .then((doc) => {
              fileUpload(
                packaging_list,
                packaging_list_name,
                path,
                packaging_list_filetype,
                (err) => {
                  if (err) {
                    console.log("err -> ", err);
                  } else {
                    console.log("packaging_list of landing uploaded");
                    currentUploadingDocs.push({
                      name: `${path}${packaging_list_name}.${packaging_list_filetype}`,
                      url: `https://storage.googleapis.com/meribilty-files/${path}${packaging_list_name}.${packaging_list_filetype}`,
                    });
                  }
                }
              );
            })
            .catch((e) => {
              if (e.code === 404) {
                fileUpload(
                  packaging_list,
                  packaging_list_name,
                  path,
                  packaging_list_filetype,
                  (err) => {
                    if (err) {
                      console.log("err -> ", err);
                    } else {
                      console.log("packaging_list of landing uploaded");
                      currentUploadingDocs.push({
                        name: `${path}${packaging_list_name}.${packaging_list_filetype}`,
                        url: `https://storage.googleapis.com/meribilty-files/${path}${packaging_list_name}.${packaging_list_filetype}`,
                      });
                    }
                  }
                );
              }
            })
        : fileUpload(
            packaging_list,
            packaging_list_name,
            path,
            packaging_list_filetype,
            (err) => {
              if (err) {
                console.log("err -> ", err);
              } else {
                console.log("packaging_list of landing uploaded");
                currentUploadingDocs.push({
                  name: `${path}${packaging_list_name}.${packaging_list_filetype}`,
                  url: `https://storage.googleapis.com/meribilty-files/${path}${packaging_list_name}.${packaging_list_filetype}`,
                });
              }
            }
          );
    }

    const myTimer = setInterval(() => {
      if (currentUploadingDocs.length.toString() === req.body.docLength) {
        req.body.currentUploadingDocs = currentUploadingDocs;
        clearInterval(myTimer);

        next();
      }
    }, 2000);
  },
  // Update Request
  (req, res) => {
    const params = req.body;
    pplRequestRef
      .child(params.orderNo)
      .update({
        documents: params.currentUploadingDocs,
        documents_uploaded_on: getCurrentDate(),
        documents_uploaded_on_timestamp: getCurrentTimestamp(),
      })
      .then(() => {
        res.json({
          status: true,
          message: "Document Uploaded Successfully !",
          documentsUploaded: params.currentUploadingDocs,
        });
        fcmTokenRef
          .child("vendors")
          .child(params.vendor_phone)
          .once("value")
          .then((snapshot) => {
            send_notification_to_single_user(snapshot.val().fcm_token.token, {
              title: "Documents uploaded",
              body: `Dear ${params.vendor_name}, refering ${params.orderNo}, documents have been submitted.`,
              routes: "MyOrders",
            });

            let newNotification = notificationsRef.child('vendors').child(params.vendor_phone).push();
            let AdminNotification = notificationsRef.child('admin').push();
            newNotification.set({
              id: newNotification.key,
              title: "Documents uploaded",
              body: `Dear ${params.vendor_name}, refering ${params.orderNo}, documents have been submitted.`,
              created: getCurrentTimestamp(),
              read: false
            }).catch(err => console.log('err -> ',err))

            AdminNotification.set({
              id: AdminNotification.key,
              title: `User(${params.user.fullname}) Uploaded Documents`,
              body: `User(${params.user.fullname}) Uploaded Documents On OrderNo#${params.orderNo}`,
              created: getCurrentTimestamp(),
              read: false
            }).catch(err => console.log('err -> ',err))


          })
          .catch((e) => console.log("catch: ", e));
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// ======================  Upload Documents (End) =========================

// ======================  After Order Acceptance (Start) =========================

// API-25

// /vendor_allot_vehicle_and_driver_to_request -> (Vendor Allots Vehicle & Driver To A Bilty)
router.post(
  "/vendor_allot_vehicle_and_driver_to_request",
  body("biltyNo").isString().withMessage("biltyNo must be string"),
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
          error: `${params.user.user_type} cannot make bilty request !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.vendorOrdriver.type} cannot make bilty request !`,
        });
        break;
    }
  },
  // Check Request
  (req, res, next) => {
    const params = req.body;

    let getLength = params.biltyNo.length;
    const getOrderNo = params.biltyNo.slice(2, getLength - 2);

    req.body.orderNo = getOrderNo;
    console.log(getOrderNo);

    pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
      const request = snapshot.val();
      if (request) {
        if (request.status == "accepted") {
          req.body.request = request;
          // console.log("order -> ", request);
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
              if (bilty.type === "vehicle") {
                if (bilty.status == "pending") {
                  req.body.bilty = bilty;
                  next();
                } else {
                  res.json({
                    status: false,
                    error: `Cannot Allot Vehicle And Driver To Bilty - Bilty Status is ${bilty.status} !`,
                  });
                }
              }

              if (bilty.type === "loading/unloading") {
                if (!bilty.driver_phone) {
                  req.body.bilty = bilty;
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
    } else {
      res.json({
        status: false,
        error: "Unknown Type !",
      });
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
            req.body.driver = driver;
            console.log("driver -> ", driver);
            next();
          } else {
            res.json({
              status: false,
              error: "driver is busy !",
            });
          }

          // if (driver.password) {

          // } else {
          //   res.json({
          //     status: false,
          //     error: "This driver is not active, driver needs to login and setup the password first !"
          //   })
          // }
        } else {
          console.log("driver not found -> ");
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
          const vehicles = [];
          snapshot.forEach((snap) => {
            vehicles.push(snap.val());
          });

          if (vehicles.length >= 1) {
            let vehicle = vehicles[0];
            if (vehicle.available) {
              req.body.vehicle = vehicle;
              console.log("vehicle -> ", vehicle);
              next();
            } else {
              res.json({
                status: false,
                error: "Vehicle Is Not Available Right Now !",
              });
            }
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
          bilty["vendor"] = params.vendor.user_id;
          bilty["vehicle_id"] = params.vehicle.id;
          bilty["driver_alotted_on"] = getCurrentDate();
          bilty["driver_alotted_on_timestamp"] = getCurrentTimestamp();

          req.body.bilty = bilty;
        }
      });

      pplRequestRef
        .child(params.request.orderNo)
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
    } else {
      res.json("unknown request type");
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
        request_type: params.request.request_type,
      })
      .then(() => {
        pplVendorVehicleRef
          .child(params.vehicle.id)
          .update({
            available: false,
            bilty: params.biltyNo,
            request_type: params.request.request_type,
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
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  },
  // Get Updated Request
  (req, res, next) => {
    const params = req.body;

    let getLength = params.biltyNo.length;
    const getOrderNo = params.biltyNo.slice(2, getLength - 2);

    req.body.orderNo = getOrderNo;
    // console.log(getOrderNo);

    pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
      const request = snapshot.val();
      if (request) {
        if (request.status == "accepted") {
          req.body.request = request;
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
  // Update Invoice
  (req, res, next) => {
    const params = req.body;

    pplInvoiceRef
      .child(params.request.orderNo)
      .update({
        ...params.request,
      })
      .then(() => {
        // req.body.invoice = invoice;
        next();
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err,
        });
      });
  },
  // Create Driver History
  (req, res, next) => {
    const params = req.body;
    const newHistory = driverHistoryRef.child(params.vehicle_driver).push();

    let data = {};
    newHistory
      .set({
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
        driver_name: params.driver.fullname,
        driver_phone: params.driver.phone,
        user_type: params.request.user_type,
        username: params.request.username,
        biltyNo: params.biltyNo,
        request_created_at: params.request.createdAt,
        driver_alotted_on: getCurrentDate(),
        driver_alotted_on_timestamp: getCurrentTimestamp(),
        paymentMethod: params.request.payment_method,
        contactPerson: params.request.contact_person,
        bilty_status: params.bilty.status || null,
        status: params.request.status,
        vendor_phone: params.vendor.user_id,
        type:
          params.request.request_type === "transit" ||
          params.request.request_type === "upcountry"
            ? "ppl"
            : "scm",
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
  (req, res) => {
    const params = req.body;

    // send_noti - vendor_allot_vehicle_and_driver_to_request
    fcmTokenRef
      .child("drivers")
      .child(params.vehicle_driver)
      .once("value")
      .then((snapshot) => {
        send_notification_to_single_user(snapshot.val().fcm_token.token, {
          title: "Driver: Assigned by vendor",
          body: `Dear ${params.driver.fullname}, refering ${params.request.orderNo}, your are assigned with truck registration number ${params.vehicle_number}.`,
        });

        let newNotification = notificationsRef.child('drivers').child(params.vehicle_driver).push();
        let AdminNotification = notificationsRef.child('admin').push();
        newNotification.set({
          id: newNotification.key,
          title: "Driver: Assigned by vendor",
          body: `Dear ${params.driver.fullname}, refering ${params.request.orderNo}, your are assigned with truck registration number ${params.vehicle_number}.`,
          created: getCurrentTimestamp(),
          read: false
        }).catch(err => console.log('err -> ',err))

        AdminNotification.set({
          id: AdminNotification.key,
          title: `Vendor(${params.vendor.user_id}) Assigned Driver`,
          body: `Vendor(${params.vendor.user_id}) Assigned Driver(${params.vehicle_driver}) On OrderNo#${params.orderNo}`,
          created: getCurrentTimestamp(),
          read: false
        }).catch(err => console.log('err -> ',err))
      });

    fcmTokenRef
      .child("users")
      .child(params.request.user_phone)
      .once("value")
      .then((snapshot) => {
        send_notification_to_single_user(snapshot.val().fcm_token.token, {
          title: "Driver: Assigned by vendor",
          body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} with truck registration number ${params.vehicle_number} has been assigned.`,
          routes: "MyOrders",
        });


        let newNotification = notificationsRef.child('users').child(params.request.user_phone).push();
        let AdminNotification = notificationsRef.child('admin').push();
        newNotification.set({
          id: newNotification.key,
          title: "Driver: Assigned by vendor",
          body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.driver.fullname} with truck registration number ${params.vehicle_number} has been assigned.`,
          created: getCurrentTimestamp(),
          read: false
        }).catch(err => console.log('err -> ',err))

        AdminNotification.set({
          id: AdminNotification.key,
          title: `Vendor(${params.vendor.user_id}) Assigned Driver`,
          body: `Vendor(${params.vendor.user_id}) Assigned Driver(${params.driver.fullname}) On OrderNo#${params.orderNo} with truck registration number ${params.vehicle_number}`,
          created: getCurrentTimestamp(),
          read: false
        }).catch(err => console.log('err -> ',err))
      });

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
          error: `${params.user.user_type} cannot make bilty request !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.vendorOrdriver.type} cannot make bilty request !`,
        });
        break;
    }
  },
  // Check Request
  (req, res, next) => {
    const params = req.body;

    let getLength = params.biltyNo.length;
    const getOrderNo = params.biltyNo.slice(2, getLength - 2);

    req.body.orderNo = getOrderNo;
    console.log(getOrderNo);

    pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
      const request = snapshot.val();
      if (request) {
        if (request.status == "accepted") {
          req.body.request = request;
          // console.log("order -> ", request);
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

            if (bilty.type === "loading/unloading") {
              if (!bilty.driver_phone) {
                req.body.bilty = bilty;
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
  }, // Check Vehicle & Driver Allotment Status
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type) {
      const transitbilties = params.request.bilty;

      console.log("loading/unloading");
      // res.status(200).send('loading/unloading')

      transitbilties.forEach((bilty) => {
        if (bilty["biltyNo"] == params.biltyNo) {
          let loading = bilty.loading_options;
          let unloading = bilty.unloading_options;
          let optionUpdateStatus = false;
          req.body.bilty = bilty;

          console.log("loading -> ", loading);
          console.log("unloading -> ", unloading);

          if (bilty.loading_options) {
            bilty.loading_options.forEach((x, index) => {
              if (x.id === params.option_id) {
                console.log("loading id matched");

                x["driver_name"] = params.vehicle_driver_name;
                x["driver_phone"] = params.vehicle_driver;
                x["driver_alotted_on"] = getCurrentDate();
                (x["driver_alotted_on_timestamp"] = getCurrentTimestamp()),
                  (optionUpdateStatus = true);
              }
            });
          }

          if (bilty.unloading_options) {
            bilty.unloading_options.forEach((x, index) => {
              if (x.id === params.option_id) {
                req.body.currentOption = x;
                console.log("unloading id matched");

                x["driver_name"] = params.vehicle_driver_name;
                x["driver_phone"] = params.vehicle_driver;
                x["driver_alotted_on"] = getCurrentDate();
                (x["driver_alotted_on_timestamp"] = getCurrentTimestamp()),
                  (optionUpdateStatus = true);
              }
            });
          }

          if (optionUpdateStatus) {
            console.log("updated loading -> ", loading);
            console.log("updated unloading -> ", unloading);
          } else {
            console.log("option not found");

            res.status(200).json({
              status: false,
              error: "Option Not Found !",
            });
          }
        }
      });

      pplRequestRef
        .child(params.request.orderNo)
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
    } else {
      res.json("unknown request type");
    }
  },
  // Send Notifications
  (req, res) => {
    const params = req.body;

    // send_noti - vendor_allot_vehicle_and_driver_to_request
    fcmTokenRef
      .child("drivers")
      .child(params.vehicle_driver)
      .once("value")
      .then((snapshot) => {
        send_notification_to_single_user(snapshot.val().fcm_token.token, {
          title: "Driver: Assigned by vendor",
          body: `Dear ${params.driver.fullname}, refering ${params.request.orderNo}, your are assigned to ${req.body.currentOption.type} option - ${params.currentOption.name}.`,
        });

        let newNotification = notificationsRef.child('drivers').child(params.vehicle_driver).push();
        let AdminNotification = notificationsRef.child('admin').push();
        newNotification.set({
          id: newNotification.key,
          title: "Driver: Assigned by vendor",
          body: `Dear ${params.driver.fullname}, refering ${params.request.orderNo}, assigned to ${req.body.currentOption.type} option - ${params.currentOption.name}.`,
          created: getCurrentTimestamp(),
          read: false
        }).catch(err => console.log('err -> ',err))

       
      });

    fcmTokenRef
      .child("users")
      .child(params.request.user_phone)
      .once("value")
      .then((snapshot) => {
        send_notification_to_single_user(snapshot.val().fcm_token.token, {
          title: "Driver: Assigned by vendor",
          body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.vehicle_driver_name} with ${req.body.currentOption.type} option - ${params.currentOption.name} has been assigned.`,
          routes: "MyOrders",
        });

        let newNotification = notificationsRef.child('users').child(params.request.user_phone).push();
        let AdminNotification = notificationsRef.child('admin').push();
        newNotification.set({
          id: newNotification.key,
          title: "Driver: Assigned by vendor",
          body: `Dear ${params.request.username}, refering ${params.request.orderNo}, ${params.vehicle_driver_name} with ${req.body.currentOption.type} option - ${params.currentOption.name} has been assigned.`,
          created: getCurrentTimestamp(),
          read: false
        }).catch(err => console.log('err -> ',err))

        AdminNotification.set({
          id: AdminNotification.key,
          title: `Vendor(${params.vendor.user_id}) Assigned Driver`,
          body: `Vendor(${params.vendor.user_id}) Assigned Driver(${params.vehicle_driver}) On OrderNo#${params.orderNo}, assigned to ${req.body.currentOption.type} option - ${params.currentOption.name}`,
          created: getCurrentTimestamp(),
          read: false
        }).catch(err => console.log('err -> ',err))
      });

    res.json({
      status: true,
      message: `Vendor Alloted Driver (${params.vehicle_driver}) to biltyNo#${params.biltyNo}`,
    });
  }
);

// API-26
// Vendor Update Driver Status => Reached To The Origin Location
// /vendor_update_driver_reached_origin
// {
//    "token": "",
//    "biltyNo": "",
// }
router.post(
  "/vendor_update_driver_reached_origin",
  body("token").isString().withMessage("token required !"),
  body("biltyNo")
    .isString()
    .withMessage("biltyNo must be BT0004 Format For SCM !"),
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
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: "Drivers cannot use this service ! only vendors can !",
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
    //  FOR PPL REQUESTS
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
              console.log("bilty -> ", bilty);

              if (bilty.status == "inprocess") {
                req.body.bilty = bilty;
                next();
              } else {
                res.json({
                  status: false,
                  error: `Cannot Update Bilty - Driver Not Alloted and Bilty Status is ${bilty.status} !`,
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
    } else {
      res.json({
        status: false,
        error: "Unknown Request Type - (Check Bilty Status For PPL)",
      });
    }
  },
  // Update Bilty For PPL
  (req, res, next) => {
    const params = req.body;

    const getOrderNo = params.biltyNo.slice(2, params.biltyNo.length - 2);
    if (params.request.request_type) {
      const transitbilties = params.request.bilty;

      transitbilties.forEach((bilty) => {
        if (bilty["biltyNo"] == params.biltyNo) {
          if (bilty.driver_phone) {
            bilty["status"] = "driver_reached";
            bilty["driver_reached_on"] = getCurrentDate();
            bilty["driver_reached_on_timestamp"] = getCurrentTimestamp();
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
    } else {
      res.json({
        status: false,
        error: "Unknown Request Type - (Update Bilty For PPL)",
      });
    }
  },
  // Done
  (req, res, next) => {
    const params = req.body;

    res.json({
      status: true,
      error: "Driver reached successfully!",
    });
  }
);

// API-27
// Vendor Update Driver Status => Driver Picked Up The Load
// /vendor_update_picked_up_load
// {
//    "token": "",
//    "biltyNo": "",
// }
router.post(
  "/vendor_update_picked_up_load",
  body("token").isString().withMessage("token required !"),
  body("biltyNo").isString().withMessage("Invalid Phone Number !"),
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
  // Check Driver / Get Driver Data
  (req, res, next) => {
    const params = req.body;
    if (params.type == "scm") {
      userRef
        .child("drivers")
        .child(params.driver.user_id)
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
    } else {
      next();
    }
  },
  // Get Request Data
  (req, res, next) => {
    // Driver Phone Required
    // Request Id Required
    const params = req.body;

    if (params.type == "scm") {
      scmRequestRef
        .child(params.biltyNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();

            req.body.request = request;
            console.log("Request Data Added");
            next();
          } else {
            res.json({
              status: false,
              error: "Request Not Found !",
            });
          }
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    } else {
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
    }
  },
  // Check Bilty Status For PPL
  (req, res, next) => {
    const params = req.body;
    if (params.type == "scm") {
      next();
    } else {
      //  FOR PPL REQUESTS
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
      } else {
        res.json({
          status: false,
          error: "Unknown Request Type !",
        });
      }
    }
  },
  // Update Bilty For PPL
  (req, res, next) => {
    const params = req.body;

    if (params.type === "scm") {
      next();
    } else {
      const getOrderNo = params.biltyNo.slice(2, params.biltyNo.length - 2);

      if (params.request.request_type) {
        const transitbilties = params.request.bilty;

        transitbilties.forEach((bilty) => {
          if (bilty["biltyNo"] == params.biltyNo) {
            if (
              bilty.driver_phone &&
              bilty.driver_phone === params.driver.user_id
            ) {
              bilty["status"] = "driver_pickup";
              bilty["driver_pickup_on"] = getCurrentDate();
              bilty["driver_pickup_on_timestamp"] = getCurrentTimestamp();
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
      } else {
        res.json({
          status: false,
          error: "Unknown Request Type",
        });
      }
    }
  },
  // Update Request Status
  (req, res, next) => {
    const params = req.body;
    // console.log("req.body.driverData -> ", req.body.driverData);

    if (params.type == "scm") {
      switch (params.request.status) {
        case "pending":
          res.json({
            status: false,
            error: "Request is not accepted by anyone driver !",
          });
          break;

        case "driver_accepted":
          res.json({
            status: false,
            error: "Driver Already Accepted Request !",
          });
          break;

        case "driver_reached":
          const driverStatus = {
            status: "driver_reached",
            driver_accepted_on: params.request.driver_accepted_on,
            driver_delivered_on: null,
            driver_reached_on: params.request.driver_reached_on,
            driver_pickup: getCurrentDate(),
            driver_pickup_timestamp: getCurrentTimestamp(),
          };
          scmRequestRef
            .child(params.request.biltyNo)
            .update({
              status: "driver_pickup",
              driver_pickup_on: getCurrentDate(),
              driver_pickup_on_timestamp: getCurrentTimestamp(),
              driver_current_location: params.driver.current_position,
            })
            .then(() => {
              console.log("Request Updated After To driver_pickup");
              next();
            })
            .catch((error) => {
              res.json({
                status: false,
                level: "Request Update",
                error: error.message,
              });
            });

          break;

        case "driver_pickup":
          res.json({
            status: false,
            error: "Driver Already PickedUp The Load !",
          });

          break;

        case "user_cancelled":
          res.json({
            status: false,
            error: "User Already Cancelled The Request !",
          });
          break;

        default:
          res.json({
            status: false,
            error: "No Case Found !",
          });
          break;
      }
    } else {
      next();
    }
  },
  // Done
  (req, res, next) => {
    const params = req.body;
    if (params.type == "scm") {
      res.json({
        status: true,
        message: `Driver Picked Up The Load On ${moment()
          .tz("Asia/Karachi")
          .format("MMMM Do YYYY, h:mm:ss a")}`,
        data: {
          driverStatus: params.driverStatus,
          estimatedTime: params.request.googleDistance.duration.text,
          estimatedDistance: params.request.googleDistance.distance.text,
          start_location: params.request.googleDistance.start_address,
          end_location: params.request.googleDistance.end_address,
        },
      });
    } else {
      res.json({
        status: true,
        error: "PPL : Driver Picked Up The Load Successfully !",
      });
    }
  }
);

// API-28
// Vendor Update Driver Status => Driver Delivered
// /vendor_update_driver_delivered
// {
//    "token": "",
//    "biltyNo": "",
// }
router.post(
  "/vendor_update_driver_delivered",
  body("token").isString().withMessage("token required !"),
  body("biltyNo").isString().withMessage("Invalid Phone Number !"),
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
  // Check Driver / Get Driver Data
  (req, res, next) => {
    const params = req.body;
    if (params.type == "scm") {
      userRef
        .child("drivers")
        .child(params.driver.user_id)
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
    } else {
      next();
    }
  },
  // Get Request Data
  (req, res, next) => {
    // Driver Phone Required
    // Request Id Required
    const params = req.body;

    if (params.type == "scm") {
      scmRequestRef
        .child(params.biltyNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();

            req.body.request = request;
            console.log("Request Data Added");
            next();
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
    } else {
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
    }
  },
  // Get User Data
  (req, res, next) => {
    const params = req.body;

    if (params.type == "scm") {
      userRef
        .child("users")
        .child(params.request.user.phone)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const user = snapshot.val();
            req.body.user = user;
            console.log("user Data Added");
            next();
          } else {
            res.json({
              status: false,
              error: "user Not Found !",
            });
          }
        });
    } else {
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
    }
  },
  // Check Bilty Status For PPL
  (req, res, next) => {
    const params = req.body;
    if (params.type == "scm") {
      next();
    } else {
      //  FOR PPL REQUESTS
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
      } else {
        res.json({
          status: false,
          error: "Unknown Request Type - (Check Bilty Status For PPL)",
        });
      }
    }
  },
  // Update Bilty For PPL
  (req, res, next) => {
    const params = req.body;

    if (params.type === "scm") {
      next();
    } else {
      if (params.request.request_type) {
        const transitbilties = params.request.bilty;

        transitbilties.forEach((bilty) => {
          if (bilty["biltyNo"] == params.biltyNo) {
            if (
              bilty.driver_phone &&
              bilty.driver_phone === params.driver.user_id
            ) {
              bilty["status"] = "driver_delivered";
              bilty["driver_delivered_on"] = getCurrentDate();
              bilty["driver_delivered_on_timestamp"] = getCurrentTimestamp();
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
      } else {
        res.json({
          status: false,
          error: "Unknown Request Type - (Update Bilty For PPL)",
        });
      }
    }
  },
  // Generate Invoice
  async (req, res, next) => {
    const params = req.body;

    if (params.type == "scm") {
      googleMapsClient
        .directions({
          params: {
            origin: [params.request.orgLat, params.request.orgLng],
            destination: [params.request.desLat, params.request.desLng],
            mode: "driving",
            key: "AIzaSyDDTYs0JX_8BEC62oRGKLZTJac3Xd2nx74",
          },
        })
        .then((Google) => {
          const DriverDistance = Google.data.routes[0].legs[0];

          // Get Loading Options From Request
          const loadingoptions = params.request.loading;
          const loadingOptionsCombine = [];
          if (loadingoptions && loadingoptions.length !== 0) {
            if (loadingoptions.length > 1) {
              loadingoptions.forEach((option) => {
                loadingOptionsCombine.push(
                  `${option.name} x${option.quantity}`
                );
              });
            } else {
              loadingOptionsCombine.push(
                `${loadingoptions[0].name} x${loadingoptions[0].quantity}`
              );
            }
          }

          // Get Loading Options From Request
          const unloadingoptions = params.request.unloading;
          const unloadingOptionsCombine = [];
          if (unloadingoptions && unloadingoptions.length !== 0) {
            if (unloadingoptions.length > 1) {
              unloadingoptions.forEach((option) => {
                unloadingOptionsCombine.push(
                  `${option.name} x${option.quantity}`
                );
              });
            } else {
              unloadingOptionsCombine.push(
                `${unloadingoptions[0].name} x${unloadingoptions[0].quantity}`
              );
            }
          }

          const newInvoiceKey = scmInvoiceRef
            .child(params.request.id)
            .push().key;
          // User Invoice
          const Userinvoice = {
            invoiceId: newInvoiceKey,
            invoiceCreatedOn: getCurrentDate(),
            invoiceCreatedOn_timestamp: getCurrentTimestamp(),
            username: params.user.fullname,
            user_phone: params.user.phone,
            driver_name: params.driver.fullname,
            driver_phone: params.driver.phone,
            biltyNo: params.request.biltyNo,
            request_id: params.request.id,
            cargo_insurance: params.request.cargo_insurance
              ? params.request.cargo_insurance
              : null,
            request_given_at: moment(params.request.createdAt).format(
              "MMMM Do YYYY, h:mm:ss a"
            ),
            origin_location: params.request.orgText,
            destination_location: params.request.desText,
            total_distance: DriverDistance.distance.text,
            estimated_time: DriverDistance.duration.text,
            driver_accepted_on: params.request.driver_accepted_on,
            driver_reached_on: params.request.driver_reached_on,
            driver_pickup_on: params.request.driver_pickup_on,
            driver_delivered_on: getCurrentDate(),
            driver_delivered_on_timestamp: getCurrentTimestamp(),
            request_duration: moment(params.request.createdAt).fromNow(),
            vehicle_type: params.request.vehicle_type,
            // TODO: Add Loading And Unloading Options
            loading_options: loadingOptionsCombine,
            unloading_options: unloadingOptionsCombine,
            floors_cost: params.request.bill.floorPrice,
            loading_cost: params.request.bill.loadingServices,
            unloading_cost: params.request.bill.unloadingServices,
            insurance_cost: params.request.bill.insurance || 0,
            discount: params.request.bill.discountPercent,
            time_cost: params.request.bill.timePrice,
            driver_cost: params.request.bill.driverPrice,
            commission_amount: params.request.bill.commissionPrice,
            total_payable_amount: params.request.bill.netTotalPrice,
          };

          scmInvoiceRef
            .child(params.request.id)
            .child("user")
            .set(Userinvoice)
            .then(() => {
              // Driver Invoice

              const Driverinvoice = {
                invoiceId: newInvoiceKey,
                invoiceCreatedOn: getCurrentDate(),
                invoiceCreatedOn_timestamp: getCurrentTimestamp(),
                username: params.user.fullname,
                user_phone: params.user.phone,
                driver_name: params.driver.fullname,
                driver_phone: params.driver.phone,
                biltyNo: params.request.biltyNo,
                request_id: params.request.id,
                cargo_insurance: params.request.cargo_insurance
                  ? params.request.cargo_insurance
                  : null,
                request_given_at: moment(params.request.createdAt).format(
                  "MMMM Do YYYY, h:mm:ss a"
                ),
                origin_location: params.request.orgText,
                destination_location: params.request.desText,
                total_distance: DriverDistance.distance.text,
                estimated_time: DriverDistance.duration.text,
                driver_accepted_on: moment(
                  params.request.driver_accepted_on
                ).format("MMMM Do YYYY, h:mm:ss a"),
                driver_reached_on: moment(
                  params.request.driver_reached_on
                ).format("MMMM Do YYYY, h:mm:ss a"),
                driver_pickup_on: moment(
                  params.request.driver_pickup_on
                ).format("MMMM Do YYYY, h:mm:ss a"),
                driver_delivered_on: getCurrentDate(),
                driver_delivered_on_timestamp: getCurrentTimestamp(),
                request_duration: moment(params.request.createdAt).fromNow(),
                vehicle_type: params.request.vehicle_type,
                // TODO: Add Loading And Unloading Options
                loading_options: loadingOptionsCombine,
                unloading_options: unloadingOptionsCombine,
                floors_cost: params.request.bill.floorPrice,
                loading_cost: params.request.bill.loadingServices,
                unloading_cost: params.request.bill.unloadingServices,
                discount: params.request.bill.discountPercent,
                time_cost: params.request.bill.timePrice,
                arrival_cost: params.request.bill.arrivalPrice,
                departure_cost: params.request.bill.departurePrice,
                driver_earning: params.request.bill.driverPrice,
                commission_amount: params.request.bill.commissionPrice,
                total_payable_amount: params.request.bill.netTotalPrice,
              };

              scmInvoiceRef
                .child(params.request.id)
                .child("driver")
                .set(Driverinvoice)
                .then(() => {
                  next();
                  // res.json({
                  //   status: true,
                  //   invoice: Driverinvoice,
                  // });
                })
                .catch((error) => {
                  res.json({
                    status: false,
                    message: "driver invoice generation",
                    error,
                  });
                });
            })
            .catch((error) => {
              res.json({
                status: false,
                message: "user invoice generation",
                error,
              });
            });
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      next();
    }
  },
  // Create Driver History
  (req, res, next) => {
    const params = req.body;
    if (params.type == "scm") {
      if (params.user_paid) {
        driverHistoryRef
          .child(params.driver.phone)
          .child(params.type)
          .child(params.request.biltyNo)
          .set({
            username: params.user.fullname,
            user_phone: params.user.phone,
            biltyNo: params.request.biltyNo,
            narration: "Driver Will Receive Payment From Meribilty",
            user_paid: params.user_paid,
            paymentMethod: "wallet",
            request_status: params.request.status,
            driver_accepted_on: params.request.driver_accepted_on,
            driver_reached_on: params.request.driver_reached_on,
            driver_pickup_on: params.request.driver_pickup_on,
            driver_delivered_on: params.request.driver_delivered_on,
            status: "completed",
            type: "scm",
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
        driverHistoryRef
          .child(params.driver.phone)
          .child(params.type)
          .child(params.request.biltyNo)
          .set({
            username: params.user.fullname,
            user_phone: params.user.phone,
            biltyNo: params.request.biltyNo,
            narration:
              "Driver Will Receive Payment From User (Cash On Delivery)",
            paymentMethod: "cod",
            request_status: params.request.status,
            driver_accepted_on: params.request.driver_accepted_on,
            driver_reached_on: params.request.driver_reached_on,
            driver_pickup_on: params.request.driver_pickup_on,
            driver_delivered_on: params.request.driver_delivered_on,
            status: "completed",
            type: "scm",
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
      }
    } else {
      // FOR PPL REQUEST

      const getOrderNo = params.biltyNo.slice(2, params.biltyNo.length - 2);

      driverHistoryRef
        .child(params.driver.user_id)
        .child(params.type)
        .child(params.biltyNo)
        .set({
          username: params.request.username,
          user_phone: params.request.user_phone,
          orderNo: getOrderNo,
          biltyNo: params.biltyNo,
          paymentMethod: params.request.payment_method,
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
    }
  },
  // Update Request Status
  (req, res, next) => {
    const params = req.body;
    // console.log("req.body.driverData -> ", req.body.driverData);

    if (params.type == "scm") {
      const driverStatus = {
        status: "driver_delivered",
        driver_delivered_on: getCurrentDate(),
        driver_delivered_on_timestamp: getCurrentTimestamp(),
        driver_reached_on: params.request.driver_reached_on,
        driver_pickup: params.driver_pickup_on,
      };

      req.body.driverStatus = driverStatus;

      scmRequestRef
        .child(params.request.biltyNo)
        .update({
          status: "driver_delivered",
          driver_delivered_on: getCurrentDate(),
          driver_delivered_on_timestamp: getCurrentTimestamp(),

          driver_current_location: params.driver.current_position,
        })
        .then(() => {
          console.log("Request Updated After To driver_delivered");
          next();
        })
        .catch((err) => {
          res.json({
            status: false,
            level: "Request Update",
            error: err.message,
          });
        });
    } else {
      next();
    }
  },
  // Done
  (req, res, next) => {
    const params = req.body;
    if (params.type == "scm") {
      res.json({
        status: true,
        message: `Driver Delivered The Load On ${moment()
          .tz("Asia/Karachi")
          .format("MMMM Do YYYY, h:mm:ss a")}`,
        data: {
          driverStatus: params.driverStatus,
          estimatedTime: params.request.googleDistance.duration.text,
          estimatedDistance: params.request.googleDistance.distance.text,
          start_location: params.request.googleDistance.start_address,
          end_location: params.request.googleDistance.end_address,
        },
      });
    } else {
      res.json({
        status: true,
        error: "PPL : Driver Delivered The Load Successfully !",
      });
    }
  }
);

// API-29
// Vendor Update Driver Status => Driver Returning Container
// /vendor_update_returning_container
// {
//    "token": "",
//    "biltyNo": "",
//    "type" : "" (scm,ppl)
// }
router.post(
  "/vendor_update_returning_container",
  body("token").isString().withMessage("token required !"),
  body("biltyNo").isString().withMessage("Invalid Bilty NO !"),
  body("type").isString().withMessage("type must be scm / ppl "),
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

    //  FOR PPL REQUESTS
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
    } else {
      res.json({
        status: false,
        error: "Unknown Request Type - (Check Bilty Status For PPL)!",
      });
    }
  },
  // Update Bilty For PPL
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type) {
      const transitbilties = params.request.bilty;

      transitbilties.forEach((bilty) => {
        if (bilty["biltyNo"] == params.biltyNo) {
          if (
            bilty.driver_phone &&
            bilty.driver_phone === params.driver.user_id
          ) {
            bilty["status"] = "container_returned";
            bilty["container_returned_on"] = getCurrentDate();
            bilty["container_returned_on_timestamp"] = getCurrentTimestamp();

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
    } else {
      res.json({
        status: false,
        error: "Unknown Request Type - (Update Bilty For PPL)!",
      });
    }
  },
  // Create Driver History
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type) {
      driverHistoryRef
        .child(params.driver.user_id)
        .child("ppl")
        .child(params.biltyNo)
        .set({
          username: params.request.username,
          user_phone: params.request.user_phone,
          orderNo: params.request.orderNo,
          biltyNo: params.biltyNo,
          paymentMethod: params.request.payment_method,
          ...params.bilty,
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
    }
  },
  // Check If All Bilties Are Completed
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.child(params.request.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();

        if (request.request_type) {
          const transitbilties = request.bilty;
          let biltyCompletionChecker = true;

          if (transitbilties) {
            if (transitbilties.length !== 0) {
              transitbilties.forEach((bilty) => {
                if (bilty.status !== "container_returned") {
                  biltyCompletionChecker = false;
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
                order_completed_on_timestamp: getCurrentTimestamp(),
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
            error: "Unknown Request Type - (Check Bilty Status For PPL)!",
          });
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
      .child(params.driver.user_id)
      .update({
        bilty: null,
        request_type: null,
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
      .child(params.vehicle_number)
      .update({
        available: true,
      })
      .then(() => {
        next();
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err,
        });
      });
  },
  // Done
  (req, res, next) => {
    const params = req.body;
    res.json({
      status: false,
      error: "PPL : Empty Container Returned Successfully !",
    });
  }
);

// API-30
// /vendor_removes_driver_from_bilty
router.post(
  "/vendor_removes_driver_from_bilty",
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
          error: `${params.user.user_type} cannot make bilty request !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.vendorOrdriver.type} cannot make bilty request !`,
        });
        break;
    }
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
              if (bilty.status == "pending") {
                req.body.bilty = bilty;
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
    } else {
      res.json({
        status: false,
        error: "Unknown Type !",
      });
    }
  }
);

// =================   VENDOR REQUEST TO ANOTHER VENDOR  (START) ==================

// API-31
// /vendor_send_bilty_request -> (Vendor Will Send Its Bilty Requirement Request To Another Vendor) (PAUSED)
router.post(
  "/vendor_bilty_request_to_vendor",
  body("biltyNo").isString().withMessage("biltyNo must be an string"),
  body("requested_from")
    .isMobilePhone()
    .withMessage("requested_from must be a phone"),
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
          error: `${params.user.user_type} cannot make bilty request !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make bilty request !`,
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
          next();
        } else {
          res.json({
            status: false,
            error: "Cannot Find Vendor !",
          });
        }
      });
  },
  // Check Requested From
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("vendors")
      .child(params.requested_from)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const requested_from = snapshot.val();
          req.body.requested_from = requested_from;
          next();
        } else {
          res.json({
            status: false,
            error: "Cannot Find requested_from vendor !",
          });
        }
      });
  },
  // Check Request
  (req, res, next) => {
    const params = req.body;

    let getLength = params.biltyNo.length;
    const getOrderNo = params.biltyNo.slice(2, getLength - 2);

    pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
      const request = snapshot.val();
      if (request) {
        if (request.status === "accepted") {
          req.body.request = request;
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
              if (bilty.status == "pending") {
                req.body.bilty = bilty;
                next();
              } else {
                res.json({
                  status: false,
                  error: `Cannot Send Bilty Request For This Bilty ! - Bilty Status is ${bilty.status} !`,
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
    } else {
      res.json({
        status: false,
        error: "Unknown Type !",
      });
    }
  },
  // Check Vendor To Vendor Request
  (req, res, next) => {
    const params = req.body;

    pplVendorToVendorRequestRef
      .child(params.biltyNo)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          res.json({
            status: false,
            error: "Request Already Exists !",
            request: snapshot.val(),
          });
        } else {
          next();
        }
      });
  },
  // Google Distance Duration
  (req, res, next) => {
    const params = req.body;
    googleMapsClient
      .directions({
        params: {
          origin: [params.request.orgLat, params.request.orgLng],
          destination: [params.request.desLat, params.request.desLng],
          mode: "driving",
          key: "AIzaSyDDTYs0JX_8BEC62oRGKLZTJac3Xd2nx74",
        },
      })
      .then((Google) => {
        const GoogleObject = Google.data.routes[0].legs[0];
        req.body.GoogleObject = GoogleObject;
        next();
      })
      .catch((error) => {
        console.log(error);
        next();
      });
  },
  // Create A Request
  (req, res, next) => {
    const params = req.body;
    const newVendorToVendorRequest = pplVendorToVendorRequestRef.push();
    const requestId = newVendorToVendorRequest.key;
    // req.body.vendor_to_vendor_request_id = requestId;

    let currentDate = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Karachi",
    });

    const data = {
      vendor_name: params.vendor.company_name,
      vendor_phone: params.vendor.phone,
      requested_from: params.requested_from,
      biltyNo: params.bilty.biltyNo,
      vehicle_type: params.bilty.type,
      option: params.bilty.option,
      weight: params.bilty.weight,
      quantity: params.bilty.quantity,
      user_phone: params.bilty.user_phone,
      amount: params.amount,
      orderNo: params.request.orderNo,
      desLat: params.request.desLat,
      desLng: params.request.desLng,
      orgLat: params.request.orgLat,
      orgLng: params.request.orgLng,
      material: params.request.material,
      google: params.GoogleObject,
      created: currentDate,
      status: "pending",
    };

    req.body.data = data;

    pplVendorToVendorRequestRef
      .child(params.biltyNo)
      .set(data)
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
  // Complete
  (req, res) => {
    const params = req.body;
    res.json({
      status: true,
      message: "Bilty Request Sent To Vendor Successfully !",
      requestData: {
        ...params.data,
      },
    });
  }
);

// /vendor_accept_bilty_request -> (Vendor Will Accept Request And Fill Bilty Requirements) (PAUSED)
router.post(
  "/vendor_accept_bilty_request",
  body("biltyNo").isString().withMessage("biltyNo must be an string"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },

  // Check User Type
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
          error: `${params.vendorOrdriver.type} cannot accept bilty request !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.vendorOrdriver.type} cannot accept bilty request !`,
        });
        break;
    }
  },
  // Check bilty Request
  (req, res, next) => {
    const params = req.body;

    pplVendorToVendorRequestRef
      .child(params.biltyNo)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendorRequest = snapshot.val();
          if (vendorRequest.requested_from.phone === params.vendor.phone) {
            req.body.vendorRequest = vendorRequest;
            next();
          } else {
            res.json({
              status: false,
              error: "Request Has Not Been Sent To You",
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
  // Check Order
  (req, res, next) => {
    const params = req.body;

    pplRequestRef
      .child(params.vendorRequest.orderNo)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const request = snapshot.val();
          req.body.request = request;
          next();
        } else {
          res.json({
            status: false,
            error: "request not found",
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
              if (bilty.status == "pending") {
                req.body.bilty = bilty;
                next();
              } else {
                res.json({
                  status: false,
                  error: `Cannot Send Bilty Request For This Bilty ! - Bilty Status is ${bilty.status} !`,
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
    } else {
      res.json({
        status: false,
        error: "Unknown Type !",
      });
    }
  },
  // Create A Update Bilty Request
  (req, res, next) => {
    const params = req.body;
    pplVendorToVendorRequestRef
      .child(params.biltyNo)
      .update({
        status: "accepted",
        accepted_on: getCurrentDate(),
        accepted_on_timestamp: getCurrentTimestamp(),
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

    if (params.request.request_type) {
      const transitbilties = params.request.bilty;

      transitbilties.forEach((bilty) => {
        if (bilty["biltyNo"] == params.biltyNo) {
          bilty["vendor"] = params.vendor.phone;
          bilty["amount"] = params.vendorRequest.amount;
          bilty["type"] = "requested";
          bilty["request_status"] = "accepted";
        }
      });

      pplRequestRef
        .child(params.vendorRequest.orderNo)
        .update({
          bilty: transitbilties,
        })
        .then(() => {
          res.json({
            status: true,
            message: `${params.vendorRequest.requested_from.company_name} accepted the bilty request !`,
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

// /vendor_reject_bilty_request -> (Vendor Rejects Bilty Requirement Request From Another Vendor) (PAUSED)
router.post(
  "/vendor_reject_bilty_request",
  body("phone").isMobilePhone().withMessage("phone is not valid"),
  body("biltyNo").isString().withMessage("biltyNo must be an string"),
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
          res.json({
            status: false,
            error: "Cannot Find Vendor !",
          });
        }
      });
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
          error: `${params.vendorOrdriver.type} cannot reject bilty request !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.vendorOrdriver.type} cannot reject bilty request !`,
        });
        break;
    }
  },
  // Check bilty Request
  (req, res, next) => {
    const params = req.body;

    pplVendorToVendorRequestRef
      .child(params.biltyNo)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendorRequest = snapshot.val();
          if (vendorRequest.requested_from.phone === params.vendor.phone) {
            req.body.vendorRequest = vendorRequest;
            next();
          } else {
            res.json({
              status: false,
              error: "Request Has Not Been Sent To You",
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
  // Check Order
  (req, res, next) => {
    const params = req.body;

    pplRequestRef
      .child(params.vendorRequest.orderNo)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const request = snapshot.val();
          req.body.request = request;
          next();
        } else {
          res.json({
            status: false,
            error: "request not found",
          });
        }
      });
  },
  // Create A Request
  (req, res, next) => {
    const params = req.body;
    pplVendorToVendorRequestRef
      .child(params.biltyNo)
      .update({
        status: "rejected",
        rejected_on: getCurrentDate(),
        rejected_on_timestamp: getCurrentTimestamp(),
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

    if (params.request.request_type) {
      const transitbilties = params.request.bilty;

      transitbilties.forEach((bilty) => {
        if (bilty["biltyNo"] == params.biltyNo) {
          bilty["vendor"] = params.phone;
          bilty["amount"] = params.vendorRequest.amount;
          bilty["type"] = "requested";
          bilty["request_status"] = "rejected";
        }
      });

      pplRequestRef
        .child(params.vendorRequest.orderNo)
        .update({
          bilty: transitbilties,
        })
        .then(() => {
          res.json({
            status: true,
            message: `${params.vendorRequest.requested_from.company_name} accepted the bilty request !`,
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

// =================   VENDOR REQUEST TO ANOTHER VENDOR  (ENDS) ==================

// ======================  After Order Acceptance (End) =========================

// ======================  Vendor Routes =========================

// /vendor_complete_bilty -> (The Order Is now Completed)
router.post(
  "/vendor_complete_bilty",
  body("reqId").isString().withMessage("reqId must be string"),
  body("vendor_phone")
    .isMobilePhone()
    .withMessage("vendor_phone must be valid phone number"),
  body("amount").isString().withMessage("amount must be a string"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;
    pplRequestRef.child(params.reqId).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();
        req.body.request = request;
        next();
      } else {
        res.json({
          status: false,
          message: "Request Not Found !",
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
          next();
        } else {
          res.json({
            status: false,
            message: "User Not Found !",
          });
        }
      });
  },
  // Generate Invoice
  (req, res, next) => {
    const params = req.body;

    if (req.body.request) {
      const { request } = req.body;
      const { user } = req.body;

      if (request.phase == 5) {
        const newPPLInvoice = pplInvoiceRef.push();
        const invoiceId = newPPLInvoice.key;

        // TODO: Get Vehicles & Drivers Alloted
        // TODO: Total Amount Payable By Customer

        newPPLInvoice
          .set({
            invoiceId,
            biltyNo: request.orderNo,
            reqId: request.id,
            username: user.fullname,
            user_phone: user.phone,
            vendor_phone: request.vendor_phone,
            requestType: request.request_type,
            priceGivenByUser: `${request.user_price} PKR`,
            request_created_at: moment(request.createdAt).format(
              "MMMM Do YYYY, h:mm:ss a"
            ),
            bilty_placed_on: moment(request.bilty_placed_on).format(
              "MMMM Do YYYY, h:mm:ss a"
            ),
            user_accepted_qoute_amount: `${request.accepted_qoute_amount} PKR`,
            user_accepted_qoute_on: moment(request.qoute_accepted_on).format(
              "MMMM Do YYYY, h:mm:ss a"
            ),
            floors: request.floors,
            material: request.material,
            material_weight: `${request.material_weight} tons`,
            vehicles_demanded: request.vehicles,
            loading: request.loading,
            unloading: request.unloading,
            cargo_value: request.cargo_value || null,
            insurance_amount: request.insurance || null,
            pickup_location: request.originText,
            destination: request.destinationText,
            empty_container_location: request.empty_container_text,
          })
          .then(() => {
            res.json({
              status: true,
              message: `Bilty No -> ${req.body.request.orderNo} has been placed`,
            });
          })
          .catch((err) => {
            res.json({
              status: false,
              error: err.message,
            });
          });
      } else if (request.phase == 10) {
      }
    } else {
      res.json({
        status: false,
        error: "Request Id Not Found",
      });
    }
  },
  // Check Order Bilty Status
  (req, res, next) => {
    const params = req.body;
    const { request } = req.body;

    if (request.status == "In_progress") {
      // Check Vehicle Quantites
      // const quantity = request.vehicle_quantity;
      // if (quantity > 1) {
      // } else {
      // }

      next();
    } else {
      res.json({
        status: false,
        error: "Can not place bilty , request status is not In_progress !",
      });
    }
  },
  // Update Bilty
  (req, res, next) => {
    const params = req.body;
    pplRequestRef
      .child(params.reqId)
      .update({
        status: "In_progress",
        bilty_completed_on: getCurrentDate(),
        bilty_completed_on_timestamp: getCurrentTimestamp(),
      })
      .then(() => {
        res.json({
          status: true,
          message: `Bilty No -> ${req.body.request.orderNo} has been placed`,
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error,
        });
      });
  }
  // TODO: Notification
);

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

    if (params.phone !== params.vendor.phone) {
      userRef
        .child("drivers")
        .child(params.phone)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            res.json({
              status: false,
              error: "This Driver Already Exists !",
            });
          } else {
            next();
          }
        });
    } else {
      res.json({
        status: false,
        error: "Vendor Phone and Driver Phone are same !",
      });
    }
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
        user: null,
        token: null,
        vendor: null,
        referer: params.vendor.phone,
        vendorOrdriver: null,
        created: getCurrentDate(),
        created_timestamp: getCurrentTimestamp(),
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
    let filterphone = params.phone;
    let transformphone = filterphone.substr(1);
    console.log('filterphone -> ',filterphone)
    console.log('transformphone -> ',transformphone)
    let content = `You have been invited by ${params.vendor.company_name} To Meribilty App as a driver. Login With Your Phone Number ${params.phone}.`;
    axios.post(`http://bsms.its.com.pk/api.php?key=b23838b9978affdf2aab3582e35278c6&msgdata=${content}&to=${transformphone}`).then((response)=>{
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

    // const bucket = storage.bucket("meribilty-files");
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
    let filterphone = params.phone;
    let transformphone = filterphone.substr(1);
    console.log('filterphone -> ',filterphone)
    console.log('transformphone -> ',transformphone)
    // Send SMS To User Agent
    let content = `You have been removed as a vendor driver. To Meribilty Driver App.`;
    axios.post(`http://bsms.its.com.pk/api.php?key=b23838b9978affdf2aab3582e35278c6&msgdata=${content}&to=${transformphone}`).then((response)=>{
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
      .orderByChild("vehicle_type")
      .equalTo(params.vehicle_type)
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
        added_on_timestamp: getCurrentTimestamp(),
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
    pplVendorVehicleRef.child(params.id).once("value", (snapshot) => {
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

    pplVendorVehicleRef.child(params.id).once("value", (snapshot) => {
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

// ================= VENDOR VEHICLE (Ends) =================

// ============ DATA SERVICES FOR VENDOR (START) ==============

// Get Vendor Vehicles
// {
//   "token" : "",
// }
router.post(
  "/get_vendor_vehicles",
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
          error: `${params.user.user_type} cannot get vehicles!`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot get vehicles!`,
        });
        break;
    }
  },
  // Get Vendor drivers
  (req, res, next) => {
    const params = req.body;

    pplVendorVehicleRef
      .orderByChild("vendor_phone")
      .equalTo(params.vendor.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vehicles = snapshot.val();

          const converted = Object.entries(vehicles);
          const final = [];
          converted.forEach((x) => {
            final.push(x[1]);
          });

          res.json({
            status: true,
            vehicles: final,
          });
        } else {
          res.json({
            status: false,
            error: "No Vehicle Found !",
          });
        }
      });
  }
);

// Get Vendor Drivers
// {
//   "token" : "",
// }
router.post(
  "/get_vendor_drivers",
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
          error: `${params.user.user_type} cannot get vehicles!`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot get vehicles!`,
        });
        break;
    }
  },
  // Get Vendor Drivers
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("drivers")
      .orderByChild("referer")
      .equalTo(params.vendor.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const drivers = snapshot.val();

          const converted = Object.entries(drivers);
          const final = [];
          converted.forEach((x) => {
            final.push(x[1]);
          });

          res.json({
            status: true,
            drivers: final,
          });
        } else {
          res.json({
            status: false,
            error: "No drivers Found !",
          });
        }
      });
  }
);


// Get Single Bilty
router.post(
  "/get_single_order",
  verifyTokenFirebase,
  //  Get Request Data
  (req, res, next) => {
    const params = req.body;

    // const orderNo = params.biltyNo.slice(2, (params.biltyNo.length - 2));

    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();

        res.json({
          status: true,
          data: request,
        });
      } else {
        res.json({
          status: false,
          error: "Request Not Found !",
        });
      }
    });
  }
);

// Vendor/Driver/Admin Approve Payment
// {
//   "token": "",
//   "orderNo": ""
// }
router.post(
  "/approve_payment",
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

    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();

        if (request.payment_approved) {
          res.json({
            status: false,
            error: "Payment Already Approved",
          });
        } else {
          next();
        }
      } else {
        res.json({
          status: false,
          error: "Request Not Found !",
        });
      }
    });
  },
  // Update Request
  (req, res, next) => {
    const params = req.body;

    pplRequestRef
      .child(params.orderNo)
      .update({
        payment_approval: true,
      })
      .then(() => {
        res.json({
          status: true,
          message: `Payment Approved For Order#${params.orderNo}`,
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

// /user_orders -> (Get All Orders User Made)

// ============ DATA SERVICES FOR VENDOR (ENDS) ==============

// Calculate Insurance
router.post(
  "/calculate_insurance",
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
        const insurances = [];
        snapshot.forEach((x)=>{
          insurances.push(x.val());
        })

        insurances.sort(function (a, b) {
          return b.timestamp - a.timestamp;
        });


        const load_value = parseInt(params.cargo_value);
        const percent = parseInt(insurances[0].value);
        console.log("insurance -> ", insurances[0]);

        const total = Math.ceil((load_value / 100) * percent);
        res.json({
          status: true,
          insurance: total,
        });
      } else {
        res.json({
          status: false,
          error: "Insurance Percent Not Found In Database !",
        });
      }
    });
  }
);

// Add More Address Information To Order
router.post("/add_more_address_info", (req, res) => {
  const params = req.body;

  let data = {
    to: {
      name: params.to.name,
      address: params.to.address,
      city: params.to.city,
      province: params.to.province,
      country: params.to.country,
    },
    from: {
      name: params.from.name,
      address: params.from.address,
      city: params.from.city,
      province: params.from.province,
      country: params.from.country,
    },
  };

  console.log("data -> ", data);

  pplRequestRef
    .child(params.orderNo)
    .update({
      from: params.from,
      to: params.to,
    })
    .then(() => {
      res.json({
        status: true,
        message: "Address Data Added Successfully",
      });
    })
    .catch((err) => {
      res.json({
        status: false,
        error: err,
      });
    });
});

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
