# Meribilty API

# Base Url -> https://api.meribilty.com/


# Table of Contents
1. [Profile Services](#Profile)
3. [Authentication Services](#Authentication)
4. [PPL Services](#PPL)
5. [Driver Services](#Driver)
6. [Admin Panel](#AdminPanel)


# Profile


### api/get_user_profile
`{ "token": "" }`

### api/update_user_profile
* Form-Data
- token
- profileImage
- fullname
- email


### api/get_vendor_or_driver_profile
`{ "token": "" }`

### api/update_vendor_or_driver_profile
* Form-Data
- token
- profileImage
- fullname
- email


# Selections  (User Vehicle Selections , Vendor Vehicle and Driver Services)

## User

### api/get_vehicle_types_and_options 

### api/add_vehicle_selection

`{
  "token": "",
  "type": "",
  "option": ""
  "quantity": "",
  "weight": "",
  "material": ["cement","electronics","glass"]
}`

### api/edit_vehicle_selection

`{
  "token": "",
  "id": "", 
  "type": "",
  "option": ""
  "quantity": "",
  "weight": ""
}`

### api/remove_vehicle_selection

`{
  "token": "",
  "id": ""
}
`

### api/get_vehicle_selections 

`{
  "token": ""
}
`

### api/invite_friends
`
{
  "token": "",
  "phone":""
}
`
### api/get_user_orders
`
{
   "token": "",
}
`
## Vendor

### ppl/vendor_invite_driver
`
{
    "token": "",
    "fullname": "+923243254545",
    "phone": "Ayaz Bhatti",
    "cnic" : "MAZDA CONTAINER 20 FT LOCAL",
}
`

### ppl/vendor_add_vehicle

`
{
  "token": "",
  "vehicle_name" : "BOWSER 20 FT",
  "vehicle_make": "FORD",
  "vehicle_model": "2000",
  "vehicle_number": "ASD-213",
  "vehicle_type": "20ft Truck",
  "available" : true
}
`

### ppl/vendor_edit_vehicle
`
{
  "token": "",
  "id":"",
  "vehicle_name" : "BOWSER 20 FT",
  "vehicle_make": "FORD",
  "vehicle_model": "2000",
  "vehicle_number": "ASD-213",
  "vehicle_type": "20ft Truck",
  "available" : true
}
`

### ppl/vendor_remove_vehicle
`
{
  "token":"",
  "id":""
}
`

### ppl/vendor_make_vehicle_online

`
{
   "token": "",
   "vehicle_number": "SSD887"
}
`

### ppl/vendor_make_vehicle_offline

`
{
   "token": "",
   "vehicle_number": "SSD887"
}
`

### api/get_vendor_orders
`
{
   "token": "",
}
`

### api/get_new_jobs
`
{
   "token": "",
}
`

# Authentication

## Login 

### api/user_login_1
`{
 "phone": "",
}`

### api/user_login_2
`
{
  "phone": "",
  "password": ""
} 
`

### api/validate_invited
`{
  "token": "",
  "otp": ""
}`


### api/vendor_login_1
`{
 "phone": "",
}`

### api/vendor_login_2
`
{
  "phone": "",
  "password": ""
} 
`




## Registration


### auth/user/send_register_otp
`
{
      "fullname":"fahad",
      "email": "fahad@4slash.com",
      "phone": "+923243288887",
      "password": "fahad123",
      "pro": false
}
`

### auth/user/register_after_otp
`
{
 "otp": ""
}`


### auth/pro/send_application
`{
    "token": "",
    "fullname": "fahad",
    "email": "fahad@4slash.com",
    "bussiness_name": "fahad and co",
    "bussiness_address": "lalu khait",
    "NTN": "4220188455488",
    "landline": "3243288887",
    "owner": "owner",
    "point_of_contact": "3243288887",
    "cargo_volumne_per_month": "3243288887",
    "credit_duration": "3243288887",
    "credit_requirement_per_month": "3243288887"
}`


### auth/driver/send_register_otp

` { 
   "fullname": "Rizwan Qadri", 
   "cnic": "4220196318289", 
   "phone": "+923352640168", 
   "email": "omair@4slash.com", 
   "password": "omair123", 
   "work_on_same_city_movement" : true, 
   "work_in_different_cities_provinces" : false, 
   "do_cargo_movement_out_of_pak" : false, 
   "source_labor_cranes_lifters" : false ,
   "vehicle_type": "Suzuki",
   "vehicle_model_year": "2015", 
   "vehicle_number": "3545687515245", 
    "vehicle_make": "Honda", 
    "vehicle_owner": false
}`



### auth/driver/register_after_otp
`{
  "otp": ""
}`

### auth/driver/register_step_2

Form-data 

token: ""
vehicle_type: 'Suzuki'
vehicle_model_year: '2015',
vehicle_number: '3545687515245',
vehicle_make: 'Honda',
vehicle_owner: false,
profile_image,
cnic_image,
driving_license_image,
vehicle_registration_image


### auth/vendor/send_register_otp

` {   
    "company_name" : "Ahmed Company", 
    "phone" : "+923352640168", 
    "email" : "ahmed@gmail.com",
    "password" : "ahmed123",
    "confirm_password" : "ahmed123",
    "work_on_same_city_movement" : false, 
    "work_in_different_cities_provinces" : false,
    "do_cargo_movement_out_of_pak" : true, 
    "source_labor_cranes_lifters" : false ,
    "company_address": "johar",
    "company_phone_landline": "164457445",
    "owner_name": "ahmed",
    "owner_phone": "03354447444",
    "owner_email": "owner@gmail.com",
    "operations_head_name": "head khan",
    "operations_head_phone": "78463564",
    "operations_head_email": "head@gmail.com",
    "account_manager_phone": "9454654",
    "account_manager_name": "manager khan",
    "account_manager_email": "manager@gmail.com",
    "NTN_number": "8456465654141"
} `


### auth/vendor/register_after_otp
`{
  "otp":""
}`

### auth/vendor/register_step_2
Form-data 

    token
    company_address
    company_phone_landline
    owner_name
    owner_phone
    owner_email
    operations_head_name
    operations_head_phone
    operations_head_email
    account_manager_phone
    account_manager_name
    account_manager_email
    NTN_number
    owner_CNIC_Photo
    NTN_Scan_Photo






## ForgotPassword

### api/user_app_forgot_password
`{
  "phone":""
}`

### api/user_app_new_password
`{
  "otp":"",
  "password": ""
}`


### api/driver_app_forgot_password
`{
  "phone":""
}`


### api/driver_app_new_password
`{
  "otp":"",
  "password": ""
}`



# PPL  (PPL Flow)

### ppl/calculate_insurance
`{
  "cargo_value": ""
}
`

### ppl/create_request
* TRANSIT

`
{ "token": "", "date": "2022-02-26 17:57:00", "type": "transit", "material": ["Cement","Iron","Sand","Wood"], "cargo_insurance": false, "desLat": "24.844885", "desLng": "66.991985", "desText": "Tower", "disText": "1 m", "durText": "1 min", "orgLat": "24.910186", "orgLng": "67.123307", "orgText": "Perfume Chowk", "emptyLat": "53.21", "emptyLng":"67.088", "emptyText":"Pata nhi" ,   "originAddress": "karachi",
    "destinationAddress": "lahore",
    "containerReturnAddress": "karachi"}
`


* UPCOUNTRY

`{  
      "token": "",
      "date": "2022-12-28 13:00:00",
      "type": "upcountry",
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
      "security_deposit": "5000",
      "originAddress": "Karachi",
      "destinationAddress": "Lahore",
      "containerReturnAddress": "Karachi"
}
`

## Counter Offer Process

### ppl/vendor_send_qoute
* TRANSIT
`
{
    "token": "",
    "orderNo": "0006",
    "amount": "600000",
}
`

* UPCOUNTRY

`
{
    "token": "",
    "subOrderNo": "",
    "amount": "600000",
}
`


### ppl/user_reject_vendor_qoute 
* TRANSIT
`
{
   "token":"",
   "orderNo": "",
   "vendor_phone": ""
}
`
* UPCOUNTRY
`
{
   "token":"",
   "subOrderNo": "",
   "vendor_phone": ""
}
`


### ppl/user_accept_vendor_qoute
* TRANSIT
`
{
   "token":"",
   "orderNo": "",
   "vendor_phone": ""
}
`
* UPCOUNTRY
`
{
   "token":"",
   "subOrderNo": "",
   "vendor_phone": ""
}
`


### ppl/user_counters_vendor_qoute  
* TRANSIT
`
{
  "token": "", 
  "orderNo": "-MrYCU3DYsPGa3cVjsmr",
  "amount": "120000",
  "vendor_phone": "+923243280234"
}
`

* UPCOUNTRY
`
{
  "token": "", 
  "subOrderNo": "",
  "amount": "120000",
  "vendor_phone": "+923243280234"
}
`

### ppl/vendor_accept_counter_offer
* TRANSIT
`
{
  "token": "", 
  "orderNo": "0004",
  "user_phone": "+923243280234"
}
`

* UPCOUNTRY
`
{
  "token": "", 
  "subOrderNo": "0004",
  "user_phone": "+923243280234"
}
`

### ppl/vendor_reject_counter_offer
* TRANSIT
`
{
  "token": "", 
  "orderNo": "0004",
  "user_phone": "+923243280234"
}
`

* UPCOUNTRY
`
{
  "token": "", 
  "subOrderNo": "0004",
  "user_phone": "+923243280234"
}
`

### ppl/vendor_counters_user_counter_offer
* TRANSIT
`
{
   "token": ""
   "orderNo": "",
   "amount": ""
}
`

* UPCOUNTRY
`
{
   "token": ""
   "subOrderNo": "",
   "amount": ""
}
`

### ppl/vendor_reject_counter_offer

* TRANSIT
`
{
    "token": "",
    "orderNo": "0001",
    "user_phone": "+923322323883",
}
`
* UPCOUNTRY
`
{
    "token": "",
    "subOrderNo": "0001",
    "user_phone": "+923322323883",
}
`




### ppl/user_accept_vendor_counter_offer 
* TRANSIT
`
{
  "token": "",
  "orderNo": "",
  "vendor_phone": ""
}
`

* UPCOUNTRY
`
{
  "token": "",
  "subOrderNo": "",
  "vendor_phone": ""
}
`

### ppl/user_reject_vendor_counter_offer
* TRANSIT
`
{
  "token": "",
  "orderNo": "",
  "vendor_phone": ""
}
`

* UPCOUNTRY
`
{
  "token": "",
  "subOrderNo": "",
  "vendor_phone": ""
}
`



## Add Payment Method

### ppl/user_add_payment_method

* CASH ON DELIVERY
`
{
    "token": "",
    "orderNo": "0005",
    "payment_method": "cod",
    "point_of_payment": "origin/destination" 
}
`


* CREDIT
`
{
    "token": "",
    "orderNo": "0005",
    "payment_method": "credit"
}
`

* BANK

    token
    orderNo
    payment_method
    accountNo
    transfer_slip


* CARD
`
{
    "token": "",
    "orderNo": "0005",
    "payment_method": "card"
}
` 


## Contact Person / Clearing Agent

### ppl/user_invites_a_user
`
  {
  "token": "",
  "fullname": "khan",
  "email": "raheem@gmail.com",
  "phone": "+923354547448",
  }
`

### ppl/get_contact_persons
`
{
  "token": ""
}
`

### ppl/user_add_contact_person_to_request
* SELF
`
{
  "token":"",
  "orderNo": ""
}
`

* OTHER
`
{
  "token":"",
  "orderNo": "",
  "phone": ""
}
`

## Upload Documents 

### ppl/user_upload_upcountry_documents
    
     token
     orderNo
     detail_packing_list
     clearing_form
     
### ppl/user_upload_transit_cargo_documents

     token
     orderNo
     bill_of_landing
     invoice
     gd



## ORDER

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

### ppl/order_reject_2
Transit

`
 {
    "token" : "" 
    "orderNo": "0001",
 }
`

Upcountry
`
 {
    "token" : "" 
    "biltyNo": "0001",
 }
`


### ppl/approve_payment
{
  "token": "",
  "orderNo": ""
}


# PPL Get Data 

### ppl/get_single_bilty
`{
  "token": "",
  "biltyNo": ""
}`

### ppl/get_single_order
`{
  "token": "",
  "orderNo": ""
}`
# Vendor Allot Vehicle and Driver To Bilty

### ppl/vendor_allot_vehicle_and_driver_to_request
`
{
        "token": "",
        "biltyNo": "",
        "vehicle_number": "BAH 7894",
        "vehicle_driver": "+923456548785"
}
`

# Driver Services

### driver/reached_origin
`{
    "token": "",
    "biltyNo": "",
    "type": ""
}`


### driver/picked_up_load
`{
    "token": "",
    "biltyNo": "",
    "type": ""
}`


### driver/driver_delivered
`{
    "token": "",
    "biltyNo": "",
    "type": ""
}`


### driver/driver_returning_container
`{
    "token": "",
    "biltyNo": "",
    "type": ""
}`

# AdminPanel

## Requests

### admin/requests_ppl (GET)

## Users

### admin/user/driver

### admin/user/pro

### admin/user/user

### admin/user/vendor


## Settings/Variable
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



## Get Vendor Qoutes
### api/get_vendor_qoutes
`{"token":""}`

### api/get_user_counter_offers
`{"token":""}`

### api/get_vendor_partner_counter_offers
`{"token":""}`
