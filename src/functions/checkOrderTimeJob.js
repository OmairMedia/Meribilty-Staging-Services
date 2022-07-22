const CronJob = require("cron").CronJob;
const { pplRequestRef,fcmTokenRef,pplSettingsRef,notificationsRef, pplBiddingsRef } = require('../db/newRef')
const { send_notification_to_single_user } = require("../functions/notifications");
const { getCurrentTimestamp,getCurrentDate } = require("./slash");

exports.checkSubscriptionExpirations = new CronJob({
  cronTime: "0 */1 * * *", // every 1-hour
  //cronTime: "*/10 * * * * *", //test
  onTick: () => {
    let settime = 0;

    pplSettingsRef.child("vendor_quote_time").child(0).once('value', (snapshot) => {
      if(snapshot.val()) {
        const setTime = snapshot.val();
      
        pplRequestRef
          .once('value')
          .then(snapshot => {
          snapshot.forEach((order) => {
              let o = order.val();
              
              if(o.status !== 'pending' && o.status !== 'qoute_rejected' && o.status !== 'user_counter_rejected' && o.status !== 'vendor_counter_rejected' && o.status !== 'cancelled' && o.status !== 'rejected') {
                let k = order.key;
  
              let creationtime = o.createdAt_timestamp;
              let now = getCurrentTimestamp();
  
              
              let datediff = difference2Parts(creationtime - now);
  
              let qoutetime = setTime.minutes;
  
              let days = datediff.days;
              let hours = datediff.hours;
              let minutes = datediff.minutes;
              
              if(days > 0) {
              
              } else if (days === 0 && hours > 0) {
              let hoursInMinutes = Math.floor(hours * 60) 
              let allmins = Math.floor(hoursInMinutes + minutes);
              console.log('allmins -> ',allmins);


              
  
              if(allmins >= qoutetime) {
                  console.log('More than 3 hours past');

                  // Cancel The Order


                  // Cancel All The Qoutes On That Order
                   
                  
                  // Send Notification
                  // User
                  fcmTokenRef
                      .child("users")
                      .child(o.user_phone)
                      .once("value", (snapshot) => {
                      if (snapshot.val()) {

                        if(o.status === 'pending') {
                          pplRequestRef.child(o.orderNo).update({
                            status:'cancelled'
                          }).then(()=>{
                            console.log(`OrderNo#${o.orderNo} has been cancelled`);
          
                            pplBiddingsRef.child(o.requrest_type).child('qoutes').orderByChild('orderNo').equalTo(o.orderNo).once('value', (snapshot) => {
                              if(snapshot.val()) {
                                let qoutes = [];
                                snapshot.forEach((snap)=>{
                                  qoutes.push(snap.key)
                                })
          
                                qoutes.forEach((x) => {
                                  pplBiddingsRef.child(o.requrest_type).child('qoutes').child(x).update({
                                    rejected_on: getCurrentDate(),
                                    rejected_on_timestamp: getCurrentTimestamp(),
                                    status:"rejected"
                                  }).then(()=>{
                                     console.log('all qoutes rejected');
                                  }).catch(err => console.log('err -> ',err))
                                })
                              }
                            })
                          }).catch(err => console.log('err -> ',err))
                        }
            
                          
                          send_notification_to_single_user(
                              snapshot.val().fcm_token.token,
                              {
                                  title: "Decision On Final Qoute",
                                  body: `You have final offer on OrderNo#${o.orderNo}, please take your decision`,
                              }
                              );
                  
                              let newNotification = notificationsRef.child('users').child(o.user_phone).push();
                              let AdminNotification = notificationsRef.child('admin').push();
                  
                              newNotification.set({
                              id: newNotification.key,
                              title: "Decision On Final Qoute",
                              body: `You have final offer on OrderNo#${o.orderNo}, please take your decision !`,
                              created: getCurrentTimestamp()
                              }).catch(err => console.log('err -> ',err))
                      }
                      });
                  }
                  } 
              }
          })
  
          }).catch(e => console.log(e))} 
    });  
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


 

