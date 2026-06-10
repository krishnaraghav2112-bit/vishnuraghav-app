"""
Iteration 5 — Razorpay Standard Web Checkout (test mode) integration tests.

Covers:
- POST /api/enrollments/checkout — real Razorpay order creation
- Already-enrolled idempotency
- POST /api/enrollments/verify — forged signature (400) and correct signature (200)
- GET  /api/enrollments/access/{slug} after paid
- 401 on unauthenticated checkout
"""
import hashlib
import hmac
import os
import re
import secrets
import time

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://raghav-portfolio-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Test mode keys (these match /app/backend/.env)
RZP_KEY_ID = "rzp_test_Sz5OWC87AMxkyO"
RZP_KEY_SECRET = "6l04X9vZRhE4pxuleTrdTkge"

PAID_SLUG = "time-management-mastery"      # price=1999 INR
PAID_PRICE_INR = 1999


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def fresh_student():
    """Register a unique student per test run to avoid already_enrolled pollution."""
    token_hex = secrets.token_hex(4)
    email = f"TEST_stu_{token_hex}@example.com"
    password = "Student@12345"
    payload = {"name": f"Test Student {token_hex}", "email": email,
               "password": password, "phone": "9999999999"}
    r = requests.post(f"{API}/auth/register", json=payload, timeout=30)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    return {"email": email, "password": password, "token": data["token"],
            "user": data["user"]}


@pytest.fixture(scope="module")
def auth_headers(fresh_student):
    return {"Authorization": f"Bearer {fresh_student['token']}"}


# ─── Tests ────────────────────────────────────────────────────────────────────

class TestRazorpayCheckout:
    """POST /api/enrollments/checkout against Razorpay live test API."""

    def test_checkout_unauthenticated_returns_401(self):
        r = requests.post(f"{API}/enrollments/checkout",
                          json={"course_slug": PAID_SLUG}, timeout=20)
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"

    def test_checkout_creates_real_razorpay_order(self, auth_headers, fresh_student):
        r = requests.post(f"{API}/enrollments/checkout",
                          headers=auth_headers,
                          json={"course_slug": PAID_SLUG}, timeout=30)
        assert r.status_code == 200, f"checkout failed: {r.status_code} {r.text}"
        data = r.json()

        assert data.get("mode") == "razorpay", f"mode should be 'razorpay', got {data}"
        assert data.get("razorpay_key") == RZP_KEY_ID
        assert isinstance(data.get("order_id"), str)
        assert data["order_id"].startswith("order_"), f"order_id should start with 'order_', got {data['order_id']}"
        assert data.get("amount_paise") == PAID_PRICE_INR * 100, \
            f"expected {PAID_PRICE_INR*100}, got {data.get('amount_paise')}"
        assert data.get("currency") == "INR"
        assert re.fullmatch(r"[a-f0-9]{24}", data.get("enrollment_id", "")), \
            f"enrollment_id should be 24-hex ObjectId, got {data.get('enrollment_id')}"
        assert "course_title" in data

        # Stash for later tests BEFORE any further (non-critical) assertions
        TestRazorpayCheckout.order_id = data["order_id"]
        TestRazorpayCheckout.enrollment_id = data["enrollment_id"]

        prefill = data.get("prefill") or {}
        assert "name" in prefill and "email" in prefill and "contact" in prefill
        assert prefill["email"].lower() == fresh_student["email"].lower()

    def test_order_id_recognized_by_razorpay(self):
        """Fetch the order back from Razorpay Orders API to confirm it exists."""
        oid = getattr(TestRazorpayCheckout, "order_id", None)
        assert oid, "Order ID not produced in previous test."
        r = requests.get(f"https://api.razorpay.com/v1/orders/{oid}",
                         auth=(RZP_KEY_ID, RZP_KEY_SECRET), timeout=30)
        assert r.status_code == 200, f"Razorpay didn't recognise order: {r.status_code} {r.text}"
        body = r.json()
        assert body["id"] == oid
        assert body["amount"] == PAID_PRICE_INR * 100
        assert body["currency"] == "INR"


class TestRazorpayVerify:
    """POST /api/enrollments/verify — signature math."""

    def test_forged_signature_returns_400_and_stays_pending(self, auth_headers):
        """Re-checkout to get a fresh order/enrollment, then send a forged sig."""
        r = requests.post(f"{API}/enrollments/checkout",
                          headers=auth_headers,
                          json={"course_slug": PAID_SLUG}, timeout=30)
        # might return already_enrolled if a previous test marked paid; guard:
        data = r.json()
        if data.get("already_enrolled"):
            pytest.skip("Already enrolled — cannot test forged signature here.")
        order_id = data["order_id"]
        enrollment_id = data["enrollment_id"]

        fake_payment_id = f"pay_test_{secrets.token_hex(6)}"
        forged_sig = "deadbeef" * 8  # 64 hex chars, definitely wrong

        rv = requests.post(f"{API}/enrollments/verify",
                           headers=auth_headers,
                           json={"enrollment_id": enrollment_id,
                                 "razorpay_payment_id": fake_payment_id,
                                 "razorpay_order_id": order_id,
                                 "razorpay_signature": forged_sig},
                           timeout=20)
        assert rv.status_code == 400, f"Expected 400 for forged sig, got {rv.status_code}: {rv.text}"
        detail = rv.json().get("detail", "")
        assert detail == "Invalid payment signature", f"Unexpected detail: {detail}"

        # Confirm enrollment still pending — via /enrollments/me
        em = requests.get(f"{API}/enrollments/me", headers=auth_headers, timeout=20)
        assert em.status_code == 200
        enrollments = em.json()
        match = next((e for e in enrollments if e.get("enrollment_id") == enrollment_id
                      or e.get("id") == enrollment_id
                      or e.get("_id") == enrollment_id), None)
        # If we can't map by id, check by order; status should not be 'paid'
        if match is None:
            # fall back: assume no paid enrollment yet
            assert not any(e.get("status") == "paid" and e.get("course_slug") == PAID_SLUG
                           for e in enrollments)
        else:
            assert match.get("status") != "paid", f"Enrollment was flipped paid on forged sig: {match}"

        # Save for next test (correct-sig flow)
        TestRazorpayVerify.order_id = order_id
        TestRazorpayVerify.enrollment_id = enrollment_id

    def test_correct_signature_marks_paid(self, auth_headers):
        order_id = getattr(TestRazorpayVerify, "order_id", None)
        enrollment_id = getattr(TestRazorpayVerify, "enrollment_id", None)
        if not order_id or not enrollment_id:
            pytest.skip("Previous test did not produce order/enrollment ids.")

        fake_payment_id = f"pay_test_{secrets.token_hex(8)}"
        msg = f"{order_id}|{fake_payment_id}".encode()
        sig = hmac.new(RZP_KEY_SECRET.encode(), msg, hashlib.sha256).hexdigest()

        rv = requests.post(f"{API}/enrollments/verify",
                           headers=auth_headers,
                           json={"enrollment_id": enrollment_id,
                                 "razorpay_payment_id": fake_payment_id,
                                 "razorpay_order_id": order_id,
                                 "razorpay_signature": sig},
                           timeout=20)
        assert rv.status_code == 200, f"Verify failed: {rv.status_code} {rv.text}"
        body = rv.json()
        assert body.get("status") == "paid"
        assert body.get("course_slug") == PAID_SLUG

        # Verify persistence via /enrollments/me
        em = requests.get(f"{API}/enrollments/me", headers=auth_headers, timeout=20)
        assert em.status_code == 200
        enrollments = em.json()
        paid = [e for e in enrollments if e.get("course_slug") == PAID_SLUG
                and e.get("status") == "paid"]
        assert paid, f"No paid enrollment found post-verify: {enrollments}"


class TestAlreadyEnrolledAndAccess:
    """After paid: idempotent checkout + access check."""

    def test_checkout_twice_returns_already_enrolled(self, auth_headers):
        # First call (after correct-sig verify) — should now be already enrolled
        r = requests.post(f"{API}/enrollments/checkout",
                          headers=auth_headers,
                          json={"course_slug": PAID_SLUG}, timeout=20)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert data.get("already_enrolled") is True, f"Expected already_enrolled=True, got {data}"
        assert re.fullmatch(r"[a-f0-9]{24}", data.get("enrollment_id", ""))

    def test_access_endpoint_returns_course(self, auth_headers):
        r = requests.get(f"{API}/enrollments/access/{PAID_SLUG}",
                         headers=auth_headers, timeout=20)
        assert r.status_code == 200, f"access denied: {r.status_code} {r.text}"
        data = r.json()
        assert data.get("access") is True, f"Expected access=True, got {data}"
        course = data.get("course") or {}
        assert course.get("slug") == PAID_SLUG, f"Wrong course returned: {course}"


# ─── Module teardown — best-effort cleanup ───────────────────────────────────

@pytest.fixture(scope="module", autouse=True)
def _cleanup(fresh_student):
    yield
    # No public delete endpoint for users/enrollments; rely on TEST_ prefix
    # in email/admin cleanup outside of this run.
    pass
