# Deployment Guide

This project is configured to deploy the Frontend on **Vercel** and the Backend on **Render**.

## 1. Backend (Render)

The project includes a `render.yaml` Blueprint. When you connect your GitHub repository to Render, you can select "Blueprint" to automatically configure the service.

### Environment Variables on Render
You must manually set these environment variables in your Render dashboard after connecting:

- `DATABASE_URL`: `file:/data/dev.db` (This stores the SQLite database on the attached persistent disk).
- `FRONTEND_URL`: `https://your-vercel-project-url.vercel.app` (This allows CORS requests from your frontend).
- `ADMIN_EMAIL`: The email for your default organizer account (e.g. `admin@quizcore.com`)
- `ADMIN_PASSWORD`: The password for your default organizer account.

## 2. Frontend (Vercel)

Deploy the root directory to Vercel. Vercel will automatically detect that it's a Vite + React project. 

### Environment Variables on Vercel
You must add these environment variables in your Vercel Project Settings before building:

- `VITE_API_BASE_URL`: `https://quizcore-backend.onrender.com/api` (Replace with your actual Render URL).
- `VITE_SOCKET_URL`: `https://quizcore-backend.onrender.com` (Replace with your actual Render URL).

*Note: A `vercel.json` file is already included to ensure React Router works correctly in production.*
