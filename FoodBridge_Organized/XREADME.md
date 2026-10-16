# XREADME — Code Change Log

Use this file to document application-code changes in `FoodBridge_Organized`.

## Required workflow

1. **Before editing code**, add a dated entry describing what will change, how it will be changed, and the expected effect.
2. Then make the code change.
3. Update that same entry with what was actually changed, the outcome, and the checks or tests run (including failures or checks not run).
4. Keep entries in reverse chronological order. Use the local date and time with timezone.

Do not mark a change complete before recording its outcome and verification. For documentation-only changes, record an entry when they are part of a code-change task or materially change project guidance.

## Entries

### 2026-10-16 19:50 IST — Prepare a GitHub-ready project and phone-accessible Python server

- **Planned change:** Clarify the repository entry point and project structure, add a separate run guide, and provide a simple Python launcher that can serve the existing single-site Flask app to phones on the same Wi-Fi. Improve Git ignore rules for local secrets and generated files. Preserve routes, account workflows, desktop/mobile UI, and presentation.
- **Approach:** Keep the existing Flask `templates/`, `static/`, `database/`, and `tests/` layout intact; add an environment-configurable Python runner and update `start.sh` to use it without enabling Flask debug mode. Update the root and application README files with setup, LAN access, GitHub collaboration, and safe sharing instructions.
- **Expected effect:** Contributors can clone and run the project without choosing an HTML file; users can open the same web app from a phone using the host computer's LAN address, without exposing debug mode or changing application behavior.
- **Outcome:** Added `run.py` with configurable host/port and debug mode off; updated `start.sh` to check MySQL then launch the Python runner; added detailed Linux/macOS and Windows setup plus same-Wi-Fi phone instructions in `RUNNING.md`; updated both repository entry-point docs and added GitHub collaboration guidance; expanded `.gitignore` for private environment files and generated Python/test files. The existing Flask template/static structure and routes were retained.
- **Verification:** Shell syntax validation, Python compilation, and `git diff --check` passed. Seven application tests passed; the MySQL integration test was skipped because no disposable test database is configured. Pylance found no syntax errors in `run.py`. Started the Python runner with `FOODBRIDGE_HOST=0.0.0.0` and `FOODBRIDGE_PORT=5018`; logs confirmed debug mode off and listening on all addresses. HTTP smoke tests returned 200 for `/`, `/login`, and `/static/js/portal.js`, and 401 for protected `/api/me` without a session. Verified `.env`, `.venv`, `__pycache__`, and bytecode are ignored while `.env.example` remains trackable. No live MySQL or phone-on-physical-Wi-Fi test was possible here.

### 2026-10-16 19:39 IST — Compact the authenticated workspace on phones

- **Planned change:** Reduce oversized spacing, controls, and type in the signed-in Hotel and NGO workspace on phone-sized screens only. Preserve tablet/desktop styling and desktop layout.
- **Approach:** Add narrowly scoped dashboard overrides at the existing phone breakpoint in `static/css/style.css`, including a sidebar width that fits narrow screens. Verify both roles' overview, food, and order screens at phone widths, check mobile navigation, and compare desktop computed styles before and after.
- **Expected effect:** The signed-in workspace should use phone space more efficiently and avoid oversized panels or clipped side navigation, without changing desktop appearance.
- **Outcome:** Added phone-only dashboard styling for a shorter header, tighter page headings/cards/forms, smaller controls and text, and a sidebar width constrained to the phone viewport. Desktop and wider tablet rules were left unchanged.
- **Verification:** Rendered Hotel and NGO overview, food, order, and account pages with representative data at phone width. Each role's mobile menu opened, navigated, and closed; document and page-content widths did not exceed the viewport. The mobile page heading uses 20px text and the top bar is 58px. At desktop width, the existing 225px sidebar and 80px top bar remain unchanged; the phone-only rules do not apply. The compact NGO browse screen was visually checked in the browser. MySQL-backed interactions were not retested because this change only affects CSS.

### 2026-10-16 19:31 IST — Restore workspace retry after API startup errors

- **Planned change:** Make the workspace's startup error retry action re-run account/session initialization instead of trying to render a page before an account has loaded. Validate the HTML/CSS/JavaScript asset wiring.
- **Approach:** Distinguish startup retries from page-data retries in the workspace click handler, preserving the existing page retry behavior after initialization. Inspect the template links and CSS import chain, run focused Python tests, check JavaScript through browser execution, and simulate recovery after a failed startup API request.
- **Expected effect:** If the initial `/api/me` request fails temporarily, users can recover from the workspace retry button without a JavaScript exception.
- **Outcome:** Updated the workspace retry handler so a failed initial `/api/me` request restarts account/session initialization; retries after the workspace has loaded still re-render the active page.
- **Verification:** Python unit tests passed (7 passed; the MySQL integration test was skipped because `FOODBRIDGE_TEST_DB_NAME` is not configured). Pylance reported no diagnostics for `app.py`. Browser validation loaded `/`, `/login`, `/signup`, and `/admin`; their local CSS, JS, image assets and all five CSS imports returned HTTP 200. Hotel login, NGO registration, and admin login forms submitted the expected JSON payloads to their respective API endpoints in a mocked browser session, with no JavaScript page errors. Simulated an initial `/api/me` 503 followed by a successful response: the retry called `/api/me` again and loaded the Hotel overview. No live database-backed registration/order flow was run.

### 2026-10-16 12:43 IST — Unify the public website and organize Flask pages/assets

- **Planned change:** Make one public FoodBridge homepage the starting point for visitors, with direct Hotel/NGO registration and sign-in plus a separate admin sign-in. Keep role-based workspace screens behind authentication. Organize HTML templates and static assets into conventional Flask folders.
- **Approach:** Move HTML into `templates/` and frontend CSS/JS/images into `static/`; update Flask to render templates and serve static assets through Flask's static route. Change `/` into the landing page and use `/app` for the authenticated portal; update all links, redirects, tests, and setup instructions.
- **Expected effect:** People can open one website URL and choose the right account workflow without browsing source folders; staff and administrators still get their own account-specific tools within the same site. The source tree will be easier to understand and serve.
- **Outcome:** Added the public homepage at `/` with Hotel and NGO join cards, common sign-in links, and a separate admin sign-in link. The account cards preselect the correct role. Moved HTML into `templates/` and CSS/JS/images into `static/`; `/app` now serves the authenticated workspace. Added an executable `start.sh` that prepares the Python environment when needed, checks MySQL connectivity, and starts the site. Updated setup and project structure documentation.
- **Verification:** Eight unittest tests passed; one optional MySQL integration test was skipped because no disposable test database was configured. Python compilation, Pylance diagnostics, and `git diff --check` passed. Browser checks confirmed the homepage renders, Hotel and NGO links preselect their account roles, sign-in and admin sign-in are reachable, static assets load, and unauthenticated `/app` requests redirect to `/login`. `start.sh` is executable, and `.env`/`.venv` remain ignored.

### 2026-10-16 12:33 IST — Test all workflows and fix sidebar overflow

- **Planned change:** Exercise public signup/login, Hotel listing and order flows, NGO browse/request flows, Admin views, and sign-out using random temporary values only. Fix any directly observed UI issue that blocks those functions.
- **Approach:** Use a local in-memory mock API, not the configured Flask/MySQL API, then test the responsive app in browser. During testing the sidebar's 729px content overflowed a 600px-high viewport and placed sign-out below the visible screen; add vertical sidebar scrolling and retest.
- **Expected effect:** Verify interaction flows without writing test records to the database, and make all sidebar navigation including sign-out reachable on short/mobile viewports.
- **Outcome:** Added vertical scrolling to the sidebar. Used a temporary local mock API with in-memory state only to exercise Hotel and NGO registration/login, Hotel food listing creation, NGO listing visibility and order requests, Hotel accept and decline actions, Hotel/NGO profile and dashboard views, Admin overview/accounts/food/orders, and sign-out. No test values were sent to MySQL or saved to files.
- **Verification:** Browser checks passed with no JavaScript runtime errors. On a 467×333 CSS viewport, the sidebar scrolled and sign-out remained reachable and worked. Public sign-up offered only Hotel and NGO. Flask/MySQL-backed persistence was deliberately not tested because the database credentials are unavailable; temporary API server was stopped after testing.

### 2026-10-16 12:11 IST — Build authenticated Hotel, NGO, and Admin workflows

- **Planned change:** Turn the empty frontend into a working application with separate Hotel (food donor) and NGO (food recipient) sign-up/sign-in, persisted shared food listings, NGO order requests, and an admin monitoring panel. Do not expose admin registration or an admin role choice in public authentication.
- **Approach:** Add a Flask/MySQL backend consistent with the repository's stated technology stack; use password hashing, server-side sessions, role checks, input validation, and environment-based DB/admin configuration. Serve the existing frontend through Flask, replace placeholder views with role-aware forms and pages backed by API requests, and document setup and secure admin provisioning. Admin access will be through a separate protected route.
- **Expected effect:** Two independently authenticated user accounts can work with the same persistent food listings; Hotels can publish food, NGOs can browse and request it, and an authorized admin can monitor accounts, listings, and orders. No seeded demo accounts or records will be created.
- **Outcome:** Implemented Hotel/NGO sign-up and sign-in, hashed passwords and server-side sessions, role-protected Flask APIs, MySQL tables for accounts/food/orders, Hotel listing and order approval pages, NGO browse/request/order pages, and a separate CLI-provisioned admin login and monitoring panel. NGO listings and active workspaces refresh every 30 seconds. No demo accounts or records were added.
- **Verification:** Six unit tests passed; the isolated MySQL workflow test was skipped because `FOODBRIDGE_TEST_DB_NAME` was not configured. Python compilation and `git diff --check` passed, and the Flask route map and admin provisioning CLI were verified. Browser checks confirmed public signup only offers Hotel and NGO, the separate admin sign-in has no signup link, and unauthenticated workspace visits redirect to sign-in without JavaScript errors. A valid signup request returned the explicit database-unavailable response: while MySQL responds to ping, this environment does not have credentials/permissions to create an isolated test database, so database-backed account-to-order integration remains unverified here. The local app also needs a configured MySQL database and `.env` before registration can complete.

### 2026-10-16 11:53 IST — Remove demo users, records, and simulated frontend behavior

- **Planned change:** Remove tester/demo identities, seeded donation/match/notification records, role switching, hard-coded demo metrics, and client-side actions that pretend to save or submit data. Keep the user-facing screens and navigation ready for backend integration.
- **Approach:** Remove the demo data module and demo-only controls; replace data-driven pages with honest empty states; retain navigation and responsive UI; remove forms/actions that cannot yet submit to a backend; update the project README to describe the backend-ready frontend accurately.
- **Expected effect:** The frontend will no longer display fake people, records, metrics, or simulated successes. Users can navigate the existing screens and see empty states until real backend endpoints are connected.
- **Outcome:** Removed hard-coded identities, counts, sample records, role switching, and demo-only UI actions. Replaced data-driven screens with empty states, retained page navigation, removed the client-side donation form workflow, and updated the frontend documentation. The admin screen now explicitly requires server-side authorization.
- **Verification:** `git diff --check` passed. Opened `index.html` in the browser and navigated all seven screens; headings rendered correctly with no JavaScript runtime errors or visible demo identity text. `node --check` could not run because Node.js is not installed in the environment.

### 2026-10-16 11:51 IST — Establish change-log workflow

- **Planned change:** Create this file and link it from the frontend README.
- **Approach:** Define a before/after entry workflow so future code edits have a timestamped plan, expected effect, outcome, and verification record.
- **Expected effect:** Changes to the frontend code will have a clear, chronological audit trail, with the intended behavior documented before implementation.
- **Outcome:** Created this log and added a reference to it in `README.md`. No application code was changed.
- **Verification:** Confirmed the repository worktree was clean before this documentation update; reviewed the existing frontend README and repository layout.
