# Brandbae — India's Creator Marketplace

**Live:** [brandbae.co.in](https://www.brandbae.co.in)

A platform for Indian brands to discover and connect with Instagram creators. Brands browse verified creator profiles; creators apply to be listed.

---

## Tech Stack

- **Backend:** Node.js, Express
- **Database:** PostgreSQL (via `pg`)
- **Auth:** JWT + bcrypt, cookie-based sessions
- **Frontend:** Vanilla HTML/CSS/JS (no framework)

---

## Project Structure

```
brandbae/
├── public/                    # All static files served by Express
│   ├── assets/images/         # Niche cover images (.webp)
│   ├── css/
│   │   ├── base.css           # Variables, reset, typography
│   │   ├── components.css     # Nav, buttons, modals
│   │   ├── landing.css        # Landing page only
│   │   ├── marketplace.css    # Marketplace page only
│   │   ├── join.css           # Creator signup only
│   │   └── admin.css          # Admin panel only
│   ├── js/
│   │   ├── main.js            # Scroll reveal, nav, landing page logic
│   │   └── marketplace.js     # Filters, sorting, unlock modal
│   ├── index.html
│   ├── marketplace.html
│   ├── join.html
│   ├── admin.html
│   ├── creator-dashboard.html
│   └── login-creator.html
│
├── routes/
│   ├── auth.js                # Register, login, logout, /auth/me
│   ├── creators.js            # GET /api/creators, GET /api/creator/me
│   └── leads.js               # POST/GET /api/leads, CSV export
│
├── db/
│   ├── pool.js                # pg connection pool + initDB()
│   └── migrations/            # SQL migration files
│
├── server.js                  # Express entry point, admin routes
├── seed.js                    # Seed creator data
├── seed-admin.js              # Create admin user
└── .env
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or hosted — e.g. Neon, Supabase, Railway)

### Setup

```bash
# Install dependencies
npm install

# Create .env from the example
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET

# Start the server
npm start
```

Server runs at `http://localhost:3000`.

### Environment Variables

| Variable       | Description                              |
|----------------|------------------------------------------|
| `DATABASE_URL` | PostgreSQL connection string             |
| `JWT_SECRET`   | Secret key for signing JWTs             |
| `PORT`         | Server port (default: 3000)             |

---

## Key Routes

### Pages

| Route                | File                      |
|----------------------|---------------------------|
| `/`                  | Landing page              |
| `/marketplace`       | Browse creators           |
| `/join`              | Creator application form  |
| `/login/creator`     | Creator login             |
| `/creator/dashboard` | Creator dashboard         |
| `/admin`             | Admin panel               |

### API

| Method | Route                           | Description                        |
|--------|---------------------------------|------------------------------------|
| GET    | `/api/creators`                 | List all approved creators         |
| GET    | `/api/creator/me`               | Authenticated creator's profile    |
| POST   | `/api/leads`                    | Save a brand lead (unlock flow)    |
| GET    | `/api/leads`                    | List all leads                     |
| GET    | `/api/leads/export`             | Download leads as CSV              |
| POST   | `/auth/creator/register`        | Creator application + account      |
| POST   | `/auth/creator/login`           | Creator login                      |
| POST   | `/auth/admin/login`             | Admin login                        |
| POST   | `/auth/logout`                  | Clear session cookie               |
| GET    | `/auth/me`                      | Current user info                  |
| GET    | `/api/admin/applications`       | List all creator applications      |
| PATCH  | `/api/admin/applications/:id`   | Approve or reject an application   |

---

## Database Tables

- **`leads`** — brands who clicked unlock (name, phone, city)
- **`creators`** — approved creators shown in the marketplace
- **`users`** — auth accounts (brand / creator / admin)
- **`creator_applications`** — pending/approved/rejected creator signups

Tables are created automatically on first run via `initDB()` in `db/pool.js`.

---

## Scripts

```bash
npm run seed          # Seed marketplace with sample creators
npm run seed:admin    # Create the admin user (run once)
```

---

## Creator Approval Flow

1. Creator submits application via `/join`
2. Account created with `status = pending`
3. Admin reviews at `/admin`
4. On approval → creator row inserted into `creators` table and appears in marketplace
5. Creator can now log in at `/login/creator`
