const admin = require("firebase-admin");

const db = admin.database();

const e_walletRef = db.ref("e-wallet");
const walletRef = db.ref("wallets");
const subscribed_usersRef = db.ref("subscribed_users");
const pricingRef = db.ref("accounts/pricing");
const settings = db.ref("settings");
const forgotPassToken = db.ref("forgot_pass_token");
// USERS REF
const userRef = db.ref("users");
const driverRef = db.ref("users/users");
const vendorRef = db.ref("users/vendors");
const proUserApplicationRef = db.ref("applications");

const heavyref = db.ref("heavyVehicles");
const heavyvehref = db.ref("requests/heavyVehicles");
const scmRequestRef = db.ref("requests/scm");
const promoRef = db.ref("accounts/promo_code");
const bidRef = db.ref("driver_bids");
const sessionsRef = db.ref("sessions");
const userReqRef = db.ref("user_requests");

// SMS Ref
const MessagesRef = db.ref("sms");
const forgetPasswordOTPRef = db.ref("sms/forgot_password");
const registrationOTPRef = db.ref("sms/registration");
const invitedOTPRef = db.ref("sms/invited");
const referalsRef = db.ref("referals");

const requests_dataRef = db.ref("requests/logistics");
const commissionRef = db.ref("accounts/commission");
const userLiveRequestsRef = db.ref("user_live_requests");
const notificationKeys = db.ref("notification_keys");
const feedsRef = db.ref("news");
const completeReqRef = db.ref("complete_requests");
const invoicesClientsRef = db.ref("accounts/invoices/clients");
const invoicesDriversRef = db.ref("accounts/invoices/drivers");
const addaListRef = db.ref("adda_list");
const onlineDriversRef = db.ref("online_drivers");

// Settings

const vehicleTypeRef = db.ref("settings/scm/vehicle_types");

module.exports = {
  referalsRef,
  walletRef,
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
  proUserApplicationRef,
  vehicleTypeRef,
  scmRequestRef,
  settings,
  driverRef,
  vendorRef,
  invitedOTPRef,
};
