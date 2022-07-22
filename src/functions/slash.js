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
} = require("../db/ref");

// New Ref
const {
  scmRequestRef,
  scmPricing,
  vehicleListRef,
  scmCommission,
  scmInvoiceRef,
  scmSettingsRef,
  driverHistoryRef,
  pplBiddingsRef,
  pplInvoiceRef,
  pplSettingsRef,
} = require("../db/newRef");


const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const _ = require("lodash");
const momenttimezone = require("moment-timezone");


// Helper Functions 
module.exports = {
  // Get Current Pakistani Time
  getCurrentDate() {
    let currentDate = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Karachi', hour12: true })
    return currentDate;
  },
  // Get Current Pakistan Time In Unix Timestamp
  getCurrentTimestamp() {
    let timestamp = momenttimezone.tz("Asia/Karachi").valueOf();
    return timestamp;
  },
  // Verify Firebase idToken
  verifyTokenFirebase(req, res, next) {
    const params = req.body;

    try {
      const idToken = params.token;
      // Verify Token

      admin.auth()
        .verifyIdToken(idToken)
        .then((decodedToken) => {
          const uid = decodedToken.uid;

          req.body.user = decodedToken;
          // console.log('req.body.user -> ',req.body.user)
          next()

          // res.json({
          //   status:true,
          //   data: decodedToken
          // })
          // ...
        })
        .catch((err) => {
          // Handle error
          res.json({
            status: false,
            error: err.message
          })
        });
    } catch (error) {
      // throw error;
      console.log({ error });
      res.json({
        status: false,
        error: "Invalid Token !",
      });
    }
  },
  // Check If User/Pro User Exists 
  async checkUserExistsUserApp(req, res, next) {
    const params = req.body;
    // Check In User
    const checkUserSnap = await userRef
      .child("users")
      .child(params.phone)
      .once("value");
    // Check In Pro
    const checkProSnap = await userRef
      .child("pro")
      .child(params.phone)
      .once("value");


    console.log("checkUserSnap -> ", checkUserSnap.val());
    console.log("checkProSnap -> ", checkProSnap.val());

    if (
      checkUserSnap.val() == null &&
      checkProSnap.val() == null
    ) {
      next();
    } else {
      let user = {
        user: checkUserSnap.val() || null,
        pro: checkProSnap.val() || null,
      };
      console.log(user);

      const convert = Object.entries(user);
      const notemptyObj = [];

      convert.forEach((x) => {
        notemptyObj.push(x[1]);
      });

      console.log("notemptyObj -> ", notemptyObj);

      const refilter = notemptyObj.filter((x) => {
        return x !== null;
      });

      console.log("refilter -> ", refilter);
      if (refilter) {
        if (refilter.length == 0) {
          next();
        }

        if (refilter.length !== 0) {
          const foundUser = refilter[0];

          res.json({
            status: false,
            error: "Phone Number Already Exist In Database !",
            type: foundUser.type,
          });
        }
      }
    }
  },
  // Check If Vendor/Driver Exists 
  async checkUserExistsVendorApp(req, res, next) {
    const params = req.body;

    const checkDriverSnap = await userRef
      .child("drivers")
      .child(params.phone)
      .once("value");

    const checkVendorSnap = await userRef
      .child("vendors")
      .child(params.phone)
      .once("value");


    console.log("checkDriverSnap -> ", checkDriverSnap.val());
    console.log("checkVendorSnap -> ", checkVendorSnap.val());

    if (
      checkDriverSnap.val() == null &&
      checkVendorSnap.val() == null
    ) {
      next();
    } else {
      let user = {
        driver: checkDriverSnap.val() || null,
        vendor: checkVendorSnap.val() || null,
      };
      console.log(user);

      const convert = Object.entries(user);
      const notemptyObj = [];

      convert.forEach((x) => {
        notemptyObj.push(x[1]);
      });

      console.log("notemptyObj -> ", notemptyObj);

      const refilter = notemptyObj.filter((x) => {
        return x !== null;
      });

      console.log("refilter -> ", refilter);
      if (refilter) {
        if (refilter.length == 0) {
          next();
        }

        if (refilter.length !== 0) {
          const foundUser = refilter[0];

          res.json({
            status: false,
            error: "Phone Number Already Exist In Database !",
            type: foundUser.type,
          });
        }
      }
    }
  },
  // Generate PPL Invoice On /order_accept
  async generatePPLinvoice(request) {
    var commission = 0;
    
    let commissionSnap = await pplSettingsRef.child("commission").once('value');
    let taxSnap = await pplSettingsRef.child("commission").once('value');


    pplSettingsRef.child("commission").once('value', (snapshot) => {
      if(snapshot.val()) {
        let commissions = [];
        snapshot.forEach((x)=>{
          commissions.push(x.val())
        })
    
        // console.log('commissions -> ',commissions);
    
         const sortedpendingOffers1 = commissions.sort(function (a, b) {
          return b.timestamp - a.timestamp;
        });
    
        let latestCommission = sortedpendingOffers1[0];
        commission = latestCommission;

      } 
    });


    if (request.qoute) {
      // Vendor Qoute Is Accepted
      console.log(`OrderNo${request.orderNo} Accepted For This Vendor Qoute -> `);

      let invoice = {
        ...request,
        commission: commission,
        payableAmount: `${request.qoute.qoute_amount} PKR`,
      };

      // Check Bilties 
      const bilties = request.bilty;

      pplInvoiceRef
        .child(request.orderNo)
        .set(invoice)
        .catch((err) => console.log(err));
    } else if (request.user_counter) {
      // User Counter Is Accepted

      const qouteSnap = await pplBiddingsRef
        .child(request.request_type)
        .child("qoutes")
        .child(request.user_counter.qouteId)
        .once("value");
      const qoute = qouteSnap.val();

      let invoice = {
        ...request,
        commission: commission,
        payableAmount: `${request.user_counter.amount} PKR`,
      };

      pplInvoiceRef
        .child(request.orderNo)
        .set(invoice)
        .catch((err) => console.log(err));
    } else if (request.vendor_counter) {
      // Vendor Counter Is Accepted

      const qouteSnap = await pplBiddingsRef
        .child(request.request_type)
        .child("qoutes")
        .child(request.vendor_counter.qouteId)
        .once("value")
        .catch((err) => console.log(err.message));
      const qoute = qouteSnap.val();

      const counterSnap = await pplBiddingsRef
        .child(request.request_type)
        .child("user_counter")
        .child(request.vendor_counter.userCounterId)
        .once("value")
        .catch((err) => console.log(err.message));
      const counter = counterSnap.val();

      let invoice = {
        ...request,
        commission: commission,
        payableAmount: `${request.vendor_counter.amount} PKR`,
      };

      pplInvoiceRef
        .child(request.orderNo)
        .set({
          ...invoice,
        })
        .catch((err) => console.log(err.message));
    }

   
  },
  // Used In auth/pro -> /send_application
  async sendProUserApplicationEmail(subject, body) {
    const transporter = nodemailer.createTransport({
      host: "Meribilty.com",
      port: 465,
      secure: true,
      auth: {
        user: "omair@Meribilty.com",
        pass: "4slash1234!@#$",
      },
      tls: { rejectUnauthorized: false },
    });

    const info = await transporter.sendMail({
      from: '"Meribilty Admin" <admin@Meribilty.com>', // sender address
      to: "4slash1234@gmail.com", // list of receivers Sajidh4@gmail.com,arsalanshafiq917@gmail.com,mavia@4slash.com,allawalarizwan@gmail.com
      subject, // Subject line
      text: `
       fullname: ${body.fullname}
       email: ${body.email}
       phone: ${body.phone}
       bussiness_name: ${body.bussiness_name}
       bussiness_address: ${body.bussiness_address}
       NTN: ${body.NTN}
       landline: ${body.landline}
       owner: ${body.owner}
       point of contact: ${body.point_of_contact}
       cargo volume per month: ${body.cargo_volume_per_month}
       credit duration: ${body.credit_duration}
       credit requirement per month: ${body.credit_requirement_per_month}
      `,
    });

    console.log("Message sent: %s", info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

    // Preview only available when sending through an Ethereal account
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
  },
  // Unused -> Can Give Radial Distance Between Two lats & Lngs
  CHECK_distance(lat1, lon1, lat2, lon2) {
    const radlat1 = (Math.PI * lat1) / 180;
    const radlat2 = (Math.PI * lat2) / 180;
    const radlon1 = (Math.PI * lon1) / 180;
    const radlon2 = (Math.PI * lon2) / 180;
    const theta = lon1 - lon2;
    const radtheta = (Math.PI * theta) / 180;
    let dist =
      Math.sin(radlat1) * Math.sin(radlat2) +
      Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist);
    dist = (dist * 180) / Math.PI;
    dist = dist * 60 * 1.1515;
    dist *= 1.609344;
    return dist;
  },
};
