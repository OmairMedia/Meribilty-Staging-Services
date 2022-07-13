# Base Url -> https://api.meribilty.com/
# * x-access-token : c13b2e50e12241663fb9299e1472dfb615326243
# PPL Services 

# Base Url -> https://api.meribilty.com/

# PPL Services 

## Data







ppl/ppl_data  (GET)


ppl/get_vendor_deliveries
`
{
  "vendor_phone" : "+923243280234",
}
`

ppl/get_vendor_drivers
`
{
  "vendor_phone" : "+923243280234",
}
`

ppl/get_vendor_vehicles
`
{
  "vendor_phone" : "+923243280234",
}
`

### PPL REQUESTS 

### ppl/create_request

`
{  
      "token": "",
      "date": "",
      "type": "transit",
      "loading": [ { "name": "crane", "quantity": "1" }, { "name": "fork lift 3 ton", "quantity": "1" } ],
      "unloading":[], 
      "floors": "0",
      "material": ["Cement","Iron","Sand","Wood"], 
      "cargo_insurance": false, 
      "desLat": "24.844885", 
      "desLng": "66.991985", 
      "desText": "Tower", 
      "disText": "1 m", 
      "durText": "1 min", 
      "orgLat": "24.910186", 
      "orgLng": "67.123307", 
      "orgText": "Perfume Chowk", 
      "emptyLat": "53.21", 
      "emptyLng":"67.088", 
      "emptyText":"Pata nhi", 
      "vehicles": [ { "name": "20 Feet Container", "quantity": "1" }, { "name": "40 Feet Container", "quantity": "3" } ] 
}
`


### Counter Offer Process


### ppl/vendor_send_qoute
`
{
    "amount": "600000",
    "token": "",
    "orderNo": "0006"
}
`   
### ppl/user_reject_vendor_qoute 
`
{

   "orderNo": "",
   "token":"",
   "vendor_phone": ""
}
`


### ppl/user_accept_vendor_qoute
`
{

   "orderNo": "",
   "token":"",
   "vendor_phone": ""
}
`


### ppl/user_counters_vendor_qoute  
`
{
  "token": "", 
  "orderNo": "-MrYCU3DYsPGa3cVjsmr",
  "amount": "120000",
  "vendor_phone": "+923243280234"
}
`

### ppl/vendor_accept_counter_offer
`
{
  "token": "", 
  "orderNo": "0004",
  "user_phone": "+923243280234"
}
`

### ppl/vendor_reject_counter_offer
`
{
  "token": "", 
  "orderNo": "0004",
  "user_phone": "+923243280234"
}
`

### ppl/vendor_counters_user_counter_offer
`
{
   "token": ""
   "orderNo": "",
   "amount": ""
}
`
### ppl/user_accept_vendor_counter_offer 
`
{
   "token": ""
   "orderNo": "",
   "vendor_phone": ""
}
 `

### ppl/user_reject_vendor_counter_offer
`
{
  "token": "",
  "orderNo": "",
  "vendor_phone": ""
}
`




## Payment Method

### ppl/user_add_payment_method
`
{
    "orderNo": "0006",
    "payment_method": "cod",
    "token": ""
}
`



## Contact Person / Clearing Agent

### ppl/user_create_contact_person
`
{
    "token": "",
    "firstname": "omair",
    "lastname": "khan",
    "email": "omair@4slash.com",
    "limited_app_access": true,
    "agent_phone": "+923243280234"
}
`

### ppl/user_edit_contact_person
`
{
    "token": "",
    "firstname": "omair",
    "lastname": "khan",
    "email": "omair@4slash.com",
    "limited_app_access": true,
    "agent_phone": "+923243280234"
}
`

### ppl/user_remove_contact_person
`
{
    "token": "",
    "agent_phone": "+923243280234"
}
`

### ppl/user_add_contact_person_to_request
`
{
    "token": "",
    "phone": "+923243280234",
    "orderNo": "0006"
}
`


## Vendor Add,Edit,Remove Driver

### /vendor_add_driver

- FORM DATA

    token
    firstname
    lastname
    phone
    cnic
    vendor_phone
    profile_image
    cnic_image
    driving_license_image




### /vendor_edit_driver
`
- FORM DATA

    token
    firstname
    lastname
    phone
    cnic
    vendor_phone
    profile_image
    cnic_image
    driving_license_image


### /vendor_remove_driver 
`
{
    "token": "",
    "phone": "Ayaz Bhatti",
}
`


## Vendor Add,Edit,Remove Vehicle

### /vendor_add_vehicle

`
{
  "token": "",
  "vehicle_name" : "BOWSER 20 FT",
  "vehicle_make": "FORD",
  "vehicle_model": "2000",
  "vehicle_number": "ASD-213",
  "vehicle_type": "Container",
  "available" : true
}
`

### /vendor_edit_vehicle

`
{
  "token": "",
  "vehicle_name" : "BOWSER 20 FT",
  "vehicle_make": "FORD",
  "vehicle_model": "2000",
  "vehicle_number": "ASD-213",
  "vehicle_type": "Container",
  "available" : true
}
`



### /vendor_remove_vehicle

`
 {
  "token": "",
  "vehicle_name" : "BOWSER 20 FT",
  "vehicle_make": "FORD",
  "vehicle_model": "2000",
  "vehicle_number": "ASD-213",
  "vehicle_type": "Container",
  "available" : true
}

`




### /vendor_make_vehicle_online

`
{
        "token": "",
        "vehicle_number": "SSD887"
}
`

### /vendor_make_vehicle_offline

`
{
        "token": "",
        "vehicle_number": "SSD887"
}
`


### vendor_allot_vehicle_and_driver_to_request

`
{
      "token": "",
      "biltyNo": "BT0006a0",
      "vehicle_number": "BAH 7894",
      "vehicle_driver": "+923243280234"
}
`



### ppl/order_accept

`
 {
    "token" : ""  
    "orderNo": "0001",
 }
`

### ppl/order_reject

`
 {
    "token" : "" 
    "orderNo": "0001",
 }
`



### Upload Documents 

## ppl/user_upload_upcountry_documents

  detail_packing_list
  clearing_form
  token


## ppl/user_upload_transit_cargo_documents

  token
  bill_of_landing
  invoice
  gd



## Settings/Variable
ppl/update_driver_position
ppl/add_vehicle_type_with_pricing
ppl/add_vehicle
ppl/update_commission
ppl/add_material
ppl/add_loading_option
ppl/add_unloading_option
ppl/add_user_cancellation_reason
ppl/add_vendor_cancellation_reason
ppl/add_insurance_percent
ppl/add_vehicle_type

## Settings/Variable
ppl/update_driver_position
ppl/add_vehicle_type_with_pricing
ppl/add_vehicle
ppl/update_commission
ppl/add_material
ppl/add_loading_option
ppl/add_unloading_option
ppl/add_user_cancellation_reason
ppl/add_vendor_cancellation_reason
ppl/add_insurance_percent
ppl/add_vehicle_type