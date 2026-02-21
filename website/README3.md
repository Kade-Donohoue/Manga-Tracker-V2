# Manga Activity

A self-hostable manga tracking and reading platform built with **Cloudflare**, **React**, and **Puppeteer**.  
It aggregates chapters from various sites, offers stat tracking, and supports Discord interaction via slash commands.  
You can use the hosted version at [https://manga.kdonohoue.com](https://manga.kdonohoue.com) or deploy it yourself.

---

## 🧪 Running the App Locally

```sh
# 1. Install dependencies (only needed once)
pnpm install

# 2. Set up environment variables
cp example.env .env.dev   # Or .env.production
# Edit and fill in all required variables

# 3. Follow the Cloudflare setup steps (below)

# 4. Start the development server
pnpm dev

# 5. In a separate terminal, run:
pnpm tunnel

```

`pnpm tunnel` supports two modes:
 - Quick Start Mode: No setup — generates a random Cloudflare domain.
 - Custom Domain Mode: Requires configuration with Cloudflare Tunnel to use your own domain/subdomain.

## ☁️ Cloudflare Setup
A Cloudflare account and domain are required. You'll also need the following services:
### 1. Cloudflare Worker
 - Create a worker.
 - Add its credentials to packages/server/wrangler.toml.
### 2. D1 Database
 - Create a D1 instance and add credentials to wrangler.toml.
 - In packages/server/package.json, replace dev-manga-bot with your D1 DB name. 
### 3. Database Initialization
From packages/server, run:

```sh
# For staging/production:
pnpm resetDbRemote

# For local development:
pnpm resetDbLocal
```
### 4. R2 Object Storage
 - Create an R2 bucket.
 - Connect a subdomain to it.
 - Add R2 credentials to packages/server/wrangler.toml.

### 4. KV Storage
 - Create an KV.
 - Enter Id into packages/server/wrangler.toml
 - Add R2 credentials to packages/server/wrangler.toml.

## 🔑 Auth Setup

## 🚀 Manual Deployment
### Step 1: Set Up
 - Fill out .env.production.
 - Ensure packages/server/wrangler.toml is configured properly.

### Step 2: Log in to Cloudflare
```sh
npx wrangler login
```
### Step 3: Deploy the Client
```sh
cd packages/client
pnpm build
npx wrangler pages deploy dist
```
In Cloudflare Pages, Create and set the following Variables and Secrets:
 - VITE_SERVER_URL
 - VITE_IMG_URL

### Step 4: Deploy the Server
```sh
cd packages/server
pnpm deploy
```

## 📦 Optional: Building Native Apps (Electron / Android)
These builds are optional — only needed if you want to rebuild the desktop or mobile versions yourself.  
For convenience, copies of the native apps are available on the **Releases Page**.


> The Android app connects to the same server as the web version.

### From `packages/client`:
```sh
pnpm build
pnpm electron:buildAll
pnpm capacitor:build
```
### Android APK Instructions
1. Open Android Studio (it should launch automatically).
2. Click the ☰ hamburger menu.
3. Navigate to Build → Generate Signed App Bundle or APK.
4. Choose APK, click Next.
5. Create a keystore and fill in credentials.
6. Select Release, then Finish to build your APK.

## Database Migrations
```sh
pnpm exec wrangler d1 migrations apply DB --remote
```

to generate migrations
```sh
npx drizzle-kit generate
```