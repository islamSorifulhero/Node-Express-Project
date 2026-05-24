# REST API built with Node.js, Express.js, TypeScript, PostgreSQL, and Raw SQL.

A collaborative platform for software teams to report bugs, suggest features, and coordinate resolutions.

**Live URL:** https://node-express-project-ruddy.vercel.app
**GitHub:** https://github.com/islamSorifulhero/Node-Express-Project
**Video:** https://docs.google.com/document/d/1QKFsTDS5ReGpP4b46rwYZjUYvcvPhYNDhm9ejC9cbTI/edit?usp=sharing

---

## Features

- JWT authentication with role-based access control (`contributor` / `maintainer`)
- Create, view, update, and delete issues (bugs & feature requests)
- Filter issues by type and status; sort by newest or oldest
- Passwords hashed with bcrypt — never exposed in responses
- Raw SQL via `pg` pool — no ORMs or query builders
- Modular Express architecture with TypeScript strict mode

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js 24 LTS | Runtime |
| TypeScript 5 | Type safety |
| Express.js | HTTP framework |
| PostgreSQL | Relational database |
| `pg` (native driver) | Direct pool queries |
| bcrypt | Password hashing |
| jsonwebtoken | JWT auth |
| http-status-codes | Consistent status codes |

---

## Local Setup

### 1. Clone & install

```bash
git clone https://github.com/islamSorifulhero/Node-Express-Project
cd devpulse
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/devpulse
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=10
NODE_ENV=development
```

### 3. Initialise database

Run `src/config/schema.sql` against your PostgreSQL instance:

```bash
psql $DATABASE_URL -f src/config/schema.sql
```

### 4. Start the server

```bash
# Development (ts-node)
npm run dev

# Production build
npm run build
npm start
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login and receive JWT |

### Issues

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/issues` | Public | List all issues (filterable) |
| GET | `/api/issues/:id` | Public | Get single issue |
| POST | `/api/issues` | Authenticated | Create a new issue |
| PATCH | `/api/issues/:id` | Authenticated | Update an issue |
| DELETE | `/api/issues/:id` | Maintainer | Delete an issue |

#### Query parameters for `GET /api/issues`

| Param | Values | Default |
|---|---|---|
| `sort` | `newest`, `oldest` | `newest` |
| `type` | `bug`, `feature_request` | — |
| `status` | `open`, `in_progress`, `resolved` | — |

#### Authorization header format

```
Authorization: <JWT_TOKEN>
```

---

## Database Schema

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | Auto-increment |
| `name` | VARCHAR(255) | Required |
| `email` | VARCHAR(255) | Unique, required |
| `password` | TEXT | Bcrypt hash, never returned |
| `role` | VARCHAR(20) | `contributor` \| `maintainer`, default `contributor` |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

### `issues`

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | Auto-increment |
| `title` | VARCHAR(150) | Required |
| `description` | TEXT | Min 20 chars |
| `type` | VARCHAR(20) | `bug` \| `feature_request` |
| `status` | VARCHAR(20) | `open` \| `in_progress` \| `resolved`, default `open` |
| `reporter_id` | INTEGER | FK to users (app-level validation) |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

---

## Deployment

### NeonDB (recommended)

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string to `DATABASE_URL`
3. Run `schema.sql` via the Neon SQL editor

### Vercel

```bash
npm i -g vercel
npm run build
vercel --prod
```

Set environment variables in the Vercel dashboard under **Settings → Environment Variables**.

---

## Project Structure

```
src/
├── config/
│   ├── database.ts        # pg Pool instance
│   └── schema.sql         # DB initialisation script
├── middleware/
│   ├── auth.ts            # JWT authenticate + requireRole guards
│   └── errorHandler.ts    # Global error & 404 handlers
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   └── auth.routes.ts
│   └── issues/
│       ├── issues.controller.ts
│       └── issues.routes.ts
├── types/
│   └── express.d.ts       # req.user augmentation
├── utils/
│   ├── db.ts              # query / queryOne / queryMany helpers
│   ├── jwt.ts             # signToken / verifyToken
│   ├── response.ts        # sendSuccess / sendError helpers
│   └── validation.ts      # Input validation functions
├── app.ts                 # Express app setup
└── index.ts               # Server entry point
```
