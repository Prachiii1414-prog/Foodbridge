# FoodBridge — Organized Frontend

A student project frontend for **FoodBridge: Intelligent Surplus Food Redistribution and Donor–Recipient Matching System**.

## Project structure
- `index.html`: application shell, navigation, and reusable modal forms
- `pages/`: reserved for standalone pages if required
- `assets/images/`: local logo assets
- `css/`: base imports, layout, reusable components, dashboard polish, responsive rules
- `js/`: navigation, donation handling, matching, tracking, notifications, and main app renderer
- `data/demo-data.js`: sample records separated from application logic

## Run locally
1. Open the `FoodBridge_Organized` folder in VS Code.
2. Open `index.html` in a browser, or run it using VS Code Live Server.
3. Use **Switch Demo Role** to preview Donor, Recipient, and Admin.
4. Add a donation to test the donation form, table, dashboard counters, and tracking timeline.

No XAMPP is required for this frontend prototype.

## Important
This is an interactive frontend demo. It stores changes only in browser memory, so refreshing the page resets them. Login, authorization, persistent database storage, real distance calculations, and real notifications are not implemented yet.

## Suggested Flask API integration
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/donations`
- `POST /api/donations`
- `GET /api/matches`
- `POST /api/requests`
- `GET /api/tracking`
- `GET /api/notifications`
- `GET /api/admin/summary`

Enforce permissions and validate data in Flask. Frontend role switching is for demonstration only and is not authentication. The match scores are illustrative; connect your actual matching algorithm to the API.
