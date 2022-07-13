const express = require("express");
const router = express.Router();
const { StreamChat } = require("stream-chat");
const { verifyToken, verifyTokenVendorApp, verifyTokenFirebase } = require("../../functions/slash");
const { pplRequestRef, scmRequestRef } = require("../../db/newRef");
const { userRef } = require("../../db/ref");
const { body, validationResult } = require("express-validator");
const { isArray } = require("lodash");

// initialize Stream Chat SDK
const streamClient = new StreamChat(
  "r4vjktd8gbcr",
  "mkpxnc6jddehcdt7cxguk8p9fxs8nadwmwua2gwtk89zs3422kfaxbmgm26n4pwf"
);

router.post("/join",
// body("user_id").isString().withMessage("user_id must be a string"),
// Validator
// (req, res, next) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ errors: errors.array() });
//   } else {
//     next();
//   }
// },
verifyTokenFirebase,
async (req, res) => {
  const orderArr = [];
  const biltyArr = [];
  var { user_id } = req.body.user;
  const { user_type } = req.body.user;

  if (user_type == 'user' || user_type == 'pro') {
    await pplRequestRef
    .orderByChild("user_phone")
    .equalTo(user_id)
    .once("value", (snapshot) => {
      if (snapshot.val()) {
        snapshot.forEach((snap) => {
          let request = snap.val();
  
          if (request.status != "completed") {
            orderArr.push(request.orderNo);
            
            if (request.request_type == "transit") {
              request.bilty.forEach((bilty) => {
                biltyArr.push(bilty.biltyNo)
              })
            } else if (request.request_type == "upcountry") {
              request.bilty.forEach((bilty) => {
                biltyArr.push(bilty.biltyNo)
              })
            }
          }
        })
      }
    })    
  } else if (user_type == 'vendor') {
    await userRef
    .child("vendors")
    .child(user_id)
    .once('value', (snap) => {
      if (snap.val()) {
        const orders = snap.val().orders;
        // console.log('orders -> ',orders)
        if (orders) {
          isArray(orders) ? orderArr.push(...orders) : orderArr.push(orders)
         
        } else {
          res.json({
            status:false,
            error: "Vendor did not have any orders"
          })
        }
      } else {
        res.json({
          status: false,
          message: "Vendor Not Found !",
        });
      }
    })

    if(orderArr.length > 0) {
      orderArr.forEach(async(orderNo) => {
        // console.log('orderNo -> ',orderNo)
        await pplRequestRef
        .child(orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            // let length = snapshot.numChildren();
            // console.log('length -> ',length);
            

            let request = snapshot.val();
      
              if (request.status != "completed") {
                
                if (request.request_type == "transit") {
                  // console.log('request -> ',request)
                  if(request.bilty) {
                    request.bilty.forEach((bilty) => {
                      biltyArr.push(bilty.biltyNo)
                    })
                  } 
                } else if (request.request_type == "upcountry") {
                  // console.log('request -> ',request)
                  if(request.bilty) {
                    request.bilty.forEach((bilty) => {
                      biltyArr.push(bilty.biltyNo)
                    })
                  }
                }
              } else {
                console.log('orderNo before splice -> ',orderNo); 
                console.log('orderArr before -> ',orderArr);
                console.log('orderArr after -> ',orderArr);

                orderArr.splice(orderArr.indexOf(orderNo), 1);
                // console.log('orderArr -> ',orderArr);
              }
          }
        })
      })
    } else {
      // res.status(200).json({ token, user_id, user_type, orderArr, biltyArr });
      res.json({

        token, user_id, user_type,
        orderArr: [],
        biltyArr: [],
        status:false,
        error: "Vendor did not have any active orders"
      })
    }
    
   
  } else if (user_type == 'driver') {
    await userRef
    .child("drivers")
    .child(user_id)
    .once('value', (snap) => {
      if (snap.val()) {
        console.log('bilty -> ',snap.val().bilty)
        const biltyNo = snap.val().bilty;
        if (biltyNo) {
          biltyArr.push(biltyNo);
          const length = biltyNo.length;
          const orderNo = biltyNo.slice(2,(length - 2));
          orderArr.push(orderNo);
        }
      } else {
        res.json({
          status: false,
          message: "Driver Not Found !",
        });
      }
    })
  }

  user_id = user_id.slice(1);
  
  const admin_id = 'Asher';
  const admin = await streamClient.upsertUsers([{id: admin_id, role: 'admin'}, {id: user_type+'_'+user_id, role: 'user'}]);
  console.log('Admin ===', admin.users[Object.keys(admin.users)[0]].id);
  console.log("user_phone -> ", user_id);
  console.log("user_type -> ", user_type);

  if(orderArr.length > 0) {
    orderArr.forEach(async (orderNo, index) => {
      orderNo = `Order${orderNo}`;
      orderArr[index] = orderNo;
      const channel = streamClient.channel('livestream', orderNo, {name: orderNo, created_by_id: admin_id});
      await channel.create();
      await channel.addMembers([user_type+'_'+user_id])
    });
  } else {
    res.json({
      status:false,
      error: "User not associated with any order !"
    })
  }

  
  
  biltyArr.forEach(async (biltyNo) => {
    const channel = streamClient.channel('livestream', biltyNo, {name: biltyNo, created_by_id: admin_id});
    await channel.create();
    await channel.addMembers([user_type+'_'+user_id])
  });

  // generate Stream Chat token to use to authenticate user on the client
  const token = streamClient.createToken((user_type+'_'+user_id));

  res.status(200).json({ token, user_id, user_type, orderArr, biltyArr });
});




router.post("/join-admin", async (req, res) => {
  const { user_id } = req.body;

  console.log("Username -> ", user_id);

  // generate Stream Chat token to use to authenticate user on the client
  const token = streamClient.createToken(user_id);

  res.status(200).json({ user: { user_id }, token });
});

module.exports = router;