# DigiXCrm VPS Deployment & Optimization Guide

This guide ensures your CRM is deployed safely, optimized for speed, and scales effortlessly on your VPS.

---

## 🛠️ Phase 1: Preparation (The Clean State)

Before going live, we have:
- [x] **Log Cleanup**: Removed internal `console.log` statements from core billing and webhook engines.
- [x] **Durable Queries**: Verified that all dashboard components use optimized parallel Prisma queries.
- [x] **Elite UI**: Typography is locked to **Inter** for an elite, high-fidelity user experience.

---

## 🚀 Phase 2: VPS Deployment Workflow

### 1. Initial Server Setup
Ensure your VPS has the following installed:
- **Node.js 20+** (LTS recommended)
- **PostgreSQL 15+**
- **PM2** (`npm install -g pm2`) for process management.
- **Nginx** or **Caddy** for the reverse proxy and SSL.

### 2. Deployment Script
On your VPS, run these commands:

```bash
# 1. Clone & Install
git clone <your-repo-url>
cd <repo-dir>
npm install

# 2. Setup Environment
cp .env.example .env
nano .env # Fill in your production credentials (DB, Stripe, etc.)

# 3. Database Migration (The Critical Step)
# Since we have schema changes from today, we MUST deploy them.
npx prisma migrate deploy

# 4. Build for Production
npm run build

# 5. Launch with PM2
pm2 start npm --name "digixcrm" -- start
```

---

## 🏗️ Phase 3: Database Strategy (Existing DB vs New)

The user asked: **"do we just push db or what, can we sync it with existing db on VPS?"**

### Scenario A: You have an existing database with data
1. **DO NOT** use `npx prisma db push`. It can be destructive and drop columns.
2. **USE** `npx prisma migrate deploy`. 
   - This compares your `prisma/migrations` folder against what’s in the VPS database.
   - It only applies the *missing* pieces (like the new `GlobalSettings` or `CustomRole` tables).
   - Your existing data stays safe.

### Scenario B: You want to push local data to VPS (Seeding)
If you have a fresh VPS DB and want to seed it with the SuperAdmin or initial data:
```bash
npx prisma db seed
```
> [!IMPORTANT]
> **Production Security**: Before running the seed script, open `scripts/seed-superadmin.ts` and change the `email` and `password` variables from the defaults (`admin@crm.com`) to your actual production credentials. Delete the script or change the password immediately after login.

---

## 🔒 Phase 4: Security & Environment Checklist

Ensure these variables are set in your VPS `.env`:

| Variable | Importance | Note |
| :--- | :--- | :--- |
| `DATABASE_URL` | CRITICAL | Your VPS Postgres connection string. |
| `NEXTAUTH_SECRET` | CRITICAL | Random string for session encryption. |
| `NEXTAUTH_URL` | CRITICAL | Must be your root domain: `https://yourdomain.com`. |
| `NEXT_PUBLIC_APP_URL` | CRITICAL | Must be your root domain: `https://yourdomain.com`. |
| `STRIPE_WEBHOOK_SECRET` | HIGH | Get this from Stripe Dashboard -> Webhooks. |
| `TURNSTILE_SECRET` | HIGH | For bot protection on login/register. |

---

## ⚡ Phase 5: Optimization & Cleanup

To ensure no "lags":
1. **Enable Caching**: Next.js 15 handles this well by default, but ensure your VPS has enough RAM (at least 2GB) for the build process.
2. **Database Indices**: Prisma creates indices for IDs, but for large datasets, we may want to add indices to `email` or `status` fields in the future.
3. **PM2 Autostart**: Run `pm2 save && pm2 startup` to ensure the CRM comes back up after a server reboot.

---

**Everything is now "Green". Your code is clean, optimized, and ready for Prime Time.**
