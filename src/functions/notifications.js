// Database Reference
// Not Been Used Now ...
// TODO:

// Libraries Here
const admin = require('firebase-admin');

const cloud_message = admin.messaging();

// Exporting Functions Here
module.exports = {
  async send_notification_to_single_user(token, notification) {

    if(notification.orderNo && notification.createdAt) {
      var payload = notification.routes !== undefined ?
      {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          type: 'notification',
          routes: notification.routes,
          orderNo: notification?.orderNo,
          createdAt: notification?.createdAt,
          createdAt_timestamp: notification?.createdAt_timestamp
        }
      } : {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        type: 'notification',
      }
    };
    } else {

      var payload = notification.routes !== undefined ?
      {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          type: 'notification',
          routes: notification.routes,
        }
      } : {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        type: 'notification',
      }
    };

    }

    
    //    await cloud_message.sendMulticast({
    //   tokens: [token],
    //   notification: {
    //     title: "Weather Warning!",
    //     body: "A new weather warning has been issued for your location.",
    //   },
    // })

    cloud_message
      .sendToDevice(token,
        payload
      )
      .then((data) => {
        console.log(JSON.stringify(data, null, 2));
      })
      .catch((e) => console.log(e));
  },
  send_notification_to_single_driver(notificationData, driver) {
    console.log(notificationData);

    cloud_message
      .sendToDevice(notificationData.token, {
        data: notificationData.data,
      })
      .then((data) => {
        console.log(data);
      })
      .catch((e) => console.log(e));
  },
  async send_notification_to_single_vendor(token, notification) {

    var payload = notification.routes !== undefined ?
    {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        type: 'notification',
        routes: notification.routes
      }
    } : {
    notification: {
      title: notification.title,
      body: notification.body,
    },
    data: {
      type: 'notification',
    }
  };

    await cloud_message
      .sendToDevice(token, payload).then((data) => {
        console.log('Notification Send To Vendor!')
      })
      .catch((e) => console.log(e));
  },
  async send_notification_to_all_vendor(tokens, title, message) {

    var payload = {
      notification: {
        title: title,
        body: message,
      },
      data: {
        type: 'notification',
      }
    };
    tokens.forEach(token => {
      cloud_message
        .sendToDevice(token,
          payload
        )
        .then((data) => {
          console.log(JSON.stringify(data, null, 2));
        })
        .catch((e) => console.log(e));
    })
  },
  send_pro_user_application_status_notification(
    notificationData,
    user
  ) {
    console.log(notificationData);

    cloud_message
      .sendToDevice(notificationData.token, {
        data: notificationData.data,
      })
      .then((data) => {
        console.log(data);
      })
      .catch((e) => console.log(e));
  },
  async create_user_notification(token, user) {
    cloud_message
      .sendToDevice(token, {
        data: `Dear user, a user ${user.fullname} has been created`,
      })
      .then((data) => {
        console.log(data);
      })
      .catch((e) => console.log(e));
  },
  async create_driver_notification(token, user) {
    cloud_message
      .sendToDevice(token, {
        data: `Dear user, a user ${user.fullname} has been created`,
      })
      .then((data) => {
        console.log(data);
      })
      .catch((e) => console.log(e));
  },
  async create_new_request_notification(token, user, request) {
    cloud_message
      .sendToDevice(token, {
        data: `Dear ${user.fullname}, ${request.orderNo} has ben received `,
      })
      .then((data) => {
        console.log(data);
      })
      .catch((e) => console.log(e));
  },
  async create_order_confirm_notification(token, user, request) {
    cloud_message
      .sendToDevice(token, {
        data: `Dear ${user.fullname}, ${request.orderNo} is confirmed `,
      })
      .then((data) => {
        console.log(data);
      })
      .catch((e) => console.log(e));
  },
  async create_order_inprocess_notification(token, user, request) {
    cloud_message
      .sendToDevice(token, {
        data: `Dear ${user.fullname}, ${request.orderNo} is in process `,
      })
      .then((data) => {
        console.log(data);
      })
      .catch((e) => console.log(e));
  },
  async create_document_submit_notification(token, user, request) {
    cloud_message
      .sendToDevice(token, {
        data: `Dear ${user.fullname}, refering ${request.orderNo}: ${request.originAddress} - ${request.destinationAddress}, documents have been submitted.
      `,
      })
      .then((data) => {
        console.log(data);
      })
      .catch((e) => console.log(e));
  },
  async create_document_pending_notification(token, user, request) {
    cloud_message
      .sendToDevice(token, {
        data: `Dear ${user.fullname}, refering ${request.orderNo}: ${request.originAddress} - ${request.destinationAddress}, documents are awaited.
      `,
      })
      .then((data) => {
        console.log(data);
      })
      .catch((e) => console.log(e));
  },
  async create_counter_sent_notification(token, user, request, counter) {
    cloud_message
      .sendToDevice(token, {
        data: `Dear ${user.fullname}, refering ${request.orderNo}: ${request.originAddress} - ${request.destinationAddress}, -${counter.id} has been sent.
      `,
      })
      .then((data) => {
        console.log(data);
      })
      .catch((e) => console.log(e));
  }
};
