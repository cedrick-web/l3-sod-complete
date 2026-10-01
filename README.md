# L3 SOD Project

## Requirements
- Node.js installed
- XAMPP installed, with MySQL started
- VS Code or another editor

## Setup
1. In phpMyAdmin, open the Import tab and import `database/database.sql`.
   This creates `l3_sod_project`, the `users` and `projects` tables, and the four required projects.
2. Open this folder in VS Code.
3. Open the terminal in this folder and run:
   `npm install`
4. Start the server:
   `npm start`
5. Open `http://localhost:3001/register` and create an account.
6. Log in at `http://localhost:3001/login`. A successful login opens the dashboard.

## Database settings
The default connection is host `localhost`, user `root`, blank password, database `l3_sod_project`.
If your MySQL root account has a password, set DB_PASSWORD before starting the server in PowerShell:
`$env:DB_PASSWORD="your_mysql_password"`
Then run `npm start`.

## Notes
- `/`, `/about`, `/dashboard`, and dashboard APIs require a logged-in session.
- `/login` and `/register` are public.
- Passwords are hashed with bcrypt before they are stored.
- The dashboard reads registered users and projects from MySQL.
- The sidebar starts hidden and opens/closes with the menu button.
- Port 3001 is used to avoid conflict with another local project.
- The default Express session store is in memory and is suitable for a small classroom demonstration, not production deployment.
