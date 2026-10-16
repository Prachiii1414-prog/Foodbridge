# FoodBridge

FoodBridge connects Hotels with surplus food to NGOs serving their communities. One Flask website provides the public landing page, sign-in and registration, and the role-specific workspace. Users do not need to open or select an HTML file manually.

## Features

- Hotel and NGO registration and sign-in
- Shared, MySQL-backed food listings
- NGO food requests and Hotel accept/decline actions
- A separately provisioned administrator account and protected monitoring panel
- Responsive pages for desktop and mobile browsers

## Technology

- HTML, CSS, and JavaScript
- Python 3 and Flask
- MySQL 8

## Run and test

Start with the [run and mobile access guide](./FoodBridge_Organized/RUNNING.md) for installation, database setup, local use, and phone access over Wi-Fi.

The application lives in [`FoodBridge_Organized/`](./FoodBridge_Organized/). Its [README](./FoodBridge_Organized/README.md) describes the current workflows and tests.

## Collaborating through GitHub

Accept the invitation to the collaborator's repository while signed into the GitHub account they invited. Clone that repository and check the `origin` remote before making a branch:

```sh
git clone <collaborator-repository-url>
cd <repository-folder>
git remote -v
git switch -c feature/foodbridge
```

If you already cloned the project, `git remote -v` should show the collaborator's repository as `origin`. If you do not have push permission, ask the repository owner to grant it; do not push directly to their `main` branch.

After making and checking your changes:

```sh
git status --short
git add -A
git diff --cached --check
git commit -m "Prepare FoodBridge for local and mobile testing"
git push -u origin feature/foodbridge
```

Then open a pull request on the collaborator's repository. Do not commit `.env`, database passwords, secret keys, or virtual environments. The repository ignores `.env` and `.venv/`; keep `.env.example` as the shareable configuration template.

## Not implemented

Email verification, password recovery, food image uploads, delivery tracking, automatic matching, and email notifications are future work.
