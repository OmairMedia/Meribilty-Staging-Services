

### ppl/get_vehicle_types_and_options (GET)



### ppl/get_vehicle_selections (GET)

`
{
    "token": "",
}
`


### ppl/add_vehicle_selection
`
{
    "token": "",
    "type": "",
    "weight": "",
    "option": "",
    "quantity": "" 
}
`


### ppl/edit_vehicle_selection
`
{
  "token": "",
  "id": "", 
  "type": "",
  "option": ""
  "quantity": "",
  "weight": ""
}
`


### ppl/remove_vehicle_selection
`
{
    "token": "",
    "id": ""
}
`





### ppl/add_vehicle_type_with_pricing

`
  {
    "vehicleType": "40ft Truck",
    "labour": "8500",
    "lifters": [
        {
            "weights": "3-4",
            "ratePerHour": "1500"
        },
        {
          "weights": "5-7",
          "ratePerHour": "2000"
        },
        {
          "weights": "8-10",
          "ratePerHour": "3000"
        }
    ],
    "cranes": [
      {
       "weights": "0-15",
       "ratePerHour": "4000"
       },
      {
       "weights": "15-20",
       "ratePerHour": "5000"
       },
      {
       "weights": "25-30",
       "ratePerHour": "6000"
       }
    ]
    }
`


### api/get_wallet
`
{
  "token": ""
}
`


### api/get_user_orders
`
{
  "token": ""
}
`