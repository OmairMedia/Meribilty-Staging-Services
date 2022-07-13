## Vendor 



### ppl/vendor_complete_bilty
`
{
  "reqId": "",
  "vendor_phone":""
}
`


### /vendor_invite_driver
`
{
    "token": "",
    "fullname": "+923243254545",
    "phone": "Ayaz Bhatti",
    "cnic" : "MAZDA CONTAINER 20 FT LOCAL",
}
`



### /vendor_edit_driver
`
{
    "token": "",
    "firstname": "+923243280234",
    "lastname": "+923243254545",
    "phone": "Ayaz Bhatti",
    "cnic" : "MAZDA CONTAINER 20 FT LOCAL",
    "vendor_phone" : "+923243280234"
    "profile_image": ,
    "cnic_image": ,
    "driving_license_image":
}
`

### /vendor_remove_driver 
`
{
    "token": "",
    "phone": "Ayaz Bhatti",
}
`


### /vendor_add_vehicle

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









### ppl/vendor_allot_vehicle_and_driver_to_request
`{
        "vendor_phone": "+923243280234",
        "biltyNo": "",
        "vehicle_number": "BAH 7894",
        "vehicle_driver": "+923456548785"
}`