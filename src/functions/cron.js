const CronJob = require("cron").CronJob;
const { pplRequestRef,fcmTokenRef,notificationsRef } = require('../db/newRef')
const { send_notification_to_single_user } = require("../functions/notifications")
const {getCurrentTimestamp,getCurrentDate} = require("../functions/slash")

exports.checkSubscriptionExpirations = new CronJob({
  cronTime: "0 */1 * * *", // every 1-hour
  //cronTime: "*/10 * * * * *", //test
  onTick: () => {

    pplRequestRef
      .once('value')
      .then(snapshot => {
        snapshot.forEach((order) => {
          let o = order.val();
          let k = order.key;
          

          if(o.status !== 'pending' && o.status !== 'qoute_rejected' && o.status !== 'user_counter_rejected' && o.status !== 'vendor_counter_rejected' && o.status !== 'cancelled' && o.status !== 'rejected') {
            if (o.documents !== undefined) {
              if (o.request_type === "transit" && o.documents.length < 5) {
                // console.log(`req type is:  ${o.request_type}:${k} /  ${o.documents.length}`);
                sendNotification({
                  phone: o.user_phone,
                  name: o.username,
                  orderNo: k,
                })
                
                let newNotification = notificationsRef.child('users').child(o.user_phone).push();
                let AdminNotification = notificationsRef.child('admin').push();
                newNotification.set({
                  id: newNotification.key,
                  title: "User: Documents Upload Pending",
                  body: `Dear ${o.username}, refering ${k}, Documents are awaited !`,
                  created: getCurrentTimestamp()
                }).catch(err => console.log('err -> ',err))
              }
              else if (o.request_type === "upcountry" && o.documents.length < 2) {
                // console.log(`req type is:  ${o.request_type}:${k} /  ${o.documents.length}`);
                sendNotification({
                  phone: o.user_phone,
                  name: o.username,
                  orderNo: k,
                })
  
                let newNotification = notificationsRef.child('users').child(o.user_phone).push();
                let AdminNotification = notificationsRef.child('admin').push();
                newNotification.set({
                  id: newNotification.key,
                  title: "User: Documents Upload Pending",
                  body: `Dear ${o.username}, refering ${k}, Documents are awaited !`,
                  created: getCurrentTimestamp()
                }).catch(err => console.log('err -> ',err))
              }
            } else if (o.documents === undefined) {
              // console.log(`req type is:  ${o.request_type}:${k} / is Undefined!`);
              sendNotification({
                phone: o.user_phone,
                name: o.username,
                orderNo: k,
              })
  
              let newNotification = notificationsRef.child('users').child(o.user_phone).push();
                let AdminNotification = notificationsRef.child('admin').push();
                newNotification.set({
                  id: newNotification.key,
                  title: "User: Documents Upload Pending",
                  body: `Dear ${o.username}, refering ${k}, Documents are awaited !`,
                  created: getCurrentTimestamp()
                }).catch(err => console.log('err -> ',err))
            }
          }
        })

      }).catch(e => console.log(e))
  },
  start: true,
});

const sendNotification = (data) => {
  fcmTokenRef.child('users').child(data.phone).once('value').then(snapshot => {
    send_notification_to_single_user(snapshot.val().fcm_token.token, {
      title: "Upload Remaining Documents!",
      body: `Dear ${data.name}, refering order no:${data.orderNo}, documents are awaited.`,
      routes: "MyOrders"
    })
  }).catch(e => console.log("catch: ", e));
}