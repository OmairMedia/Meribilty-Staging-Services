const admin = require('firebase-admin');

const db = admin.database();

// SCM
const scmRequestRef = db.ref('requests/scm');
const scmPricing = db.ref('settings/scm/pricing');
const scmCommission = db.ref('settings/scm/commission');
const scmMaterialsRef = db.ref('settings/scm/material_list');
const scmLoadingOptions = db.ref('settings/scm/loading_options');
const scmUnloadingOptions = db.ref('settings/scm/unloading_options');
const scmCancellationReasonRef = db.ref('settings/scm/cancellation_reasons');
const scmInvoiceRef = db.ref('invoices/scm');
const scmSettingsRef = db.ref('settings/scm');

// PPL
const pplRequestRef = db.ref('requests/ppl');
const pplSettingsRef = db.ref('settings/ppl');
const pplCommission = db.ref('settings/ppl/commission');
const pplInvoiceRef = db.ref('invoices/ppl');
const pplBiddingsRef = db.ref('biddings');
const pplQoutesRef = db.ref('biddings/qoutes');
const pplUserCounterRef = db.ref('biddings/user_counter');
const pplVendorCounterRef = db.ref('biddings/vendor_counter');
const pplVendorVehicleRef = db.ref('vendor_vehicles');
const pplVendorToVendorRequestRef = db.ref('requests/vendor_to_vendor');
const pplCancellationReasonRef = db.ref('settings/ppl/cancellation_reasons');
const pplMaterialsListRef = db.ref('settings/ppl/material_list');

// USERS
const driversRef = db.ref('users/drivers');
const proRef = db.ref('users/pro');
const usersRef = db.ref('users/users');
const vendorsRef = db.ref('users/vendors');


// Settings
const pplVehiclesRef = db.ref('settings/ppl/vehicles');
const pplVehicleTypeRef = db.ref('settings/ppl/vehicle_types');
const pplRoutesEstimation = db.ref('settings/ppl/estimation');
const driverHistoryRef = db.ref('driverHistory');
const vendorHistoryRef = db.ref('driverHistory');
const pplTemporary = db.ref('selections/loading_options');
const pplUserVehicleSelections = db.ref('selections/vehicles');


// FCM TOKEN REF

const fcmTokenRef = db.ref('fcm_tokens');
const notificationsRef = db.ref('notifications');

module.exports = {
  scmRequestRef,
  scmCommission,
  scmPricing,
  scmInvoiceRef,
  scmMaterialsRef,
  scmLoadingOptions,
  scmUnloadingOptions,
  scmCancellationReasonRef,
  pplRequestRef,
  pplCommission,
  pplInvoiceRef,
  pplVehiclesRef,
  pplVehicleTypeRef,
  pplBiddingsRef,
  pplQoutesRef,
  pplUserCounterRef,
  pplVendorCounterRef,
  pplSettingsRef,
  scmSettingsRef,
  pplVendorVehicleRef,
  driverHistoryRef,
  pplCancellationReasonRef,
  pplMaterialsListRef,
  vendorHistoryRef,
  pplVendorToVendorRequestRef,
  pplTemporary,
  pplUserVehicleSelections,
  pplRoutesEstimation,
  driversRef,
  proRef,
  usersRef,
  vendorsRef,
  fcmTokenRef,
  notificationsRef
};
