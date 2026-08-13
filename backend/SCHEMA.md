# Geberew Market — Database Schema & Setup Guide

**Author:** Surafel Muhabaw  
**Task:** Task 1 — Core Data Model & Schema Design  
**Status:** ✅ Complete & migrated — 2 migrations applied, database live on `localhost:5433`  
**Last Updated:** August 13, 2026  

> **Visual reference:** open [`SCHEMA_REFERENCE.html`](./SCHEMA_REFERENCE.html) in your browser
> for the interactive ERD, RLS matrix, and geo-point map.

---

## Table of Contents

1. [Prerequisites — what you need installed](#1-prerequisites)
2. [Docker — full setup guide](#2-docker-setup)
3. [Database setup — migrations & seed](#3-database-setup)
4. [Verifying everything works](#4-verification)
5. [Database details](#5-database-details)
6. [Enums](#6-enums)
7. [Tables (all 7)](#7-tables)
8. [Row Level Security (RLS)](#8-row-level-security)
9. [Relationships](#9-relationships)
10. [Migration history](#10-migration-history)
11. [Troubleshooting](#11-troubleshooting)
12. [Who owns what](#12-who-owns-what)

---

## 1. Prerequisites

Before you touch anything, make sure you have all of these installed:

| Tool | Purpose | How to check |
|---|---|---|
| **Docker Desktop** | Runs the PostgreSQL database | `docker --version` |
| **Node.js** (v18+) | Runs Prisma and the backend | `node --version` |
| **npm** | Package manager | `npm --version` |

### Installing Docker Desktop (if not installed)

1. Go to **https://www.docker.com/products/docker-desktop**
2. Download the installer for your OS (Windows / Mac / Linux)
3. Run the installer — accept all defaults
4. After install, launch **Docker Desktop** from your Start Menu / Applications
5. Wait for the whale icon in your taskbar to show **"Engine running"** (green)
6. Verify it works:
   ```bash
   docker --version
   # Docker version 24.x.x or higher
   
   docker compose version
   # Docker Compose version v2.x.x
   ```

> **Windows users:** Docker Desktop requires WSL 2 (Windows Subsystem for Linux).
> If Docker asks you to install WSL 2 during setup, follow its instructions — it is automatic.

### Installing Node.js (if not installed)

1. Go to **https://nodejs.org**
2. Download the **LTS version** (v20 or v22)
3. Run the installer
4. Verify:
   ```bash
   node --version   # v20.x.x or higher
   npm --version    # 10.x.x or higher
   ```

---

## 2. Docker Setup

### What Docker does here

Docker runs a **PostgreSQL 15 database with the PostGIS extension** inside an isolated container on your machine. You do not need to install PostgreSQL separately — Docker handles everything.

The database container is defined in [`docker-compose.yml`](./docker-compose.yml):

```yaml
services:
  db:
    image: postgis/postgis:15-3.3      # PostgreSQL 15 + PostGIS 3.3
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: geberew_market
    ports:
      - "5433:5432"                    # host port 5433 → container port 5432
    volumes:
      - pgdata:/var/lib/postgresql/data  # data persists between restarts

volumes:
  pgdata:                              # named volume — survives docker compose down
```

**Why port 5433?** To avoid conflicts with any local PostgreSQL installation you might already have running on the default port 5432.

### Starting Docker

```bash
# Step 1: Make sure Docker Desktop is open and running (check taskbar/menu bar)

# Step 2: From the backend/ folder, start the database container:
docker compose up -d

# -d = "detached" = runs in the background, your terminal stays free
```

**Expected output:**
```
Container backend-db-1  Starting
Container backend-db-1  Started
```

### Stopping Docker

```bash
docker compose down          # stops the container, data is KEPT (in pgdata volume)
docker compose down -v       # stops AND deletes all data — use with caution
```

### Checking container status

```bash
docker compose ps            # shows running containers

# Expected output:
# NAME             STATUS
# backend-db-1     running (healthy)

docker compose logs db       # view PostgreSQL logs
docker compose logs -f db    # follow logs in real-time (Ctrl+C to stop)
```

### Connecting to the database directly (optional)

```bash
# Open a psql shell inside the container
docker exec -it backend-db-1 psql -U postgres -d geberew_market

# From there you can run raw SQL:
\dt                          # list all tables
\d users                     # describe the users table
SELECT * FROM crops;         # query crops
\q                           # quit
```

---

## 3. Database Setup

Run these commands **in order**, from the `backend/` folder:

### Step 1 — Install Node dependencies

```bash
npm install
```

### Step 2 — Start Docker (database must be running first)

```bash
docker compose up -d
```

Wait a few seconds for PostgreSQL to initialise before the next step.

### Step 3 — Apply migrations

```bash
npx prisma migrate deploy
```

This runs both migration files in `prisma/migrations/` and creates all 7 tables, enums, indexes, foreign keys, and RLS policies in the database.

**Expected output:**
```
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "geberew_market" at "localhost:5433"

2 migrations found in prisma/migrations
No pending migrations to apply.        ← already applied
  OR
2 migrations applied.                  ← first time running
```

### Step 4 — Generate the Prisma client

```bash
npx prisma generate
```

This generates the TypeScript client your application code uses to query the database.

### Step 5 — Seed reference data (Task 2 — Tebie Tegenew)

```bash
npx prisma db seed
# or:
npm run seed
```

This inserts the 5 crops and 5 markets with real GPS coordinates, plus one sample verified price per crop at Merkato.

**Expected output:**
```
🌱 Starting seed…

📦 Seeding crops…
  ✅ Teff (ጤፍ / Xaafii)
  ✅ Maize (በቆሎ / Boqqolloo)
  ✅ Wheat (ስንዴ / Qamadii)
  ✅ Red Onion (ቀይ ሽንኩርት / Qodaa Diimaa)
  ✅ Coffee (ቡና / Bunaa)

🗺️  Seeding markets with geo-points…
  ✅ Merkato (Addis Ababa) → POINT(38.7369 9.0192)
  ...

💰 Seeding sample verified prices at Merkato…
  ✅ Teff — ETB 8,500 / quintal
  ...

🧪 Verifying geo-point storage…

  Market geo-points in database:
  ┌────────────────────────────┬──────────────┬───────────┬──────────┐
  │ name                       │ region       │ longitude │ latitude │
  ├────────────────────────────┼──────────────┼───────────┼──────────┤
  │ Adama Grain Market         │ Oromia       │ 39.27     │ 8.54     │
  │ Bahir Dar Wholesale Market │ Amhara       │ 37.3614   │ 11.5742  │
  │ Hawassa Market             │ Sidama       │ 38.4759   │ 7.0621   │
  │ Jimma Coffee Market        │ Oromia       │ 36.8344   │ 7.6731   │
  │ Merkato                    │ Addis Ababa  │ 38.7369   │ 9.0192   │
  └────────────────────────────┴──────────────┴───────────┴──────────┘

✅ Seed complete. Database is ready for development.
```

### Step 6 — Browse the data visually (optional but recommended)

```bash
npx prisma studio
```

Opens a browser UI at **http://localhost:5555** where you can view and edit all 7 tables without writing SQL.

---

## 4. Verification

After running all setup steps, confirm everything is working:

```bash
# Check the container is running
docker compose ps

# List all tables in the database
docker exec backend-db-1 psql -U postgres -d geberew_market -c "\dt"
# Expected: 9 rows (7 your tables + _prisma_migrations + spatial_ref_sys from PostGIS)

# Confirm RLS is enabled on all 5 sensitive tables
docker exec backend-db-1 psql -U postgres -d geberew_market \
  -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename IN ('users','prices','listings','inquiries','sms_messages');"
# Expected: rowsecurity = t (true) for all 5

# Check geo-points are stored correctly
docker exec backend-db-1 psql -U postgres -d geberew_market \
  -c "SELECT name, ST_X(location) AS lng, ST_Y(location) AS lat FROM markets;"
```

---

## 5. Database Details

| Setting | Value |
|---|---|
| Engine | PostgreSQL 15 + PostGIS 3.3 |
| Image | `postgis/postgis:15-3.3` |
| Host | `localhost` |
| Port | `5433` (mapped from container's 5432) |
| Database | `geberew_market` |
| User | `postgres` |
| Password | `password` |
| Schema | `public` |
| Extension | `postgis` — enables `geometry` type and spatial functions |
| Data storage | Docker named volume `pgdata` — persists between restarts |

**Connection string** (in [`.env`](./.env)):
```
DATABASE_URL="postgresql://postgres:password@localhost:5433/geberew_market?schema=public"
```

---

## 6. Enums

```sql
-- User roles — stored in the "role" column of the users table
CREATE TYPE "Role" AS ENUM (
  'FARMER',       -- submits crop listings, queries prices via app or SMS
  'BUYER',        -- browses listings, contacts farmers
  'COOPERATIVE',  -- submits listings on behalf of multiple farmer members
  'OPERATOR',     -- verifies prices; access scoped to assigned_region only
  'ADMIN'         -- full unrestricted access to every table
);

-- Listing lifecycle
CREATE TYPE "ListingStatus" AS ENUM (
  'ACTIVE',       -- visible to buyers
  'SOLD',         -- farmer marked it as sold
  'CANCELLED'     -- farmer cancelled the listing
);

-- SMS message direction
CREATE TYPE "SmsDirection" AS ENUM (
  'INBOUND',      -- user texted the short code
  'OUTBOUND'      -- system sent a message to a user
);
```

---

## 7. Tables

### `users`
Stores every account in the system. OTP via phone is the primary login method.
`assigned_region` is only set for OPERATOR accounts — it controls which markets and listings they can access via RLS.

**RLS: ON**

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `phone` | TEXT UNIQUE | Primary login identifier — used for OTP |
| `role` | Role enum | Default: `FARMER` |
| `assigned_region` | TEXT nullable | OPERATOR only — scopes their RLS access to one region |
| `created_at` | TIMESTAMP | Auto-set on insert |
| `updated_at` | TIMESTAMP | Auto-updated on every change |

---

### `crops`
The canonical list of crops the system knows about. Every submission form, SMS parser, and price board reads from this table. Names are stored in three languages so the UI can render in Amharic, Afaan Oromoo, or English.

**RLS: OFF** — identical list for all users, no sensitivity.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | Slug-style ID e.g. `red_onion`, `teff` |
| `name_am` | TEXT | Amharic name e.g. `ጤፍ` |
| `name_om` | TEXT | Afaan Oromoo name e.g. `Xaafii` |
| `name_en` | TEXT nullable | English name e.g. `Teff` |
| `created_at` | TIMESTAMP | Auto |

**Seeded crops:** Teff · Maize · Wheat · Red Onion · Coffee

---

### `markets`
Wholesale market locations. The `location` column stores GPS coordinates using the PostGIS `geometry(Point, 4326)` type — WGS-84, the same coordinate system used by GPS and Google Maps. The `region` column is what RLS uses to scope operator access.

**RLS: OFF** — same market list for every user.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | Slug-style e.g. `merkato`, `adama_grain_market` |
| `name` | TEXT | Display name |
| `region` | TEXT | Region name — used to scope OPERATOR RLS policies |
| `location` | geometry(Point,4326) | GPS geo-point, longitude first then latitude |

**Inserting a market with a geo-point:**
```sql
-- ST_MakePoint(longitude, latitude) — longitude comes FIRST
INSERT INTO markets (id, name, region, location)
VALUES (
  'merkato',
  'Merkato',
  'Addis Ababa',
  ST_SetSRID(ST_MakePoint(38.7369, 9.0192), 4326)
);
```

**Querying geo-point coordinates back:**
```sql
SELECT
  name,
  ST_X(location) AS longitude,
  ST_Y(location) AS latitude
FROM markets;
```

**Seeded markets:**

| Market | Region | Longitude | Latitude |
|---|---|---|---|
| Merkato | Addis Ababa | 38.7369 | 9.0192 |
| Bahir Dar Wholesale Market | Amhara | 37.3614 | 11.5742 |
| Adama Grain Market | Oromia | 39.2700 | 8.5400 |
| Jimma Coffee Market | Oromia | 36.8344 | 7.6731 |
| Hawassa Market | Sidama | 38.4759 | 7.0621 |

---

### `prices`
Daily wholesale prices submitted by field reporters or operators. A price is not visible to farmers or buyers until an operator sets `is_verified = true`. `effective_date` tracks which trading day the price applies to (not necessarily today).

**RLS: ON**

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `crop_id` | TEXT FK → `crops` | Which crop this price is for |
| `market_id` | TEXT FK → `markets` | Which market this price was recorded at |
| `price_value` | DECIMAL(12,2) | Price in Ethiopian Birr (ETB) |
| `grade` | TEXT nullable | e.g. `Grade 1`, `Washed Grade 1`, `Grade 2` |
| `unit` | TEXT | Unit of measurement e.g. `quintal`, `kg` |
| `source` | TEXT | Who submitted it — reporter name, `sms`, or `seed_data` |
| `is_verified` | BOOLEAN | `false` by default — must be set `true` by an operator to publish |
| `effective_date` | TIMESTAMP | The trading day this price applies to |
| `created_at` | TIMESTAMP | Auto |

---

### `listings`
Farmer supply postings. A farmer (or cooperative rep) says: "I have 20 quintals of Grade-1 Teff, call this number." The `id` is client-generated — this is intentional so that the PWA can create listings offline and sync them later without creating duplicates.

**RLS: ON**

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID — **generated by the client app**, not the server, for offline PWA support |
| `farmer_id` | TEXT FK → `users` | The farmer or cooperative rep who owns this listing |
| `crop_id` | TEXT FK → `crops` | Which crop is being offered |
| `market_id` | TEXT FK → `markets`, nullable | The nearest market — nullable for woreda-only listings |
| `quantity` | DECIMAL(12,2) | Quintals available |
| `grade` | TEXT nullable | Quality grade if known |
| `pickup_location` | TEXT | Where to collect — market name or woreda description |
| `contact` | TEXT | Phone number buyers can call |
| `status` | ListingStatus enum | Default: `ACTIVE`. Changes to `SOLD` or `CANCELLED` when farmer updates it |
| `created_at` | TIMESTAMP | Auto |
| `updated_at` | TIMESTAMP | Auto-updated on every change |

---

### `inquiries`
A contact event log. Created every time a buyer contacts a farmer through the app — via the call button or in-app inquiry. Does not store message content; it is a timestamped record that the contact happened.

**RLS: ON**

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `buyer_id` | TEXT FK → `users` | The buyer who initiated contact |
| `listing_id` | TEXT FK → `listings` | The listing they inquired about |
| `created_at` | TIMESTAMP | Auto |

---

### `sms_messages`
Full log of every SMS the system touches — inbound queries from farmers/buyers and outbound price responses, verification triggers, and weekly digests. `user_id` is nullable because unregistered phone numbers can still text the short code.

**RLS: ON**

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `user_id` | TEXT FK → `users`, nullable | Linked registered user — `null` if sender not in the system |
| `sender` | TEXT | The phone number (inbound sender or outbound recipient) |
| `direction` | SmsDirection enum | `INBOUND` — user texted us. `OUTBOUND` — we texted user |
| `intent` | TEXT nullable | Parsed command e.g. `price_query`, `listing_create`, `digest` |
| `response` | TEXT | The full message body |
| `status` | TEXT nullable | Gateway delivery status e.g. `delivered`, `failed` |
| `cost` | DECIMAL(8,4) nullable | Per-message cost in USD as reported by the SMS gateway |
| `created_at` | TIMESTAMP | Auto |

---

## 8. Row Level Security (RLS)

RLS is enforced at the **database level** — it protects data even if the API has a bug. Postgres checks every query against the active policies before returning any rows.

### How the API must set session context

Every authenticated API request **must** execute these `SET LOCAL` statements inside the same database transaction as the query. Without them, RLS will block every row.

```sql
-- Required at the start of every authenticated transaction
SET LOCAL app.current_user_id = '<user-uuid>';
SET LOCAL app.current_role    = 'FARMER';    -- or BUYER | COOPERATIVE | OPERATOR | ADMIN
SET LOCAL app.current_region  = 'Oromia';   -- OPERATOR only; use empty string '' for all others
```

> `SET LOCAL` is automatically reset by Postgres at the end of each transaction — no cleanup needed, and no risk of one request's context leaking into another.

### RLS Access Matrix

| Table | FARMER | BUYER | COOPERATIVE | OPERATOR | ADMIN |
|---|---|---|---|---|---|
| `users` | Own row R/W | Own row R/W | Own row R/W | All rows R | All rows R/W |
| `crops` | All R (no RLS) | All R | All R | All R | All R/W |
| `markets` | All R (no RLS) | All R | All R | All R | All R/W |
| `prices` | Verified only R | Verified only R | Verified only R | All R/W | All R/W |
| `listings` | Own R/W | Active only R | Own R/W | Region-scoped R/W | All R/W |
| `inquiries` | Own listings' R | Own R/W | Own R/W | Region-scoped R | All R/W |
| `sms_messages` | Own R | Own R | Own R | All R | All R/W |

### All Policy Names (for debugging)

| Table | Policy | Who | What |
|---|---|---|---|
| `users` | `admin_all_users` | ADMIN | ALL operations |
| `users` | `user_own_profile` | Any | SELECT own row only |
| `users` | `user_update_own_profile` | Any | UPDATE own row only |
| `users` | `operator_read_users` | OPERATOR | SELECT all rows |
| `prices` | `admin_all_prices` | ADMIN | ALL operations |
| `prices` | `operator_all_prices` | OPERATOR | ALL operations (submit + verify) |
| `prices` | `public_verified_prices` | FARMER/BUYER/COOP | SELECT where `is_verified = true` |
| `listings` | `admin_all_listings` | ADMIN | ALL operations |
| `listings` | `farmer_own_listings` | FARMER | ALL on own listings |
| `listings` | `buyer_active_listings` | BUYER | SELECT where `status = 'ACTIVE'` |
| `listings` | `cooperative_own_listings` | COOPERATIVE | ALL on own listings |
| `listings` | `operator_region_listings` | OPERATOR | ALL in `app.current_region` |
| `inquiries` | `admin_all_inquiries` | ADMIN | ALL operations |
| `inquiries` | `farmer_listing_inquiries` | FARMER | SELECT on own listings' inquiries |
| `inquiries` | `buyer_own_inquiries` | BUYER | ALL on own inquiries |
| `inquiries` | `cooperative_own_inquiries` | COOPERATIVE | ALL on own inquiries |
| `inquiries` | `operator_region_inquiries` | OPERATOR | SELECT in `app.current_region` |
| `sms_messages` | `admin_all_sms` | ADMIN | ALL operations |
| `sms_messages` | `operator_read_sms` | OPERATOR | SELECT all (delivery monitoring) |
| `sms_messages` | `user_own_sms` | Any | SELECT own messages only |

---

## 9. Relationships

```
users ──────────────────────── listings ──────────────── crops
  │          (farmer_id)           │        (crop_id)
  │                                └──────────────────── markets
  │                                      (market_id)
  ├──── inquiries ─────────────── listings
  │         (buyer_id)            (listing_id)
  │
  └──── sms_messages
            (user_id · nullable — null if sender not registered)

prices ──── crops      (crop_id)
       └─── markets    (market_id)
```

**Cascade rules:**
- Deleting a `user` → cascades to their `listings`, `inquiries`, `sms_messages`
- Deleting a `crop` → cascades to related `prices` and `listings`
- Deleting a `market` → cascades to related `prices`; sets `listings.market_id` to `NULL`
- Deleting a `listing` → cascades to its `inquiries`

---

## 10. Migration History

Migrations live in `prisma/migrations/`. Prisma applies them in order on a fresh database.

| # | Migration folder | What it does |
|---|---|---|
| 1 | `20260812161701_init_schema_and_rls` | Creates all 7 tables, 3 enums, unique index on `users.phone`, all foreign key constraints, enables the PostGIS extension, and applies base RLS policies on `listings` and `inquiries` |
| 2 | `20260812162744_complete_rls` | Adds `assigned_region` column to `users`; enables RLS on `users`, `prices`, and `sms_messages`; adds COOPERATIVE policies; upgrades OPERATOR `listings` policy from placeholder to proper region-scoped; adds OPERATOR and COOPERATIVE policies on `inquiries` |

```bash
# Apply all pending migrations (safe to run multiple times)
npx prisma migrate deploy

# Check which migrations have been applied
npx prisma migrate status

# Create a new migration after editing schema.prisma (dev only)
npx prisma migrate dev --name describe_your_change
```

---

## 11. Troubleshooting

### Docker container will not start

```
unable to get image 'postgis/postgis:15-3.3': failed to connect to the docker API
```
**Fix:** Docker Desktop is not running. Open Docker Desktop and wait for the engine to show "Running" before retrying.

---

### Port 5433 is already in use

```
Error: bind: address already in use
```
**Fix:** Something else is using port 5433. Either stop that process, or change the port in `docker-compose.yml` from `"5433:5432"` to e.g. `"5434:5432"`, and update `DATABASE_URL` in `.env` to match.

---

### Migration fails with "relation already exists"

This means the tables were already created (e.g. from a manual run). Use `npx prisma migrate status` to see what state the database is in. If you need a clean slate:

```bash
docker compose down -v          # wipe all data
docker compose up -d            # fresh container
npx prisma migrate deploy       # apply from scratch
```

---

### Prisma client is out of date

```
@prisma/client did not initialize yet
```
**Fix:**
```bash
npx prisma generate
```

---

### Cannot connect — "password authentication failed"

Check that your `.env` file has `DATABASE_URL` set correctly and matches the credentials in `docker-compose.yml` (`postgres` / `password`).

---

### Seed fails with duplicate key error

The seed uses `upsert` for crops and markets so it is safe to re-run, but prices use `create`. If you re-run the seed after prices already exist, you will get duplicate price rows (not an error — just duplicates). To reset:

```bash
docker compose down -v   # wipe data
docker compose up -d
npx prisma migrate deploy
npm run seed
```

---

## 12. Who Owns What

| Team Member | Task | Tables they work with |
|---|---|---|
| **Tebie Tegenew** | Task 2 — Seed commodity list | `crops` |
| **Habtamu Arega** | Task 3 — Price submission & verification | `prices`, `users`, `crops`, `markets` |
| **Surafel Teshale** | Task 4 — Farmer listing form + PWA offline sync | `listings`, `crops`, `markets` |
| **Surafel Muhabaw** | Task 5 — SMS gateway listener & parser | `sms_messages`, `crops`, `users` |
| **Surafel Teshale** | Task 6 — Cooperative submission form | `listings`, `users` (COOPERATIVE role) |
| **Tebie Tegenew** | Task 7 — Buyer browse and contact flow | `listings`, `inquiries` |
| **Surafel Muhabaw** | Task 8 — SMS weekly digest job | `sms_messages`, `prices` |
| **Habtamu Arega** | Task 9 — Public price index | `prices`, `crops`, `markets` |
| **Wintana** | Task 10 — Operational dashboard | `prices`, `listings`, `sms_messages` |
| **Wintana** | Task 14 — Daily price board | `prices`, `crops`, `markets` |
| **Mahlet Amare** | Task 15 — Staging UAT | All tables (read) |

---

*Prepared by Surafel Muhabaw · Task 1 of 17 · August 13, 2026*  
*Visual reference: open `SCHEMA_REFERENCE.html` in any browser — includes interactive ERD.*
