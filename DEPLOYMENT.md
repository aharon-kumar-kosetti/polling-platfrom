# Deployment Guide

This project is configured to deploy the **Backend on Railway** (or Render) and the **Frontend on Vercel**.

---

## 1. Backend (Railway Deployment)

### Service Configuration:
- **Railway Project**: `energetic-magic`
- **Railway Service**: `quizcore-backend`
- **Environment**: `production`

Railway uses the included `railway.json` and `Procfile` for automated builds with Nixpacks and Prisma client generation.

### Railway Service Settings:
1. In Railway, navigate to your **`quizcore-backend`** service.
2. Under **Settings**:
   - **Root Directory**: Set to `/server` (or leave default `/` as `railway.json` supports both).
   - **Build Command**: `npx prisma generate` (or handled automatically).
   - **Start Command**: `npm start`
   - **Healthcheck Path**: `/health`
3. Under **Networking**:
   - Click **Generate Domain** to assign a public domain (e.g. `quizcore-backend-production.up.railway.app`).

### Environment Variables on Railway
Add these variables in your Railway Service **Variables** tab:

| Variable | Value / Description |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgresql://postgres:QuizCore7.vercel.app@db.zzkxdsgbaxihilsizqzg.supabase.co:5432/postgres` |
| `JWT_SECRET` | `a-strong-random-secret-key-here` |
| `FRONTEND_URL` | `https://your-quizcore-frontend.vercel.app` *(Your Vercel production frontend URL)* |
| `ADMIN_EMAIL` | `admin@quizcore.com` *(Default organizer email)* |
| `ADMIN_PASSWORD` | `your-secure-admin-password` *(Default organizer password)* |
| `ADMIN_NAME` | `Admin Organizer` |

*(Note: `PORT` is automatically managed and injected by Railway.)*

---

## 2. Frontend (Vercel Deployment)

Deploy the root directory to Vercel. Vercel will automatically detect that it's a Vite + React project.

### Environment Variables on Vercel
Add these environment variables in your **Vercel Project Settings > Environment Variables**:

| Variable | Value |
| :--- | :--- |
| `VITE_API_BASE_URL` | `https://quizcore-backend-production.up.railway.app/api` *(Your Railway public URL + /api)* |
| `VITE_SOCKET_URL` | `https://quizcore-backend-production.up.railway.app` *(Your Railway public URL)* |

*Note: The included `vercel.json` file handles SPA client-side routing for React Router.*

---

## 3. Alternative Backend (Render)
If deploying to Render, the project still includes `render.yaml` Blueprint compatibility.
