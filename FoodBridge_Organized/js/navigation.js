/* Navigation and common UI helpers */
window.FoodBridge = window.FoodBridge || {};
FoodBridge.pageNames = {dashboard:"Overview",donations:"Donations",matches:"Smart Matches",tracking:"Tracking",notifications:"Notifications",profile:"My Profile",admin:"Admin Insights"};
FoodBridge.esc = function(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));};
FoodBridge.toast = function(message){const t=document.querySelector("#toast");t.textContent=message;t.classList.add("show");clearTimeout(FoodBridge.toastTimer);FoodBridge.toastTimer=setTimeout(()=>t.classList.remove("show"),2600);};
FoodBridge.statusClass = function(status){return status.toLowerCase().replace(/\s+/g,"-");};
FoodBridge.go = function(page){if(page==="admin"&&FoodBridge.state.role!=="admin"){FoodBridge.toast("Switch to the Admin demo role to open this page.");return;}FoodBridge.state.page=page;document.querySelector("#sidebar").classList.remove("open");FoodBridge.render();};
document.querySelector("#mainNavigation").addEventListener("click",event=>{const button=event.target.closest("[data-page]");if(button)FoodBridge.go(button.dataset.page);});
document.addEventListener("click",event=>{const button=event.target.closest("[data-page]");if(button&&!button.closest("#mainNavigation"))FoodBridge.go(button.dataset.page);});
document.querySelector("#menuToggle").addEventListener("click",()=>document.querySelector("#sidebar").classList.toggle("open"));
