# SCM

## Data

### scm/get_user_data  (GET)
`{
   "phone" : "+92838383833"
}`

### scm/scm_data (GET)

### scm/user_deliveries (GET)
`{
  "phone" : "+92838383833"
}`

### scm/estimated_price  
`{
  "start_location": { "lat": 24.8627626, "lng": 67.0087094 },
  "end_location": { "lat": 24.8607002, "lng": 66.9975986 },
   "loading": [ {
        "name":"crane",
         "quantity":"1"
    },
    {
         "name":"fork_lift_5_ton",
         "quantity":"2"
     }],
 "unloading":[{
         "name":"labour",
          "quantity":"2"
     }],
"floors": "3",
 "vehicle_type": "Suzuki",
 "cargo_value": "30000"
 }`

## Request Process

### scm/create_request 
`{
  "user_phone":"+923243280234",
  "loading": [ {
          "name":"crane",
           "quantity":"2"
      }, {
          "name":"fork_lift_2_tons",
          "quantity":"2"
      }],
  "unloading":[{
          "name":"labour",
           "quantity":"2"
     }],
  "floors": "2",
  "cargo_insurance": false,
  "desLat": "24.8345168",
  "desLng": "67.0995516",
  "desText": "Brooks Chowrangi",
  "disText": "1 m",
  "durText": "1 min",
  "orgLat": "24.8345168",
  "orgLng": "67.0995516",
  "orgText": "Brooks Chowrangi",
  "vehicle_type": "Suzuki",
  "wallet": false
}`

### User Actions

### scm/request_cancel_by_user
`{
  "phone": "",
   "reqId": "",
}`

### Driver Actions 

### scm/request_accept_by_driver
`{
 "phone": "+923142341232",
 "reqId": "-maxasd2913madisa82d"
}`

### scm/request_reject_by_driver
`{
 "phone": "+923142341232",
 "reqId": "-maxasd2913madisa82d"
}`

### scm/driver_reached_origin
`{
 "phone": "+923142341232",
 "reqId": "-maxasd2913madisa82d"
}`

### scm/driver_picked_up_load
`{
 "phone": "+923142341232",
 "reqId": "-maxasd2913madisa82d"
}`

### scm/driver_delivered
`{
 "phone": "+923142341232",
 "reqId": "-maxasd2913madisa82d"
}`

### scm/update_driver_position
`{
 "phone": "+923142341232",
 "lat": "63.12234",
 "lng": "45.3524"
}`

### scm/make_driver_online
`{
 "phone": "+923142341232",
}`

### scm/make_driver_offline
`{
 "phone": "+923142341232",
}`

## Settings / Variables

### scm/add_vehicle_type_with_pricing
`
{
    "vehicleType": "Suzuki",
     "emptyKM": "5",
     "loadedKM": "10",
     "labourPrice": "500",
    "pricePerFloor": "200",
    "minimumEmptyPrice": "5",
     "minimumEmptyDistance": "10",
    "minimumLoadedPrice": "10",
    "minimumLoadedDistance": "15",
    "cancelChargesPriceType": false,
     "clientChargesPriceType": false,
     "driverCancelPrice": "500",
    "driverCancelDuration": "30",
     "clientCancelPrice": "20",
     "clientCancelDuration": "10",
     "minimumPriceLoadtime": "20",
     "minimumPricePerMinute": "10",
    "incentiveAmount": "200"
}
`


### scm/add_vehicle
`
{
  "name": "Hi-Roof",
  "limit": "1",
  "vehicle_type": "Suzuki"
 }
`
### scm/add_material
`
{
  "name": "Cement"
}
`

### scm/add_loading_option
`
{
  "name"  :  "Crane",
   "price": "1000"
}
`

### scm/add_unloading_option
`
{
  "name"  :  "Crane",
   "price": "1000"
}
`

### scm/add_user_cancellation_reason
`{
  "name": "Too much wait !"
}`

### scm/add_vehicle_type
`
  {
  vehicleType: '',
 emptyKM: '5',
   loadedKM: '10',
   labourPrice: '500',
   pricePerFloor: '200',
  minimumEmptyPrice: '5',
   minimumEmptyDistance: '10',
  minimumLoadedPrice: '10',
  minimumLoadedDistance: '15',
  cancelChargesPriceType: false,
   clientChargesPriceType: false,
   driverCancelPrice: '500',
  driverCancelDuration: '30',
 clientCancelPrice: '20',
  clientCancelDuration: '10',
  minimumPriceLoadtime: '20',
  minimumPricePerMinute: '10',
   incentiveAmount: '200'
  }
`

### scm/add_promo_code
`
{
"code" : "NTF227",
 "discount": "35"
}
`

### scm/add_insurance_percent
`{
 "percent": "15"
}`
