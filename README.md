# PUSH — Deployment Guide

Get this running on your phone in ~10 minutes. No coding or terminal required.

---

## What you need

1. An **Anthropic API key** — pay-as-you-go, ~pennies/month for personal use
2. A free **GitHub** account
3. A free **Vercel** account

---

## Step 1 — Get an Anthropic API key

1. Go to **https://console.anthropic.com**
2. Sign up or log in
3. **Billing → Add credit** (start with $5; that's months of personal use)
4. **API Keys → Create Key** → copy the key (starts with `sk-ant-`)
5. Save it somewhere — you'll paste it in Step 3

---

## Step 2 — Put the code on GitHub

1. Go to **https://github.com/new**
2. Repository name: `push` (or whatever you want)
3. Set it to **Private**
4. Click **Create repository**
5. On the next page, click **"uploading an existing file"** (it's a small link in the middle of the page)
6. **Drag every file and folder from this project** (including the `src/`, `api/`, and `public/` folders) into the upload area
7. Scroll down → click **Commit changes**

---

## Step 3 — Deploy to Vercel

1. Go to **https://vercel.com/new**
2. Sign in with GitHub (allow access if asked)
3. Find your `push` repo in the list → click **Import**
4. **Don't** change framework, build command, or output directory — Vercel auto-detects Vite
5. Expand **Environment Variables**
   - Name: `ANTHROPIC_API_KEY`
   - Value: paste the key from Step 1
   - Click **Add**
6. Click **Deploy**
7. Wait ~90 seconds

---

## Step 4 — Use it on your phone

Vercel gives you a URL like `push-yourname.vercel.app`.

**iPhone:** open in Safari → Share button → **Add to Home Screen**
**Android:** open in Chrome → menu (⋮) → **Add to Home screen**

It'll launch fullscreen like a native app, and your data persists between sessions in the browser's local storage.

---

## Cost expectations

Default model is **Claude Haiku 4.5** — roughly **$0.001–0.002 per goal** you add. Adding 10 goals/day ≈ a few cents/month. Anthropic's $5 minimum credit will last a long time.

To upgrade quality: edit `api/generate.js`, change `claude-haiku-4-5-20251001` to `claude-sonnet-4-6` (smarter, ~5x cost) or `claude-opus-4-7` (smartest, ~25x cost). Push to GitHub → Vercel auto-redeploys.

---

## Troubleshooting

**"Connection failed" toast when adding a goal**
→ Vercel dashboard → your project → **Logs**. Look at the most recent `/api/generate` invocation.
- `ANTHROPIC_API_KEY env var not set` → you missed Step 3.5; add it under Settings → Environment Variables, then redeploy
- `401` errors → API key is wrong or revoked
- `429` errors → out of credit; top up at console.anthropic.com

**Goals don't persist between sessions**
→ You're probably in private/incognito mode, or your browser is blocking localStorage.

**Want to wipe all data**
→ In your browser's dev tools (or Safari → Settings → Advanced → Website Data), clear data for your Vercel URL.

---

## File map

```
push-app/
├── api/
│   └── generate.js      ← serverless backend, holds the API key
├── public/
│   └── manifest.json    ← PWA config for "Add to Home Screen"
├── src/
│   ├── App.jsx          ← the main app
│   ├── main.jsx         ← React entry
│   └── index.css        ← global styles
├── index.html
├── package.json
├── vite.config.js
└── README.md            ← you are here
```
