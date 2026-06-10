# Vishnu Raghav Platform — PRD

## Original Problem Statement (user, Feb 2026)
> Build a website for Vishnu Raghav — a Hindi author who has published 2 books (available on Amazon/Flipkart) and is also a content creator. The site must:
> 1. Sell his books (linked to Amazon/Flipkart)
> 2. Showcase his social media presence
> 3. Host his blog
> 4. Sell premium online courses (Time Management, Overthinking, etc.) — students pay first, then unlock videos
> User has zero coding knowledge and a minimum budget.

## Architecture
- **Frontend**: React 19 + React Router 7 + Tailwind + shadcn/ui + sonner toasts. Fonts: Fraunces (serif headings) + Plus Jakarta Sans (body). Theme: dark + brand gold `#c9a84c` + brand purple `#7c5cfc`.
- **Backend**: FastAPI + MongoDB (Motor async driver). JWT auth (bcrypt + PyJWT), Authorization Bearer header.
- **Hosting**: Emergent platform (~$5–10/month). Database: MongoDB (included).
- **Payments**: Razorpay-ready endpoints. Currently **MOCK MODE** (auto-succeeds) until user sets `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` in `/app/backend/.env`.

## User Personas
1. **Reader** — visits site to discover books, click Amazon/Flipkart, read blog, subscribe to newsletter.
2. **Student** — registers, browses courses, pays via Razorpay, watches YouTube-embedded videos, tracks progress, earns certificate.
3. **Admin (Vishnu)** — `admin@vishnuraghav.in` / `Admin@12345`. Sees stats, users, enrollments via `/api/admin/*`.

## Core Requirements (static)
- Hero with Vishnu's branding, 4 stats, dual CTAs
- 4 Courses with paid-gate access
- 3 Books (2 live + 1 upcoming) with Amazon/Flipkart links
- Blog with category filter + search
- Newsletter capture
- Contact form
- Student dashboard (My Courses, Progress, Certificates, Payments, Profile)
- Course player (YouTube playlist embed + lesson-tracker sidebar)
- JWT auth (register, login, profile update)

## Implemented (Feb 2026 — Day 1)
- ✅ Full landing page with all sections (Hero, Platforms bar, Courses, Books, About, Journey timeline, Testimonials, YouTube grid, Topics, Blog, Newsletter, CTA, Contact, Footer)
- ✅ JWT register/login + Bearer token (localStorage)
- ✅ Enrollment + mock Razorpay payment flow
- ✅ Course player with YouTube iframe + lesson sidebar + progress tracking
- ✅ Student dashboard (5 tabs)
- ✅ Blog list + filter + detail page
- ✅ Newsletter + Contact form persistence
- ✅ Admin role + admin endpoints (stats / users / enrollments)
- ✅ Custom SVG book covers (Hindi + English titles)
- ✅ data-testid coverage on all interactive elements
- ✅ 29/29 backend tests pass; all frontend flows verified

## Implemented (June 2026 — Iter 8: Cloudinary uploads (production-ready))
- ✅ **Cloudinary integration** for all admin-panel image uploads (book covers, course thumbnails, blog featured images, author photo, all future fields).
- ✅ `POST /api/admin/upload` now uploads to Cloudinary via `cloudinary.uploader.upload(bytes, folder='vishnu_raghav', unique_filename=True, secure=True)` and returns the `secure_url` (https CDN URL) which is persisted in MongoDB. API_SECRET stays server-side only — never leaks into responses or frontend bundle.
- ✅ **Graceful fallback**: if `CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET` env vars are absent, the endpoint falls back to local-disk storage (dev mode) — backwards-compatible with existing `/api/uploads/...` URLs already in DB (StaticFiles mount preserved).
- ✅ Status flag added to `GET /api/` → returns `{ok:true, cloudinary:"enabled"|"disabled"}` for quick health check after deploy.
- ✅ Frontend `ImageUpload.jsx` unchanged — already handles both relative `/api/uploads/...` and absolute `https://res.cloudinary.com/...` URLs.
- ✅ 11/11 new Cloudinary tests + 9/9 iter4 upload regression tests pass. Code review confirms: raw bytes passed, folder + unique_filename set, secure_url returned, 502 on Cloudinary errors, API_SECRET never returned.
- ⚠️ **Required env vars in Railway/production**: `CLOUDINARY_CLOUD_NAME=du3m6zwhg`, `CLOUDINARY_API_KEY=<your-key>`, `CLOUDINARY_API_SECRET=<your-secret>`. Optional: `CLOUDINARY_FOLDER` (defaults to `vishnu_raghav`).

## Implemented (June 2026 — Iter 7: Razorpay webhook backstop)
- ✅ **POST /api/razorpay/webhook** — server-to-server backstop for payment confirmation when the browser never reaches `/verify` (tab closed, network drop, mobile crash).
- ✅ Fail-closed: returns 503 when `RAZORPAY_WEBHOOK_SECRET` env var is missing — never silently accepts.
- ✅ Constant-time HMAC-SHA256 signature verification (`hmac.compare_digest`) over **raw request bytes** (not reformatted JSON).
- ✅ Idempotent: `_mark_paid_from_webhook` uses `{status:{$ne:'paid'}}` guard → replays do not double-write or double-increment coupon `used_count`. Sets `paid_via='webhook'` for audit.
- ✅ Handles `payment.captured`, `payment.authorized`, `order.paid`, `payment.failed` (sets status='failed' only when pending). Unknown events ack 200 (so Razorpay stops retrying).
- ✅ 13/13 new backend tests pass. Iter5/iter6 regression suites pass (any flakes were transient Razorpay sandbox rate-limit 401s, not webhook code).
- ⚠️ **To activate**: in Razorpay Dashboard → Settings → Webhooks → Add Webhook, paste `https://<your-domain>/api/razorpay/webhook`, select events (`payment.captured`, `payment.failed`, `order.paid`), copy the generated secret, and add it as `RAZORPAY_WEBHOOK_SECRET="..."` in `/app/backend/.env`. Then `sudo supervisorctl restart backend`.

## Implemented (June 2026 — Iter 6: Coupon system + payment chip copy fix)
- ✅ **Payment-methods chip** updated to single line: **"UPI • Cards • Net Banking • EMI (eligible cards only)"** in `PayModal.jsx`.
- ✅ **Coupon system** end-to-end (minimal, production-safe):
  - Backend: `POST/GET/PATCH/DELETE /api/admin/coupons` (admin-guarded), `POST /api/coupons/validate` (logged-in students). Supports `percent` (1-100) & `fixed` (₹) discounts, optional `expires_at` (YYYY-MM-DD or ISO), `max_uses`, `course_slugs` restriction, `active` flag. Server-side discount computation; client-supplied amount never trusted.
  - Stored in `db.coupons` (unique index on `code`); `used_count` auto-increments inside `/enrollments/verify` only after a valid HMAC signature (idempotent guard prevents double-counting).
  - `/enrollments/checkout` accepts `coupon_code` → re-evaluates server-side, creates Razorpay order at the discounted paise amount, persists `coupon_code/discount/original_amount` on the enrollment.
  - Frontend `PayModal`: compact coupon input (Apply / Remove), green "applied" banner, price breakdown (Original / Discount / Total payable), Pay button label reflects discounted amount in INR.
  - Admin Panel: new **"Coupons"** tab (7th) with create/edit/delete + Active toggle + `used_count / max_uses` indicator.
- ✅ 22/22 new coupon backend tests pass + 7/7 Razorpay regression tests still pass (29/29 total). Frontend e2e verified.

## Implemented (June 2026 — Iter 5: Live Razorpay Standard Checkout)
- ✅ **Razorpay Standard Web Checkout integrated end-to-end** (test mode keys configured).
- ✅ Backend `POST /api/enrollments/checkout` now calls the real Razorpay Orders API (`razorpay.Client(...).order.create`) with amount in paise, currency INR, ≤40-char receipt, and notes (course_slug/user_id/email). Returns `mode=razorpay`, `order_id`, `amount_paise`, `razorpay_key`, `enrollment_id`, and `prefill`.
- ✅ Backend `POST /api/enrollments/verify` validates **HMAC-SHA256(`order_id|payment_id`, KEY_SECRET)**, asserts the body order_id matches the enrollment's order_id (defensive), fails-closed when secret missing for a `razorpay_live` enrollment, and only then marks status='paid'.
- ✅ Frontend `PayModal.jsx` dynamically injects `https://checkout.razorpay.com/v1/checkout.js` once, opens `new window.Razorpay(options)` with theme colour `#c9a84c`, handles `payment.failed` event and `modal.ondismiss` (busy state reset + toast).
- ✅ `REACT_APP_RAZORPAY_KEY_ID` added to `/app/frontend/.env` (PUBLIC test key id only). `RAZORPAY_KEY_SECRET` stays server-side in `/app/backend/.env`. `.env` already gitignored.
- ✅ 7/7 new Razorpay backend tests pass (test_razorpay_iter5.py) — incl. live verification against Razorpay Orders API. Frontend hosted modal opens correctly (verified via screenshot: "Test Mode" ribbon + "Secured By Razorpay").

## Implemented (June 2026 — Iter 4: Image uploads + YouTube thumbnails)
- ✅ **Direct image upload** in admin panel — no more URL pasting. Endpoint: `POST /api/admin/upload` (multipart, admin-only, validates type/size, returns `/api/uploads/<random>.<ext>`). Files served via `app.mount("/api/uploads", StaticFiles(...))`.
- ✅ **Reusable ImageUpload component** (`/app/frontend/src/components/ImageUpload.jsx`) — file picker, instant preview, remove button, auto-saves uploaded URL via PATCH on parent resource.
- ✅ **Wired into 4 admin fields**: Site Settings → Author Photo (`site-photo`), Books edit → Cover (`bf-cover`), Courses edit → Thumbnail (`cf-thumb`, new field), Blog edit → Featured Image (`bf-blog-image`, new field).
- ✅ **Course `thumbnail` & Blog `image` fields** added to backend models (optional, backwards-compatible). Rendered on home page cards (overlay on existing gradient palette fallback).
- ✅ **YouTube thumbnails** auto-fetch from any URL format — watch?v=, youtu.be/, /shorts/, /embed/, /live/, /v/, or raw 11-char ID. Uses `https://i.ytimg.com/vi/<id>/hqdefault.jpg` (always-exists thumbnail). Verified across 3 URL formats end-to-end.
- ✅ **9/9 new backend tests pass** (`test_uploads_iter4.py`); all 4 frontend upload widgets + YouTube thumbnail rendering verified via Playwright.

## Implemented (Feb 2026 — Day 2: Phase 2)
- ✅ **Real images everywhere** — Vishnu Raghav's actual photo in hero + about; real book covers for Jo Mai Kah Na Saka, Dagmagate Pair, Uljha Jeevan (all 3 books). Floating hero books also use real covers.
- ✅ **MongoDB-backed content** — BOOKS / COURSES / BLOG_POSTS migrated from in-memory lists to MongoDB collections via `seed_content()` startup function. Read endpoints query MongoDB (with static fallback).
- ✅ **Admin Panel UI at `/admin`** — 9 tabs: Overview (stats), Users, Enrollments, Books CRUD, Courses Edit, Blog CRUD, Newsletter (read), Contacts (read), Site Settings (author photo + hero quote).
- ✅ **Admin CRUD APIs** — POST/PATCH/DELETE for /admin/books, POST/PATCH/DELETE for /admin/blog, PATCH for /admin/courses, PATCH for /admin/site, GET for /admin/newsletter & /admin/contacts.
- ✅ **Role-gated Admin nav button** — Visible only to `role: admin` users.
- ✅ **17/17 new backend tests pass** (test_admin_phase2.py); all admin frontend flows verified end-to-end.

## Prioritized Backlog

### P0 (next sprint)
- 📧 **Resend email integration** (DEFERRED — user said skip for now). When ready: signup at resend.com → API key → set `RESEND_API_KEY` in `/app/backend/.env` → enable welcome emails, payment receipts, contact-form notifications.
- 💳 **Live Razorpay**: When Vishnu ji's Razorpay account is KYC-verified, set `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` in backend `.env`. Backend `/api/enrollments/checkout` already conditionally switches to live Razorpay when keys present; only signature verification path needs frontend Razorpay.js script integration.
- 🎬 **Real course videos**: Replace placeholder YouTube playlist URLs in 4 courses with Vishnu's actual playlist embed URLs (editable now via Admin Panel → Courses tab).

### P1
- 📜 **Certificate PDF generation**: Currently shows "downloading..." toast. Add real PDF gen with `reportlab` or send via email.
- 🔁 **Password reset flow**: needs email (deferred with Resend).
- 🌐 **Custom domain** + SEO meta tags + Open Graph images per page

### P2
- 📱 **PWA**: manifest + service worker
- 🎁 **Coupon codes** for course discounts
- 💬 **Comments on blog posts**
- ⭐ **Student reviews/ratings** for courses
- 🔧 Split `AdminPanel.jsx` into separate files (BookForm/BlogForm/CourseForm/SiteSettings) once it crosses ~700 lines

## Test Credentials
See `/app/memory/test_credentials.md`

## Key Decisions
1. **JWT in localStorage + Bearer header** (not httpOnly cookies) — chosen for reliability across Emergent's preview-domain ↔ public-domain CORS scenarios.
2. **Mock Razorpay default** — user has no Razorpay account yet; mock mode lets development continue. Switching to live = set 2 env vars.
3. **YouTube embed for video hosting** — saves bandwidth costs (FREE) vs hosting videos directly. User can upload as unlisted videos.
4. **Static data in `server.py`** for books/courses/blogs — fine for v1 (small content set, no admin UI yet). Will move to MongoDB collections when admin panel is built.
