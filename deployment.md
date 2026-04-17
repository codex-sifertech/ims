# Deployment Guide

This project is a frontend web application built with [Vite](https://vitejs.dev/) and uses Firebase. You can follow the steps below to easily deploy it for free on popular platforms like Vercel and Render.

## 🚀 Deploying on Vercel

Vercel is highly optimized for frontend projects and will automatically detect Vite.

### Step-by-Step Vercel Deployment
1. **Create an account:** Go to [vercel.com](https://vercel.com/) and sign up using your GitHub account.
2. **Import Project:**
   - On the Vercel dashboard, click **"Add New"** > **"Project"**.
   - Grant Vercel access to your GitHub repositories if prompted.
   - Find your repository (`codex-sifertech/ims`) in the list and click **"Import"**.
3. **Configure Project:**
   - **Project Name:** Choose a name (e.g., `ims-dashboard`).
   - **Framework Preset:** Vercel should automatically detect **Vite**.
   - **Root Directory:** Leave it as `./`.
   - **Build and Output Settings:** (Vercel sets these automatically for Vite)
     - Build Command: `npm run build`
     - Output Directory: `dist`
     - Install Command: `npm install`
   - **Environment Variables:** If your Firebase configuration uses `.env` variables (e.g., `VITE_FIREBASE_API_KEY`), expand the "Environment Variables" section and add them here.
4. **Deploy:** Click the **"Deploy"** button.
5. **Done:** Vercel will build your app and give you a live URL within minutes.

---

## 🛠️ Deploying on Render

Render is a robust alternative that supports static sites and full-stack web apps.

### Step-by-Step Render Deployment
1. **Create an account:** Go to [render.com](https://render.com/) and sign up with your GitHub account.
2. **Create a New Web Service / Static Site:**
   - In the Render dashboard, click **"New"** and select **"Static Site"**.
   - Connect your GitHub account and find the `ims` repository. Click **"Connect"**.
3. **Configure the Static Site:**
   - **Name:** Choose a name for your site.
   - **Branch:** Select the main branch (e.g., `main` or `master`).
   - **Build Command:** `npm install && npm run build`
   - **Publish directory:** `dist`
4. **Advanced Settings (Environment Variables):**
   - Click "Advanced".
   - If your Firebase config is hidden in `.env` files, click "Add Environment Variable" and add your keys (e.g., `VITE_FIREBASE_API_KEY`, etc.).
5. **Deploy:** Click **"Create Static Site"**.
6. **Done:** Render will queue your build and provide a live URL once finished.
