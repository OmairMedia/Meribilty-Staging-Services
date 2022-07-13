# Base Url -> https://api.meribilty.com/

### Invited User

### ppl/user_invites_a_user
`
{
  "token": "",
  "fullname": "",
  "email": "",
  "phone": ""
}
`

### Invited Driver

### ppl/vendor_invite_driver

`
{
    "token": "",
    "fullname": "",
    "email": "",
    "phone": "",
    "cnic" : ""
}
`

## Login 

### api/user_login_1
`{
 "phone": "",
}`

### api/user_login_2
`

{
  "token": "",
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
  "token": "",
  "password": ""
} 
`




# Registration


### auth/normal/send_register_otp
`
{
      "fullname":"fahad",
      "email": "fahad@4slash.com",
      "phone": "+923243288887",
      "password": "fahad123",
}
`

### auth/normal/register_after_otp
`
{
 "otp": ""
}`

### auth/pro/send_register_otp
`{
      "fullname":"fahad",
      "email": "fahad@4slash.com",
      "phone": "+923243288887",
      "password": "fahad123",
}`

### auth/pro/register_after_otp
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
    "phone": "+923243280234",
    "email": "omair@4slash.com",
    "password": "omair123",
    "work_on_same_city_movement" : true,
    "work_in_different_cities_provinces" : false,
    "do_cargo_movement_out_of_pak" : false,
    "source_labor_cranes_lifters" : false
  } `



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

`   {
      "company_name" : "",
      "phone" : "",
      "email" : "",
      "password" : "",
      "confirm_password" : "",
      "work_on_same_city_movement" : true,
      "work_in_different_cities_provinces" : false,
      "do_cargo_movement_out_of_pak" : false,
      "source_labor_cranes_lifters" : false
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




## Forgot Password

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


