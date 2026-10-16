const roleLabels = { hotel: "Hotel · Food donor", ngo: "NGO · Food recipient", admin: "Administrator" };
const roleNavigation = {
  hotel: [
    ["overview", "▦", "Overview"],
    ["foods", "♧", "My food listings"],
    ["orders", "↗", "NGO requests"],
    ["profile", "♙", "My account"]
  ],
  ngo: [
    ["overview", "▦", "Overview"],
    ["foods", "⌕", "Browse food"],
    ["orders", "↗", "My orders"],
    ["profile", "♙", "My account"]
  ],
  admin: [
    ["overview", "▦", "Platform overview"],
    ["accounts", "♙", "Accounts"],
    ["foods", "♧", "Food listings"],
    ["orders", "↗", "Orders"]
  ]
};

const content = document.querySelector("#pageContent");
const pageName = document.querySelector("#pageName");
const sidebar = document.querySelector("#sidebar");
const navigation = document.querySelector("#mainNavigation");
let account;
let activePage = "overview";
let toastTimeout;
let refreshTimer;
let renderVersion = 0;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: { ...(options.headers || {}), ...(options.body ? { "Content-Type": "application/json" } : {}) }
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an unreadable response.");
  }
  if (response.status === 401) {
    window.location.replace("/login");
    const error = new Error(result.error || "Please sign in again.");
    error.status = 401;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(result.error || "The request could not be completed.");
    error.status = response.status;
    throw error;
  }
  return result;
}

function toast(message, isError = false) {
  const element = document.querySelector("#toast");
  element.textContent = message;
  element.classList.toggle("toast-error", isError);
  element.classList.add("show");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => element.classList.remove("show"), 3500);
}

function renderNavigation() {
  navigation.innerHTML = roleNavigation[account.role].map(([page, icon, label]) => `
    <button class="nav-item${page === activePage ? " active" : ""}" type="button" data-page="${page}">
      <span aria-hidden="true">${icon}</span>${label}
    </button>`).join("");
}

function titleFor(page) {
  const item = roleNavigation[account.role].find(([key]) => key === page);
  return item ? item[2] : "Overview";
}

function heading(title, subtitle, action = "") {
  return `<div class="page-title"><div><p class="eyebrow">${escapeHtml(roleLabels[account.role])}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div>${action}</div>`;
}

function statCard(label, value, note) {
  return `<article class="stat-card"><div class="stat-top">${escapeHtml(label)}</div><div class="stat-value">${escapeHtml(value)}</div><div class="stat-foot">${escapeHtml(note)}</div></article>`;
}

function emptyState(title, text) {
  return `<div class="empty-state"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></div>`;
}

function foodCard(food, canOrder) {
  const quantity = Number(food.available_quantity);
  return `<article class="food-card">
    <div class="food-card-top"><span class="food-category">${escapeHtml(food.category)}</span><span class="status ${escapeHtml(food.status)}">${escapeHtml(food.status)}</span></div>
    <h2>${escapeHtml(food.name)}</h2>
    <p class="food-description">${escapeHtml(food.description || "No additional details provided.")}</p>
    <div class="food-details">
      <div><small>Available</small><strong>${escapeHtml(food.available_quantity)} ${escapeHtml(food.unit)}</strong></div>
      <div><small>Best before</small><strong>${escapeHtml(food.best_before)}</strong></div>
      <div class="food-detail-wide"><small>Pickup</small><strong>${escapeHtml(food.pickup_address)}</strong></div>
      <div class="food-detail-wide"><small>Donor</small><strong>${escapeHtml(food.donor_name)}</strong></div>
    </div>
    ${canOrder ? `<form class="order-form" data-order-food="${food.id}">
      <div class="field"><label for="order-quantity-${food.id}">Quantity to request</label><input id="order-quantity-${food.id}" name="quantity" type="number" min="0.01" max="${quantity}" step="0.01" required></div>
      <div class="field"><label for="order-note-${food.id}">Message to donor <span class="field-hint">(optional)</span></label><textarea id="order-note-${food.id}" name="note" rows="2" maxlength="1000"></textarea></div>
      <button class="btn btn-primary" type="submit">Request this food</button>
    </form>` : ""}
  </article>`;
}

function orderCard(order, canManage) {
  const actions = canManage && order.status === "pending" ? `
    <div class="order-actions">
      <button class="btn btn-primary" data-order-status="accepted" data-order-id="${order.id}">Accept request</button>
      <button class="btn btn-outline" data-order-status="rejected" data-order-id="${order.id}">Decline</button>
    </div>` : "";
  return `<article class="order-card">
    <div class="order-card-heading"><div><h3>${escapeHtml(order.food_name)}</h3><p>${canManage ? `From ${escapeHtml(order.ngo_name)}` : `Donor: ${escapeHtml(order.hotel_name)}`}</p></div><span class="status ${escapeHtml(order.status)}">${escapeHtml(order.status)}</span></div>
    <p><strong>Requested:</strong> ${escapeHtml(order.quantity)} ${escapeHtml(order.unit)}</p>
    ${order.note ? `<p><strong>Message:</strong> ${escapeHtml(order.note)}</p>` : ""}
    <p class="muted"><time datetime="${escapeHtml(order.created_at)}">${escapeHtml(order.created_at)}</time></p>
    ${actions}
  </article>`;
}

function donationForm() {
  return `<section class="panel form-panel">
    <div class="panel-heading"><div><h2>Share surplus food</h2><p>Post a listing for registered NGO accounts to request.</p></div></div>
    <form id="foodForm" class="form-grid">
      <div class="field"><label for="food-name">Food name</label><input id="food-name" name="name" maxlength="180" required></div>
      <div class="field"><label for="food-category">Category</label><select id="food-category" name="category" required>
        <option value="">Choose a category</option><option>Fresh Produce</option><option>Cooked Meals</option><option>Bakery</option><option>Dairy</option><option>Packaged Food</option><option>Other</option>
      </select></div>
      <div class="field"><label for="food-quantity">Quantity</label><input id="food-quantity" name="quantity" type="number" min="0.01" step="0.01" max="999999" required></div>
      <div class="field"><label for="food-unit">Unit</label><input id="food-unit" name="unit" maxlength="32" placeholder="meals, kg, boxes" required></div>
      <div class="field"><label for="food-best-before">Best before</label><input id="food-best-before" name="best_before" type="date" required></div>
      <div class="field"><label for="food-pickup">Pickup address</label><input id="food-pickup" name="pickup_address" maxlength="500" required></div>
      <div class="field field-wide"><label for="food-description">Description / pickup instructions</label><textarea id="food-description" name="description" maxlength="2000" rows="3"></textarea></div>
      <div class="field field-wide"><button class="btn btn-primary" type="submit">Publish food listing</button></div>
    </form>
  </section>`;
}

async function showOverview() {
  if (account.role === "admin") {
    const summary = await api("/api/admin/summary");
    const counts = summary.counts;
    return `${heading("Platform overview", "Monitor FoodBridge accounts, food listings, and order activity.")}
      <div class="stats-grid">${statCard("Accounts", counts.accounts, `${counts.hotels} Hotels · ${counts.ngos} NGOs`)}${statCard("Food listings", counts.foods, `${counts.open_foods} available`)}${statCard("Order requests", counts.orders, `${counts.pending_orders} awaiting response`)}</div>
      <section class="panel">${panelHeading("Recent orders")}<div class="record-list">${summary.orders.slice(0, 5).map(order => orderCard(order, false)).join("") || emptyState("No orders yet", "Orders will appear when NGOs request listed food.")}</div></section>`;
  }
  if (account.role === "hotel") {
    const [foodResult, orderResult] = await Promise.all([api("/api/foods"), api("/api/orders")]);
    const available = foodResult.foods.filter(food => food.status === "available");
    const pending = orderResult.orders.filter(order => order.status === "pending");
    return `${heading("Welcome, " + account.name, "Share surplus food and respond to NGO requests.")}
      <div class="stats-grid">${statCard("Your listings", foodResult.foods.length, `${available.length} currently available`)}${statCard("NGO requests", orderResult.orders.length, `${pending.length} awaiting your response`)}</div>
      <section class="panel">${panelHeading("Latest NGO requests")}<div class="record-list">${orderResult.orders.slice(0, 3).map(order => orderCard(order, true)).join("") || emptyState("No requests yet", "When an NGO requests your food, it will appear here.")}</div></section>`;
  }
  const [foodResult, orderResult] = await Promise.all([api("/api/foods"), api("/api/orders")]);
  const pending = orderResult.orders.filter(order => order.status === "pending");
  return `${heading("Welcome, " + account.name, "Browse food shared by Hotels and manage your requests.")}
    <div class="stats-grid">${statCard("Available food listings", foodResult.foods.length, "Shared by registered Hotels")}${statCard("Your requests", orderResult.orders.length, `${pending.length} awaiting a Hotel response`)}</div>
    <section class="panel">${panelHeading("Recently available food")}<div class="food-grid">${foodResult.foods.slice(0, 3).map(food => foodCard(food, true)).join("") || emptyState("No food listings yet", "New Hotel listings will appear here when available.")}</div></section>`;
}

function panelHeading(title) {
  return `<div class="panel-heading"><div><h2>${escapeHtml(title)}</h2></div></div>`;
}

async function showFoods() {
  const result = await api("/api/foods");
  if (account.role === "hotel") {
    return `${heading("My food listings", "Publish surplus food and see which listings are still available.", '<button class="btn btn-primary" data-scroll-to="foodForm">＋ Add food</button>')}
      ${donationForm()}
      <section class="panel listing-panel">${panelHeading("Your listings")}<div class="food-grid">${result.foods.map(food => foodCard(food, false)).join("") || emptyState("No listings yet", "Add your first food listing using the form above.")}</div></section>`;
  }
  return `${heading("Browse available food", "Request the amount your organization can collect.")}
    <div class="food-grid">${result.foods.map(food => foodCard(food, true)).join("") || `<section class="panel">${emptyState("No food currently available", "Check again later for new Hotel listings.")}</section>`}</div>`;
}

async function showOrders() {
  const result = await api("/api/orders");
  const canManage = account.role === "hotel";
  return `${heading(canManage ? "NGO requests" : "My food requests", canManage ? "Review requests from NGOs for your listings." : "Track your requests and responses from Hotels.")}
    <div class="record-list">${result.orders.map(order => orderCard(order, canManage)).join("") || `<section class="panel">${emptyState(canManage ? "No requests yet" : "No orders yet", canManage ? "NGO requests for your listings will appear here." : "Browse food listings and request what your organization needs.")}</section>`}</div>`;
}

async function showAdminPage(page) {
  const result = await api("/api/admin/summary");
  if (page === "accounts") {
    return `${heading("Accounts", "Registered Hotels, NGOs, and administrators.")}
      <section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Organization</th><th>Email</th><th>Account type</th><th>Joined</th></tr></thead><tbody>${result.accounts.map(item => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.email)}</td><td>${escapeHtml(item.role)}</td><td>${escapeHtml(item.created_at)}</td></tr>`).join("") || `<tr><td colspan="4">No accounts yet.</td></tr>`}</tbody></table></div></section>`;
  }
  if (page === "foods") {
    return `${heading("Food listings", "Monitor all food published on the platform.")}
      <div class="food-grid">${result.foods.map(food => foodCard(food, false)).join("") || `<section class="panel">${emptyState("No food listings yet", "Hotel listings will appear here.")}</section>`}</div>`;
  }
  return `${heading("All orders", "Monitor food requests between Hotels and NGOs.")}
    <div class="record-list">${result.orders.map(order => orderCard(order, false)).join("") || `<section class="panel">${emptyState("No orders yet", "NGO order requests will appear here.")}</section>`}</div>`;
}

async function showProfile() {
  return `${heading("My account", "Your FoodBridge account details.")}
    <section class="panel profile-cover"><div class="avatar">${escapeHtml(account.name.slice(0, 1).toUpperCase())}</div><h2>${escapeHtml(account.name)}</h2><p>${escapeHtml(account.email)}</p><span class="status">${escapeHtml(roleLabels[account.role])}</span></section>`;
}

async function render(page = activePage) {
  activePage = page;
  const currentRender = ++renderVersion;
  window.clearInterval(refreshTimer);
  pageName.textContent = titleFor(page);
  renderNavigation();
  content.innerHTML = '<section class="panel empty-state"><p>Loading your FoodBridge account…</p></section>';
  try {
    let view;
    if (account.role === "admin" && page !== "overview") {
      view = await showAdminPage(page);
    } else if (page === "overview") {
      view = await showOverview();
    } else if (page === "foods") {
      view = await showFoods();
    } else if (page === "orders" && account.role !== "admin") {
      view = await showOrders();
    } else if (page === "profile" && account.role !== "admin") {
      view = await showProfile();
    } else {
      view = await showOverview();
    }
    if (currentRender !== renderVersion) return;
    content.innerHTML = view;
  } catch (error) {
    if (currentRender !== renderVersion) return;
    content.innerHTML = `<section class="panel empty-state"><h3>We couldn't load this page</h3><p>${escapeHtml(error.message)}</p><button class="btn btn-outline" data-retry>Try again</button></section>`;
  }
  const refreshablePages = account.role === "admin"
    ? ["overview", "accounts", "foods", "orders"]
    : account.role === "ngo"
      ? ["overview", "foods", "orders"]
      : ["overview", "orders"];
  if (refreshablePages.includes(page)) {
    refreshTimer = window.setInterval(() => {
      if (!document.hidden && activePage === page) render(page);
    }, 30000);
  }
  sidebar.classList.remove("open");
}

document.addEventListener("click", async event => {
  const pageButton = event.target.closest("[data-page]");
  if (pageButton) {
    await render(pageButton.dataset.page);
    return;
  }
  const orderButton = event.target.closest("[data-order-status]");
  if (orderButton) {
    orderButton.disabled = true;
    try {
      await api(`/api/orders/${orderButton.dataset.orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: orderButton.dataset.orderStatus })
      });
      toast(`Request ${orderButton.dataset.orderStatus}.`);
      await render(activePage);
    } catch (error) {
      toast(error.message, true);
      orderButton.disabled = false;
    }
    return;
  }
  if (event.target.closest("[data-retry]")) {
    if (!account) {
      await start();
      return;
    }
    await render(activePage);
    return;
  }
  const scrollButton = event.target.closest("[data-scroll-to]");
  if (scrollButton) document.getElementById(scrollButton.dataset.scrollTo)?.scrollIntoView({ behavior: "smooth" });
});

document.addEventListener("submit", async event => {
  const form = event.target;
  if (form.id === "foodForm") {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await api("/api/foods", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      toast("Food listing published. NGOs can now see it.");
      await render("foods");
    } catch (error) {
      toast(error.message, true);
      button.disabled = false;
    }
  } else if (form.matches("[data-order-food]")) {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    const fields = new FormData(form);
    try {
      await api(`/api/foods/${form.dataset.orderFood}/orders`, {
        method: "POST",
        body: JSON.stringify({ quantity: fields.get("quantity"), note: fields.get("note") })
      });
      toast("Request sent to the Hotel.");
      await render(activePage);
    } catch (error) {
      toast(error.message, true);
      button.disabled = false;
    }
  }
});

document.querySelector("#menuToggle").addEventListener("click", () => sidebar.classList.toggle("open"));
document.querySelector("#logoutButton").addEventListener("click", async () => {
  try {
    await api("/api/logout", { method: "POST" });
    window.location.replace("/");
  } catch (error) {
    toast(error.message, true);
  }
});

async function start() {
  try {
    const result = await api("/api/me");
    account = result.account;
    if (!roleNavigation[account.role]) {
      await api("/api/logout", { method: "POST" });
      window.location.replace("/login");
      return;
    }
    if (account.role === "admin") {
      document.title = "Admin panel | FoodBridge";
      document.querySelector(".brand small").textContent = "ADMINISTRATION";
    }
    document.querySelector("#userName").textContent = account.name;
    document.querySelector("#userRole").textContent = roleLabels[account.role];
    document.querySelector("#userAvatar").textContent = account.name.slice(0, 1).toUpperCase();
    document.querySelector("#topUserName").textContent = account.name;
    document.querySelector("#topUserRole").textContent = roleLabels[account.role];
    await render("overview");
  } catch (error) {
    if (error.status === 401) {
      window.location.replace("/login");
      return;
    }
    content.innerHTML = `<section class="panel empty-state"><h3>FoodBridge is temporarily unavailable</h3><p>${escapeHtml(error.message)}</p><button class="btn btn-outline" data-retry>Try again</button></section>`;
  }
}

start();
