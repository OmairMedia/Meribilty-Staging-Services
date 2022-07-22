const nodemailer = require("nodemailer");

const {
  notificationsRef,
  pplRequestRef,
  fcmTokenRef,
} = require("../db/newRef");


const {
  send_notification_to_single_vendor,
  send_notification_to_single_user,
} = require("../functions/notifications");

const { generatePPLinvoice, getCurrentTimestamp } = require("../functions/slash");

let checkChildAdded = 0;

const mail = {
  PPLGenerateInvoice() {
    pplRequestRef.on("child_changed", (addSnap) => {
      const request = addSnap.val();
      console.log("A PPL Request Is Been Modified");

      let data = {
        qoute_accepted_on: request.qoute_accepted_on || null,
        qoute_rejected_on: request.qoute_rejected_on || null,
        user_counter_accepted_on: request.user_counter_accepted_on || null,
        user_counter_rejected_on: request.user_counter_rejected_on || null,
        vendor_counter_accepted_on: request.vendor_counter_accepted_on || null,
        vendor_counter_rejected_on: request.vendor_counter_rejected_on || null,
        order_rejected_on: request.order_rejected_on || null,
        order_accepted_on: request.order_accepted_on || null,
      };

      switch (request.status) {
        case "qoute_accepted":
          console.log("qoute accepted -> ", data);
          break;

        case "qoute_rejected":
          console.log("qoute_rejected -> ", data);
          break;

        case "user_counter_accepted":
          console.log("user_counter_accepted -> ", data);
          break;

        case "user_counter_rejected":
          console.log("user_counter_rejected -> ", data);
          break;

        case "vendor_counter_accepted":
          console.log("vendor_counter_accepted -> ", data);
          break;

        case "vendor_counter_rejected":
          console.log("vendor_counter_rejected -> ", data);
          break;

        case "accepted":
          console.log("accepted -> ", data);

          generatePPLinvoice(request)
            .then(() => {
              console.log("invoice generated");
            })
            .catch((err) => console.log({ err }));

          break;

        case "rejected":
          console.log("rejected -> ", data);
          break;

        case "allotment":
          console.log("allotment -> ", data);
          // Generate Invoice
          break;

        default:
          break;
      }
    });
  },
  PPLNewRequest() {
    let orderCheck = 0;

    // Checking If Child Is Added

    pplRequestRef.once("value", (totSnap) => {
      let totalOrders = totSnap.numChildren();

      pplRequestRef.on("child_added", (addSnap) => {
        orderCheck++;
        // console.log('Total Request Count In Child Addedd -> ',checkChildAdded)

        if (totalOrders < orderCheck) {
          const order = addSnap.val();
          totalQoutes = orderCheck;
          console.log(
            `A New PPL Request has been created - OrderNo#${order.orderNo}`
          );

          fcmTokenRef.child("vendors").once("value", (snapshot) => {
            if (snapshot.val()) {
              snapshot.forEach((childsnap) => {
                send_notification_to_single_vendor(
                  childsnap.val().fcm_token.token,
                  {
                    title: "A New Job Has Been Received",
                    body: `A New Order Has Been Created By User !`,
                  }
                );

                console.log('vendor key -> ',childsnap.key);



                let newNotification = notificationsRef.child('vendors').child(childsnap.key).push();
                
                newNotification.set({
                  id: newNotification.key,
                  title: "A New Job Has Been Received",
                  body: `A New Order#${order.orderNo} Has Been Created By User !`,
                  created: getCurrentTimestamp(),
                  read:false,
                }).catch(err => console.log('err -> ',err))
              });
              
              let AdminNotification = notificationsRef.child('admin').push();
              AdminNotification.set({
                id: AdminNotification.key,
                title: "A New Order Has Been Created",
                body: `A New Order#${order.orderNo} Has Been Created By User(${order.username}) !`,
                created: getCurrentTimestamp(),
                read:false,
              }).catch(err => console.log('err -> ',err))
            }
          });
        }
      });
    });
  },
};

// mail.PPLGenerateInvoice();
mail.PPLNewRequest();
