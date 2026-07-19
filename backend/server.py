from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import json
import logging
import secrets
import bcrypt
import re
import jwt
import razorpay
import cloudinary
import cloudinary.uploader
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated
from bson import ObjectId

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, BeforeValidator, ConfigDict

import email_service
import httpx
import hmac
import hashlib

# ── Shiprocket config ──
SHIPROCKET_EMAIL = os.environ.get("SHIPROCKET_EMAIL", "").strip()
SHIPROCKET_PASSWORD = os.environ.get("SHIPROCKET_PASSWORD", "").strip()
SHIPROCKET_PICKUP_LOCATION = os.environ.get("SHIPROCKET_PICKUP_LOCATION", "Primary").strip()
SHIPROCKET_ENABLED = bool(SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD)
_shiprocket_token: dict = {"token": None, "expires_at": None}

async def get_shiprocket_token() -> Optional[str]:
    """Get a fresh Shiprocket token (cached for 9 days)."""
    if not SHIPROCKET_ENABLED:
        return None
    now = datetime.now(timezone.utc)
    if _shiprocket_token["token"] and _shiprocket_token["expires_at"] and now < _shiprocket_token["expires_at"]:
        return _shiprocket_token["token"]
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post("https://apiv2.shiprocket.in/v1/external/auth/login", json={
            "email": SHIPROCKET_EMAIL, "password": SHIPROCKET_PASSWORD
        })
        if r.status_code != 200:
            logger.error(f"Shiprocket auth failed: {r.text}")
            return None
        data = r.json()
        _shiprocket_token["token"] = data.get("token")
        _shiprocket_token["expires_at"] = now + timedelta(days=9)
        return _shiprocket_token["token"]

async def create_shiprocket_order(book_order: dict) -> Optional[dict]:
    """Create a shipment on Shiprocket."""
    token = await get_shiprocket_token()
    if not token:
        return None
    addr = book_order.get("address", {})
    payload = {
        "order_id": str(book_order["_id"]),
        "order_date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "pickup_location": SHIPROCKET_PICKUP_LOCATION,
        "channel_id": "",
        "billing_customer_name": book_order["name"],
        "billing_last_name": "",
        "billing_address": addr.get("line1", ""),
        "billing_address_2": addr.get("line2", ""),
        "billing_city": addr.get("city", ""),
        "billing_pincode": addr.get("pincode", ""),
        "billing_state": addr.get("state", ""),
        "billing_country": "India",
        "billing_email": book_order.get("email", ""),
        "billing_phone": book_order.get("phone", ""),
        "shipping_is_billing": True,
        "order_items": [
            {
                "name": it.get("book_title", "Signed Book"),
                "sku": it.get("book_slug", "book"),
                "units": it.get("quantity", 1),
                "selling_price": it.get("unit_price", 0),
            } for it in (book_order.get("items") or [{
                "book_title": book_order.get("book_title", "Signed Book"),
                "book_slug": book_order.get("book_slug", "book"),
                "quantity": book_order.get("quantity", 1),
                "unit_price": book_order.get("amount", 0),
            }])
        ],
        "payment_method": "Prepaid" if book_order.get("payment_mode") != "cod" else "COD",
        "sub_total": book_order.get("amount", 0),
        "length": 22, "breadth": 15, "height": 3, "weight": 0.5,
    }
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(
            "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
            json=payload, headers={"Authorization": f"Bearer {token}"}
        )
        if r.status_code not in (200, 201):
            logger.error(f"Shiprocket order create failed: {r.text}")
            return None
        data = r.json()
        return {
            "shiprocket_order_id": data.get("order_id"),
            "shipment_id": data.get("shipment_id"),
            "awb": data.get("awb_code", ""),
            "tracking_url": f"https://shiprocket.co/tracking/{data.get('awb_code', '')}",
        }

async def fetch_shiprocket_tracking(awb: str) -> Optional[dict]:
    """Fetch live tracking info for an AWB."""
    token = await get_shiprocket_token()
    if not token or not awb:
        return None
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            f"https://apiv2.shiprocket.in/v1/external/courier/track/awb/{awb}",
            headers={"Authorization": f"Bearer {token}"}
        )
        if r.status_code != 200:
            return None
        data = r.json()
        td = data.get("tracking_data", {})
        shipment_track = td.get("shipment_track", [{}])
        latest = shipment_track[0] if shipment_track else {}
        activities = td.get("shipment_track_activities", [])
        return {
            "current_status": latest.get("current_status", "Processing"),
            "delivered": latest.get("delivered", False),
            "awb": awb,
            "activities": [{"date": a.get("date"), "activity": a.get("activity"), "location": a.get("location")} for a in activities[:5]],
        }
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8 MB

# ── Cloudinary config (server-side only; uses signed uploads via API secret) ──
CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "").strip()
CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY", "").strip()
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "").strip()
CLOUDINARY_FOLDER = os.environ.get("CLOUDINARY_FOLDER", "vishnu_raghav").strip() or "vishnu_raghav"
CLOUDINARY_ENABLED = bool(CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET)
if CLOUDINARY_ENABLED:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True,
    )

# ── Razorpay config (server-side; mode-aware) ──
# RAZORPAY_MODE = "test" | "live" | "" (auto-detect from key prefix)
# When set to "test", a key starting with "rzp_live_" is REFUSED at startup
# to prevent accidental real-money charges in non-production environments.
RAZORPAY_MODE = os.environ.get("RAZORPAY_MODE", "").strip().lower()
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "").strip()
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()
RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "").strip()

def _razorpay_detected_mode(key: str) -> str:
    if not key:
        return "mock"
    if key.startswith("rzp_test_"):
        return "test"
    if key.startswith("rzp_live_"):
        return "live"
    return "unknown"

RAZORPAY_DETECTED_MODE = _razorpay_detected_mode(RAZORPAY_KEY_ID)
RAZORPAY_ENABLED = bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)

# ───── Mongo ─────
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

# ───── Helpers ─────
PyObjectId = Annotated[str, BeforeValidator(str)]

def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def serialize_user(u: dict) -> dict:
    return {
        "id": str(u["_id"]),
        "email": u["email"],
        "name": u.get("name", ""),
        "role": u.get("role", "student"),
        "phone": u.get("phone", ""),
        "city": u.get("city", ""),
        "occupation": u.get("occupation", ""),
        "created_at": u.get("created_at", datetime.now(timezone.utc)).isoformat() if isinstance(u.get("created_at"), datetime) else u.get("created_at"),
    }

async def get_current_user(request: Request) -> dict:
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user

# ───── App ─────
app = FastAPI(title="Vishnu Raghav Platform")
api = APIRouter(prefix="/api")

# ───── Schemas ─────
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = ""

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    occupation: Optional[str] = None

class NewsletterIn(BaseModel):
    email: EmailStr

class ContactIn(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = ""
    purpose: Optional[str] = "General"
    message: str

class EnrollIn(BaseModel):
    course_slug: str
    coupon_code: Optional[str] = None

class CouponValidateIn(BaseModel):
    code: str
    course_slug: str

class CouponIn(BaseModel):
    code: str
    kind: str
    value: int
    expires_at: Optional[str] = None
    max_uses: Optional[int] = None
    course_slugs: Optional[List[str]] = []
    book_slugs: Optional[List[str]] = []
    applies_to: Optional[str] = "all"  # "all", "courses", "books"
    active: Optional[bool] = True

class CouponUpdate(BaseModel):
    kind: Optional[str] = None
    value: Optional[int] = None
    expires_at: Optional[str] = None
    max_uses: Optional[int] = None
    course_slugs: Optional[List[str]] = None
    book_slugs: Optional[List[str]] = None
    applies_to: Optional[str] = None
    active: Optional[bool] = None
# ───── AUTH ─────
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email, "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "phone": body.phone or "", "city": "", "occupation": "",
        "role": "student",
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    token = create_access_token(str(doc["_id"]), email)
    response.set_cookie("access_token", token, httponly=True, samesite="lax", max_age=604800, path="/")
    # Fire-and-forget welcome email (fail-soft)
    try:
        await email_service.send_welcome(doc["name"], email)
    except Exception:
        logger.exception("welcome email failed")
    return {"user": serialize_user(doc), "token": token}

@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(str(user["_id"]), email)
    response.set_cookie("access_token", token, httponly=True, samesite="lax", max_age=604800, path="/")
    return {"user": serialize_user(user), "token": token}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return serialize_user(user)

@api.patch("/auth/profile")
async def update_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        await db.users.update_one({"_id": user["_id"]}, {"$set": updates})
    fresh = await db.users.find_one({"_id": user["_id"]})
    return serialize_user(fresh)

# ───── CONTENT (Books, Courses, Blogs) ─────
# Books are returned from a static seeded list since author has fixed list
BOOKS = [
    {
        "slug": "jo-mai-kah-na-saka",
        "title": "Jo Mai Kah Na Saka",
        "hindi": "जो मैं कह न सका",
        "tagline": "फिर ईश्वर भी स्तब्ध रह गया वो बातें सुनकर",
        "publisher": "BlueRose ONE",
        "price": "₹220",
        "description": "Dives into unspoken emotions — thoughts suppressed, words trapped forever. Even God was speechless hearing what this book finally says.",
        "excerpt": "Ek prashn kiya kisine: aakhir marne ke baad kya hoga? Lekin laut kar nahi aaye, jinke naye kapde rakhe reh gaye — unke ghar jakar dekho ek baar kaise hota hai bichhadna...",
        "takeaways": [
            "The weight of words never spoken",
            "Confronting buried emotions",
            "Why silence destroys relationships",
            "Peace with what was left unsaid",
        ],
        "amazon": "https://www.amazon.in/dp/9375427781?ref_=cm_sw_r_ffobk_cp_ud_dp_bzr_WXXSV5GVBQ6HVCNF1CTC",
        "flipkart": "",
        "badge": "",
        "cover_palette": ["#1a3a5c", "#2c5f8a"],
        "cover_image": "https://customer-assets.emergentagent.com/job_vishnu-books/artifacts/7oyl66rr_WhatsApp%20Image%202026-06-01%20at%2023.17.43%20%281%29.jpeg",
        "status": "available",
    },
    {
        "slug": "dagmagate-pair",
        "title": "Dagmagate Pair",
        "hindi": "डगमगाते पैर",
        "tagline": "रोक सको तो रोक लो वरना सब बिखर जाएगा",
        "publisher": "BlueRose ONE · Co-author: Yatin Tyagi",
        "price": "₹220",
        "description": "A deeply honest book about life's instability — accepting weakness, finding clarity, and choosing to stay when everything inside says run. ISBN: 9789375427780",
        "excerpt": "Yeh kitab kisi mahaan vyakti ki nahi hai. Yeh ek sadharan insaan ki hai jo thak gaya tha — aur bhaagne ke bajay ruk gaya. Dagmagate pair kamjori ki sweekarokti hai...",
        "takeaways": [
            "Accepting weakness as strength",
            "Finding clarity in life's heaviness",
            "Why stopping is the bravest act",
            "The price of unspoken goodbyes",
        ],
        "amazon": "https://amzn.in/d/08fg9q3O",
        "flipkart": "https://dl.flipkart.com/dl/dagmagate-pair-rok-sako-lo-varna-sab-bikhar-jayega/p/itm5db88a967e173?pid=9789375427780&lid=LSTBOK9789375427780HTL2WZ",
        "badge": "Bestseller",
        "cover_palette": ["#4a6741", "#8a9a5a"],
        "cover_image": "https://customer-assets.emergentagent.com/job_vishnu-books/artifacts/h0xx2nem_WhatsApp%20Image%202026-06-01%20at%2023.17.42%20%281%29.jpeg",
        "status": "available",
    },
    {
        "slug": "uljha-jeevan",
        "title": "Uljha Jeevan",
        "hindi": "उलझा जीवन",
        "tagline": "बस कुछ पल और, फिर यह रात भी बीत जाएगी",
        "publisher": "A Practical Guide to Overthinking",
        "price": "Coming Soon",
        "description": "Vishnu's upcoming book — a practical guide to the overthinking mind. Exploring fear, uncertainty, and the path to reclaiming mental peace and clarity.",
        "excerpt": "Bas kuch pal aur, fir yeh raat bhi beet jayegi. Jab zindagi ulajh jaaye aur har raat ek prashn ban jaaye — tab yeh kitab tumhare saath khadi rahegi...",
        "takeaways": [
            "Why the mind cannot stop thinking",
            "The fear behind every overthought",
            "Practical tools for mental silence",
            "How to accept an uncertain life",
        ],
        "amazon": "",
        "flipkart": "",
        "badge": "Coming Soon",
        "cover_palette": ["#1a0a0a", "#3d0000"],
        "cover_image": "https://customer-assets.emergentagent.com/job_vishnu-books/artifacts/tgt6qdm1_WhatsApp%20Image%202026-06-01%20at%2023.17.43.jpeg",
        "status": "upcoming",
    },
]

VISHNU_PHOTO_URL = "https://customer-assets.emergentagent.com/job_vishnu-books/artifacts/y6mn6cdy_WhatsApp%20Image%202026-06-01%20at%2023.17.42.jpeg"

# Default YouTube videos shown in the YT section.
# `url` can be a full youtube link (watch?v=, youtu.be/, /shorts/) — frontend will extract video ID for thumbnail.
# Empty url = no real thumbnail (gradient placeholder used).
DEFAULT_YT_VIDEOS = [
    {"title": "Time Management की पूरी Guide", "url": "", "palette": ["#1a1228", "#3a2865"]},
    {"title": "Overthinking को कैसे रोकें — 5 Steps", "url": "", "palette": ["#120c28", "#2c1870"]},
    {"title": "Failure के बाद कैसे उठें — Real Talk", "url": "", "palette": ["#1a0a10", "#4a1030"]},
]

COURSES = [
    {
        "slug": "time-management-mastery",
        "title": "Time Management Mastery",
        "tagline": "A complete system to own every hour of your day",
        "icon": "Clock",
        "price": 1999, "original_price": 4999,
        "duration": "6 Weeks", "lessons": 40, "modules": 6, "level": "All Levels",
        "rating": 4.9, "students": 820,
        "featured": True, "new": False, "color": "gold",
        "palette": ["#1a1228", "#3a2865"],
        "youtube_playlist": "https://www.youtube.com/embed/videoseries?list=PLrAXtmRdnEQy6nuLMHjMZOz59Oq8B9bDe",
        "modules_detail": [
            {"title": "Foundation: Audit Your Time", "lessons": 6},
            {"title": "Prioritization Frameworks", "lessons": 7},
            {"title": "Deep Work Systems", "lessons": 7},
            {"title": "Weekly & Daily Planning", "lessons": 6},
            {"title": "Energy Management", "lessons": 7},
            {"title": "Sustaining the System", "lessons": 7},
        ],
    },
    {
        "slug": "overcoming-overthinking",
        "title": "Overcoming Overthinking",
        "tagline": "Silence the mental noise and reclaim your peace",
        "icon": "Brain",
        "price": 1499, "original_price": 3499,
        "duration": "4 Weeks", "lessons": 30, "modules": 4, "level": "Beginner",
        "rating": 4.8, "students": 540,
        "featured": False, "new": True, "color": "purple",
        "palette": ["#120c28", "#2c1870"],
        "youtube_playlist": "https://www.youtube.com/embed/videoseries?list=PLrAXtmRdnEQy6nuLMHjMZOz59Oq8B9bDe",
        "modules_detail": [
            {"title": "Why You Overthink", "lessons": 7},
            {"title": "Pattern Disruption", "lessons": 8},
            {"title": "Mental Hygiene Habits", "lessons": 8},
            {"title": "Living with Uncertainty", "lessons": 7},
        ],
    },
    {
        "slug": "mind-control-meditation",
        "title": "Mind Control & Meditation",
        "tagline": "Daily practices for inner calm and sharp focus",
        "icon": "Sparkles",
        "price": 999, "original_price": 2499,
        "duration": "3 Weeks", "lessons": 22, "modules": 3, "level": "All Levels",
        "rating": 4.7, "students": 310,
        "featured": False, "new": False, "color": "purple",
        "palette": ["#0c1a18", "#0c4034"],
        "youtube_playlist": "https://www.youtube.com/embed/videoseries?list=PLrAXtmRdnEQy6nuLMHjMZOz59Oq8B9bDe",
        "modules_detail": [
            {"title": "Understanding the Mind", "lessons": 7},
            {"title": "Daily Meditation Practice", "lessons": 8},
            {"title": "Advanced Focus Tools", "lessons": 7},
        ],
    },
    {
        "slug": "relationship-emotional-clarity",
        "title": "Relationship & Emotional Clarity",
        "tagline": "Understand yourself and the people around you",
        "icon": "Heart",
        "price": 1299, "original_price": 2999,
        "duration": "4 Weeks", "lessons": 28, "modules": 4, "level": "All Levels",
        "rating": 4.8, "students": 420,
        "featured": False, "new": False, "color": "purple",
        "palette": ["#1a0a18", "#4a1040"],
        "youtube_playlist": "https://www.youtube.com/embed/videoseries?list=PLrAXtmRdnEQy6nuLMHjMZOz59Oq8B9bDe",
        "modules_detail": [
            {"title": "Self-Awareness Basics", "lessons": 7},
            {"title": "Emotional Communication", "lessons": 7},
            {"title": "Conflict & Boundaries", "lessons": 7},
            {"title": "Long-term Connection", "lessons": 7},
        ],
    },
]

BLOG_POSTS = [
    {
        "slug": "5-productivity-habits", "category": "productivity",
        "title": "5 Productivity Habits That Changed My Life",
        "excerpt": "Simple daily systems that compound into massive life changes over time. From the morning routine to the night routine.",
        "date": "Feb 12, 2026", "read_min": 5, "featured": True, "palette": ["#1a1228", "#3a2865"], "icon": "Zap",
        "body": "Habit 1: The 90-Minute Deep Work Block. Habit 2: Single-Tasking with a Timer. Habit 3: Two Daily Reviews. Habit 4: Strict Phone-Free First Hour. Habit 5: Weekly Reset Sundays.\n\nEach of these compounded over 18 months turned my chaotic days into a calm, output-rich life. Start with one. Stack the rest as it becomes second nature.",
    },
    {
        "slug": "busy-but-not-productive", "category": "time",
        "title": "Why You're Always Busy But Never Productive",
        "excerpt": "The difference between activity and achievement — how to cross the gap.",
        "date": "Feb 5, 2026", "read_min": 7, "featured": False, "palette": ["#120c28", "#2c1870"], "icon": "Clock",
        "body": "Busy is a feeling. Productive is an outcome. This article breaks down the 3 traps that keep professionals stuck in motion without progress, and the 1 weekly review ritual that fixes it.",
    },
    {
        "slug": "wrote-first-book-working-fulltime", "category": "motivation",
        "title": "How I Wrote My First Book While Working Full Time",
        "excerpt": "The story behind Dagmagate Pair and lessons learned along the way.",
        "date": "Jan 28, 2026", "read_min": 9, "featured": False, "palette": ["#1a0a10", "#4a1030"], "icon": "Flame",
        "body": "Most of my first book was written between 5:00 AM and 6:30 AM. Here's the system, the doubts, the 4 rewrites, and the moment I almost quit.",
    },
    {
        "slug": "2-hour-study-method", "category": "study",
        "title": "The 2-Hour Study Method That Actually Works",
        "excerpt": "Study less, retain more — the science-backed system.",
        "date": "Jan 18, 2026", "read_min": 6, "featured": False, "palette": ["#0c1a18", "#0c4034"], "icon": "BookOpen",
        "body": "The 2-hour method is based on 4×25-minute focus blocks + spaced recall. This article walks through exactly how to structure your 2 hours for maximum retention.",
    },
    {
        "slug": "career-clarity-guide", "category": "career",
        "title": "From Confused to Confident — Career Clarity Guide",
        "excerpt": "Step-by-step framework to find direction professionally.",
        "date": "Jan 10, 2026", "read_min": 8, "featured": False, "palette": ["#0c1428", "#1c3048"], "icon": "Briefcase",
        "body": "The 3-question framework I use to coach students into clarity: What energizes you? What are you naturally good at? What would the market pay for? Find the overlap.",
    },
]

@api.get("/site/assets")
async def site_assets():
    settings = await db.site_settings.find_one({"_id": "main"}) or {}
    return {
        "author_photo": settings.get("author_photo", VISHNU_PHOTO_URL),
        "hero_quote": settings.get("hero_quote", ""),
        "youtube_videos": settings.get("youtube_videos", DEFAULT_YT_VIDEOS),
        "youtube_channel_url": settings.get("youtube_channel_url", "https://youtube.com/@vishnuraghav"),
    }

@api.get("/books")
async def list_books():
    cursor = db.books.find({}, {"_id": 0}).sort("order", 1)
    items = await cursor.to_list(100)
    if not items:
        return BOOKS
    return items

@api.get("/books/{slug}")
async def get_book(slug: str):
    book = await db.books.find_one({"slug": slug}, {"_id": 0})
    if not book:
        book = next((b for b in BOOKS if b["slug"] == slug), None)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book

@api.get("/courses")
async def list_courses():
    cursor = db.courses.find({}, {"_id": 0}).sort("order", 1)
    items = await cursor.to_list(100)
    if not items:
        return COURSES
    return items

@api.get("/courses/{slug}")
async def get_course(slug: str):
    course = await db.courses.find_one({"slug": slug}, {"_id": 0})
    if not course:
        course = next((c for c in COURSES if c["slug"] == slug), None)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

@api.get("/blog")
async def list_blog(category: Optional[str] = None, q: Optional[str] = None):
    cursor = db.blog_posts.find({}, {"_id": 0}).sort("order", 1)
    posts = await cursor.to_list(200)
    if not posts:
        posts = list(BLOG_POSTS)
    if category and category != "all":
        posts = [p for p in posts if p.get("category") == category]
    if q:
        ql = q.lower()
        posts = [p for p in posts if ql in p.get("title", "").lower() or ql in p.get("excerpt", "").lower()]
    return posts

@api.get("/blog/{slug}")
async def get_blog(slug: str):
    post = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not post:
        post = next((p for p in BLOG_POSTS if p["slug"] == slug), None)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

# ───── COUPONS ─────
def _parse_iso(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        if len(s) == 10:  # YYYY-MM-DD
            return datetime.fromisoformat(s + "T23:59:59+00:00")
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None

async def _evaluate_coupon(code: str, course_slug: str) -> dict:
    """Returns {valid, message, discount, final_amount, original_amount, coupon} for a (code, course) pair.
    discount/final_amount/original_amount are in rupees (int)."""
    code = (code or "").strip().upper()
    if not code:
        return {"valid": False, "message": "Enter a coupon code"}
    coupon = await db.coupons.find_one({"code": code})
    if not coupon or not coupon.get("active", True):
        return {"valid": False, "message": "Invalid coupon code"}
    exp = _parse_iso(coupon.get("expires_at"))
    if exp and datetime.now(timezone.utc) > exp:
        return {"valid": False, "message": "This coupon has expired"}
    max_uses = coupon.get("max_uses")
    if max_uses is not None and coupon.get("used_count", 0) >= max_uses:
        return {"valid": False, "message": "This coupon has reached its usage limit"}
    allowed_slugs = coupon.get("course_slugs") or []
    if allowed_slugs and course_slug not in allowed_slugs:
        return {"valid": False, "message": "This coupon is not valid for this course"}
    course = await db.courses.find_one({"slug": course_slug}, {"_id": 0}) \
        or next((c for c in COURSES if c["slug"] == course_slug), None)
    if not course:
        return {"valid": False, "message": "Course not found"}
    original = int(course["price"])
    kind = coupon.get("kind", "percent")
    value = int(coupon.get("value", 0))
    if kind == "percent":
        discount = original * max(0, min(100, value)) // 100
    else:  # fixed
        discount = min(original, max(0, value))
    final_amount = max(0, original - discount)
    return {
        "valid": True,
        "message": "Coupon applied",
        "code": code,
        "kind": kind,
        "value": value,
        "discount": discount,
        "original_amount": original,
        "final_amount": final_amount,
    }

@api.post("/coupons/validate")
async def coupons_validate(body: CouponValidateIn, _: dict = Depends(get_current_user)):
    return await _evaluate_coupon(body.code, body.course_slug)

class BookCouponValidateIn(BaseModel):
    code: str
    amount: int  # total cart amount before discount
@api.post("/coupons/validate-book")
async def coupons_validate_book(body: BookCouponValidateIn, _: dict = Depends(get_current_user)):
    code = (body.code or "").strip().upper()
    if not code:
        return {"valid": False, "message": "Enter a coupon code"}
    coupon = await db.coupons.find_one({"code": code})
    if not coupon or not coupon.get("active", True):
        return {"valid": False, "message": "Invalid coupon code"}
    exp = _parse_iso(coupon.get("expires_at"))
    if exp and datetime.now(timezone.utc) > exp:
        return {"valid": False, "message": "This coupon has expired"}
    max_uses = coupon.get("max_uses")
    if max_uses is not None and coupon.get("used_count", 0) >= max_uses:
        return {"valid": False, "message": "This coupon has reached its usage limit"}
    applies_to = coupon.get("applies_to", "all")
    if applies_to == "courses":
        return {"valid": False, "message": "This coupon is only valid for courses"}
    kind = coupon.get("kind", "percent")
    value = int(coupon.get("value", 0))
    original = body.amount
    if kind == "percent":
        discount = original * max(0, min(100, value)) // 100
    else:
        discount = min(original, max(0, value))
    final_amount = max(0, original - discount)
    return {
        "valid": True,
        "message": f"Coupon applied — ₹{discount} off!",
        "code": code,
        "kind": kind,
        "value": value,
        "discount": discount,
        "original_amount": original,
        "final_amount": final_amount,
    }

# ───── ENROLLMENT & PAYMENT (mock-ready Razorpay) ─────
@api.post("/enrollments/checkout")
async def checkout(body: EnrollIn, user: dict = Depends(get_current_user)):
    course = next((c for c in COURSES if c["slug"] == body.course_slug), None)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check if already enrolled
    existing = await db.enrollments.find_one({"user_id": str(user["_id"]), "course_slug": body.course_slug, "status": "paid"})
    if existing:
        return {"already_enrolled": True, "enrollment_id": str(existing["_id"])}

    # Apply coupon if provided
    original_price = int(course["price"])
    final_price = original_price
    applied_coupon = None
    applied_discount = 0
    if body.coupon_code:
        evalc = await _evaluate_coupon(body.coupon_code, body.course_slug)
        if not evalc["valid"]:
            raise HTTPException(status_code=400, detail=evalc["message"])
        final_price = evalc["final_amount"]
        applied_coupon = evalc["code"]
        applied_discount = evalc["discount"]

    # Create pending enrollment
    enrollment = {
        "user_id": str(user["_id"]),
        "course_slug": body.course_slug,
        "course_title": course["title"],
        "amount": final_price,
        "original_amount": original_price,
        "coupon_code": applied_coupon,
        "discount": applied_discount,
        "currency": "INR",
        "status": "pending",
        "razorpay_order_id": None,
        "razorpay_payment_id": None,
        "created_at": datetime.now(timezone.utc),
        "progress_pct": 0,
        "completed_lessons": [],
    }
    rzp_key = RAZORPAY_KEY_ID
    rzp_secret = RAZORPAY_KEY_SECRET

    if rzp_key and rzp_secret:
        # Real Razorpay flow — create an Order via the Razorpay Orders API
        try:
            client_rzp = razorpay.Client(auth=(rzp_key, rzp_secret))
            amount_paise = max(100, final_price * 100)
            # Receipt must be <= 40 chars
            user_id_short = str(user["_id"])[-10:]
            receipt = f"vr_{body.course_slug[:20]}_{user_id_short}"[:40]
            rzp_order = client_rzp.order.create({
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt,
                "payment_capture": 1,
                "notes": {
                    "course_slug": body.course_slug,
                    "user_id": str(user["_id"]),
                    "user_email": user.get("email", ""),
                    "coupon_code": applied_coupon or "",
                },
            })
        except razorpay.errors.BadRequestError as e:
            logger.exception("Razorpay BadRequest")
            raise HTTPException(status_code=400, detail=f"Razorpay error: {e}")
        except Exception:
            logger.exception("Razorpay order create failed")
            raise HTTPException(status_code=500, detail="Could not initiate payment. Please try again.")

        enrollment["payment_mode"] = f"razorpay_{RAZORPAY_DETECTED_MODE}"
        enrollment["razorpay_order_id"] = rzp_order["id"]
        res = await db.enrollments.insert_one(enrollment)
        return {
            "mode": "razorpay",
            "razorpay_key": rzp_key,
            "order_id": rzp_order["id"],
            "amount_paise": rzp_order["amount"],
            "currency": rzp_order["currency"],
            "enrollment_id": str(res.inserted_id),
            "course_title": course["title"],
            "original_amount": original_price,
            "amount": final_price,
            "discount": applied_discount,
            "coupon_code": applied_coupon,
            "prefill": {
                "name": user.get("name", ""),
                "email": user.get("email", ""),
                "contact": user.get("phone", ""),
            },
        }
    else:
        # Mock mode: simulate immediate payment for development
        enrollment["payment_mode"] = "test_mock"
        enrollment["status"] = "paid"
        enrollment["razorpay_payment_id"] = f"pay_mock_{secrets.token_hex(6)}"
        enrollment["paid_at"] = datetime.now(timezone.utc)
        res = await db.enrollments.insert_one(enrollment)
        if applied_coupon:
            await db.coupons.update_one({"code": applied_coupon}, {"$inc": {"used_count": 1}})
        return {
            "mode": "mock",
            "enrollment_id": str(res.inserted_id),
            "status": "paid",
            "course_title": course["title"],
            "amount": final_price,
            "original_amount": original_price,
            "discount": applied_discount,
            "coupon_code": applied_coupon,
            "transaction_id": enrollment["razorpay_payment_id"],
        }

class VerifyIn(BaseModel):
    enrollment_id: str
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str

@api.post("/enrollments/verify")
async def verify_payment(body: VerifyIn, user: dict = Depends(get_current_user)):
    enrollment = await db.enrollments.find_one({"_id": ObjectId(body.enrollment_id), "user_id": str(user["_id"])})
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    # Defensive: order_id in body must match the order_id created at checkout for this enrollment
    if enrollment.get("razorpay_order_id") and enrollment["razorpay_order_id"] != body.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Order id mismatch")
    rzp_secret = RAZORPAY_KEY_SECRET
    # Fail-closed: if the enrollment was created against real Razorpay, the secret MUST be present
    if enrollment.get("payment_mode", "").startswith("razorpay_") and enrollment.get("payment_mode") != "razorpay_mock" and not rzp_secret:
        raise HTTPException(status_code=500, detail="Server payment misconfiguration")
    if rzp_secret:
        import hmac, hashlib
        msg = f"{body.razorpay_order_id}|{body.razorpay_payment_id}"
        expected = hmac.new(rzp_secret.encode(), msg.encode(), hashlib.sha256).hexdigest()
        if expected != body.razorpay_signature:
            raise HTTPException(status_code=400, detail="Invalid payment signature")
    await db.enrollments.update_one(
        {"_id": enrollment["_id"]},
        {"$set": {"status": "paid", "razorpay_payment_id": body.razorpay_payment_id,
                  "paid_at": datetime.now(timezone.utc)}}
    )
    # Increment coupon usage exactly once on payment success
    if enrollment.get("coupon_code") and enrollment.get("status") != "paid":
        await db.coupons.update_one({"code": enrollment["coupon_code"]}, {"$inc": {"used_count": 1}})
    return {"status": "paid", "course_slug": enrollment["course_slug"]}

# ───── RAZORPAY WEBHOOK ─────
# Server-to-server backstop in case the browser never POSTs to /enrollments/verify
# (network drop, user closes tab, mobile app crash, etc).
# Configure in Razorpay Dashboard → Settings → Webhooks:
#   URL:    https://<your-domain>/api/razorpay/webhook
#   Events: payment.captured, payment.failed, order.paid
#   Secret: copy the generated secret into RAZORPAY_WEBHOOK_SECRET in /app/backend/.env
async def _mark_paid_from_webhook(order_id: str, payment_id: str):
    """Idempotent: marks the enrollment paid and increments coupon usage exactly once."""
    if not order_id:
        return False
    enrollment = await db.enrollments.find_one({"razorpay_order_id": order_id})
    if not enrollment:
        logger.warning(f"Webhook for unknown order_id={order_id}")
        return False
    if enrollment.get("status") == "paid":
        # Already verified by the client — nothing to do
        return True
    await db.enrollments.update_one(
        {"_id": enrollment["_id"], "status": {"$ne": "paid"}},
        {"$set": {
            "status": "paid",
            "razorpay_payment_id": payment_id or enrollment.get("razorpay_payment_id"),
            "paid_at": datetime.now(timezone.utc),
            "paid_via": "webhook",
        }},
    )
    if enrollment.get("coupon_code"):
        await db.coupons.update_one(
            {"code": enrollment["coupon_code"]},
            {"$inc": {"used_count": 1}},
        )
    logger.info(f"Webhook marked enrollment {enrollment['_id']} paid (order={order_id})")
    return True

@api.post("/razorpay/webhook")
async def razorpay_webhook(request: Request):
    webhook_secret = RAZORPAY_WEBHOOK_SECRET
    if not webhook_secret:
        # If admin hasn't configured the webhook secret yet, refuse — never silently accept.
        logger.error("Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not configured")
        raise HTTPException(status_code=503, detail="Webhook not configured")

    raw_body = await request.body()
    sent_sig = request.headers.get("x-razorpay-signature", "")
    if not sent_sig:
        raise HTTPException(status_code=400, detail="Missing signature")

    import hmac, hashlib
    expected_sig = hmac.new(webhook_secret.encode(), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_sig, sent_sig):
        logger.warning("Razorpay webhook signature mismatch")
        raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event = payload.get("event", "")
    entities = payload.get("payload", {}) or {}

    if event in ("payment.captured", "payment.authorized"):
        pe = (entities.get("payment", {}) or {}).get("entity", {}) or {}
        order_id = pe.get("order_id")
        payment_id = pe.get("id")
        await _mark_paid_from_webhook(order_id, payment_id)
    elif event == "order.paid":
        oe = (entities.get("order", {}) or {}).get("entity", {}) or {}
        order_id = oe.get("id")
        pe = (entities.get("payment", {}) or {}).get("entity", {}) or {}
        payment_id = pe.get("id")
        await _mark_paid_from_webhook(order_id, payment_id)
    elif event == "payment.failed":
        pe = (entities.get("payment", {}) or {}).get("entity", {}) or {}
        order_id = pe.get("order_id")
        if order_id:
            await db.enrollments.update_one(
                {"razorpay_order_id": order_id, "status": "pending"},
                {"$set": {"status": "failed",
                          "failed_at": datetime.now(timezone.utc),
                          "failure_reason": pe.get("error_description", "")}},
            )
    else:
        logger.info(f"Razorpay webhook event ignored: {event}")

    # Always 200 — Razorpay will retry on non-2xx for up to 24 h.
    return {"ok": True}

@api.get("/enrollments/me")
async def my_enrollments(user: dict = Depends(get_current_user)):
    cursor = db.enrollments.find({"user_id": str(user["_id"])}).sort("created_at", -1)
    items = []
    async for e in cursor:
        c = next((c for c in COURSES if c["slug"] == e["course_slug"]), None)
        items.append({
            "id": str(e["_id"]),
            "course_slug": e["course_slug"],
            "course_title": e.get("course_title"),
            "course_tagline": c["tagline"] if c else "",
            "course_icon": c["icon"] if c else "BookOpen",
            "course_palette": c["palette"] if c else ["#222", "#333"],
            "amount": e["amount"],
            "status": e["status"],
            "progress_pct": e.get("progress_pct", 0),
            "completed_lessons": e.get("completed_lessons", []),
            "created_at": e["created_at"].isoformat() if isinstance(e.get("created_at"), datetime) else e.get("created_at"),
            "transaction_id": e.get("razorpay_payment_id", ""),
            "payment_mode": e.get("payment_mode", ""),
        })
    return items

@api.get("/enrollments/access/{course_slug}")
async def check_access(course_slug: str, user: dict = Depends(get_current_user)):
    enrollment = await db.enrollments.find_one({
        "user_id": str(user["_id"]),
        "course_slug": course_slug,
        "status": "paid",
    })
    if not enrollment:
        return {"access": False}
    course = next((c for c in COURSES if c["slug"] == course_slug), None)
    return {
        "access": True,
        "enrollment_id": str(enrollment["_id"]),
        "progress_pct": enrollment.get("progress_pct", 0),
        "completed_lessons": enrollment.get("completed_lessons", []),
        "course": course,
    }

class ProgressIn(BaseModel):
    enrollment_id: str
    lesson_id: str
    progress_pct: int

@api.post("/enrollments/progress")
async def update_progress(body: ProgressIn, user: dict = Depends(get_current_user)):
    enrollment = await db.enrollments.find_one({"_id": ObjectId(body.enrollment_id), "user_id": str(user["_id"])})
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    completed = set(enrollment.get("completed_lessons", []))
    completed.add(body.lesson_id)
    await db.enrollments.update_one(
        {"_id": enrollment["_id"]},
        {"$set": {"completed_lessons": list(completed), "progress_pct": min(100, body.progress_pct)}}
    )
    return {"ok": True}

# ───── NEWSLETTER & CONTACT ─────
@api.post("/newsletter/subscribe")
async def newsletter_subscribe(body: NewsletterIn):
    email = body.email.lower().strip()
    existing = await db.newsletter.find_one({"email": email})
    if existing:
        return {"ok": True, "message": "Already subscribed"}
    await db.newsletter.insert_one({"email": email, "created_at": datetime.now(timezone.utc)})
    return {"ok": True, "message": "Subscribed successfully"}

@api.post("/contact")
async def contact(body: ContactIn):
    doc = body.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    await db.contacts.insert_one(doc)
    # Notify admin + auto-respond to sender (fail-soft)
    try:
        await email_service.send_contact_notification(
            body.name, body.email, body.phone or "", body.purpose or "General", body.message
        )
        await email_service.send_contact_autoresponder(body.name, body.email)
    except Exception:
        logger.exception("contact email send failed")
    return {"ok": True, "message": "Message received. We'll respond within 48 hours."}

# ───── PASSWORD RESET ─────
class ForgotPasswordIn(BaseModel):
    email: EmailStr

class ResetPasswordIn(BaseModel):
    token: str
    new_password: str

def _hash_token(t: str) -> str:
    import hashlib
    return hashlib.sha256(t.encode()).hexdigest()

@api.post("/auth/forgot-password")
async def forgot_password(body: ForgotPasswordIn):
    """Always returns success to avoid email enumeration. If the user exists,
    a reset link is emailed; otherwise nothing happens."""
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if user:
        raw_token = secrets.token_urlsafe(32)
        await db.password_resets.insert_one({
            "user_id": str(user["_id"]),
            "email": email,
            "token_hash": _hash_token(raw_token),
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=30),
            "used": False,
            "created_at": datetime.now(timezone.utc),
        })
        frontend = os.environ.get("FRONTEND_URL", "").strip().rstrip("/") or "https://authorvishnuraghav.in"
        reset_url = f"{frontend}/reset-password?token={raw_token}"
        try:
            await email_service.send_password_reset(user.get("name", ""), email, reset_url)
        except Exception:
            logger.exception("password reset email failed")
    return {"ok": True, "message": "If an account exists for that email, a reset link has been sent."}

@api.post("/auth/reset-password")
async def reset_password(body: ResetPasswordIn):
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    rec = await db.password_resets.find_one({"token_hash": _hash_token(body.token), "used": False})
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid or already used reset link")
    exp = rec.get("expires_at")
    if isinstance(exp, datetime) and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if not exp or datetime.now(timezone.utc) > exp:
        raise HTTPException(status_code=400, detail="This reset link has expired")
    user = await db.users.find_one({"_id": ObjectId(rec["user_id"])})
    if not user:
        raise HTTPException(status_code=400, detail="Account not found")
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": hash_password(body.new_password)}}
    )
    await db.password_resets.update_one({"_id": rec["_id"]}, {"$set": {"used": True, "used_at": datetime.now(timezone.utc)}})
    return {"ok": True, "message": "Password updated. You can now sign in."}

# ───── ADMIN: Email test ─────
class TestEmailIn(BaseModel):
    to: EmailStr

@api.post("/admin/test-email")
async def admin_test_email(body: TestEmailIn, _: dict = Depends(require_admin)):
    """Sends a sample welcome email to verify Resend deliverability."""
    eid = await email_service.send_welcome("Test User", body.to)
    if eid is None:
        raise HTTPException(status_code=502, detail="Email send failed (check server logs and RESEND_API_KEY)")
    return {"ok": True, "id": eid, "to": body.to}

# ───── ADMIN ─────
@api.get("/admin/stats")
async def admin_stats(_: dict = Depends(require_admin)):
    users = await db.users.count_documents({})
    enrollments = await db.enrollments.count_documents({"status": "paid"})
    revenue_cursor = db.enrollments.aggregate([
        {"$match": {"status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ])
    revenue = 0
    async for r in revenue_cursor:
        revenue = r["total"]
    contacts = await db.contacts.count_documents({})
    newsletter = await db.newsletter.count_documents({})
    return {
        "users": users, "enrollments": enrollments, "revenue": revenue,
        "contacts": contacts, "newsletter_subs": newsletter,
    }

@api.get("/admin/integrations")
async def admin_integrations(_: dict = Depends(require_admin)):
    """Surface the live state of all third-party integrations so admins can
    confirm what's wired up before going to production."""
    # Mask the key id so it can be safely shown in the admin UI
    masked_key = ""
    if RAZORPAY_KEY_ID:
        masked_key = f"{RAZORPAY_KEY_ID[:11]}…{RAZORPAY_KEY_ID[-4:]}" if len(RAZORPAY_KEY_ID) > 18 else "set"
    return {
        "razorpay": {
            "enabled": RAZORPAY_ENABLED,
            "detected_mode": RAZORPAY_DETECTED_MODE,   # mock | test | live | unknown
            "configured_mode": RAZORPAY_MODE or "auto",
            "webhook_configured": bool(RAZORPAY_WEBHOOK_SECRET),
            "key_id_masked": masked_key,
        },
        "cloudinary": {
            "enabled": CLOUDINARY_ENABLED,
            "folder": CLOUDINARY_FOLDER if CLOUDINARY_ENABLED else None,
        },
        "email": {
            "enabled": bool(os.environ.get("RESEND_API_KEY", "").strip()),
            "sender": os.environ.get("SENDER_EMAIL", "").strip(),
            "admin_notify": os.environ.get("ADMIN_NOTIFY_EMAIL", "").strip(),
        },
        "mongo": {
            "db_name": os.environ.get("DB_NAME", ""),
        },
    }

@api.get("/admin/users")
async def admin_users(_: dict = Depends(require_admin)):
    cursor = db.users.find({}).sort("created_at", -1).limit(200)
    out = []
    async for u in cursor:
        out.append(serialize_user(u))
    return out

@api.get("/admin/enrollments")
async def admin_enrollments(_: dict = Depends(require_admin)):
    cursor = db.enrollments.find({}).sort("created_at", -1).limit(200)
    out = []
    async for e in cursor:
        out.append({
            "id": str(e["_id"]),
            "user_id": e["user_id"], "course_slug": e["course_slug"],
            "course_title": e.get("course_title"),
            "amount": e["amount"], "status": e["status"],
            "created_at": e["created_at"].isoformat() if isinstance(e.get("created_at"), datetime) else e.get("created_at"),
        })
    return out

# ── Admin: Newsletter + Contacts (read) ──
@api.get("/admin/newsletter")
async def admin_newsletter(_: dict = Depends(require_admin)):
    cursor = db.newsletter.find({}).sort("created_at", -1).limit(500)
    out = []
    async for n in cursor:
        out.append({"email": n["email"],
                    "created_at": n["created_at"].isoformat() if isinstance(n.get("created_at"), datetime) else n.get("created_at")})
    return out

@api.get("/admin/contacts")
async def admin_contacts(_: dict = Depends(require_admin)):
    cursor = db.contacts.find({}).sort("created_at", -1).limit(500)
    out = []
    async for c in cursor:
        out.append({
            "id": str(c["_id"]),
            "name": c.get("name"), "email": c.get("email"),
            "phone": c.get("phone", ""), "purpose": c.get("purpose", ""),
            "message": c.get("message", ""),
            "created_at": c["created_at"].isoformat() if isinstance(c.get("created_at"), datetime) else c.get("created_at"),
        })
    return out

# ── Admin: Site Settings ──
class YouTubeVideoIn(BaseModel):
    title: str
    url: Optional[str] = ""
    palette: Optional[List[str]] = ["#1a1228", "#3a2865"]

class SiteSettingsIn(BaseModel):
    author_photo: Optional[str] = None
    hero_quote: Optional[str] = None
    youtube_channel_url: Optional[str] = None
    youtube_videos: Optional[List[YouTubeVideoIn]] = None

@api.patch("/admin/site")
async def admin_site_update(body: SiteSettingsIn, _: dict = Depends(require_admin)):
    raw = body.model_dump(exclude_unset=True)
    updates = {k: v for k, v in raw.items() if v is not None}
    if "youtube_videos" in updates:
        updates["youtube_videos"] = [v.model_dump() if hasattr(v, "model_dump") else v for v in updates["youtube_videos"]]
    if updates:
        await db.site_settings.update_one({"_id": "main"}, {"$set": updates}, upsert=True)
    settings = await db.site_settings.find_one({"_id": "main"}) or {}
    return {
        "author_photo": settings.get("author_photo", VISHNU_PHOTO_URL),
        "hero_quote": settings.get("hero_quote", ""),
        "youtube_videos": settings.get("youtube_videos", DEFAULT_YT_VIDEOS),
        "youtube_channel_url": settings.get("youtube_channel_url", "https://youtube.com/@vishnuraghav"),
    }

# ── Admin: Books CRUD ──
class BookIn(BaseModel):
    slug: str
    title: str
    hindi: Optional[str] = ""
    tagline: Optional[str] = ""
    publisher: Optional[str] = ""
    price: Optional[str] = ""
    signed_price: Optional[int] = 249
    cod_fee: Optional[int] = 40
    description: Optional[str] = ""
    excerpt: Optional[str] = ""
    takeaways: Optional[List[str]] = []
    amazon: Optional[str] = ""
    flipkart: Optional[str] = ""
    badge: Optional[str] = ""
    cover_image: Optional[str] = ""
    cover_palette: Optional[List[str]] = ["#1a3a5c", "#2c5f8a"]
    status: Optional[str] = "available"
    order: Optional[int] = 100

@api.post("/admin/books")
async def admin_create_book(body: BookIn, _: dict = Depends(require_admin)):
    existing = await db.books.find_one({"slug": body.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    doc = body.model_dump()
    await db.books.insert_one(doc)
    return {"ok": True, "slug": body.slug}

class BookUpdate(BaseModel):
    title: Optional[str] = None
    hindi: Optional[str] = None
    tagline: Optional[str] = None
    publisher: Optional[str] = None
    price: Optional[str] = None
    signed_price: Optional[int] = None
    cod_fee: Optional[int] = None
    description: Optional[str] = None
    excerpt: Optional[str] = None
    takeaways: Optional[List[str]] = None
    amazon: Optional[str] = None
    flipkart: Optional[str] = None
    badge: Optional[str] = None
    cover_image: Optional[str] = None
    cover_palette: Optional[List[str]] = None
    status: Optional[str] = None
    order: Optional[int] = None

@api.patch("/admin/books/{slug}")
async def admin_update_book(slug: str, body: BookUpdate, _: dict = Depends(require_admin)):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    # Cascade: if cover is being replaced, destroy the previous Cloudinary asset
    if "cover_image" in updates:
        old = await db.books.find_one({"slug": slug}, {"cover_image": 1, "_id": 0})
        old_url = (old or {}).get("cover_image") or ""
        if old_url and old_url != updates["cover_image"]:
            await _destroy_cloudinary_asset(old_url)
    if updates:
        await db.books.update_one({"slug": slug}, {"$set": updates}, upsert=True)
    return {"ok": True}

@api.delete("/admin/books/{slug}")
async def admin_delete_book(slug: str, _: dict = Depends(require_admin)):
    existing = await db.books.find_one({"slug": slug}, {"cover_image": 1, "_id": 0})
    await db.books.delete_one({"slug": slug})
    if existing and existing.get("cover_image"):
        await _destroy_cloudinary_asset(existing["cover_image"])
    return {"ok": True}

# ── Admin: Blog CRUD ──
class BlogIn(BaseModel):
    slug: str
    title: str
    category: Optional[str] = "general"
    excerpt: Optional[str] = ""
    body: Optional[str] = ""
    date: Optional[str] = ""
    read_min: Optional[int] = 5
    featured: Optional[bool] = False
    palette: Optional[List[str]] = ["#1a1228", "#3a2865"]
    icon: Optional[str] = "BookOpen"
    image: Optional[str] = ""
    order: Optional[int] = 100

@api.post("/admin/blog")
async def admin_create_blog(body: BlogIn, _: dict = Depends(require_admin)):
    # Clean the slug - remove spaces and special characters
    body.slug = re.sub(r'[^a-z0-9\-_]', '', body.slug.lower().replace(' ', '-'))
    
    if not body.slug:
        raise HTTPException(status_code=400, detail="Slug is empty!")
    
    existing = await db.blog_posts.find_one({"slug": body.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    await db.blog_posts.insert_one(body.model_dump())
    return {"ok": True, "slug": body.slug}

class BlogUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    excerpt: Optional[str] = None
    body: Optional[str] = None
    date: Optional[str] = None
    read_min: Optional[int] = None
    featured: Optional[bool] = None
    palette: Optional[List[str]] = None
    icon: Optional[str] = None
    image: Optional[str] = None
    order: Optional[int] = None

@api.patch("/admin/blog/{slug}")
async def admin_update_blog(slug: str, body: BlogUpdate, _: dict = Depends(require_admin)):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if "image" in updates:
        old = await db.blog_posts.find_one({"slug": slug}, {"image": 1, "_id": 0})
        old_url = (old or {}).get("image") or ""
        if old_url and old_url != updates["image"]:
            await _destroy_cloudinary_asset(old_url)
    if updates:
        await db.blog_posts.update_one({"slug": slug}, {"$set": updates})
    return {"ok": True}

@api.delete("/admin/blog/{slug}")
async def admin_delete_blog(slug: str, _: dict = Depends(require_admin)):
    existing = await db.blog_posts.find_one({"slug": slug}, {"image": 1, "_id": 0})
    await db.blog_posts.delete_one({"slug": slug})
    if existing and existing.get("image"):
        try:
            await _destroy_cloudinary_asset(existing["image"])
        except Exception as e:
            print(f"Cloudinary cleanup failed (non-fatal): {e}")
    return {"ok": True}
# ── Admin: Course basic update (title, price, tagline, youtube playlist) ──
class CourseUpdate(BaseModel):
    title: Optional[str] = None
    tagline: Optional[str] = None
    price: Optional[int] = None
    original_price: Optional[int] = None
    duration: Optional[str] = None
    lessons: Optional[int] = None
    modules: Optional[int] = None
    level: Optional[str] = None
    rating: Optional[float] = None
    students: Optional[int] = None
    featured: Optional[bool] = None
    new: Optional[bool] = None
    youtube_playlist: Optional[str] = None
    thumbnail: Optional[str] = None
    order: Optional[int] = None

@api.post("/admin/courses")
async def admin_create_course(body: dict, _: dict = Depends(require_admin)):
    existing = await db.courses.find_one({"slug": body.get("slug")})
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    await db.courses.insert_one(body)
    return {"ok": True, "slug": body.get("slug")}
    
@api.patch("/admin/courses/{slug}")
async def admin_update_course(slug: str, body: CourseUpdate, _: dict = Depends(require_admin)):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
       await db.courses.update_one({"slug": slug}, {"$set": updates})
    return {"ok": True}
@api.delete("/admin/courses/{slug}")
async def admin_delete_course(slug: str, _: dict = Depends(require_admin)):
    await db.courses.delete_one({"slug": slug})
    return {"ok": True}

# ── Admin: File upload ──
# ── Admin: Coupons CRUD ──
def _serialize_coupon(c: dict) -> dict:
    return {
        "code": c.get("code"),
        "kind": c.get("kind", "percent"),
        "value": c.get("value", 0),
        "expires_at": c.get("expires_at"),
        "max_uses": c.get("max_uses"),
        "used_count": c.get("used_count", 0),
        "course_slugs": c.get("course_slugs", []),
        "active": c.get("active", True),
        "created_at": c["created_at"].isoformat() if isinstance(c.get("created_at"), datetime) else c.get("created_at"),
    }

@api.get("/admin/coupons")
async def admin_list_coupons(_: dict = Depends(require_admin)):
    cursor = db.coupons.find({}).sort("created_at", -1).limit(500)
    return [_serialize_coupon(c) async for c in cursor]

@api.post("/admin/coupons")
async def admin_create_coupon(body: CouponIn, _: dict = Depends(require_admin)):
    code = body.code.strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Code is required")
    if body.kind not in ("percent", "fixed"):
        raise HTTPException(status_code=400, detail="kind must be 'percent' or 'fixed'")
    if body.value <= 0 or (body.kind == "percent" and body.value > 100):
        raise HTTPException(status_code=400, detail="Invalid discount value")
    if await db.coupons.find_one({"code": code}):
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    doc = {
        "code": code,
        "kind": body.kind,
        "value": body.value,
        "expires_at": body.expires_at,
        "max_uses": body.max_uses,
        "course_slugs": body.course_slugs or [],
        "active": body.active if body.active is not None else True,
        "used_count": 0,
        "created_at": datetime.now(timezone.utc),
    }
    await db.coupons.insert_one(doc)
    return _serialize_coupon(doc)

@api.patch("/admin/coupons/{code}")
async def admin_update_coupon(code: str, body: CouponUpdate, _: dict = Depends(require_admin)):
    code = code.strip().upper()
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if "kind" in updates and updates["kind"] not in ("percent", "fixed"):
        raise HTTPException(status_code=400, detail="kind must be 'percent' or 'fixed'")
    if updates:
        res = await db.coupons.update_one({"code": code}, {"$set": updates})
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Coupon not found")
    c = await db.coupons.find_one({"code": code})
    return _serialize_coupon(c) if c else {"ok": True}

@api.delete("/admin/coupons/{code}")
async def admin_delete_coupon(code: str, _: dict = Depends(require_admin)):
    code = code.strip().upper()
    await db.coupons.delete_one({"code": code})
    return {"ok": True}

@api.post("/admin/upload")
async def admin_upload(file: UploadFile = File(...), _: dict = Depends(require_admin)):
    """Upload an image.
    - If CLOUDINARY_* env vars are set → uploads to Cloudinary, persists the secure_url (CDN, survives redeploys).
    - Otherwise (dev only) → saves to local disk under /app/backend/uploads/ and serves at /api/uploads/.
    Returns {url, filename, public_id, size, source}."""
    filename = file.filename or "upload"
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXT))}")
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 8 MB)")
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    if CLOUDINARY_ENABLED:
        # ── Cloudinary upload (production path) ──
        try:
            result = cloudinary.uploader.upload(
                data,
                folder=CLOUDINARY_FOLDER,
                resource_type="image",
                overwrite=False,
                use_filename=False,
                unique_filename=True,
                invalidate=True,
            )
        except Exception as e:
            logger.exception("Cloudinary upload failed")
            raise HTTPException(status_code=502, detail=f"Image upload service error: {e}")
        url = result.get("secure_url")
        if not url:
            raise HTTPException(status_code=502, detail="Image upload did not return a URL")
        return {
            "url": url,
            "filename": result.get("public_id", ""),
            "public_id": result.get("public_id", ""),
            "size": result.get("bytes", len(data)),
            "source": "cloudinary",
        }

    # ── Local disk fallback (dev only) ──
    new_name = f"{secrets.token_hex(10)}{ext}"
    dest = UPLOAD_DIR / new_name
    dest.write_bytes(data)
    return {"url": f"/api/uploads/{new_name}", "filename": new_name, "public_id": "", "size": len(data), "source": "local"}


# ── Cloudinary asset cleanup helpers ──
def _extract_cloudinary_public_id(url: str) -> Optional[str]:
    """Parse a Cloudinary secure URL and return the public_id (folder/name without extension).
    Returns None for non-Cloudinary URLs."""
    if not url or "res.cloudinary.com" not in url:
        return None
    try:
        # Format: https://res.cloudinary.com/<cloud>/image/upload/[transforms/]v<digits>/<folder>/<name>.<ext>
        after_upload = url.split("/upload/", 1)[1]
        # Strip the version segment "v123456789/" if present (always digits after a 'v')
        parts = after_upload.split("/")
        if parts and parts[0].startswith("v") and parts[0][1:].isdigit():
            parts = parts[1:]
        path = "/".join(parts)
        # Drop the file extension (last dot, in last segment)
        if "." in path.rsplit("/", 1)[-1]:
            path = path.rsplit(".", 1)[0]
        return path or None
    except Exception:
        return None

async def _destroy_cloudinary_asset(url_or_public_id: str) -> bool:
    """Delete a Cloudinary image given either a URL or a public_id. Fail-soft."""
    if not CLOUDINARY_ENABLED:
        return False
    pid = url_or_public_id
    if url_or_public_id and url_or_public_id.startswith("http"):
        pid = _extract_cloudinary_public_id(url_or_public_id) or ""
    if not pid:
        return False
    try:
        # Run sync SDK off the event loop
        import asyncio as _asyncio
        res = await _asyncio.to_thread(cloudinary.uploader.destroy, pid, invalidate=True)
        ok = res.get("result") in ("ok", "not found")
        logger.info(f"Cloudinary destroy public_id={pid} result={res.get('result')}")
        return ok
    except Exception:
        logger.exception(f"Cloudinary destroy failed public_id={pid}")
        return False

class CloudinaryDeleteIn(BaseModel):
    url: Optional[str] = None
    public_id: Optional[str] = None

@api.delete("/admin/upload")
async def admin_delete_upload(body: CloudinaryDeleteIn, _: dict = Depends(require_admin)):
    """Delete a previously uploaded image. Accepts either the full secure_url or the raw public_id."""
    target = body.public_id or body.url or ""
    if not target:
        raise HTTPException(status_code=400, detail="Provide either 'public_id' or 'url'")
    ok = await _destroy_cloudinary_asset(target)
    if not ok and not CLOUDINARY_ENABLED:
        raise HTTPException(status_code=400, detail="Cloudinary is not configured")
    return {"ok": ok, "target": target}

# ───── BOOK ORDERS ─────

class BookOrderAddress(BaseModel):
    line1: str
    line2: Optional[str] = ""
    city: str
    state: str
    pincode: str

class BookOrderItem(BaseModel):
    book_slug: str
    book_title: str
    quantity: int
    unit_price: int

class BookOrderIn(BaseModel):
    items: List[BookOrderItem]
    subtotal: int
    shipping: int
    amount: int
    cod_fee: Optional[int] = 0
    coupon_code: Optional[str] = None
    discount: Optional[int] = 0
    payment_mode: str
    name: str
    phone: str
    address: BookOrderAddress

class BookOrderVerifyIn(BaseModel):
    order_id: str
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str
    

# ═══════════════════════════════════════════════════════════════════════
# ─── MIND HEALTH ASSESSMENT ────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════

ASSESSMENT_QUESTIONS = [
    {"id": 1, "domain": "mood", "text": "Mujhe adhiktar samay udaasi ya khaali-pan mehsoos hua."},
    {"id": 2, "domain": "mood", "text": "Mujhe un cheezon mein bhi khushi nahi milti jo pehle mujhe pasand thi."},
    {"id": 3, "domain": "mood", "text": "Subah uthkar din shuru karna mushkil lagta hai."},
    {"id": 4, "domain": "mood", "text": "Main bina wajah bahut thaka hua mehsoos karta hoon."},
    {"id": 5, "domain": "overthinking", "text": "Ek hi baat mere dimaag mein baar-baar chalti rehti hai."},
    {"id": 6, "domain": "overthinking", "text": "Main future ki chinta mein present ko enjoy nahi kar pata."},
    {"id": 7, "domain": "overthinking", "text": "Main apni purani galtiyon ko baar-baar yaad karta hoon."},
    {"id": 8, "domain": "self_worth", "text": "Mujhe lagta hai main dusron jitna accha nahi hoon."},
    {"id": 9, "domain": "self_worth", "text": "Main apni achievements ko bhi ignore kar deta hoon."},
    {"id": 10, "domain": "stress", "text": "Main chhoti baaton ko lekar bahut zyada tension le leta hoon."},
    {"id": 11, "domain": "daily_functioning", "text": "Mera dhyan aasani se bhatak jata hai."},
    {"id": 12, "domain": "daily_functioning", "text": "Mujhe decision lene mein pehle se zyada mushkil hoti hai."},
    {"id": 13, "domain": "daily_functioning", "text": "Meri neend pehle se kharab ho gayi hai."},
    {"id": 14, "domain": "relationships_purpose", "text": "Main logon se milna ya baat karna avoid karta hoon."},
    {"id": 15, "domain": "relationships_purpose", "text": "Mujhe lagta hai koi mujhe sach mein nahi samajhta."},
    {"id": 16, "domain": "relationships_purpose", "text": "Mujhe lagta hai meri life mein direction ki kami hai."},
    {"id": 17, "domain": "stress", "text": "Main apni emotions ko control nahi kar pata."},
    {"id": 18, "domain": "stress", "text": "Stress ki wajah se meri daily life prabhavit ho rahi hai."},
    {"id": 19, "domain": "relationships_purpose", "text": "Kabhi-kabhi mujhe lagta hai meri life ka koi purpose nahi hai."},
    {"id": 20, "domain": "safety", "text": "Pichhle 2 hafton mein, kya kabhi aapke man mein aisa khayal aaya ki zindagi jeene ka koi matlab nahi hai ya khud ko nuksan pahunchane ka vichar aaya?"},
]

ASSESSMENT_OPTIONS = [
    {"value": 0, "label": "Kabhi nahi"},
    {"value": 1, "label": "Kuch din"},
    {"value": 2, "label": "Aadhe se zyada din"},
    {"value": 3, "label": "Lagbhag har din"},
]

DOMAIN_MAX = {
    "mood": 12, "overthinking": 9, "self_worth": 6,
    "stress": 9, "daily_functioning": 9, "relationships_purpose": 12,
}

DOMAIN_NAMES = {
    "mood": "Mood",
    "overthinking": "Overthinking",
    "self_worth": "Self Worth",
    "stress": "Anxiety & Stress",
    "daily_functioning": "Daily Functioning",
    "relationships_purpose": "Relationships & Purpose",
}

DOMAIN_TO_COURSE = {
    "overthinking": "overcoming-overthinking",
    "mood": "mind-control-meditation",
    "self_worth": "mind-control-meditation",
    "stress": "time-management-mastery",
    "daily_functioning": "time-management-mastery",
    "relationships_purpose": "relationship-emotional-clarity",
}


class AssessmentAnswerIn(BaseModel):
    q_id: int
    value: int


class AssessmentSubmitIn(BaseModel):
    answers: List[AssessmentAnswerIn]


def _build_personality_analysis(top_domains, level_key):
    combos = {
        ("overthinking", "self_worth"): ("Overthinking + Self Doubt Pattern",
            "Aap har situation ko bahut deeply analyse karte hain. Problem ye nahi ki aap zyada sochte hain — problem ye hai ki aapka dimaag har possibility ko danger samajhne lagta hai. Isi wajah se decision delay, self doubt, future anxiety aur mental exhaustion jaise patterns develop hote hain. Achhi baat ye hai ki ye permanent personality nahi hai — ye ek trained thinking pattern hai jise badla ja sakta hai."),
        ("mood", "overthinking"): ("Low Mood + Overthinking Pattern",
            "Aapka dimaag har chhoti baat par ruk jata hai aur usi ke baare mein baar-baar sochta hai. Ye lagataar overthinking dheere-dheere mood ko bhi girati hai — jaise ek dhundh mein sab kuch dhundhla lagne lagta hai. Ye ek cycle hai — sochna → mood down → phir aur zyada sochna. Is cycle ko break kiya ja sakta hai, sirf sahi tools ki zaroorat hoti hai."),
        ("stress", "overthinking"): ("High Stress + Overthinking Pattern",
            "Aapka mind hamesha 'ON' rehta hai — ek race jo kabhi ruk nahi rahi. Har chhoti situation ko threat samajhna, decisions par atakna, aur constant tension mehsoos karna — ye sab aapki mental energy ko drain kar rahe hain. Body aur mind dono ko rest chahiye."),
        ("mood", "self_worth"): ("Low Mood + Self Worth Pattern",
            "Aap khud ko doosron se compare karte hain aur apni achievements ko chhota samajhte hain. Ye habit dheere-dheere aapke aatmvishwas ko kamzor karti hai aur mood ko bhi giraati hai. Sach ye hai ki har insaan ki apni timing hai — aur aap jitna sochte hain, usse kahin zyada strong hain."),
        ("relationships_purpose", "mood"): ("Purpose + Connection Gap",
            "Aap logon ke beech hote hue bhi akela mehsoos karte hain, aur life ki direction unclear lagti hai. Ye common phase hai jab hum apni identity aur meaning ki tarah dhundhte hain. Ye kamzori nahi — balki growth ka signal hai."),
        ("daily_functioning", "overthinking"): ("Focus + Overthinking Struggle",
            "Overthinking ki wajah se aapka focus toot raha hai — decisions lena mushkil, neend disturbed, aur task complete karna challenging. Aapka mind saath dena chahta hai lekin overload ho gaya hai."),
    }
    single = {
        "mood": ("Low Mood Pattern", "Aapke andar ek udasee ya khaali-pan hai jo daily life par asar dikha rahi hai. Ye phase temporary ho sakta hai, lekin ise ignore karna theek nahi."),
        "overthinking": ("Overthinking Pattern", "Aapka dimaag har situation ko bar-bar analyse karta hai. Ye ek trained habit hai, jise unlearn kiya ja sakta hai."),
        "self_worth": ("Self Worth Pattern", "Aap apni value ko underestimate karte hain. Aap doosron se kam nahi — bas khud ko waisi hi nazar se dekhna hai jaisi aap doosron ko dekhte hain."),
        "stress": ("High Stress Pattern", "Aapke andar stress build up ho raha hai. Body aur mind ko rest chahiye."),
        "daily_functioning": ("Focus & Function Gap", "Focus, decisions aur neend par asar padh raha hai. Ye ek recoverable phase hai."),
        "relationships_purpose": ("Connection & Purpose Gap", "Aap emotionally akela mehsoos karte hain aur direction unclear lagti hai. Ye khud se dubara connect hone ka signal hai."),
    }
    if not top_domains:
        return {"title": "Balanced Mind", "body": "Aap emotionally balanced lag rahe hain — ye ek achhi baat hai."}
    if len(top_domains) >= 2:
        for key in [(top_domains[0], top_domains[1]), (top_domains[1], top_domains[0])]:
            if key in combos:
                t, b = combos[key]
                return {"title": t, "body": b}
    t, b = single.get(top_domains[0], ("Your Mind Pattern", "Aapka mind kai directions mein kaam kar raha hai."))
    return {"title": t, "body": b}


def _build_strengths(low_domains):
    strength_map = {
        "mood": "Emotional Stability",
        "overthinking": "Clear Thinking",
        "self_worth": "Healthy Self Image",
        "stress": "Stress Resilience",
        "daily_functioning": "Focused Execution",
        "relationships_purpose": "Strong Connections",
    }
    result = [strength_map[d] for d in low_domains if d in strength_map]
    if not result:
        result = ["Emotional Awareness", "Willingness to Reflect", "Learning Mindset"]
    else:
        result.extend(["Emotional Awareness", "Learning Mindset"])
    return result[:5]


def _build_risks(level_key):
    return {
        "healthy": [],
        "mild": ["Overthinking build-up", "Emotional fatigue", "Sleep disturbance"],
        "moderate": ["Burnout", "Chronic stress", "Motivation loss", "Relationship strain"],
        "high": ["Depression signals", "Emotional shutdown", "Isolation"],
        "very_high": ["Serious mental health concerns — Professional support strongly recommended"],
    }.get(level_key, [])


def calculate_assessment(answers):
    ans_map = {a.q_id: a.value for a in answers}
    total = sum(ans_map.get(q["id"], 0) for q in ASSESSMENT_QUESTIONS if q["domain"] != "safety")
    domain_scores = {d: 0 for d in DOMAIN_MAX}
    for q in ASSESSMENT_QUESTIONS:
        if q["domain"] in domain_scores:
            domain_scores[q["domain"]] += ans_map.get(q["id"], 0)
    domain_pct = {d: round((s / DOMAIN_MAX[d]) * 100) for d, s in domain_scores.items()}
    safety_answer = ans_map.get(20, 0)
    safety_risk = safety_answer >= 1

    if total <= 12:
        level = {"key": "healthy", "label": "Healthy Mind", "emoji": "🟢", "color": "#22c55e"}
    elif total <= 24:
        level = {"key": "mild", "label": "Mild Emotional Stress", "emoji": "🟡", "color": "#eab308"}
    elif total <= 36:
        level = {"key": "moderate", "label": "Moderate Emotional Distress", "emoji": "🟠", "color": "#f97316"}
    elif total <= 48:
        level = {"key": "high", "label": "High Emotional Distress", "emoji": "🔴", "color": "#ef4444"}
    else:
        level = {"key": "very_high", "label": "Very High Emotional Distress", "emoji": "⚫", "color": "#71717a"}

    sorted_domains = sorted(domain_pct.items(), key=lambda x: -x[1])
    top_domains = [d for d, p in sorted_domains[:2] if p >= 40]
    low_domains = [d for d, p in sorted_domains if p < 40]

    analysis = _build_personality_analysis(top_domains, level["key"])
    strengths = _build_strengths(low_domains)
    risks = _build_risks(level["key"])
    course_slug = DOMAIN_TO_COURSE.get(top_domains[0] if top_domains else "overthinking", "overcoming-overthinking")
    percentile = min(99, max(1, round((total / 60) * 100)))

    return {
        "total": total, "max": 60, "level": level,
        "domain_scores": domain_scores, "domain_pct": domain_pct,
        "domain_names": DOMAIN_NAMES, "top_domains": top_domains,
        "safety_risk": safety_risk, "safety_answer": safety_answer,
        "analysis": analysis, "strengths": strengths, "risks": risks,
        "course_slug": course_slug, "percentile": percentile,
    }


@api.get("/assessment/questions")
async def get_assessment_questions():
    return {"questions": ASSESSMENT_QUESTIONS, "options": ASSESSMENT_OPTIONS}


@api.post("/assessment/submit")
async def submit_assessment(body: AssessmentSubmitIn, user: dict = Depends(get_current_user)):
    if len(body.answers) != 20:
        raise HTTPException(status_code=400, detail="All 20 questions must be answered")
    for a in body.answers:
        if a.value < 0 or a.value > 3:
            raise HTTPException(status_code=400, detail="Invalid answer value")
    report = calculate_assessment(body.answers)
    doc = {
        "user_id": str(user["_id"]),
        "email": user.get("email", ""),
        "name": user.get("name", ""),
        "answers": [a.model_dump() for a in body.answers],
        "total": report["total"],
        "level_key": report["level"]["key"],
        "level_label": report["level"]["label"],
        "domain_scores": report["domain_scores"],
        "domain_pct": report["domain_pct"],
        "top_domains": report["top_domains"],
        "safety_risk": report["safety_risk"],
        "safety_answer": report["safety_answer"],
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.assessments.insert_one(doc)
    report["assessment_id"] = str(result.inserted_id)
    return report


@api.get("/assessment/me")
async def my_assessments(user: dict = Depends(get_current_user)):
    cursor = db.assessments.find({"user_id": str(user["_id"])}).sort("created_at", -1).limit(10)
    out = []
    async for a in cursor:
        out.append({
            "id": str(a["_id"]),
            "total": a["total"],
            "level_label": a["level_label"],
            "level_key": a["level_key"],
            "top_domains": a.get("top_domains", []),
            "created_at": a["created_at"].isoformat() if a.get("created_at") else None,
        })
    return out

def _serialize_book_order(o: dict) -> dict:
    o["id"] = str(o.pop("_id"))
    if isinstance(o.get("created_at"), datetime):
        o["created_at"] = o["created_at"].isoformat()
    if isinstance(o.get("paid_at"), datetime):
        o["paid_at"] = o["paid_at"].isoformat()
    return o

@api.post("/book-orders/checkout")
async def book_order_checkout(body: BookOrderIn, user: dict = Depends(get_current_user)):
    if not body.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    primary = body.items[0]
    total_qty = sum(i.quantity for i in body.items)
    combined_title = ", ".join(f"{i.book_title} (x{i.quantity})" for i in body.items)

    order_doc = {
        "user_id": str(user["_id"]),
        "email": user.get("email", ""),
        "items": [i.model_dump() for i in body.items],
        "book_slug": primary.book_slug,
        "book_title": combined_title,
        "quantity": total_qty,
        "subtotal": body.subtotal,
        "shipping": body.shipping,
        "cod_fee": body.cod_fee or 0,
        "amount": body.amount,
        "payment_mode": body.payment_mode,
        "name": body.name,
        "phone": body.phone,
        "address": body.address.model_dump(),
        "status": "pending",
        "coupon_code": body.coupon_code or None,
        "discount": body.discount or 0,
        "razorpay_order_id": None,
        "razorpay_payment_id": None,
        "shiprocket_order_id": None,
        "shipment_id": None,
        "awb": None,
        "tracking_url": None,
        "created_at": datetime.now(timezone.utc),
        "paid_at": None,
    }

    if body.payment_mode == "cod":
        result = await db.book_orders.insert_one(order_doc)
        order_doc["_id"] = result.inserted_id
        sr = await create_shiprocket_order(order_doc)
        if sr:
            await db.book_orders.update_one(
                {"_id": result.inserted_id},
                {"$set": {
                    "status": "confirmed",
                    "shiprocket_order_id": sr.get("shiprocket_order_id"),
                    "shipment_id": sr.get("shipment_id"),
                    "awb": sr.get("awb"),
                    "tracking_url": sr.get("tracking_url"),
                }}
            )
        else:
            await db.book_orders.update_one({"_id": result.inserted_id}, {"$set": {"status": "confirmed"}})
        if body.coupon_code:
            await db.coupons.update_one({"code": body.coupon_code.upper()}, {"$inc": {"used_count": 1}})
        # ── Send confirmation emails ──
        try:
            items_dicts = [i.model_dump() for i in body.items]
            await email_service.send_book_order_confirmation(
                name=body.name,
                email=user.get("email", ""),
                order_id=str(result.inserted_id),
                items=items_dicts,
                subtotal=body.subtotal,
                shipping=body.shipping,
                cod_fee=body.cod_fee or 0,
                discount=body.discount or 0,
                total=body.amount,
                payment_mode=body.payment_mode,
                address=body.address.model_dump(),
            )
            await email_service.send_book_order_admin_notify(
                order_id=str(result.inserted_id),
                customer_name=body.name,
                customer_email=user.get("email", ""),
                customer_phone=body.phone,
                items=items_dicts,
                total=body.amount,
                payment_mode=body.payment_mode,
                address=body.address.model_dump(),
            )
        except Exception:
            logger.exception("Book order confirmation email failed (order still confirmed)")
                
        return {"mode": "cod", "order_id": str(result.inserted_id), "status": "confirmed"}

    rzp_key = RAZORPAY_KEY_ID
    rzp_secret = RAZORPAY_KEY_SECRET
    if not (rzp_key and rzp_secret):
        raise HTTPException(status_code=500, detail="Payment not configured")
    try:
        client_rzp = razorpay.Client(auth=(rzp_key, rzp_secret))
        user_id_short = str(user["_id"])[-8:]
        receipt = f"book_{primary.book_slug[:15]}_{user_id_short}"[:40]
        rzp_order = client_rzp.order.create({
            "amount": body.amount * 100,
            "currency": "INR",
            "receipt": receipt,
            "payment_capture": 1,
            "notes": {"book_slug": primary.book_slug, "user_id": str(user["_id"]), "items_count": total_qty},
        })
    except Exception:
        logger.exception("Razorpay book order create failed")
        raise HTTPException(status_code=500, detail="Could not initiate payment. Please try again.")

    if body.coupon_code:
        await db.coupons.update_one({"code": body.coupon_code.upper()}, {"$inc": {"used_count": 1}})
    order_doc["razorpay_order_id"] = rzp_order["id"]
    result = await db.book_orders.insert_one(order_doc)
    return {
        "mode": "razorpay",
        "order_id": str(result.inserted_id),
        "razorpay_key": rzp_key,
        "razorpay_order_id": rzp_order["id"],
        "amount_paise": rzp_order["amount"],
        "prefill": {"name": body.name, "email": user.get("email", ""), "contact": body.phone},
    }

@api.post("/book-orders/verify")
async def book_order_verify(body: BookOrderVerifyIn, user: dict = Depends(get_current_user)):
    order = await db.book_orders.find_one({"_id": ObjectId(body.order_id), "user_id": str(user["_id"])})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("status") == "confirmed":
        return {"ok": True, "already_confirmed": True}
    rzp_secret = RAZORPAY_KEY_SECRET
    if rzp_secret:
        msg = f"{body.razorpay_order_id}|{body.razorpay_payment_id}"
        expected = hmac.new(rzp_secret.encode(), msg.encode(), hashlib.sha256).hexdigest()
        if expected != body.razorpay_signature:
            raise HTTPException(status_code=400, detail="Invalid payment signature")
    await db.book_orders.update_one(
        {"_id": ObjectId(body.order_id)},
        {"$set": {
            "status": "paid",
            "razorpay_payment_id": body.razorpay_payment_id,
            "paid_at": datetime.now(timezone.utc),
        }}
    )
    order["_id"] = ObjectId(body.order_id)
    order["razorpay_payment_id"] = body.razorpay_payment_id
    sr = await create_shiprocket_order(order)
    if sr:
        await db.book_orders.update_one(
            {"_id": ObjectId(body.order_id)},
            {"$set": {
                "status": "confirmed",
                "shiprocket_order_id": sr.get("shiprocket_order_id"),
                "shipment_id": sr.get("shipment_id"),
                "awb": sr.get("awb"),
                "tracking_url": sr.get("tracking_url"),
            }}
        )
     # ── Send confirmation emails ──
    try:
        order_items = order.get("items") or []
        if not order_items:
            order_items = [{
                "book_title": order.get("book_title", "Signed Book"),
                "book_slug": order.get("book_slug", "book"),
                "quantity": order.get("quantity", 1),
                "unit_price": order.get("amount", 0),
            }]
        customer_email = order.get("email", "") or user.get("email", "")
        await email_service.send_book_order_confirmation(
            name=order.get("name", ""),
            email=customer_email,
            order_id=body.order_id,
            items=order_items,
            subtotal=order.get("subtotal", 0),
            shipping=order.get("shipping", 0),
            cod_fee=order.get("cod_fee", 0),
            discount=order.get("discount", 0),
            total=order.get("amount", 0),
            payment_mode=order.get("payment_mode", "prepaid"),
            address=order.get("address", {}),
        )
        await email_service.send_book_order_admin_notify(
            order_id=body.order_id,
            customer_name=order.get("name", ""),
            customer_email=customer_email,
            customer_phone=order.get("phone", ""),
            items=order_items,
            total=order.get("amount", 0),
            payment_mode=order.get("payment_mode", "prepaid"),
            address=order.get("address", {}),
        )
    except Exception:
        logger.exception("Book order confirmation email failed (order still confirmed)")
    return {"ok": True, "status": "confirmed"}

@api.get("/book-orders/me")
async def my_book_orders(user: dict = Depends(get_current_user)):
    cursor = db.book_orders.find({"user_id": str(user["_id"])}).sort("created_at", -1)
    orders = []
    async for o in cursor:
        orders.append(_serialize_book_order(o))
    return orders

@api.get("/book-orders/track/{order_id}")
async def track_book_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.book_orders.find_one({"_id": ObjectId(order_id), "user_id": str(user["_id"])})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    tracking = None
    if order.get("awb"):
        tracking = await fetch_shiprocket_tracking(order["awb"])
    return {"order": _serialize_book_order(order), "tracking": tracking}

@api.get("/admin/book-orders")
async def admin_book_orders(_: dict = Depends(require_admin)):
    cursor = db.book_orders.find({}).sort("created_at", -1)
    orders = []
    async for o in cursor:
        orders.append(_serialize_book_order(o))
    return orders
@api.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {
        "app": "Vishnu Raghav Platform",
        "ok": True,
        "cloudinary": "enabled" if CLOUDINARY_ENABLED else "disabled",
    }

# ───── Startup ─────
async def seed_content():
    """Seed default content (books, courses, blog) into MongoDB if collections are empty."""
    if await db.books.count_documents({}) == 0:
        for i, b in enumerate(BOOKS):
            doc = {**b, "order": i}
            await db.books.insert_one(doc)
    if await db.courses.count_documents({}) == 0:
        for i, c in enumerate(COURSES):
            doc = {**c, "order": i}
            await db.courses.insert_one(doc)
    if await db.blog_posts.count_documents({}) == 0:
        for i, p in enumerate(BLOG_POSTS):
            doc = {**p, "order": i}
            await db.blog_posts.insert_one(doc)
    # Site settings default
    if await db.site_settings.find_one({"_id": "main"}) is None:
        await db.site_settings.insert_one({"_id": "main", "author_photo": VISHNU_PHOTO_URL, "hero_quote": ""})

@app.on_event("startup")
async def startup():
    # ── Safety: refuse to boot with live Razorpay keys when RAZORPAY_MODE=test ──
    if RAZORPAY_MODE == "test" and RAZORPAY_DETECTED_MODE == "live":
        raise RuntimeError(
            "Razorpay configuration conflict: RAZORPAY_MODE=test but key starts with 'rzp_live_'. "
            "Replace the key with a test key (rzp_test_...) or unset RAZORPAY_MODE."
        )
    if RAZORPAY_DETECTED_MODE == "unknown" and RAZORPAY_KEY_ID:
        logger.warning(
            f"Razorpay key '{RAZORPAY_KEY_ID[:8]}…' does not match rzp_test_/rzp_live_ prefix; "
            "treating as configured but mode is indeterminate."
        )
    logger.info(
        f"Razorpay: enabled={RAZORPAY_ENABLED} mode={RAZORPAY_DETECTED_MODE} "
        f"webhook={'set' if RAZORPAY_WEBHOOK_SECRET else 'unset'}"
    )

    await db.users.create_index("email", unique=True)
    await db.enrollments.create_index([("user_id", 1), ("course_slug", 1)])
    await db.newsletter.create_index("email", unique=True)
    await db.books.create_index("slug", unique=True)
    await db.courses.create_index("slug", unique=True)
    await db.blog_posts.create_index("slug", unique=True)
    await db.coupons.create_index("code", unique=True)
    await db.book_orders.create_index([("user_id", 1), ("created_at", -1)])

    await seed_content()

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@vishnuraghav.in")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@12345")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "name": "Vishnu Raghav (Admin)",
            "password_hash": hash_password(admin_password),
            "role": "admin", "phone": "", "city": "", "occupation": "",
            "created_at": datetime.now(timezone.utc),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )

app.include_router(api)

# Serve uploaded files at /api/uploads/<filename>
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown():
    client.close()
