/* Donation form, list rendering, filters and CSV export */
FoodBridge.renderDonations = function(){const list=FoodBridge.state.donations;return `<div class="page-title"><div><p class="eyebrow">YOUR FOOD, THEIR FUTURE</p><h1>Donations</h1><p>Manage surplus food, availability and handovers in one place.</p></div><button class="btn btn-primary" id="addDonationPage">＋ Add donation</button></div><div class="toolbar"><input id="donationSearch" placeholder="Search donations..."><select id="statusFilter"><option value="">All statuses</option><option>Pending</option><option>Matched</option><option>In transit</option><option>Completed</option></select><select id="typeFilter"><option value="">All categories</option><option>Fresh Produce</option><option>Cooked Meals</option><option>Bakery</option><option>Dairy</option><option>Packaged Food</option><option>Other</option></select></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Food item</th><th>Quantity</th><th>Pickup location</th><th>Best before</th><th>Status</th><th>Action</th></tr></thead><tbody id="donationRows">${list.map(FoodBridge.donationRow).join("")}</tbody></table></div>`;};
FoodBridge.donationRow = d=>`<tr><td><strong>${d.emoji} ${FoodBridge.esc(d.name)}</strong><br><small>${FoodBridge.esc(d.type)}</small></td><td>${FoodBridge.esc(d.quantity)}</td><td>${FoodBridge.esc(d.location)}</td><td>${FoodBridge.esc(d.expiry)}</td><td><span class="status ${FoodBridge.statusClass(d.status)}">${FoodBridge.esc(d.status)}</span></td><td><button class="text-link" data-track="${d.id}">Track ↗</button></td></tr>`;
FoodBridge.bindDonationPage = function(){
 const add=document.querySelector("#addDonationPage");if(add)add.onclick=FoodBridge.openDonation;
 const search=document.querySelector("#donationSearch"),status=document.querySelector("#statusFilter"),type=document.querySelector("#typeFilter");
 if(search){const filter=()=>{const q=search.value.toLowerCase();const rows=FoodBridge.state.donations.filter(d=>(d.name+" "+d.location+" "+d.type).toLowerCase().includes(q)&&(!status.value||d.status===status.value)&&(!type.value||d.type===type.value));document.querySelector("#donationRows").innerHTML=rows.map(FoodBridge.donationRow).join("")||'<tr><td colspan="6">No matching donations found.</td></tr>';};search.oninput=filter;status.onchange=filter;type.onchange=filter;}
 document.querySelectorAll("[data-track]").forEach(b=>b.onclick=()=>FoodBridge.go("tracking"));
};
FoodBridge.openDonation = function(){if(FoodBridge.state.role!=="donor"){FoodBridge.toast("Switch to the Donor role to publish a donation.");return;}document.querySelector("#donationModal").showModal();};
document.querySelector("#sidebarAdd").addEventListener("click",FoodBridge.openDonation);
document.querySelector("#closeDonation").addEventListener("click",()=>document.querySelector("#donationModal").close());
document.querySelector("#cancelDonation").addEventListener("click",()=>document.querySelector("#donationModal").close());
document.querySelector("#donationForm").addEventListener("submit",event=>{
 event.preventDefault();const $=id=>document.getElementById(id);
 const type=$("foodType").value,emoji={"Fresh Produce":"🥬","Cooked Meals":"🍱","Bakery":"🥖","Dairy":"🥛","Packaged Food":"🥫","Other":"🍽️"};
 FoodBridge.state.donations.unshift({id:Date.now(),name:$("foodName").value.trim(),type,quantity:$("foodQuantity").value.trim(),location:$("foodLocation").value.trim(),expiry:$("foodExpiry").value,urgency:$("foodUrgency").value,status:"Pending",emoji:emoji[type],recipient:"Awaiting match",created:"Just now"});
 FoodBridge.state.notifications.unshift({icon:"♧",title:"Donation published",body:"Your new donation was added to this demo session.",time:"Just now"});
 event.target.reset();$("donationModal").close();FoodBridge.state.page="donations";FoodBridge.render();FoodBridge.toast("Donation added to the demo workspace.");
});
