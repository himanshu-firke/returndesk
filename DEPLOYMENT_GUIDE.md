# ReturnDesk — 5-Minute Production Deployment Guide

This guide walks you through deploying **ReturnDesk** to free-tier cloud hosting for the final submission.

---

## 🏗️ Architecture Overview

```
[Vercel] Next.js Frontend  (https://returndesk.vercel.app)
       │
       │  REST API (JSON)
       ▼
[Render] Express Backend   (https://returndesk-api.onrender.com)
       │
       │  PostgreSQL (SSL)
       ▼
[Neon]   Cloud PostgreSQL  (postgres://...sslmode=require)
```

---

## ⚡ STEP 1: Deploy Database on Neon (Free, Instant)

1. Go to **[https://neon.tech](https://neon.tech)** and sign in with GitHub.
2. Click **"Create Project"**:
   - **Project name**: `returndesk`
   - **Region**: Select closest to you (e.g. `US East (Ohio)` or `Asia Pacific (Singapore)`).
   - **Postgres version**: `16` (default).
3. Once created, copy the **Connection String** from the dashboard. It looks like:
   ```
   postgresql://neondb_owner:AbCdEf123456@ep-cool-pond-a5xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Run the database setup and seed script from your local terminal against Neon:
   ```powershell
   # In your local project terminal:
   $env:DATABASE_URL="<PASTE_YOUR_NEON_CONNECTION_STRING_HERE>"
   node server/scripts/setup-db.js
   node server/scripts/seed.js
   ```
   ✅ *Output should confirm: Database schema initialized and 33 return requests seeded successfully!*

---

## ⚡ STEP 2: Deploy Backend API on Render (Free Web Service)

1. Go to **[https://dashboard.render.com](https://dashboard.render.com)** and sign in with GitHub.
2. Click **"New +"** ➔ **"Web Service"**.
3. Select **"Build and deploy from a Git repository"** and choose your repository: `himanshu-firke/returndesk`.
4. Configure the service:
   - **Name**: `returndesk-api` (or any unique name)
   - **Region**: Same region as your Neon database
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Click **"Advanced"** ➔ **"Add Environment Variable"**:
   - `DATABASE_URL` = `<PASTE_YOUR_NEON_CONNECTION_STRING_HERE>`
   - `CLIENT_URL` = `*` *(or your Vercel URL once deployed in Step 3)*
   - `PORT` = `10000` *(Render sets this automatically, but adding is safe)*
6. Click **"Create Web Service"**.
7. Wait 1-2 minutes until deployment completes.
8. Copy your backend URL: e.g. `https://returndesk-api.onrender.com`.
9. Test the health endpoint in your browser:
   ```
   https://returndesk-api.onrender.com/api/health
   ```
   ✅ *Should return `{"status":"ok", "timestamp":"..."}`.*

---

## ⚡ STEP 3: Deploy Frontend on Vercel (Free Next.js Platform)

1. Go to **[https://vercel.com](https://vercel.com)** and sign in with GitHub.
2. Click **"Add New..."** ➔ **"Project"**.
3. Import your repository: `himanshu-firke/returndesk`.
4. In the configuration screen:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click **Edit** and select **`client`**.
5. Expand **"Environment Variables"**:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://returndesk-api.onrender.com/api` *(use your actual Render backend URL from Step 2)*
6. Click **"Deploy"**.
7. In ~1 minute, Vercel will give you a live production URL: e.g. `https://returndesk-alpha.vercel.app`.

---

## ⚡ STEP 4: Update README & GitHub Description

1. Add the live URL to `README.md` at the top.
2. In your GitHub repository settings, set the **Website** URL to your Vercel deployment link.
3. Reply to the recruiter with both links!

---

## 📝 Recruiter Email Reply Template

```text
Subject: Re: Assignment Round – Next Steps_FRIDO

Hi Raksha,

Thank you for the update. Here are the links for my ReturnDesk assignment submission:

- Deployed Application: https://returndesk-your-subdomain.vercel.app
- GitHub Repository: https://github.com/himanshu-firke/returndesk

The application is deployed with a PostgreSQL cloud database (Neon) pre-seeded with 33 realistic return requests across all statuses and reasons. All 5 business rules, server-side search/filtering/sorting/pagination, locked states, and full responsive design (down to 375px) are fully implemented and verified.

Looking forward to the technical round!

Best regards,
Himanshu Firke
```
