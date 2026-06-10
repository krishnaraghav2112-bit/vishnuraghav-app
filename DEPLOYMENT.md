# 🚀 FREE Deployment Guide — Vishnu Raghav Platform

Deploy your full-stack app for **₹0/month** using:
- **Frontend** → Render (static site, always free)
- **Backend** → Render (free web service, sleeps after 15 min idle)
- **Database** → MongoDB Atlas M0 (free forever, 512 MB)
- **Images** → Cloudinary (free 25 GB)
- **Emails** → Resend (free 3000/month)
- **Payments** → Razorpay TEST mode (free)

> ⚠️ **Important Free-tier caveat:**
> Render free backend **sleeps after 15 min of inactivity**.
> First request after sleep takes ~30–50 seconds (cold start).
> **Fix:** Use [UptimeRobot.com](https://uptimerobot.com) (free) to ping
> `https://your-backend.onrender.com/api/` every 5 minutes → always-on.

---

## ✅ Pre-flight Checklist

Before starting, make sure you have these accounts ready:

- [ ] **GitHub account** → push this repo there
- [ ] **MongoDB Atlas** → free M0 cluster + connection string
- [ ] **Cloudinary** → Cloud name + API Key + API Secret
- [ ] **Razorpay** → Test mode Key ID + Secret (from Dashboard → API Keys)
- [ ] **Resend** → API key + verified sender domain
- [ ] **Render account** → sign in with GitHub

---

## 📋 Step-by-Step Deployment

### Step 1 — Push code to GitHub

```bash
cd vishnubhai2-main
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/vishnuraghav.git
git push -u origin main
```

### Step 2 — MongoDB Atlas (free)

1. Go to https://cloud.mongodb.com → Sign up
2. Create a **free M0 cluster** (any region — Mumbai/Singapore preferred)
3. **Database Access** → Add user with password
4. **Network Access** → Add IP `0.0.0.0/0` (allow all — needed for Render)
5. **Clusters → Connect → Drivers** → copy SRV connection string
   ```
   mongodb+srv://USER:PASS@cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   ⚠️ Replace `USER` and `PASS` in the string with your actual credentials.

### Step 3 — Deploy via Render Blueprint (one-click)

1. Go to https://dashboard.render.com/blueprints
2. Click **"New Blueprint Instance"**
3. Connect your GitHub repo
4. Render reads `render.yaml` and lists 2 services:
   - `vishnuraghav-backend` (free web service)
   - `vishnuraghav-frontend` (free static site)
5. It will ask for the `sync: false` env vars. Paste each value:

   **Backend env vars:**
   | Variable | Value |
   |---|---|
   | `MONGO_URL` | (from Step 2) |
   | `ADMIN_EMAIL` | admin@yourdomain.com |
   | `ADMIN_PASSWORD` | (strong password, 8+ chars) |
   | `CORS_ORIGINS` | *(skip for now — fill after Step 5)* |
   | `RAZORPAY_KEY_ID` | rzp_test_xxxxx |
   | `RAZORPAY_KEY_SECRET` | xxxxx |
   | `RAZORPAY_WEBHOOK_SECRET` | *(skip — fill after Step 6)* |
   | `CLOUDINARY_CLOUD_NAME` | your-cloud-name |
   | `CLOUDINARY_API_KEY` | xxxxx |
   | `CLOUDINARY_API_SECRET` | xxxxx |
   | `RESEND_API_KEY` | re_xxxxx |
   | `FRONTEND_URL` | *(skip — fill after Step 5)* |

   **Frontend env vars:**
   | Variable | Value |
   |---|---|
   | `REACT_APP_BACKEND_URL` | *(skip — fill after Step 4)* |

6. Click **Apply**. Render starts building. Wait ~5–8 minutes.

### Step 4 — Wire frontend → backend

1. After backend deploys, copy its URL (e.g. `https://vishnuraghav-backend.onrender.com`)
2. Go to `vishnuraghav-frontend` service → Environment
3. Set:
   ```
   REACT_APP_BACKEND_URL=https://vishnuraghav-backend.onrender.com
   ```
4. Click **"Manual Deploy → Deploy latest commit"** to rebuild frontend with the URL baked in.

### Step 5 — Wire backend → frontend (CORS)

1. Copy frontend URL (e.g. `https://vishnuraghav-frontend.onrender.com`)
2. Go to `vishnuraghav-backend` service → Environment
3. Set:
   ```
   CORS_ORIGINS=https://vishnuraghav-frontend.onrender.com
   FRONTEND_URL=https://vishnuraghav-frontend.onrender.com
   ```
4. Backend auto-redeploys.

### Step 6 — Razorpay webhook (for payment confirmation)

1. Razorpay Dashboard → **Settings → Webhooks → Add New**
2. URL: `https://vishnuraghav-backend.onrender.com/api/razorpay/webhook`
3. Events: `payment.captured`, `payment.failed`, `order.paid`
4. Copy the **webhook secret** Razorpay generates
5. Paste it in Render → backend → env var `RAZORPAY_WEBHOOK_SECRET`
6. Backend auto-redeploys.

### Step 7 — Keep backend awake (UptimeRobot)

1. Sign up at https://uptimerobot.com (free)
2. **Add New Monitor** → Type: HTTP(s)
3. URL: `https://vishnuraghav-backend.onrender.com/api/`
4. Interval: **5 minutes**
5. Save → backend stays awake 24/7

---

## ✅ Verify Everything Works

1. Open `https://vishnuraghav-frontend.onrender.com`
2. Check `https://vishnuraghav-backend.onrender.com/api/` → should return:
   ```json
   {"app":"Vishnu Raghav Platform","ok":true,...}
   ```
3. Sign in as admin (`ADMIN_EMAIL` + `ADMIN_PASSWORD` from Step 3)
4. Try buying a course → use Razorpay test card:
   ```
   Card:    4111 1111 1111 1111
   Expiry:  12/30
   CVV:     123
   OTP:     1234
   ```

---

## 💰 Total Monthly Cost

| Service | Cost |
|---|---|
| Render backend (free) | ₹0 |
| Render frontend (free) | ₹0 |
| MongoDB Atlas M0 | ₹0 |
| Cloudinary (free tier) | ₹0 |
| Resend (3000 emails/mo) | ₹0 |
| Razorpay (test mode) | ₹0 |
| **TOTAL** | **₹0 / month** 🎉 |

When you go LIVE on Razorpay, only transaction fees apply (~2% per payment).

---

## 🐛 Common Issues

### Backend won't start
- Check Render logs → look for "MONGO_URL" or missing env var
- Verify MongoDB Atlas allows `0.0.0.0/0` in Network Access
- Verify `ADMIN_PASSWORD` is at least 8 characters

### Frontend shows blank page / API errors
- Open browser console → check if API calls go to correct URL
- Verify `REACT_APP_BACKEND_URL` is set on frontend service
- Verify `CORS_ORIGINS` on backend includes your frontend URL

### Razorpay payment fails
- Verify `RAZORPAY_MODE=test` matches `rzp_test_...` key prefix
- Check webhook URL is reachable (curl it from terminal)

### Emails not sending
- Resend → verify sender domain is fully verified (SPF + DKIM + DMARC green)
- Check Render logs for Resend API errors

### Backend keeps sleeping
- Set up UptimeRobot (Step 7) to ping every 5 min

---

## 🆙 Upgrade Path (when you outgrow free tier)

| Upgrade | Cost | Benefit |
|---|---|---|
| Render Starter | $7/mo (~₹580) | Always-on backend, no sleep |
| MongoDB M2 | $9/mo | 2 GB storage, dedicated CPU |
| Custom domain | Free on Render | Just point your DNS |

---

**Need help?** Check Render docs: https://render.com/docs/blueprint-spec
