async function submitAuth(form, endpoint, values) {
  const message = document.querySelector("#formMessage");
  const button = form.querySelector('button[type="submit"]');
  message.textContent = "";
  button.disabled = true;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to complete sign in.");
    window.location.assign("/app");
  } catch (error) {
    message.textContent = error.message || "The server could not be reached. Please try again.";
  } finally {
    button.disabled = false;
  }
}

const signupForm = document.querySelector("#signupForm");
if (signupForm) {
  const requestedRole = new URLSearchParams(window.location.search).get("role");
  if (requestedRole === "hotel" || requestedRole === "ngo") {
    document.querySelector("#role").value = requestedRole;
  }
  signupForm.addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(signupForm);
    submitAuth(signupForm, "/api/register", {
      name: form.get("name"),
      role: form.get("role"),
      email: form.get("email"),
      password: form.get("password")
    });
  });
}

const loginForm = document.querySelector("#loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(loginForm);
    submitAuth(loginForm, "/api/login", {
      email: form.get("email"),
      password: form.get("password")
    });
  });
}

const adminLoginForm = document.querySelector("#adminLoginForm");
if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(adminLoginForm);
    submitAuth(adminLoginForm, "/api/admin/login", {
      email: form.get("email"),
      password: form.get("password")
    });
  });
}
