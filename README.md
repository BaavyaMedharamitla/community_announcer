# Community Announcer — Internship Submission

A React + Node/Express + SQLite + Nodemailer community announcement application.

## What the application does

- Shows a short guide explaining the workflow.
- Creates and manages private email groups.
- Adds, edits and removes members.
- Lets an administrator compose an announcement for one selected group.
- Supports `{{name}}` personalization.
- Sends emails individually through SMTP so recipients do not see the rest of the group.
- Stores announcements and delivery results in SQLite.
- Provides searchable announcement history.
- Includes a Gmail-inspired light/dark interface and responsive layout.

## Stack

- React 18 + Vite
- Node.js + Express
- SQLite via better-sqlite3
- Nodemailer for SMTP email delivery
- SQL schema in `database/schema.sql`
- Lucide React icons

## Run locally

Use Node.js 18+ (Node 22 is supported).

From the project root:

```bash
npm run install:all
npm run dev
```

Then open:

```text
http://localhost:5173
```

The API runs on:

```text
http://localhost:4000
```

### If port 4000 is already in use

Windows:

```bash
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

Or set a different `PORT` in `server/.env`.

## Real email setup

Copy `server/.env.example` to `server/.env` and add SMTP credentials.

Example:

```env
PORT=4000
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-user
SMTP_PASS=your-password
MAIL_FROM=Community Announcer <your-user@example.com>
```

The UI will only enable real sending when the API reports that SMTP is configured and reachable.

## Database

The SQLite file is created automatically at:

```text
database/community.db
```

The SQL schema is also included in `database/schema.sql`.

## Important behavior

This is an admin-side announcement tool, not a group chat. Members are private recipients. They do not need to log in, and each email is delivered individually.

### Demo mode
If SMTP is not configured or the API is unavailable, the deployed UI automatically switches to **Demo mode**. The Send action records the complete announcement workflow and recipient processing in the browser's local storage, but it does not claim that a real email was delivered. Real email delivery becomes active automatically when the Node API is connected and SMTP is configured and reachable.
