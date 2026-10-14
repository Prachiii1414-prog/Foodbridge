/* Sample data for the frontend demo. Replace with Flask API responses later. */
window.FoodBridgeData = {
  donations: [
    {id:1,name:"Fresh vegetable boxes",type:"Fresh Produce",quantity:"12 boxes",location:"Rajpur Road",expiry:"2026-10-16",urgency:"Standard",status:"Matched",emoji:"🥬",recipient:"Hope Community Kitchen",created:"Today, 10:20 AM"},
    {id:2,name:"Cooked lunch meals",type:"Cooked Meals",quantity:"25 meal boxes",location:"Clock Tower",expiry:"2026-10-15",urgency:"Urgent",status:"Pending",emoji:"🍱",recipient:"Awaiting match",created:"Today, 9:05 AM"},
    {id:3,name:"Bakery surplus pack",type:"Bakery",quantity:"18 items",location:"Ballupur",expiry:"2026-10-17",urgency:"Standard",status:"In transit",emoji:"🥖",recipient:"Sunrise Shelter",created:"Yesterday"},
    {id:4,name:"Seasonal fruit basket",type:"Fresh Produce",quantity:"8 kg",location:"Dalanwala",expiry:"2026-10-16",urgency:"High",status:"Completed",emoji:"🍎",recipient:"Hope Community Kitchen",created:"Yesterday"},
    {id:5,name:"Packaged grocery kits",type:"Packaged Food",quantity:"10 kits",location:"Prem Nagar",expiry:"2026-10-19",urgency:"Standard",status:"Completed",emoji:"🥫",recipient:"Community Care Centre",created:"12 Oct"}
  ],
  notifications: [
    {icon:"⌘",title:"A strong match was found",body:"Hope Community Kitchen is a 92% match for your fresh vegetable boxes.",time:"10 minutes ago"},
    {icon:"↗",title:"Pickup scheduled",body:"A pickup window has been suggested for the cooked lunch meals.",time:"1 hour ago"},
    {icon:"✦",title:"Welcome to FoodBridge",body:"Complete your profile to improve matching recommendations.",time:"Yesterday"}
  ],
  matches: [
    {name:"Hope Community Kitchen",food:"Fresh vegetable boxes",quantity:"12 boxes",distance:"1.2 km",score:92,urgency:"High",reason:"Food type and pickup distance align closely."},
    {name:"Sunrise Shelter",food:"Cooked lunch meals",quantity:"25 meal boxes",distance:"2.4 km",score:86,urgency:"Urgent",reason:"High urgency and quantity suitability."},
    {name:"Community Care Centre",food:"Packaged grocery kits",quantity:"10 kits",distance:"3.1 km",score:79,urgency:"Standard",reason:"Suitable category and collection window."}
  ]
};
