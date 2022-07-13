const express = require('express');
const config = require('../../config/private.json')

// Scheduled Tasks
const _ = require('lodash');

const moment = require('moment-timezone');

let SID = "ACdf3c9dd58c5c293af6a30ec1ea212d50"
let SECRET = "aba225227762b749ebf386a142c2d23c"

// Twilio Client
const twillio_client = require('twilio')(
  config.twilio.accountSid,
  config.twilio.authToken
);

const orderNo = require('order-no');
const { Client } = require('@googlemaps/google-maps-services-js');

const { body, validationResult } = require('express-validator');




const {
  scmRequestRef,
  vehicleListRef,
  scmCommission,
  scmInvoiceRef,
  scmSettingsRef,
  scmCancellationReasonRef,
  driverHistoryRef,
} = require('../../db/newRef');

const {
  userRef,
  vehicleTypeRef,
  walletRef,
} = require('../../db/ref');


const {
  reqNotify,
  CHECK_distance,
  SetPriceData,
  CalculateSCMPricing,
} = require('../../functions/slash');
const { get } = require('lodash');

const googleMapsClient = new Client({});

const router = express.Router();

// =============== GET REQUESTS START ================

// /get_user_data

// {
//   "phone" : "+92838383833"
// }

router.get(
  '/get_user_data',
  body('phone').isMobilePhone().withMessage('Invalid Phone Number !'),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next()
    }
  },
  // Check User
  (req, res, next) => {
    const params = req.body;
    userRef
      .child('users')
      .child(params.phone)
      .once('value', (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          next();
        } else {
          userRef
            .child('user_agents')
            .child(params.phone)
            .once('value', (snapshot) => {
              if (snapshot.val()) {
                const agent = snapshot.val();
                req.body.agent = agent;
                next();
              } else {
                res.json({
                  status: false,
                  error: 'User Not Found ',
                });
              }
            });
        }
      });
  },
  // Get User Wallet
  (req, res, next) => {
    const params = req.body;
    if (req.body.user) {
      walletRef.child(params.phone).on('value', (snapshot) => {
        if (snapshot.val()) {
          const wallet = snapshot.val();
          req.body.wallet = wallet;
          next();
        } else {
          res.json({
            status: false,
            error: 'No Wallet Found',
          });
        }
      });
    }

    if (req.body.agent) {
      next();
    }
  },
  // Get User Deliveries
  (req, res, next) => {
    const params = req.body;
    if (req.body.user) {
      scmRequestRef
        .orderByChild('user_phone')
        .equalTo(params.phone)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const requests = snapshot.val();
            const convert = Object.entries(requests);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
            });

            req.body.deliveries = final;
            next();
          } else {
            req.body.deliveries = null;
            next();
          }
        });
    }
    // TODO: user agent request
    if (req.body.agent) {
      scmRequestRef
        .orderByChild('user_phone')
        .equalTo(params.phone)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const requests = snapshot.val();

            const convert = Object.entries(requests);
            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
            });
            req.body.deliveries = final;

            next();
          } else {
            next();
          }
        });
    }
  },
  // Throw User Data
  (req, res, next) => {
    if (req.body.user) {
      const userData = req.body.user ? req.body.user : null;
      const walletData = req.body.wallet ? req.body.wallet : null;
      const deliveriesData = req.body.deliveries ? req.body.deliveries : null;
      const userType = userData !== null ? userData.type : null;

      res.json({
        status: true,
        user: {
          id: userData.id,
          email: userData.email,
          phone: userData.phone,
          created: moment(userData.created).format('MMMM Do YYYY, h:mm:ss a'),
          type: userData.type,
        },
        wallet: walletData,
        deliveries: deliveriesData,
        userType,
      });
    }

    if (req.body.agent) {
      const userData = req.body.agent ? req.body.agent : null;
      const walletData = req.body.wallet ? req.body.wallet : null;
      const deliveriesData = req.body.deliveries ? req.body.deliveries : null;
      const userType = userData !== null ? userData.type : null;

      res.json({
        status: true,
        user: userData,
        wallet: walletData,
        deliveries: deliveriesData,
        userType,
      });
    }
  }
);

// Getting Data For Vehicles , Materials , Loading And Unloading Options
// /scm_data
router.get(
  '/scm_data',
  // Vehicle List
  (req, res, next) => {
    scmSettingsRef.child('vehicles').once('value', (snapshot) => {
      if (snapshot.val()) {
        const vehicles = snapshot.val();
        // mapping snapshot
        const convert = Object.entries(vehicles);
        const final = [];
        convert.forEach((x) => {
          final.push(x[1]);
        });

        req.body.vehicles = final;
        next();
      } else {
        res.json({
          status: false,
          error: 'Vehicles Not Found !',
        });
      }
    });
  },
  // Vehicle Types
  (req, res, next) => {
    scmSettingsRef.child('vehicle_types').once('value', (snapshot) => {
      if (snapshot.val()) {
        const vehicle_types = snapshot.val();
        const convert = Object.entries(vehicle_types);
        const final = [];
        convert.forEach((x) => {
          final.push(x[1]);
        });
        req.body.vehicle_types = final;
        next();
      } else {
        res.json({
          status: false,
          error: 'vehicle_types Not Found !',
        });
      }
    });
  },
  // Material List
  (req, res, next) => {
    scmSettingsRef.child('material_list').once('value', (snapshot) => {
      if (snapshot.val()) {
        const materials = snapshot.val();
        const convert = Object.entries(materials);
        const final = [];
        convert.forEach((x) => {
          final.push(x[1]);
        });
        req.body.materials = final;
        next();
      } else {
        res.json({
          status: false,
          error: 'materials Not Found !',
        });
      }
    });
  },
  // Loading Options
  (req, res, next) => {
    scmSettingsRef.child('loading_options').once('value', (snapshot) => {
      if (snapshot.val()) {
        const loading_options = snapshot.val();
        const convert = Object.entries(loading_options);
        const final = [];
        convert.forEach((x) => {
          final.push(x[1]);
        });

        req.body.loading_options = final;
        next();
      } else {
        res.json({
          status: false,
          error: 'loading_options Not Found !',
        });
      }
    });
  },
  // Unloading Options
  (req, res, next) => {
    scmSettingsRef.child('unloading_options').once('value', (snapshot) => {
      if (snapshot.val()) {
        const unloading_options = snapshot.val();

        const convert = Object.entries(unloading_options);
        const final = [];
        convert.forEach((x) => {
          final.push(x[1]);
        });

        req.body.unloading_options = final;
        next();
      } else {
        res.json({
          status: false,
          error: 'unloading_options Not Found !',
        });
      }
    });
  },
  // Give Data
  (req, res) => {
    const params = req.body;

    res.json({
      status: true,
      message:
        'Vehicles , Vehicle_types, Materials , Loading And Unloading Options ! ',
      vehicles: params.vehicles,
      vehicle_types: params.vehicle_types,
      materials: params.materials,
      loading_options: params.loading_options,
      unloading_options: params.unloading_options,
    });
  }
);

// /user_deliveries
router.get('/user_deliveries',
  body('phone').isMobilePhone().withMessage('Invalid Phone Number !'),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next()
    }
  },
  (req, res) => {
    const params = req.body;
    scmRequestRef
      .orderByChild('user_phone')
      .equalTo(params.phone)
      .once('value', (snapshot) => {
        if (snapshot.val()) {
          const requests = snapshot.val();
          const convert = Object.entries(requests);

          const final = [];
          convert.forEach((x) => {
            final.push(x[1]);
          });

          res.json({
            status: true,
            deliveries: final,
          });
        } else {
          res.json({
            status: false,
            error: 'Not Found !',
          });
        }
      });
  });

// =============== GET REQUESTS ENDS ================

// SCM Request Process
// "1" => User Will Give Data And Create A Request | No Driver has accepted the request
// "2" => Request is given to all nearby Drivers
// "3" => Request Is Been Approved By A Driver
// "4" => Request Is Been Rejected By A Driver
// "5" => Driver Reached To The Origin Location
// "6" => Driver Reached The Destination
// "7" => Driver PickedUp The Load
// "8" => Driver Delivered The Load
// "9" => User Cancelled The Request

// ==================================== SCM REQUEST PHASES START ====================================
// ==================================== SCM REQUEST PHASES START ====================================
// ==================================== SCM REQUEST PHASES START ====================================
// ==================================== SCM REQUEST PHASES START ====================================
// ==================================== SCM REQUEST PHASES START ====================================
// ==================================== SCM REQUEST PHASES START ====================================

// /scm_estimated_price

// {
//   "start_location": { "lat": 24.8627626, "lng": 67.0087094 },
//   "end_location": { "lat": 24.8607002, "lng": 66.9975986 },
//   "loading": [ {
//         "name":"crane",
//          "quantity":"1"
//     },
//     {
//         "name":"fork_lift_5_ton",
//          "quantity":"2"
//     }],
// "unloading":[{
//         "name":"labour",
//          "quantity":"2"
//     }],
// "floors": "3",
// "vehicle_type": "Suzuki",
// "cargo_value": "30000"
// }

router.post(
  '/estimated_price',
  body('start_location').isObject().withMessage('start_location must be an object'),
  body('end_location').isObject().withMessage('end_location must be an object'),
  body('loading').isArray().withMessage('loading must be an array'),
  body('unloading').isArray().withMessage('loading must be an array'),
  body('floors').isString().withMessage('floors must be an string'),
  body('vehicle_type').isString().withMessage('vehicle_type must be an string'),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next()
    }
  },
  // Get Loading List
  (req, res, next) => {
    const params = req.body;

    if (params.loading.length !== 0) {
      scmSettingsRef.child('loading_options').once('value', (snapshot) => {
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
            error: 'Loading Option Pricing Not Found !',
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
      scmSettingsRef.child('unloading_options').once('value', (snapshot) => {
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
      scmSettingsRef
        .child('vehicle_types')
        .child(params.vehicle_type)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const pricing = snapshot.val();
            req.body.pricingData = pricing;
            // console.log("Pricing added ", req.body.pricingData);

            scmCommission.once('value', (snapshot) => {
              const commission = snapshot.val();
              if (commission) {
                req.body.CommissionPercent = commission.value;
                if (
                  params.cargo_value
                  && params.cargo_value !== '0'
                  && params.cargo_value !== 0
                ) {
                  scmSettingsRef
                    .child('insurance')
                    .once('value', (snapshot) => {
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
                  message: 'Commission Data Missing From DB',
                });
              }
            });
          } else {
            res.json({
              status: false,
              error: 'Vehicle Type Not Found !',
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
      scmSettingsRef.child('promocodes').once('value', (snapshot) => {
        if (snapshot.val()) {
          const promocodes = snapshot.val();
          const convert = Object.entries(promocodes);

          const final = [];
          convert.forEach((x) => {
            final.push(x[1]);
          });

          const findThePromo = final.filter((promo) => promo.code == params.promo);

          console.log('findThePromo -> ', findThePromo);

          if (findThePromo.length !== 0) {
            // res.json({
            //   status: false,
            //   error: "Promocode is valid !",
            // });
            if (findThePromo[0].active) {
              req.body.discount = findThePromo[0].discount;
              console.log('discount -> ', req.body.discount);
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
              error: 'Promocode is invalid !',
            });
            // console.log("findThePromo -> ", findThePromo);
          }
        } else {
          // error
          res.json({
            status: false,
            error: 'Promo Data Not Found',
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
            mode: 'driving',
            key: 'AIzaSyDDTYs0JX_8BEC62oRGKLZTJac3Xd2nx74',
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
          console.log('distance.value  -> ', distance.text);
          console.log('duration.value  -> ', duration.text);
          console.log('start_address -> ', start_address);
          console.log('end_address  -> ', end_address);

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
                const getPricingForALoadingOption = pricingForLoadingOption.filter((x) => x.name == option.name);
                const price = getPricingForALoadingOption[0].price * option.quantity;
                loading_price += price;
                // console.log(`Price For ${option.name} -> `, price);
              });
            } else if ((loadingFilter.length = 1)) {
              const getPricingForALoadingOption = pricingForLoadingOption.filter(
                (x) => x.name == loadingFilter[0].name
              );
              const price = getPricingForALoadingOption[0].price
                * loadingFilter[0].quantity;
              loading_price += price;
              // console.log(`Price For ${loadingFilter[0]} -> `, price);
            }
          }

          // Loop Unloading Option
          if (unloadingFilter.length !== 0) {
            if (unloadingFilter.length > 1) {
              unloadingFilter.forEach((option) => {
                const getPricingForAUnloadingOption = pricingForUnloadingOption.filter(
                  (x) => x.name == option.name
                );
                const price = getPricingForAUnloadingOption[0].price * option.quantity;
                unloading_price += price;
                // console.log(`Price For ${option.name} -> `, price);
              });
            } else if ((unloadingFilter.length = 1)) {
              const getPricingForAUnloadingOption = pricingForUnloadingOption.filter(
                (x) => x.name == unloadingFilter[0].name
              );
              const price = getPricingForAUnloadingOption[0].price
                * unloadingFilter[0].quantity;
              unloading_price += price;
              // console.log(`Price For ${unloadingFilter[0].name} -> `, price);
            }
          }
          // =====================  Calculating Loading And Unloading Prices End ============================

          // =====================  Calculating Insurance Start ============================
          let insuranceCost = 0;
          if (params.insurance !== null) {
            const insurancePercent = parseInt(params.insurance.value);
            console.log('insurancePercent -> ', insurancePercent);
            const insuranceAmount = Math.ceil(
              (parseInt(params.cargo_value) / 100) * insurancePercent
            );
            console.log('insuranceAmount -> ', insuranceAmount);
            insuranceCost = insuranceAmount;
          }

          console.log('insuranceCost -> ', insuranceCost);

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

          console.log('bill -> ', bill);
          req.body.bill = bill;
          next();
        })
        .catch((error) => {
          console.log('Google Map Client Error -> ', error);
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
      console.log('calculate10percent -> ', calculate40percent);
      const high = Math.ceil(low + calculate40percent);

      res.json({
        status: true,
        high,
        low,
      });
    } else {
      res.json({
        status: false,
        error: 'Bill data missing',
      });
    }
  }
);

// Make A SCM Request
// {
//   "phone":"+923243280234",
//   "loading": [ {
//           "name":"crane",
//            "quantity":"2"
//       }, {
//           "name":"fork_lift_2_tons",
//           "quantity":"2"
//       }],
//   "unloading":[{
//           "name":"labour",
//            "quantity":"2"
//      }],
//   "floors": "2",
//   "cargo_insurance": false,
//   "desLat": "24.8345168",
//   "desLng": "67.0995516",
//   "desText": "Brooks Chowrangi",
//   "disText": "1 m",
//   "durText": "1 min",
//   "orgLat": "24.8345168",
//   "orgLng": "67.0995516",
//   "orgText": "Brooks Chowrangi",
//   "vehicle_type": "Suzuki",
//   "wallet": false
// }

// CREATE SCM REQUEST
// "1" => User Will Give Data And Create A Request | No Driver has accepted the request

// /create_request
// TODO: Schedule
// TODO: Notification
router.post(
  '/create_request',
  body('loading').isArray().withMessage('loading must be an array'),
  body('unloading').isArray().withMessage('loading must be an array'),
  body('floors').isString().withMessage('floors must be an string'),
  body('vehicle_type').isString().withMessage('vehicle_type must be an string'),
  body('desLat').isString().withMessage('desLat must be an string'),
  body('desLng').isString().withMessage('desLng must be an string'),
  body('desText').isString().withMessage('desText must be an string'),
  body('disText').isString().withMessage('disText must be an string'),
  body('durText').isString().withMessage('durText must be an string'),
  body('orgLat').isString().withMessage('orgLat must be an string'),
  body('orgLng').isString().withMessage('orgLng must be an string'),
  body('orgText').isString().withMessage('orgText must be an string'),
  body('wallet').isBoolean().withMessage('wallet must be an boolean'),

  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next()
    }
  },
  // Check Number Of Requests
  (req, res, next) => {
    scmRequestRef.once("value", (snapshot) => {
      if (snapshot.val()) {
        const rawrequests = snapshot.val();
        const requests = [];
        const convert = Object.entries(rawrequests);

        convert.forEach((x) => {
          requests.push(x[1]);
        });

        const requestInNumbers = requests.length;
        req.body.totalRequests = requestInNumbers;
        next();
      } else {
        req.body.totalRequests = 0;
        next();
      }
    });
  },
  (req, res, next) => {
    const params = req.body;

    // Create A Request
    //  requestsRef
    // Request Phases :
    // "1" => User Sent A Request | No Driver has accepted the request
    // "2" => Request Is Been Approved By A Driver
    // "3" => Driver Reached To The Origin Location
    // "4" => Driver Reached The Destination
    // "5" => Driver PickedUp The Load
    // "6" => Driver Delivered The Load

    // const newUserRequest = scmRequestRef.push();
    // const reqId = newUserRequest.key;
    const no = `BT000${req.body.totalRequests + 1}`;
    req.body.biltyNo = no;

    requestOBj = {
      ...params,
      payment_method: params.wallet ? 'wallet' : 'cod',
      biltyNo: no,
      status: 'pending',
      created: moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a'),
    }

    req.body.request = requestOBj

    // console.log(`req.body.request ->`,req.body.request)
    next()
  },
  // Check User
  (req, res, next) => {
    const params = req.body;

    userRef
      .child('users')
      .child(params.user.phone)
      .once('value', (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          // console.log('-User Data Received')
          next()
        } else {
          userRef
            .child('pro')
            .child(params.user.phone)
            .once('value', (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                req.body.user = user;
                // console.log('-User Data Received')
                next()
              } else {
                res.json({
                  status: false,
                  error: 'User Not Found in Database !',
                });
              }
            });

        }
      });
  },
  // Check Promo Code
  (req, res, next) => {
    const params = req.body;
    if (params.promo) {
      scmSettingsRef.child('promocodes').once('value', (snapshot) => {
        if (snapshot.val()) {
          const promocodes = snapshot.val();
          const convert = Object.entries(promocodes);

          const final = [];
          convert.forEach((x) => {
            final.push(x[1]);
          });

          const findThePromo = final.filter((promo) => promo.code == params.promo);

          // console.log('findThePromo -> ', findThePromo);

          if (findThePromo.length !== 0) {
            // res.json({
            //   status: false,
            //   error: "Promocode is valid !",
            // });
            if (findThePromo[0].active) {
              req.body.discount = findThePromo[0].discount;
              // console.log('discount -> ', req.body.discount);
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
              error: 'Promocode is invalid !',
            });
            // console.log("findThePromo -> ", findThePromo);
          }
        } else {
          // error
          res.json({
            status: false,
            error: 'Promo Data Not Found',
          });
        }
      });
    } else {
      next();
    }
  },
  // Find Nearest Online Driver
  (req, res, next) => {
    const params = req.body;
    //  Find Online Driver
    userRef
      .child('drivers')
      .orderByChild('online')
      .equalTo(true)
      .once('value', (snapshot) => {
        if (snapshot.val()) {
          snapshot.forEach((childSnapshot) => {
            const driver = childSnapshot.val();

            if (driver.work_on_same_city_movement == true || driver.work_on_same_city_movement == 'true') {
              if (driver.status == 'free') {
                let driversDistance = [];
                if (driver.current_position) {
                  driversDistance.push({
                    vector: CHECK_distance(
                      driver.current_position.lat,
                      driver.current_position.lng,
                      params.orgLat,
                      params.orgLng
                    ),
                    driver_phone: driver.phone,
                  });


                } else {
                  res.json({
                    status: false,
                    error: 'current position not found !',
                  });
                }

                driversDistance = _.orderBy(
                  driversDistance,
                  (item) => item.vector
                );
                console.log('driverDistance -> ', driversDistance);
                if (driversDistance[0].vector < 100) {
                  req.body.driverData = {
                    ...driver,
                  };
                  console.log('-Online Driver Found');
                  next();
                } else {
                  console.log('Driver Is Far Away');
                  res.json({
                    status: false,
                    message: 'No Driver Found Online',
                  });
                }
              } else {
                res.json({
                  status: false,
                  erorr: 'No Driver Found Online !',
                });
              }
            } else {
              res.json({
                status: false,
                erorr: 'No Driver Found Online !',
              });
            }
          });
        } else {
          res.json({
            status: false,
            erorr: 'No Driver Found Online !',
          });
        }
      });
  },
  // Get Pricing
  (req, res, next) => {
    const params = req.body;

    if (params.vehicle_type) {
      // Get Vehicle Type
      scmSettingsRef
        .child('vehicle_types')
        .child(params.vehicle_type)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const pricing = snapshot.val();
            req.body.pricingData = pricing;
            // console.log("Pricing added ", req.body.pricingData);

            scmCommission.on('value', (snapshot) => {
              const commission = snapshot.val();

              if (commission) {
                req.body.CommissionPercent = commission.value;

                if (
                  params.cargo_value
                  && params.cargo_value !== '0'
                  && params.cargo_value !== 0
                ) {
                  scmSettingsRef
                    .child('insurance')
                    .once('value', (snapshot) => {
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
                  message: 'Commission Data Missing From DB',
                });
              }
            });
          } else {
            res.json({
              status: false,
              error: 'Vehicle Type Not Found !',
            });
          }
        });
    } else {
      res.json({
        status: false,
        error: 'Vehicle Type Not Given !',
      });
    }
  },
  // Get Loading List
  (req, res, next) => {
    const params = req.body;

    if (params.loading) {
      scmSettingsRef.child('loading_options').once('value', (snapshot) => {
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
            error: 'Loading Option Pricing Not Found !',
          });
        }
      });
    } else {
      req.body.loading_options_pricing = [];
    }
  },
  // Unloading List
  (req, res, next) => {
    const params = req.body;

    if (params.unloading) {
      scmSettingsRef.child('unloading_options').once('value', (snapshot) => {
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
    }
  },
  // Set Pricing - Passing BIll
  // Added Promocode Discount
  (req, res, next) => {
    // user
    // request
    // pricingData
    // CommissionPercent
    const params = req.body;
    // Get Directions
    googleMapsClient
      .directions({
        params: {
          origin: [
            req.body.driverData.current_position.lat,
            req.body.driverData.current_position.lng,
          ],
          destination: [req.body.desLat, req.body.desLng],
          mode: 'driving',
          key: 'AIzaSyDDTYs0JX_8BEC62oRGKLZTJac3Xd2nx74',
        },
      })
      .then((Google) => {
        const DriverDistance = Google.data.routes[0].legs[0];
        req.body.googleDistance = DriverDistance;

        const { distance } = DriverDistance;
        const { duration } = DriverDistance;

        //  distance in meter
        //  duration in seconds

        // Calculation Arrival Price

        console.log('distance.value in meters -> ', distance.value);
        console.log('duration.value in meters -> ', duration.value);

        let arrivalPrice = 0;

        if (distance.value <= params.pricingData.minimumEmptyDistance) {
          arrivalPrice = params.pricingData.minimumEmptyPrice;
        } else {
          const inKM = distance.value / 1000;
          arrivalPrice = Math.ceil(inKM * params.pricingData.minimumEmptyPrice);
        }

        arrivalPrice = parseInt(arrivalPrice);

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
        if (loadingFilter !== null && loadingFilter.length !== 0) {
          if (loadingFilter.length > 1) {
            loadingFilter.forEach((option) => {

              const getPricingForALoadingOption = pricingForLoadingOption.filter((x) => {
                return x.name == option.name
              });

              if (getPricingForALoadingOption.length !== 0) {
                const price = getPricingForALoadingOption[0].price * option.quantity;
                loading_price += price;
              } else {
                res.json({
                  status: false,
                  error: 'Loading Option Not Valid !'
                })
              }

            });
          } else if ((loadingFilter.length == 1)) {
            const getPricingForALoadingOption = pricingForLoadingOption.filter(
              (x) => x.name == loadingFilter[0].name
            );
            const price = getPricingForALoadingOption[0].price * loadingFilter[0].quantity;
            loading_price += price;
            // console.log(`Price For ${loadingFilter[0]} -> `, price);
          }
        }

        if (unloadingFilter !== null && unloadingFilter.length !== 0) {
          // Loop Unloading Option
          if (unloadingFilter.length > 1) {
            unloadingFilter.forEach((option) => {
              const getPricingForAUnloadingOption = pricingForUnloadingOption.filter((x) => x.name == option.name);
              if (getPricingForAUnloadingOption.length !== 0) {
                const price = getPricingForAUnloadingOption[0].price * option.quantity;
                unloading_price += price;
                // console.log(`Price For ${option.name} -> `, price);

              } else {
                res.json({
                  status: false,
                  error: 'Loading Option Not Valid !'
                })
              }

            });
          } else if ((unloadingFilter.length == 1)) {
            const getPricingForAUnloadingOption = pricingForUnloadingOption.filter(
              (x) => x.name == unloadingFilter[0].name
            );
            const price = getPricingForAUnloadingOption[0].price
              * unloadingFilter[0].quantity;
            unloading_price += price;
            // console.log(`Price For ${unloadingFilter[0].name} -> `, price);
          }
        }
        // =====================  Calculating Loading And Unloading Prices End ============================

        // Done: Cargo Insurance
        // =====================  Calculating Insurance Start ============================
        let insuranceCost = 0;
        if (params.insurance !== null) {
          const insurancePercent = parseInt(params.insurance.value);
          console.log('insurancePercent -> ', insurancePercent);
          const insuranceAmount = Math.ceil(
            (parseInt(params.cargo_value) / 100) * insurancePercent
          );
          console.log('insuranceAmount -> ', insuranceAmount);
          insuranceCost = insuranceAmount;
        }

        console.log('insuranceCost -> ', insuranceCost);

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

        const bill = {
          arrivalPrice: parseInt(arrivalPrice),
          loadingServices: loading_price,
          unloadingServices: unloading_price,
          commissionPrice,
          departurePrice: parseInt(departurePrice),
          discountPercent: parseInt(discountPercent),
          driverPrice,
          floorPrice,
          netTotalPrice,
          timePrice,
          totalPrice,
        };

        req.body.bill = bill;
        console.log('-Bill Generated -> ', bill);
        next();
      })
      .catch((error) => {
        console.log('Google Map Client Error -> ', error);
        res.json({
          status: false,
          error: error,
        });
      });
  },
  // Check User Wallet Amount
  (req, res, next) => {
    const params = req.body;

    if (params.wallet) {
      walletRef
        .child('users')
        .child(params.user_phone)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const wallet = snapshot.val();
            req.body.wallet = wallet;
            // console.log('-Wallet Data Received')

            // Check Wallet Amount
            const amount = parseInt(wallet.amount);

            if (amount > 0) {
              // Check Amount Is Greater Than / Equal To NetTotalPrice
              let netTotalPrice = parseInt(req.body.bill.netTotalPrice);
              if (netTotalPrice <= amount) {
                // Deduct Amount
                const deductedAmount = amount - netTotalPrice;
                // Update User Wallet
                walletRef
                  .child('users')
                  .child(params.user_phone)
                  .update({
                    amount: deductedAmount
                  }).then(() => {
                    req.body.deductedAmount = deductedAmount;
                    next()
                  }).catch((err) => {
                    res.json({
                      status: false,
                      error: err.message
                    })
                  })

              } else {
                res.json({
                  status: false,
                  error: 'User does not have enough money in wallet !'
                })
              }
            } else {
              res.json({
                status: false,
                error: 'User does not have enough money in wallet !'
              })
            }
          } else {
            res.json({
              status: false,
              error: 'wallet Not Found in Database !',
            });
          }
        });
    } else {
      next()
    }
  },
  // Update Request
  (req, res) => {
    const params = req.body;
    if (req.body.bill) {
      scmRequestRef
        .child(params.request.biltyNo)
        .update({
          bill: params.bill,
          user_paid: req.body.deductedAmount ? true : false,
          googleDistance: req.body.googleDistance,
          driverData: req.body.driverData,
          ...req.body.request,
          token: null
        })
        .then(() => {
          res.json({
            status: true,
            message: 'SCM Request Has Been Placed !',
            request: {
              ...params.request,
              ...req.body.googleDistance,
            },
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
        message: 'Bill Not Found !',
      });
    }
  },

);

// Driver Accepted SCM Request Successfully
// "3" => Request Is Been Approved By A Driver
// /request_accept_by_driver

// {
//   "phone": "",
//    "reqId": ""
// }

router.post(
  '/request_accept_by_driver',
  body('phone').isMobilePhone().withMessage('Invalid Phone Number !'),
  body('reqId').isString().withMessage('reqId must be string'),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next()
    }
  },
  // Check Driver
  (req, res, next) => {
    const params = req.body;
    userRef
      .child('drivers')
      .child(params.phone)
      .once('value', (snapshot) => {
        if (snapshot.val()) {
          const driver = snapshot.val();
          req.body.driver = driver;
          next();
        } else {
          res.json({
            status: false,
            error: 'Driver Not Found !',
          });
        }
      });
  },
  // Get Request Data
  (req, res, next) => {
    // Driver Phone Required
    // Request Id Required
    const params = req.body;

    if (params.reqId) {
      scmRequestRef
        .child(params.reqId)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();

            if (request.status == 'pending') {
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
              error: 'Request Not Found !',
            });
          }

          // if (request) {
          //   if (
          //     request.status == "completed" ||
          //     request.phase >= 3 ||
          //     request.phaseText == "driver_accepted"
          //   ) {
          //     res.json({
          //       status: false,
          //       error: "Request already have a driver attached !",
          //     });
          //   } else {
          //     scmRequestRef
          //       .child(params.reqId)
          //       .update({
          //         driver_phone: params.phone,
          //         phase: 3,
          //       })
          //       .then(() => {
          //         userRef
          //           .child("drivers")
          //           .child(params.phone)
          //           .update({
          //             status: "busy",
          //             request_accepted_on: moment().valueOf(),
          //           })
          //           .then(() => {
          //             res.json({
          //               status: true,
          //               message: "SCM Request Accepted Successfully",
          //             });
          //           });
          //       })
          //       .catch((error) => {
          //         res.json({
          //           status: false,
          //           error: error,
          //         });
          //       });
          //   }
          // } else {
          //   res.json({
          //     status: false,
          //     error: "Could Not Find Request !",
          //   });
          // }
        })
        .catch((error) => {
          res.json({
            status: false,
            error,
          });
        });
    } else {
      res.json({
        status: false,
        error: 'Give reqId',
      });
    }
  },
  // Get Driver Route
  (req, res, next) => {
    const params = req.body;
    googleMapsClient
      .directions({
        params: {
          origin: [
            params.driver.current_position.lat,
            params.driver.current_position.lng,
          ],
          destination: [params.request.desLat, params.request.desLng],
          mode: 'driving',
          key: 'AIzaSyDDTYs0JX_8BEC62oRGKLZTJac3Xd2nx74',
        },
      })
      .then((Google) => {
        req.body.route = Google.data;
        next();
      })
      .catch((err) => {
        console.log(err);
      });
  },
  // Deduct From User Wallet If Payment Method => Wallet
  (req, res, next) => {
    const params = req.body;

    if (params.request.payment_method == 'wallet') {
      walletRef
        .child('users')
        .child(params.request.user_phone)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const wallet = snapshot.val();

            const WalletAmount = parseInt(wallet.amount);
            console.log('WalletAmount -> ', WalletAmount);

            // if value is in negetive
            if (WalletAmount < 0) {
              res.json({
                status: false,
                error: 'User Wallet Amount In Negetive',
              });
            }

            // if value is in positive
            if (WalletAmount > 0) {
              const get_user_request_price = parseInt(
                params.request.bill.netTotalPrice
              );

              // let discountPercent = parseInt(params.request.bill.discountPercent);

              console.log('Request Price -> ', get_user_request_price);

              if (WalletAmount >= get_user_request_price) {
                const deduction = WalletAmount - get_user_request_price;
                req.body.user_paid = deduction;

                walletRef
                  .child('users')
                  .child(params.request.user_phone)
                  .update({
                    amount: deduction,
                  })
                  .then(() => {
                    console.log('Wallet Updated');
                    req.body.user_paid = get_user_request_price;
                    next();
                  })
                  .catch((error) => {
                    res.json({
                      status: false,
                      error,
                    });
                  });
              } else {
                res.json({
                  status: false,
                  error: 'User does not have that much money in wallet',
                });
              }
            }
          } else {
            res.json({
              status: false,
              error: 'Wallet Not Found in Database !',
            });
          }
        });
    } else {
      // console.log("Payment Type Not Wallet !");
      next();
    }
  },
  // Update Driver Status
  (req, res, next) => {
    const params = req.body;
    userRef
      .child('drivers')
      .child(params.phone)
      .update({
        status: 'busy',
        on_request: req.body.request.id,
        route: req.body.route,
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
  // Update Request Status
  (req, res) => {
    const params = req.body;

    const driverStatus = {
      status: 'driver_accepted',
      driver_accepted_on: moment().format('MMMM Do YYYY, h:mm:ss a'),
      driver_delivered_on: null,
      driver_reached_on: null,
      driver_pickup: null,
    };

    req.body.driverStatus = driverStatus;

    scmRequestRef
      .child(params.reqId)
      .update({
        status: 'driver_accepted',
        driver_phone: params.phone,
        driver_accepted_on: moment().valueOf(),
        driver_current_location: req.body.driver.current_position,
        user_paid: req.body.request.user_paid,
      })
      .then(() => {
        res.json({
          status: true,
          message: `Driver Accepted The Request(${params.request.id}) Successfully `,
          route: req.body.route,
          data: {
            driverStatus: req.body.driverStatus,
            driverData: params.request.driverData,
            googleData: params.request.googleDistance,
          },
        });
      })
      .catch((error) => {
        console.log('err -> ', error);
        res.json({
          status: false,
          error,
        });
      });
  }
);

// "4" => Request Is Been Rejected By A Driver
// /request_reject_by_driver
// {
//   "phone": "",
//    "reqId": ""
// }
router.post(
  '/request_reject_by_driver',
  body('phone').isMobilePhone().withMessage('Invalid Phone Number !'),
  body('reqId').isString().withMessage('reqId must be string'),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next()
    }
  },
  // Check Driver / Get Driver Data
  (req, res, next) => {
    const params = req.body;
    if (params.phone) {
      userRef
        .child('drivers')
        .child(params.phone)
        .on('value', (snapshot) => {
          if (snapshot.val()) {
            const driver = snapshot.val();
            req.body.driver = driver;
            console.log('Driver Data Added');
            next();
          } else {
            res.json({
              status: false,
              error: 'Driver Not Found !',
            });
          }
        });
    }
  },
  // Get Request Data
  (req, res, next) => {
    // Driver Phone Required
    // Request Id Required
    const params = req.body;

    if (params.reqId) {
      scmRequestRef
        .child(params.reqId)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();

            if (request.status == 'pending') {
              req.body.request = request;
              console.log('Request Data Added');
              next();
            } else {
              req.body.request = request;
              next()
              // res.json({
              //   status: false,
              //   error: `Request has a status -> ${request.status}`,
              // });
            }
          } else {
            res.json({
              status: false,
              error: 'Request Not Found !',
            });
          }

          // if (request) {
          //   if (
          //     request.status == "completed" ||
          //     request.phase >= 3 ||
          //     request.phaseText == "driver_accepted"
          //   ) {
          //     res.json({
          //       status: false,
          //       error: "Request already have a driver attached !",
          //     });
          //   } else {
          //     scmRequestRef
          //       .child(params.reqId)
          //       .update({
          //         driver_phone: params.phone,
          //         phase: 3,
          //       })
          //       .then(() => {
          //         userRef
          //           .child("drivers")
          //           .child(params.phone)
          //           .update({
          //             status: "busy",
          //             request_accepted_on: moment().valueOf(),
          //           })
          //           .then(() => {
          //             res.json({
          //               status: true,
          //               message: "SCM Request Accepted Successfully",
          //             });
          //           });
          //       })
          //       .catch((error) => {
          //         res.json({
          //           status: false,
          //           error: error,
          //         });
          //       });
          //   }
          // } else {
          //   res.json({
          //     status: false,
          //     error: "Could Not Find Request !",
          //   });
          // }
        })
        .catch((error) => {
          res.json({
            status: false,
            error,
          });
        });
    } else {
      res.json({
        status: false,
        error: 'Give reqId',
      });
    }
  },
  // Get Pricing
  (req, res, next) => {
    const params = req.body;

    if (params.request.vehicle_type) {
      // Get Vehicle Type
      scmSettingsRef
        .child('vehicle_types')
        .child(params.request.vehicle_type)
        .once('value', (snapshot) => {
          console.log('snapshot ', snapshot.val());
          if (snapshot.val()) {
            const pricing = snapshot.val();
            req.body.pricingData = pricing;
            console.log('Pricing added ', req.body.pricingData);

            scmCommission.once('value', (snapshot) => {
              const commission = snapshot.val();

              if (commission) {
                req.body.CommissionPercent = commission.value;

                if (
                  params.cargo_value
                  && params.cargo_value !== '0'
                  && params.cargo_value !== 0
                ) {
                  scmSettingsRef
                    .child('insurance')
                    .once('value', (snapshot) => {
                      if (snapshot.val()) {
                        const insurance = snapshot.val();
                        req.body.insurance = insurance;
                      } else {
                        req.body.insurance = null;
                        next();
                      }
                    });
                } else {
                  next();
                }
              } else {
                res.json({
                  status: false,
                  message: 'Commission Data Missing From DB',
                });
              }
            });
          } else {
            res.json({
              status: false,
              error: 'Vehicle Type Not Found !',
            });
          }
        })
        .catch((error) => {
          res.json({
            status: false,
            error,
            msg: 'Vehicle Type !',
          });
        });
    } else {
      res.json({
        status: false,
        error: 'Vehicle Type Not Given !',
      });
    }
  },
  // Get Loading List
  (req, res, next) => {
    const params = req.body;
    if (params.request.loading && params.request.loading.length !== 0) {
      scmSettingsRef.child('loading_options').once('value', (snapshot) => {
        if (snapshot.val()) {
          const loading_options = snapshot.val();
          const convert = Object.entries(loading_options);

          const final = [];
          convert.forEach((x) => {
            final.push(x[1]);
          });
          req.body.loading_options_pricing = final;
          console.log('Got Loading List');
          next();
        } else {
          res.json({
            status: false,
            error: 'Loading Option Pricing Not Found !',
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

    if (params.request.unloading && params.request.unloading.length !== 0) {
      scmSettingsRef.child('unloading_options').once('value', (snapshot) => {
        if (snapshot.val()) {
          const unloading_option = snapshot.val();
          const convert = Object.entries(unloading_option);

          const final = [];
          convert.forEach((x) => {
            final.push(x[1]);
          });
          req.body.unloading_options_pricing = final;
          next();
        } else {
          res.json({
            status: false,
            error: 'Unloading List Not Found',
          });
        }
      });
    } else {
      req.body.unloading_options_pricing = [];
      next();
    }
  },
  // Update Driver Status
  (req, res, next) => {
    const params = req.body;
    console.log(params.phone)
    userRef
      .child('drivers')
      .child(params.phone)
      .update({
        status: 'free',
        on_request: null,
        route: null,
      })
      .then(() => {
        console.log('Driver Updated');
        next();
      })
      .catch((error) => {
        res.json({
          status: false,
          error,
        });
      });
  },
  // Restart Driver Finding Process
  // Find Nearest Online Driver
  (req, res, next) => {
    const params = req.body;
    //  Find Online Driver
    userRef
      .child('drivers')
      .orderByChild('online')
      .equalTo(true)
      .once('value', (snapshot) => {
        if (snapshot.val()) {
          snapshot.forEach((childSnapshot) => {
            const driver = childSnapshot.val();

            if (driver.scm == true || driver.scm == 'true') {
              if (driver.status == 'free') {
                let driversDistance = [];
                if (driver.current_position) {
                  driversDistance.push({
                    vector: CHECK_distance(
                      driver.current_position.lat,
                      driver.current_position.lng,
                      params.request.orgLat,
                      params.request.orgLng
                    ),
                    driver_phone: driver.phone,
                  });
                } else {
                  res.json({
                    status: false,
                    error: 'current position not found !',
                  });
                }

                driversDistance = _.orderBy(
                  driversDistance,
                  (item) => item.vector
                );
                console.log('driverDistance -> ', driversDistance);
                if (driversDistance[0].vector < 100) {
                  req.body.driverData = {
                    ...driver,
                  };
                  // console.log("driver -> ", driver);
                  next();
                } else {
                  console.log('Driver Is Far Away');
                  res.json({
                    status: false,
                    message: 'No Driver Found Online',
                  });
                }
              } else {
                res.json({
                  status: false,
                  erorr: 'No Driver Found Online !',
                });
              }
            } else {
              res.json({
                status: false,
                erorr: 'No Driver Found Online !',
              });
            }
          });
        } else {
          res.json({
            status: false,
            error: 'No Driver Found Online !',
          });
        }
      });
  },
  // Update Request Status
  (req, res, next) => {
    const params = req.body;

    scmRequestRef
      .child(params.reqId)
      .update({
        status: 'pending',
        driverData: params.driverData,
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
  // Done
  (req, res, next) => {
    // if (req.body.bill) {

    // } else {
    //   res.json({
    //     status: false,
    //     error: 'Bill Data Is NOt Found !',
    //   });
    // }
    res.json({
      status: true,
      message: 'Driver Cancelled The Request Successfully',
    });
  }
);

// "5" => Driver Reached To The Origin Location
// /driver_reached_origin
// {
//     "phone": "",
//      "reqId": ""
//   }
router.post(
  '/driver_reached_origin',
  body('phone').isMobilePhone().withMessage('Invalid Phone Number !'),
  body('reqId').isString().withMessage('reqId must be string'),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next()
    }
  },
  // Check Driver / Get Driver Data
  (req, res, next) => {
    const params = req.body;
    if (params.phone) {
      userRef
        .child('drivers')
        .child(params.phone)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const driver = snapshot.val();
            req.body.driver = driver;
            console.log('Driver Data Added');
            next();
          } else {
            res.json({
              status: false,
              error: 'Driver Not Found !',
            });
          }
        });
    }
  },
  // Get Request Data
  (req, res, next) => {
    // Driver Phone Required
    // Request Id Required
    const params = req.body;

    if (params.reqId) {
      scmRequestRef
        .child(params.reqId)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();

            req.body.request = request;
            console.log('Request Data Added');
            next();
          } else {
            res.json({
              status: false,
              error: 'Request Not Found !',
            });
          }
        })
        .catch((error) => {
          res.json({
            status: false,
            error,
          });
        });
    } else {
      res.json({
        status: false,
        error: 'Give reqId',
      });
    }
  },
  // Update Request Status
  (req, res, next) => {
    const params = req.body;
    // console.log("req.body.driverData -> ", req.body.driverData);

    switch (params.request.status) {
      case 'pending':
        res.json({
          status: false,
          error: 'Request is not accepted by anyone driver !',
        });
        break;

      case 'driver_accepted':
        const driverStatus = {
          status: 'driver_reached',
          driver_accepted_on: moment(params.request.driver_accepted_on).format(
            'MMMM Do YYYY, h:mm:ss a'
          ),
          driver_delivered_on: null,
          driver_reached_on: moment().format('MMMM Do YYYY, h:mm:ss a'),
          driver_pickup: null,
        };

        req.body.driverStatus = driverStatus;

        scmRequestRef
          .child(params.request.id)
          .update({
            status: 'driver_reached',
            driver_reached_on: moment().valueOf(),
            driver_current_location: params.driver.current_position,
          })
          .then(() => {
            console.log('Request Updated After To driver_accepted');
            next();
          })
          .catch((error) => {
            res.json({
              status: false,
              level: 'Request Update',
              error: error.message,
            });
          });
        break;

      case 'driver_reached':
        res.json({
          status: false,
          error: 'Driver Already Reached Origin !',
        });

        break;

      case 'driver_pickup':
        res.json({
          status: false,
          error: 'Driver Has Picked Up The Load !',
        });

        break;

      case 'user_cancelled':
        res.json({
          status: false,
          error: 'User Already Cancelled The Request !',
        });
        break;

      default:
        res.json({
          status: false,
          error: 'No Case Found !',
        });
        break;
    }
  },
  // Done
  (req, res, next) => {
    const params = req.body;
    res.json({
      status: true,
      message: `Driver Reached The Origin On ${moment().format(
        'MMMM Do YYYY, h:mm:ss a'
      )}`,
      data: {
        driverStatus: params.driverStatus,
        estimatedTime: params.request.googleDistance.duration.text,
        estimatedDistance: params.request.googleDistance.distance.text,
        start_location: params.request.googleDistance.start_address,
        end_location: params.request.googleDistance.end_address,
      },
    });
  }
);

// "6" => Driver Picked Up The Load
// /driver_picked_up_load
// {
//     "phone": "",
//      "reqId": ""
//   }
router.post(
  '/driver_picked_up_load',
  body('phone').isMobilePhone().withMessage('Invalid Phone Number !'),
  body('reqId').isString().withMessage('reqId must be string'),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next()
    }
  },
  // Check Driver / Get Driver Data
  (req, res, next) => {
    const params = req.body;
    if (params.phone) {
      userRef
        .child('drivers')
        .child(params.phone)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const driver = snapshot.val();
            req.body.driver = driver;
            console.log('Driver Data Added');
            next();
          } else {
            res.json({
              status: false,
              error: 'Driver Not Found !',
            });
          }
        });
    }
  },
  // Get Request Data
  (req, res, next) => {
    // Driver Phone Required
    // Request Id Required
    const params = req.body;

    if (params.reqId) {
      scmRequestRef
        .child(params.reqId)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();

            req.body.request = request;
            console.log('Request Data Added');
            next();
          } else {
            res.json({
              status: false,
              error: 'Request Not Found !',
            });
          }
        })
        .catch((error) => {
          res.json({
            status: false,
            error,
          });
        });
    } else {
      res.json({
        status: false,
        error: 'Give reqId',
      });
    }
  },
  // Update Request Status
  (req, res, next) => {
    const params = req.body;
    // console.log("req.body.driverData -> ", req.body.driverData);

    switch (params.request.status) {
      case 'pending':
        res.json({
          status: false,
          error: 'Request is not accepted by anyone driver !',
        });
        break;

      case 'driver_accepted':
        res.json({
          status: false,
          error: 'Driver Already Accepted Request !',
        });
        break;

      case 'driver_reached':
        const driverStatus = {
          status: 'driver_reached',
          driver_accepted_on: moment(params.request.driver_accepted_on).format(
            'MMMM Do YYYY, h:mm:ss a'
          ),
          driver_delivered_on: null,
          driver_reached_on: moment(params.request.driver_accepted_on).format(
            'MMMM Do YYYY, h:mm:ss a'
          ),
          driver_pickup: moment().format('MMMM Do YYYY, h:mm:ss a'),
        };
        scmRequestRef
          .child(params.request.id)
          .update({
            status: 'driver_pickup',
            driver_pickup_on: moment().valueOf(),
            driver_current_location: params.driver.current_position,
          })
          .then(() => {
            console.log('Request Updated After To driver_pickup');
            next();
          })
          .catch((error) => {
            res.json({
              status: false,
              level: 'Request Update',
              error: error.message,
            });
          });

        break;

      case 'driver_pickup':
        res.json({
          status: false,
          error: 'Driver Already PickedUp The Load !',
        });

        break;

      case 'user_cancelled':
        res.json({
          status: false,
          error: 'User Already Cancelled The Request !',
        });
        break;

      default:
        res.json({
          status: false,
          error: 'No Case Found !',
        });
        break;
    }
  },
  // Done
  (req, res, next) => {
    const params = req.body;
    res.json({
      status: true,
      message: `Driver Picked Up The Load On ${moment().format(
        'MMMM Do YYYY, h:mm:ss a'
      )}`,
      data: {
        driverStatus: params.driverStatus,
        estimatedTime: params.request.googleDistance.duration.text,
        estimatedDistance: params.request.googleDistance.distance.text,
        start_location: params.request.googleDistance.start_address,
        end_location: params.request.googleDistance.end_address,
      },
    });
  }
);

// "7" => Driver Delivered (Request Is Now Completed)
// /driver_delivered
router.post(
  '/driver_delivered',
  body('phone').isMobilePhone().withMessage('Invalid Phone Number !'),
  body('reqId').isString().withMessage('reqId must be string'),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next()
    }
  },
  // Check Driver / Get Driver Data
  (req, res, next) => {
    const params = req.body;
    if (params.phone) {
      userRef
        .child('drivers')
        .child(params.phone)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const driver = snapshot.val();
            req.body.driver = driver;
            console.log('Driver Data Added');
            next();
          } else {
            res.json({
              status: false,
              error: 'Driver Not Found !',
            });
          }
        });
    }
  },
  // Get Request Data
  (req, res, next) => {
    // Driver Phone Required
    // Request Id Required
    const params = req.body;

    if (params.reqId) {
      scmRequestRef
        .child(params.reqId)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();

            req.body.request = request;
            console.log('Request Data Added');
            next();
          } else {
            res.json({
              status: false,
              error: 'Request Not Found !',
            });
          }
        })
        .catch((error) => {
          res.json({
            status: false,
            error,
          });
        });
    } else {
      res.json({
        status: false,
        error: 'Give reqId',
      });
    }
  },
  // Get User Data
  (req, res, next) => {
    const params = req.body;
    if (params.phone) {
      userRef
        .child('users')
        .child(params.request.user_phone)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const user = snapshot.val();
            req.body.user = user;
            console.log('user Data Added');
            next();
          } else {
            res.json({
              status: false,
              error: 'user Not Found !',
            });
          }
        });
    }
  },
  // Generate Invoice
  (req, res, next) => {
    const params = req.body;

    googleMapsClient
      .directions({
        params: {
          origin: [params.request.orgLat, params.request.orgLng],
          destination: [params.request.desLat, params.request.desLng],
          mode: 'driving',
          key: 'AIzaSyDDTYs0JX_8BEC62oRGKLZTJac3Xd2nx74',
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
              loadingOptionsCombine.push(`${option.name} x${option.quantity}`);
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

        const newInvoiceKey = scmInvoiceRef.child(params.request.id).push().key;
        // User Invoice
        const Userinvoice = {
          invoiceId: newInvoiceKey,
          invoiceCreatedOn: moment().format('MMMM Do YYYY, h:mm:ss a'),
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
            'MMMM Do YYYY, h:mm:ss a'
          ),
          origin_location: params.request.orgText,
          destination_location: params.request.desText,
          total_distance: DriverDistance.distance.text,
          estimated_time: DriverDistance.duration.text,
          driver_accepted_on: moment(params.request.driver_accepted_on).format(
            'MMMM Do YYYY, h:mm:ss a'
          ),
          driver_reached_on: moment(params.request.driver_reached_on).format(
            'MMMM Do YYYY, h:mm:ss a'
          ),
          driver_pickup_on: moment(params.request.driver_pickup_on).format(
            'MMMM Do YYYY, h:mm:ss a'
          ),
          driver_delivered_on: moment().format('MMMM Do YYYY, h:mm:ss a'),
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
          .child('user')
          .set(Userinvoice)
          .then(() => {
            // Driver Invoice

            const Driverinvoice = {
              invoiceId: newInvoiceKey,
              invoiceCreatedOn: moment().format('MMMM Do YYYY, h:mm:ss a'),
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
                'MMMM Do YYYY, h:mm:ss a'
              ),
              origin_location: params.request.orgText,
              destination_location: params.request.desText,
              total_distance: DriverDistance.distance.text,
              estimated_time: DriverDistance.duration.text,
              driver_accepted_on: moment(
                params.request.driver_accepted_on
              ).format('MMMM Do YYYY, h:mm:ss a'),
              driver_reached_on: moment(
                params.request.driver_reached_on
              ).format('MMMM Do YYYY, h:mm:ss a'),
              driver_pickup_on: moment(params.request.driver_pickup_on).format(
                'MMMM Do YYYY, h:mm:ss a'
              ),
              driver_delivered_on: moment().format('MMMM Do YYYY, h:mm:ss a'),
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
              .child('driver')
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
                  message: 'driver invoice generation',
                  error,
                });
              });
          })
          .catch((error) => {
            res.json({
              status: false,
              message: 'user invoice generation',
              error,
            });
          });
      })
      .catch((err) => {
        console.log(err);
      });
  },
  // Create Driver History
  // TODO: Add Payment Method
  (req, res, next) => {
    const params = req.body;

    // const newHistory = driverHistoryRef.child(params.driver.phone).push();

    if (params.user_paid) {
      driverHistoryRef
        .child(params.driver.phone)
        .child(params.request.id)
        .set({
          username: params.user.fullname,
          user_phone: params.user.phone,
          request_id: params.request.id,
          biltyNo: params.request.biltyNo,
          narration: 'Driver Will Receive Payment From Meribilty',
          user_paid: params.user_paid,
          paymentMethod: 'wallet',
          request_status: params.request.status,
          driver_accepted_on: moment(params.request.driver_accepted_on).format(
            'MMMM Do YYYY, h:mm:ss a'
          ),
          driver_reached_on: moment(params.request.driver_reached_on).format(
            'MMMM Do YYYY, h:mm:ss a'
          ),
          driver_pickup_on: moment(params.request.driver_pickup_on).format(
            'MMMM Do YYYY, h:mm:ss a'
          ),
          driver_delivered_on: moment(
            params.request.driver_delivered_on
          ).format('MMMM Do YYYY, h:mm:ss a'),
          status: 'completed',
          type: 'scm',
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
    } else {
      driverHistoryRef
        .child(params.driver.phone)
        .child(params.request.id)
        .set({
          username: params.user.fullname,
          user_phone: params.user.phone,
          request_id: params.request.id,
          biltyNo: params.request.biltyNo,
          narration: 'Driver Will Receive Payment From User (Cash On Delivery)',
          paymentMethod: 'cod',
          request_status: params.request.status,
          driver_accepted_on: moment(params.request.driver_accepted_on).format(
            'MMMM Do YYYY, h:mm:ss a'
          ),
          driver_reached_on: moment(params.request.driver_reached_on).format(
            'MMMM Do YYYY, h:mm:ss a'
          ),
          driver_pickup_on: moment(params.request.driver_pickup_on).format(
            'MMMM Do YYYY, h:mm:ss a'
          ),
          driver_delivered_on: moment(
            params.request.driver_delivered_on
          ).format('MMMM Do YYYY, h:mm:ss a'),
          status: 'completed',
          type: 'scm',
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
    }
  },
  // Update Request Status
  (req, res, next) => {
    const params = req.body;
    // console.log("req.body.driverData -> ", req.body.driverData);

    const driverStatus = {
      status: 'driver_delivered',
      driver_delivered_on: moment().format('MMMM Do YYYY, h:mm:ss a'),
      driver_reached_on: moment(params.request.driver_reached_on).format(
        'MMMM Do YYYY, h:mm:ss a'
      ),
      driver_pickup: moment(params.driver_pickup_on).format(
        'MMMM Do YYYY, h:mm:ss a'
      ),
    };

    req.body.driverStatus = driverStatus;

    scmRequestRef
      .child(params.request.id)
      .update({
        status: 'driver_delivered',
        driver_delivered_on: moment().valueOf(),
        driver_current_location: params.driver.current_position,
      })
      .then(() => {
        console.log('Request Updated After To driver_delivered');
        next();
      })
      .catch((error) => {
        res.json({
          status: false,
          level: 'Request Update',
          error: error.message,
        });
      });
  },
  // Done
  (req, res, next) => {
    const params = req.body;
    res.json({
      status: true,
      message: `Driver Delivered The Load On ${moment().format(
        'MMMM Do YYYY, h:mm:ss a'
      )}`,
      data: {
        driverStatus: params.driverStatus,
        estimatedTime: params.request.googleDistance.duration.text,
        estimatedDistance: params.request.googleDistance.distance.text,
        start_location: params.request.googleDistance.start_address,
        end_location: params.request.googleDistance.end_address,
      },
    });
  }
);

// SCM Request Cancellation By User
// TODO : ADD CANCELLATION REASON
// "8" => User Cancelled The Request
// {
//   "phone": "",
//    "reqId": "",

// }
router.post(
  '/request_cancel_by_user',
  body('phone').isMobilePhone().withMessage('Invalid Phone Number !'),
  body('reqId').isString().withMessage('reqId must be string'),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next()
    }
  },
  // Get User Data
  (req, res, next) => {
    const params = req.body;
    // Request Id Required
    // User Phone Required
    if (params.phone) {
      const params = req.body;
      userRef
        .child('users')
        .child(params.phone)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const user = snapshot.val();
            req.body.user = user;

            walletRef
              .child('users')
              .child(user.phone)
              .once('value', (snapshot) => {
                if (snapshot.val()) {
                  const wallet = snapshot.val();
                  req.body.wallet = wallet;
                  next();
                } else {
                  res.json({
                    status: false,
                    error: 'Wallet Not Found ',
                  });
                }
              });
          } else {
            res.json({
              status: false,
              error,
            });
          }
        });
    } else {
      res.json({
        status: false,
        error: 'User Phone Not Given !',
      });
    }
  },
  // Get Request Data
  (req, res, next) => {
    // Driver Phone Required
    // Request Id Required
    const params = req.body;

    if (params.reqId) {
      scmRequestRef
        .child(params.reqId)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();

            if (request.status == 'pending') {
              next()
              // res.json({
              //   status: false,
              //   error: 'Request Status Is Pending !',
              // });
            } else if (request.status == 'user_cancelled') {
              res.json({
                status: false,
                error: 'User Already Cancelled This Request',
              });
            } else {
              req.body.request = request;
              next();
            }
          } else {
            res.json({
              status: false,
              error: 'Request Not Found !',
            });
          }
        })
        .catch((error) => {
          res.json({
            status: false,
            error,
          });
        });
    } else {
      res.json({
        status: false,
        error: 'reqId Not Given',
      });
    }
  },
  // Get Driver Data
  (req, res, next) => {
    const params = req.body;
    // Request Id Required
    // User Phone Required
    if (params.request.driver_phone) {
      const params = req.body;
      userRef
        .child('drivers')
        .child(params.request.driver_phone)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const driver = snapshot.val();
            req.body.driver = driver;
            next();
          } else {
            res.json({
              status: false,
              error,
            });
          }
        });
    } else {
      res.json({
        status: false,
        error: 'driver Phone Not Given !',
      });
    }
  },
  // Cancellation Price Calculation
  (req, res, next) => {
    const params = req.body;

    scmSettingsRef
      .child('vehicle_types')
      .child(params.request.vehicle_type)
      .once('value', (snapshot) => {
        if (snapshot.val()) {
          const pricing = snapshot.val();

          const get_user_cancellation_price = parseInt(pricing.clientCancelPrice);
          const get_user_cancellation_duration = parseInt(
            pricing.clientCancelDuration
          );

          const now = moment(); // create a moment with the current time
          const then = moment(params.request.createdAt); // create a moment with the other time timestamp in seconds
          const delta = now.diff(then, 'milliseconds'); // get the millisecond difference
          const differenceInMinutes = parseInt(moment(delta).format('mm'));

          if (differenceInMinutes > get_user_cancellation_duration) {
            // Substract From User Wallet
            // get_user_cancellation_price
            console.log(
              'get_user_cancellation_duration -> ',
              get_user_cancellation_duration
            );
            console.log('differenceInMinutes -> ', differenceInMinutes);

            const WalletAmount = parseInt(params.wallet.amount);
            console.log('WalletAmount -> ', WalletAmount);

            // if value is in negetive
            if (WalletAmount < 0) {
              const afterDeduction = WalletAmount - get_user_cancellation_price;
              console.log('Negetive After Deduction -> ', afterDeduction);

              walletRef
                .child('users')
                .child(params.user.phone)
                .update({
                  amount: afterDeduction,
                })
                .then(() => {
                  next();
                })
                .catch((err) => {
                  res.json({
                    status: false,
                    err,
                  });
                });
            }

            // if value is in positive
            if (WalletAmount > 0) {
              const afterDeduction = WalletAmount - get_user_cancellation_price;
              console.log('Positive After Deduction -> ', afterDeduction);

              walletRef
                .child('users')
                .child(params.user.phone)
                .update({
                  amount: afterDeduction,
                })
                .then(() => {
                  next();
                })
                .catch((err) => {
                  res.json({
                    status: false,
                    err,
                  });
                });
            }
            // res.json({
            //   stop: true,
            // });
          }

          if (differenceInMinutes < get_user_cancellation_duration) {
            console.log('No Cancellation Charges');
            next();
          }
        } else {
          res.json({
            status: false,
            error: 'Vehicle Type Not Found in Database !',
          });
        }
      });
  },
  // Update Request Status
  (req, res, next) => {
    const params = req.body;
    scmRequestRef
      .child(params.reqId)
      .update({
        status: 'user_cancelled',
        user_cancelled_on: moment().valueOf(),
        cancellation_reason: params.cancellation_reason,
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
  // Update Driver Status
  (req, res, next) => {
    const params = req.body;
    if (req.body.request.driver_phone) {
      userRef
        .child('drivers')
        .child(req.body.request.driver_phone)
        .update({
          status: 'free',
          on_request: null,
        })
        .then(() => {
          next();
        })
        .catch((error) => {
          res.json({
            status: true,
            error,
          });
        });
    }
  },
  // Update Driver History
  (req, res, next) => {
    const params = req.body;

    const newHistory = driverHistoryRef.child(params.driver.phone).push();

    switch (params.request.status) {
      case 'pending':
        res.json({
          status: false,
          error: 'No Driver Has Accepted The Request.',
        });

        break;

      case 'driver_accepted':
        newHistory
          .set({
            username: params.user.fullname,
            user_phone: params.user.phone,
            request_id: params.request.id,
            biltyNo: params.request.biltyNo,
            request_status: params.request.status,
            driver_accepted_on: params.request.driver_accepted_on,
            cancellation_reason: params.cancellation_reason,
            cancelled_by: 'user',
            cancelled_on: moment().valueOf(),
            type: 'scm',
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

        break;

      case 'driver_reached':
        newHistory
          .set({
            username: params.user.fullname,
            user_phone: params.user.phone,
            request_id: params.request.id,
            biltyNo: params.request.biltyNo,
            request_status: params.request.status,
            driver_accepted_on: params.request.driver_accepted_on,
            driver_reached_on: params.request.driver_reached_on,
            cancelled_by: 'user',
            cancelled_on: moment().valueOf(),
            cancellation_reason: params.cancellation_reason,
            type: 'scm',
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

        break;

      case 'driver_pickup':
        newHistory
          .set({
            username: params.user.fullname,
            user_phone: params.user.phone,
            request_id: params.request.id,
            biltyNo: params.request.biltyNo,
            request_status: params.request.status,
            driver_accepted_on: params.request.driver_accepted_on,
            driver_reached_on: params.request.driver_reached_on,
            driver_pickup_on: params.request.driver_pickup_on,
            cancelled_by: 'user',
            cancelled_on: moment().valueOf(),
            cancellation_reason: params.cancellation_reason,
            type: 'scm',
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
        break;

      case 'driver_delivered':
        newHistory
          .set({
            username: params.user.fullname,
            user_phone: params.user.phone,
            request_id: params.request.id,
            biltyNo: params.request.biltyNo,
            request_status: params.request.status,
            driver_accepted_on: params.request.driver_accepted_on,
            driver_reached_on: params.request.driver_reached_on,
            driver_pickup_on: params.request.driver_pickup_on,
            cancelled_by: 'user',
            cancelled_on: moment().valueOf(),
            cancellation_reason: params.cancellation_reason,
            type: 'scm',
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
        break;

      case 'driver_cancelled':
        newHistory
          .set({
            username: params.user.fullname,
            user_phone: params.user.phone,
            request_id: params.request.id,
            biltyNo: params.request.biltyNo,
            request_status: params.request.status,
            driver_accepted_on: params.request.driver_accepted_on || null,
            driver_reached_on: params.request.driver_reached_on || null,
            driver_pickup_on: params.request.driver_pickup_on || null,
            cancelled_by: 'driver',
            cancelled_on: moment().valueOf(),
            cancellation_reason: params.cancellation_reason,
            type: 'scm',
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
        break;

      case 'user_cancelled':
        res.json({
          status: false,
          error: 'User Already Cancelled The Request !',
        });
        break;

      case 'complete':
        res.json({
          status: false,
          error: 'Request Is Completed Already !',
        });
        break;

      default:
        res.json({
          status: false,
          error: 'No Case Found !',
        });
        break;
    }
  },
  // Done
  (req, res, next) => {
    const params = req.body;
    res.json({
      status: true,
      message: `User Cancelled The Request(${params.request.id
        }) On ${moment().format('MMMM Do YYYY, h:mm:ss a')} `,
    });
  }
  // DONE: Update Driver
  // TODO: Invoicing / Cancellation Price Calculation
);

// TODO: Realtime Update With Google Map (Abrar Looking Onto It)
// { "phone": "+923142341232", "lat": "63.12234", "lng": "45.3524" }
router.post(
  '/update_driver_position',
  body('phone').isMobilePhone().withMessage('Invalid Phone Number !'),
  body('lat').isString().withMessage('lat must be string'),
  body('lng').isString().withMessage('lng must be string'),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next()
    }
  },
  // Update Driver Location
  (req, res) => {

    const params = req.body;

    userRef
      .child('drivers')
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
          message: 'Position Updated',
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error,
        });
      });

    // userRef
    //   .child("drivers")
    //   .child(params.phone)
    //   .orderByChild("online")
    //   .equalTo(true)
    //   .once("value", (snapshot) => {
    //     const driver = snapshot.val();

    //     if (driver) {
    //       //  lat & lng

    //     } else {
    //       res.json({
    //         status: false,
    //         error: "Something Went Wrong",
    //       });
    //     }
    //   })
    //   .catch((err) => {
    //     res.json({
    //       err: err,
    //     });
    //   });
  }
);

// / Make Driver offline
router.post(
  '/make_driver_offline',
  body('phone').isMobilePhone().withMessage('Invalid Phone Number !'),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next()
    }
  },
  // Check Driver
  (req, res, next) => {
    //   {
    //     "driver_phone": "+923243254545",
    // }

    const params = req.body;
    userRef
      .child('drivers')
      .child(params.phone)
      .once('value', (snapshot) => {
        if (snapshot.val()) {
          const driver = snapshot.val();
          req.body.driver = driver;
          console.log('driver -> ', req.body.driver);
          next();
        } else {
          res.json({
            status: false,
            error: 'driver not found !',
          });
        }
      });
  },
  // Update Driver
  (req, res) => {
    const params = req.body;
    userRef
      .child('drivers')
      .child(params.phone)
      .update({
        online: false,
        status: "free",
        on_request: null
      })
      .then(() => {
        res.json({
          status: true,
          message: 'Driver is offline !',
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

// / Make Driver online
router.post(
  '/make_driver_online',
  body('phone').isMobilePhone().withMessage('Invalid Phone Number !'),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next()
    }
  },
  // Check Driver
  (req, res, next) => {
    //   {
    //     "driver_phone": "+923243254545",
    // }

    const params = req.body;
    userRef
      .child('drivers')
      .child(params.phone)
      .once('value', (snapshot) => {
        if (snapshot.val()) {
          const driver = snapshot.val();
          req.body.driver = driver;
          console.log('driver -> ', req.body.driver);
          next();
        } else {
          res.json({
            status: false,
            error: 'driver not found !',
          });
        }
      });
  },
  // Update Driver
  (req, res) => {
    const params = req.body;
    userRef
      .child('drivers')
      .child(params.phone)
      .update({
        online: true,
      })
      .then(() => {
        res.json({
          status: true,
          message: 'Driver is Online Now !',
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

// ================================= SETTINGS & VARIABLES ==================================

router.post('/add_vehicle_type_with_pricing', (req, res) => {
  // {
  //     "vehicleType": "Suzuki",
  //     "emptyKM": "5",
  //     "loadedKM": "10",
  //     "labourPrice": "500",
  //     "pricePerFloor": "200",
  //     "minimumEmptyPrice": "5",
  //     "minimumEmptyDistance": "10",
  //     "minimumLoadedPrice": "10",
  //     "minimumLoadedDistance": "15",
  //     "cancelChargesPriceType": false,
  //     "clientChargesPriceType": false,
  //     "driverCancelPrice": "500",
  //     "driverCancelDuration": "30",
  //     "clientCancelPrice": "20",
  //     "clientCancelDuration": "10",
  //     "minimumPriceLoadtime": "20",
  //     "minimumPricePerMinute": "10",
  //     "incentiveAmount": "200"
  //   }

  const params = req.body;

  vehicleTypeRef
    .child(params.vehicleType)
    .set(req.body)
    .then(() => {
      res.json({
        status: true,
        message: 'Vehicle Type Added Successfully',
      });
    })
    .catch((err) => {
      res.json({
        status: false,
        error: err.message,
      });
    });
});
// Add A Vehicle To Vehicle List
router.post('/add_vehicle', (req, res) => {
  const params = req.body;

  // Validate
  // Add it to firebase

  // {
  //   "name": "Hi-Roof",
  //   "limit": "1",
  //   "vehicle_type": "Suzuki"
  // }

  vehicleListRef
    .child(params.name)
    .set(params)
    .then((response) => {
      res.json({
        status: true,
        message: 'Vehicle Added Successfully',
        response,
      });
    })
    .catch((err) => {
      res.json({
        status: false,
        message: err.message,
      });
    });
});
// Add A Material To Material List
router.post('/add_material', (req, res) => {
  const { name } = req.body;

  // Validate
  // Add it to firebase
  if (name !== null) {
    scmSettingsRef
      .child('material_list')
      .child(name)
      .set({
        ...req.body,
      })
      .then((response) => {
        res.json({
          status: true,
          message: 'Material Added Successfully',
          response,
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
// Add A Loading Option To Options List
router.post('/add_loading_option', (req, res) => {
  const { name, price } = req.body;

  // Validate
  // Add it to firebase
  if (name !== null && price !== null) {
    scmSettingsRef
      .child('loading_options')
      .child(name)
      .set(req.body)
      .then((response) => {
        res.json({
          status: true,
          message: 'Loading Option Added Successfully',
          response,
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
// Add A Unloading Option To Options List
router.post('/add_unloading_option', (req, res) => {
  const { name, price } = req.body;

  // Validate
  // Add it to firebase
  if (name !== null && price !== null) {
    scmSettingsRef
      .child('unloading_options')
      .child(name)
      .set(req.body)
      .then((response) => {
        res.json({
          status: true,
          message: 'Unloading Option Added Successfully',
          response,
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
// Add A Unloading Option To Options List
router.post('/add_user_cancellation_reason', (req, res) => {
  const params = req.body;

  // const translatedText = await translateText(name, "ur");
  scmCancellationReasonRef
    .child('user')
    .child(params.name)
    .set(params.name)
    .then(() => {
      res.json({
        status: true,
        reason: 'Reason Added Successfully',
      });
    })
    .catch((err) => {
      res.json({
        status: false,
        reason: err,
      });
    });
});
// Add Pricing To SCM
router.post('/add_vehicle_type', (req, res) => {
  // {
  //     vehicleType: '',
  //     emptyKM: '5',
  //     loadedKM: '10',
  //     labourPrice: '500',
  //     pricePerFloor: '200',
  //     minimumEmptyPrice: '5',
  //     minimumEmptyDistance: '10',
  //     minimumLoadedPrice: '10',
  //     minimumLoadedDistance: '15',
  //     cancelChargesPriceType: false,
  //     clientChargesPriceType: false,
  //     driverCancelPrice: '500',
  //     driverCancelDuration: '30',
  //     clientCancelPrice: '20',
  //     clientCancelDuration: '10',
  //     minimumPriceLoadtime: '20',
  //     minimumPricePerMinute: '10',
  //     incentiveAmount: '200'
  //   }

  vehicleTypeRef
    .child(req.body.vehicleType)
    .set(req.body)
    .then(() => {
      res.json({
        status: true,
        message: 'Vehicle Type Added Successfully',
      });
    })
    .catch((err) => {
      res.json({
        status: false,
        error: err.message,
      });
    });
});
// Add A Promocode
router.post('/add_promo_code', (req, res) => {
  const params = req.body;
  // code
  // discount

  // const translatedText = await translateText(name, "ur");
  scmSettingsRef
    .child('promocodes')
    .child(params.code)
    .set({
      ...params,
      active: true,
    })
    .then(() => {
      res.json({
        status: true,
        reason: 'Promo code Added Successfully',
      });
    })
    .catch((err) => {
      res.json({
        status: false,
        reason: err,
      });
    });
});
// Add A Promocode
router.post('/add_insurance_percent', (req, res) => {
  const params = req.body;
  // percent

  scmSettingsRef
    .child('insurance')
    .update({
      value: params.percent,
      updatedOn: moment().format('MMMM Do YYYY, h:mm:ss a'),
    })
    .then(() => {
      res.json({
        status: true,
        reason: 'Insurance Percent Updated Successfully',
      });
    })
    .catch((err) => {
      res.json({
        status: false,
        reason: err,
      });
    });
});

module.exports = router;
