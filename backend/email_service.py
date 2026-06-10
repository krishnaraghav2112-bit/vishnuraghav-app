"""
Resend-powered transactional email service for Vishnu Raghav Platform.

All public functions are async, non-blocking (the synchronous Resend SDK is
dispatched via asyncio.to_thread), and fail-soft: they log errors and return
False on failure rather than raising, so an email problem never breaks a
core flow (register, contact, password-reset).

Env vars required (loaded by server.py via load_dotenv before import):
  RESEND_API_KEY        - the re_... key from Resend dashboard
  SENDER_EMAIL          - From header, e.g. 'Vishnu Raghav <noreply@authorvishnuraghav.in>'
  ADMIN_NOTIFY_EMAIL    - inbox that receives contact-form submissions
  FRONTEND_URL          - base URL used in reset links / CTAs
"""
import os
import asyncio
import logging
from html import escape
from typing import Optional

import resend

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "").strip() or "noreply@authorvishnuraghav.in"
ADMIN_NOTIFY_EMAIL = os.environ.get("ADMIN_NOTIFY_EMAIL", "").strip()
FRONTEND_URL = os.environ.get("FRONTEND_URL", "").strip().rstrip("/") or "https://authorvishnuraghav.in"

EMAIL_ENABLED = bool(RESEND_API_KEY)
if EMAIL_ENABLED:
    resend.api_key = RESEND_API_KEY
else:
    logger.warning("RESEND_API_KEY not set — emails will be skipped (logged only).")


# ───────────────────────── Core send ─────────────────────────
async def send_email(
    to: str | list[str],
    subject: str,
    html: str,
    reply_to: Optional[str] = None,
) -> Optional[str]:
    """Send an email. Returns the Resend email id on success, None on failure."""
    if not EMAIL_ENABLED:
        logger.info(f"[email skipped: no API key] to={to} subject={subject!r}")
        return None
    to_list = [to] if isinstance(to, str) else list(to)
    params: dict = {
        "from": SENDER_EMAIL,
        "to": to_list,
        "subject": subject,
        "html": html,
    }
    if reply_to:
        params["reply_to"] = reply_to
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        eid = (result or {}).get("id")
        logger.info(f"Email sent id={eid} to={to_list} subject={subject!r}")
        return eid
    except Exception as e:
        logger.exception(f"Resend send failed to={to_list} subject={subject!r}: {e}")
        return None


# ───────────────────────── Templates ─────────────────────────
# Email-safe HTML: inline styles, table-based layout, no external fonts/CSS.
BRAND_GOLD = "#d4a548"
BRAND_BG = "#0f0a1a"
BRAND_CARD = "#1a1228"
BRAND_TEXT = "#f5f1ea"
BRAND_MUTED = "#a89c8c"

def _shell(inner_html: str, preheader: str = "") -> str:
    return f"""\
<!doctype html><html><body style="margin:0;padding:0;background:{BRAND_BG};">
<span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;font-size:1px;line-height:1px;">{escape(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{BRAND_BG};padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:{BRAND_CARD};border:1px solid #2a1f3a;border-radius:14px;overflow:hidden;font-family:Georgia,'Times New Roman',serif;color:{BRAND_TEXT};">
      <tr><td style="padding:28px 32px;border-bottom:1px solid #2a1f3a;">
        <div style="font-size:22px;letter-spacing:0.5px;color:{BRAND_TEXT};">
          Vishnu <span style="color:{BRAND_GOLD};font-style:italic;">Raghav</span>
        </div>
        <div style="font-size:12px;color:{BRAND_MUTED};margin-top:4px;letter-spacing:1px;text-transform:uppercase;">Author · Speaker · Life Coach</div>
      </td></tr>
      <tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:{BRAND_TEXT};">
        {inner_html}
      </td></tr>
      <tr><td style="padding:20px 32px;border-top:1px solid #2a1f3a;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:{BRAND_MUTED};">
        You're receiving this because you interacted with authorvishnuraghav.in.<br/>
        © Vishnu Raghav · Books · Courses · YouTube
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>"""

def _btn(label: str, url: str) -> str:
    return (
        f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">'
        f'<tr><td style="background:{BRAND_GOLD};border-radius:999px;">'
        f'<a href="{url}" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;'
        f'font-size:14px;font-weight:700;letter-spacing:0.5px;color:#1a1228;text-decoration:none;">{escape(label)}</a>'
        f'</td></tr></table>'
    )


def welcome_template(name: str) -> tuple[str, str]:
    name_clean = escape((name or "friend").strip())
    inner = f"""
        <h1 style="font-family:Georgia,serif;font-size:24px;color:{BRAND_TEXT};margin:0 0 14px;">Welcome, {name_clean}.</h1>
        <p style="margin:0 0 14px;color:{BRAND_TEXT};">Glad you're here. You just joined a small community that's choosing clarity over noise — through books, courses, and conversations that actually matter.</p>
        <p style="margin:0 0 14px;color:{BRAND_TEXT};">Here's where to start:</p>
        <ul style="margin:0 0 14px;padding-left:20px;color:{BRAND_TEXT};">
          <li style="margin-bottom:6px;">Browse the <a href="{FRONTEND_URL}/#courses" style="color:{BRAND_GOLD};">courses</a> — Time Management, Overthinking, Meditation, Relationships.</li>
          <li style="margin-bottom:6px;">Read excerpts from the <a href="{FRONTEND_URL}/#books" style="color:{BRAND_GOLD};">books</a> — <em>Dagmagate Pair</em>, <em>Jo Mai Kah Na Saka</em>, <em>Uljha Jeevan</em>.</li>
          <li style="margin-bottom:6px;">Catch the latest on <a href="{FRONTEND_URL}/#youtube" style="color:{BRAND_GOLD};">YouTube</a>.</li>
        </ul>
        {_btn("Explore the platform", FRONTEND_URL)}
        <p style="margin:18px 0 0;color:{BRAND_MUTED};font-size:13px;">If you ever want to reply, just hit reply on this email. It reaches us.</p>
    """
    return "Welcome to Vishnu Raghav", _shell(inner, preheader="A short note from Vishnu — glad you're here.")


def password_reset_template(name: str, reset_url: str) -> tuple[str, str]:
    name_clean = escape((name or "friend").strip())
    inner = f"""
        <h1 style="font-family:Georgia,serif;font-size:22px;color:{BRAND_TEXT};margin:0 0 14px;">Reset your password</h1>
        <p style="margin:0 0 14px;color:{BRAND_TEXT};">Hi {name_clean}, we received a request to reset the password for your Vishnu Raghav account.</p>
        <p style="margin:0 0 14px;color:{BRAND_TEXT};">Click the button below to choose a new password. This link is valid for <strong>30 minutes</strong>.</p>
        {_btn("Reset Password", reset_url)}
        <p style="margin:18px 0 6px;color:{BRAND_MUTED};font-size:13px;">If the button doesn't work, paste this URL into your browser:</p>
        <p style="margin:0 0 18px;word-break:break-all;"><a href="{reset_url}" style="color:{BRAND_GOLD};font-size:13px;">{reset_url}</a></p>
        <p style="margin:0;color:{BRAND_MUTED};font-size:13px;">Didn't request this? You can safely ignore this email — your password will stay the same.</p>
    """
    return "Reset your Vishnu Raghav password", _shell(inner, preheader="Choose a new password — link valid for 30 minutes.")


def contact_admin_template(name: str, email: str, phone: str, purpose: str, message: str) -> tuple[str, str]:
    inner = f"""
        <h1 style="font-family:Georgia,serif;font-size:22px;color:{BRAND_TEXT};margin:0 0 14px;">New contact form submission</h1>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:14px;color:{BRAND_TEXT};">
          <tr><td style="padding:6px 0;color:{BRAND_MUTED};width:90px;">Name</td><td style="padding:6px 0;">{escape(name)}</td></tr>
          <tr><td style="padding:6px 0;color:{BRAND_MUTED};">Email</td><td style="padding:6px 0;"><a href="mailto:{escape(email)}" style="color:{BRAND_GOLD};">{escape(email)}</a></td></tr>
          <tr><td style="padding:6px 0;color:{BRAND_MUTED};">Phone</td><td style="padding:6px 0;">{escape(phone or "—")}</td></tr>
          <tr><td style="padding:6px 0;color:{BRAND_MUTED};">Purpose</td><td style="padding:6px 0;">{escape(purpose or "General")}</td></tr>
        </table>
        <div style="margin-top:18px;padding:16px;background:#0f0a1a;border:1px solid #2a1f3a;border-radius:8px;color:{BRAND_TEXT};white-space:pre-wrap;font-size:14px;line-height:1.6;">{escape(message)}</div>
        <p style="margin:18px 0 0;color:{BRAND_MUTED};font-size:13px;">Reply directly to this email to respond to {escape(name)}.</p>
    """
    return f"📩 New contact: {name} — {purpose or 'General'}", _shell(inner, preheader=f"Contact from {name} ({email})")


def contact_autoresponder_template(name: str) -> tuple[str, str]:
    name_clean = escape((name or "friend").strip())
    inner = f"""
        <h1 style="font-family:Georgia,serif;font-size:22px;color:{BRAND_TEXT};margin:0 0 14px;">Thanks for writing, {name_clean}.</h1>
        <p style="margin:0 0 14px;color:{BRAND_TEXT};">We've received your message. Vishnu personally reads every note — expect a reply within <strong>48 hours</strong>.</p>
        <p style="margin:0 0 14px;color:{BRAND_TEXT};">While you wait, here's something to sit with:</p>
        <blockquote style="margin:14px 0;padding:14px 18px;border-left:3px solid {BRAND_GOLD};background:#0f0a1a;border-radius:6px;color:{BRAND_TEXT};font-style:italic;">
          "बस कुछ पल और, फिर यह रात भी बीत जाएगी।"
        </blockquote>
        {_btn("Read while you wait", FRONTEND_URL + "/#blog")}
        <p style="margin:18px 0 0;color:{BRAND_MUTED};font-size:13px;">— Team Vishnu Raghav</p>
    """
    return "We got your message — Vishnu Raghav", _shell(inner, preheader="Thanks for reaching out — we'll respond within 48 hours.")


# ───────────────────────── Public helpers ─────────────────────────
async def send_welcome(name: str, email: str) -> Optional[str]:
    subject, html = welcome_template(name)
    return await send_email(email, subject, html)

async def send_password_reset(name: str, email: str, reset_url: str) -> Optional[str]:
    subject, html = password_reset_template(name, reset_url)
    return await send_email(email, subject, html)

async def send_contact_notification(name: str, email: str, phone: str, purpose: str, message: str) -> Optional[str]:
    if not ADMIN_NOTIFY_EMAIL:
        logger.warning("ADMIN_NOTIFY_EMAIL not set — skipping admin contact notification.")
        return None
    subject, html = contact_admin_template(name, email, phone, purpose, message)
    return await send_email(ADMIN_NOTIFY_EMAIL, subject, html, reply_to=email)

async def send_contact_autoresponder(name: str, email: str) -> Optional[str]:
    subject, html = contact_autoresponder_template(name)
    return await send_email(email, subject, html)
