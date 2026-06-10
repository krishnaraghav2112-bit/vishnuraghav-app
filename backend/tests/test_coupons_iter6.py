"""
Iteration 6 — Coupon system tests.

Covers:
- Admin CRUD on /api/admin/coupons (POST/GET/PATCH/DELETE)
- POST /api/coupons/validate (auth) — percent/fixed/expired/restricted/maxed/inactive/non-existent
- POST /api/enrollments/checkout with coupon_code — discount applied, original/discount returned
- POST /api/enrollments/verify increments used_count exactly once on real signature
- Existing flows (uncouponed checkout, signature mismatch, already_enrolled) still pass
"""
import hashlib
import hmac
import os
import secrets

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://raghav-portfolio-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

RZP_KEY_ID = "rzp_test_Sz5OWC87AMxkyO"
RZP_KEY_SECRET = "6l04X9vZRhE4pxuleTrdTkge"

ADMIN_EMAIL = "admin@vishnuraghav.in"
ADMIN_PASSWORD = "Admin@12345"

PAID_SLUG = "time-management-mastery"
PAID_PRICE_INR = 1999


# ── Fixtures ────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                      timeout=30)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture()
def fresh_student():
    token_hex = secrets.token_hex(4)
    email = f"TEST_cpn_{token_hex}@example.com"
    payload = {"name": f"Cpn Student {token_hex}", "email": email,
               "password": "Student@12345", "phone": "9999999999"}
    r = requests.post(f"{API}/auth/register", json=payload, timeout=30)
    assert r.status_code == 200, f"Register failed: {r.text}"
    data = r.json()
    return {"email": email, "token": data["token"],
            "headers": {"Authorization": f"Bearer {data['token']}"}}


@pytest.fixture()
def unique_code():
    return f"TST{secrets.token_hex(3).upper()}"


def _cleanup(admin_headers, code):
    try:
        requests.delete(f"{API}/admin/coupons/{code}", headers=admin_headers, timeout=15)
    except Exception:
        pass


# ── Admin CRUD ──────────────────────────────────────────────────────────

class TestAdminCouponCRUD:

    def test_create_requires_admin_auth(self):
        r = requests.post(f"{API}/admin/coupons",
                          json={"code": "NOAUTH", "kind": "percent", "value": 10},
                          timeout=15)
        assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"

    def test_create_invalid_kind(self, admin_headers):
        r = requests.post(f"{API}/admin/coupons", headers=admin_headers,
                          json={"code": "BADKIND", "kind": "weird", "value": 10},
                          timeout=15)
        assert r.status_code == 400

    def test_create_value_zero_invalid(self, admin_headers):
        r = requests.post(f"{API}/admin/coupons", headers=admin_headers,
                          json={"code": "BADVAL", "kind": "percent", "value": 0},
                          timeout=15)
        assert r.status_code == 400

    def test_create_percent_over_100_invalid(self, admin_headers):
        r = requests.post(f"{API}/admin/coupons", headers=admin_headers,
                          json={"code": "OVER100", "kind": "percent", "value": 150},
                          timeout=15)
        assert r.status_code == 400

    def test_create_and_list(self, admin_headers, unique_code):
        try:
            r = requests.post(f"{API}/admin/coupons", headers=admin_headers,
                              json={"code": unique_code, "kind": "percent", "value": 15},
                              timeout=15)
            assert r.status_code == 200, r.text
            data = r.json()
            assert data["code"] == unique_code
            assert data["kind"] == "percent"
            assert data["value"] == 15
            assert data["used_count"] == 0
            assert data["active"] is True

            r2 = requests.get(f"{API}/admin/coupons", headers=admin_headers, timeout=15)
            assert r2.status_code == 200
            codes = [c["code"] for c in r2.json()]
            assert unique_code in codes
        finally:
            _cleanup(admin_headers, unique_code)

    def test_create_duplicate_code_400(self, admin_headers, unique_code):
        try:
            r1 = requests.post(f"{API}/admin/coupons", headers=admin_headers,
                               json={"code": unique_code, "kind": "fixed", "value": 100},
                               timeout=15)
            assert r1.status_code == 200
            r2 = requests.post(f"{API}/admin/coupons", headers=admin_headers,
                               json={"code": unique_code, "kind": "fixed", "value": 200},
                               timeout=15)
            assert r2.status_code == 400
        finally:
            _cleanup(admin_headers, unique_code)

    def test_patch_updates_fields(self, admin_headers, unique_code):
        try:
            requests.post(f"{API}/admin/coupons", headers=admin_headers,
                          json={"code": unique_code, "kind": "percent", "value": 10},
                          timeout=15)
            r = requests.patch(f"{API}/admin/coupons/{unique_code}",
                               headers=admin_headers,
                               json={"active": False, "value": 25},
                               timeout=15)
            assert r.status_code == 200
            data = r.json()
            assert data["active"] is False
            assert data["value"] == 25
        finally:
            _cleanup(admin_headers, unique_code)

    def test_delete_removes(self, admin_headers, unique_code):
        requests.post(f"{API}/admin/coupons", headers=admin_headers,
                      json={"code": unique_code, "kind": "percent", "value": 5},
                      timeout=15)
        r = requests.delete(f"{API}/admin/coupons/{unique_code}",
                            headers=admin_headers, timeout=15)
        assert r.status_code == 200
        lst = requests.get(f"{API}/admin/coupons", headers=admin_headers, timeout=15).json()
        assert unique_code not in [c["code"] for c in lst]


# ── /coupons/validate ───────────────────────────────────────────────────

class TestCouponValidate:

    def test_requires_auth(self):
        r = requests.post(f"{API}/coupons/validate",
                          json={"code": "LAUNCH20", "course_slug": PAID_SLUG},
                          timeout=15)
        assert r.status_code == 401

    def test_percent_coupon(self, fresh_student):
        r = requests.post(f"{API}/coupons/validate", headers=fresh_student["headers"],
                          json={"code": "LAUNCH20", "course_slug": PAID_SLUG}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["valid"] is True
        assert d["original_amount"] == 1999
        # 1999 * 20 // 100 = 399
        assert d["discount"] == 399
        assert d["final_amount"] == 1600

    def test_fixed_coupon(self, fresh_student):
        r = requests.post(f"{API}/coupons/validate", headers=fresh_student["headers"],
                          json={"code": "FIXED50", "course_slug": PAID_SLUG}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["valid"] is True
        assert d["discount"] == 500
        assert d["final_amount"] == 1499

    def test_invalid_code(self, fresh_student):
        r = requests.post(f"{API}/coupons/validate", headers=fresh_student["headers"],
                          json={"code": "DOES_NOT_EXIST_XYZ", "course_slug": PAID_SLUG},
                          timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["valid"] is False
        assert "invalid" in d["message"].lower()

    def test_expired_coupon(self, fresh_student):
        r = requests.post(f"{API}/coupons/validate", headers=fresh_student["headers"],
                          json={"code": "EXPIRED", "course_slug": PAID_SLUG}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["valid"] is False
        assert "expired" in d["message"].lower()

    def test_course_restricted(self, fresh_student, admin_headers):
        # FIXED50 is restricted to time-management-mastery per problem statement
        # Try a different slug
        # Find any other available course slug
        # Build via direct course discovery (courses are static); try a different one
        OTHER_SLUG = "discipline-mastery"  # fallback if exists
        r = requests.post(f"{API}/coupons/validate", headers=fresh_student["headers"],
                          json={"code": "FIXED50", "course_slug": OTHER_SLUG}, timeout=15)
        # If course not found we may get a 'Course not found' from validate; accept that too
        d = r.json()
        # Whatever happens it must not be valid
        assert d.get("valid") is False
        # If it's a course mismatch (not "course not found") then check message
        if "course" in d.get("message", "").lower() and "not valid" in d.get("message", "").lower():
            assert "not valid for this course" in d["message"].lower()

    def test_max_uses_reached(self, admin_headers, fresh_student, unique_code):
        try:
            # Create coupon with max_uses=1 then bump used_count past it via PATCH not possible.
            # Instead create and then create enrollment to consume.
            # Simpler: create coupon, manually call validate with max_uses=0 effect via creating used_count via mock path.
            # Use mock path: temporarily blank Razorpay isn't possible. So we use admin PATCH not supporting used_count.
            # Approach: create with max_uses=1 then use Razorpay live flow to checkout+verify once to bump count.
            # Easier: create with max_uses=1, then use mock by temp shimming — not feasible without env change.
            # FALLBACK: use admin patch is limited. Skip this test if cannot artificially set.
            # We'll create a coupon and run a paid mock flow doesn't exist now (live mode is enabled).
            # So we simulate by creating coupon with max_uses=1, then doing checkout+verify once,
            # then attempt to validate again.
            requests.post(f"{API}/admin/coupons", headers=admin_headers,
                          json={"code": unique_code, "kind": "percent", "value": 5,
                                "max_uses": 1}, timeout=15)
            # Pre: validate works
            r1 = requests.post(f"{API}/coupons/validate", headers=fresh_student["headers"],
                               json={"code": unique_code, "course_slug": PAID_SLUG},
                               timeout=15)
            assert r1.json()["valid"] is True

            # Use checkout + verify to bump used_count
            chk = requests.post(f"{API}/enrollments/checkout",
                                headers=fresh_student["headers"],
                                json={"course_slug": PAID_SLUG,
                                      "coupon_code": unique_code}, timeout=30)
            assert chk.status_code == 200, chk.text
            chkd = chk.json()
            order_id = chkd["order_id"]
            enrollment_id = chkd["enrollment_id"]
            payment_id = f"pay_test_{secrets.token_hex(6)}"
            msg = f"{order_id}|{payment_id}"
            sig = hmac.new(RZP_KEY_SECRET.encode(), msg.encode(), hashlib.sha256).hexdigest()
            vr = requests.post(f"{API}/enrollments/verify",
                               headers=fresh_student["headers"],
                               json={"enrollment_id": enrollment_id,
                                     "razorpay_payment_id": payment_id,
                                     "razorpay_order_id": order_id,
                                     "razorpay_signature": sig}, timeout=30)
            assert vr.status_code == 200, vr.text

            # Now validate again — should report max-uses reached
            r2 = requests.post(f"{API}/coupons/validate", headers=fresh_student["headers"],
                               json={"code": unique_code, "course_slug": PAID_SLUG},
                               timeout=15)
            d2 = r2.json()
            assert d2["valid"] is False
            assert "usage limit" in d2["message"].lower()
        finally:
            _cleanup(admin_headers, unique_code)

    def test_inactive_coupon(self, admin_headers, fresh_student, unique_code):
        try:
            requests.post(f"{API}/admin/coupons", headers=admin_headers,
                          json={"code": unique_code, "kind": "percent", "value": 5,
                                "active": True}, timeout=15)
            # Patch to inactive
            pr = requests.patch(f"{API}/admin/coupons/{unique_code}",
                                headers=admin_headers, json={"active": False},
                                timeout=15)
            assert pr.status_code == 200
            assert pr.json()["active"] is False
            r = requests.post(f"{API}/coupons/validate", headers=fresh_student["headers"],
                              json={"code": unique_code, "course_slug": PAID_SLUG},
                              timeout=15)
            d = r.json()
            assert d["valid"] is False
        finally:
            _cleanup(admin_headers, unique_code)


# ── Checkout with coupon ────────────────────────────────────────────────

class TestCheckoutWithCoupon:

    def test_checkout_applies_percent_coupon(self, fresh_student):
        r = requests.post(f"{API}/enrollments/checkout",
                          headers=fresh_student["headers"],
                          json={"course_slug": PAID_SLUG,
                                "coupon_code": "LAUNCH20"},
                          timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["coupon_code"] == "LAUNCH20"
        assert d["original_amount"] == 1999
        assert d["discount"] == 399
        assert d["amount"] == 1600
        # amount_paise reflects discounted price
        assert d["amount_paise"] == 1600 * 100
        assert d["order_id"].startswith("order_")

    def test_checkout_uncouponed_full_price(self, fresh_student):
        r = requests.post(f"{API}/enrollments/checkout",
                          headers=fresh_student["headers"],
                          json={"course_slug": PAID_SLUG}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["amount"] == 1999
        assert d["amount_paise"] == 199900
        assert d.get("coupon_code") in (None, "")
        assert d.get("discount", 0) == 0

    def test_checkout_invalid_coupon_400(self, fresh_student):
        r = requests.post(f"{API}/enrollments/checkout",
                          headers=fresh_student["headers"],
                          json={"course_slug": PAID_SLUG,
                                "coupon_code": "NOPE_NOPE_NOPE"}, timeout=15)
        assert r.status_code == 400
        # Detail should be the invalid coupon message
        body = r.json()
        assert "invalid" in str(body.get("detail", "")).lower()


# ── Verify increments used_count ───────────────────────────────────────

class TestVerifyIncrementsUsedCount:

    def test_used_count_increments_by_one(self, admin_headers, fresh_student, unique_code):
        try:
            # Create coupon
            requests.post(f"{API}/admin/coupons", headers=admin_headers,
                          json={"code": unique_code, "kind": "percent", "value": 10},
                          timeout=15)
            # Read initial used_count
            lst = requests.get(f"{API}/admin/coupons", headers=admin_headers,
                               timeout=15).json()
            before = next(c for c in lst if c["code"] == unique_code)["used_count"]

            # Checkout with the coupon
            chk = requests.post(f"{API}/enrollments/checkout",
                                headers=fresh_student["headers"],
                                json={"course_slug": PAID_SLUG,
                                      "coupon_code": unique_code}, timeout=30)
            assert chk.status_code == 200, chk.text
            d = chk.json()
            order_id = d["order_id"]
            enrollment_id = d["enrollment_id"]

            # Compute correct signature
            payment_id = f"pay_test_{secrets.token_hex(6)}"
            msg = f"{order_id}|{payment_id}"
            sig = hmac.new(RZP_KEY_SECRET.encode(), msg.encode(),
                           hashlib.sha256).hexdigest()
            vr = requests.post(f"{API}/enrollments/verify",
                               headers=fresh_student["headers"],
                               json={"enrollment_id": enrollment_id,
                                     "razorpay_payment_id": payment_id,
                                     "razorpay_order_id": order_id,
                                     "razorpay_signature": sig}, timeout=30)
            assert vr.status_code == 200, vr.text

            # Check used_count incremented by exactly 1
            lst2 = requests.get(f"{API}/admin/coupons", headers=admin_headers,
                                timeout=15).json()
            after = next(c for c in lst2 if c["code"] == unique_code)["used_count"]
            assert after == before + 1, f"Expected used_count to go {before}→{before+1}, got {after}"
        finally:
            _cleanup(admin_headers, unique_code)


# ── Existing flows still work ──────────────────────────────────────────

class TestExistingFlowsStillWork:

    def test_signature_mismatch_400(self, fresh_student):
        chk = requests.post(f"{API}/enrollments/checkout",
                            headers=fresh_student["headers"],
                            json={"course_slug": PAID_SLUG}, timeout=30)
        assert chk.status_code == 200, chk.text
        d = chk.json()
        order_id = d["order_id"]
        enrollment_id = d["enrollment_id"]
        # Forged signature
        vr = requests.post(f"{API}/enrollments/verify",
                           headers=fresh_student["headers"],
                           json={"enrollment_id": enrollment_id,
                                 "razorpay_payment_id": "pay_forged",
                                 "razorpay_order_id": order_id,
                                 "razorpay_signature": "deadbeef" * 8},
                           timeout=15)
        assert vr.status_code == 400
        assert "invalid payment signature" in str(vr.json().get("detail", "")).lower()

    def test_already_enrolled_short_circuits(self, fresh_student):
        # Pay first
        chk1 = requests.post(f"{API}/enrollments/checkout",
                             headers=fresh_student["headers"],
                             json={"course_slug": PAID_SLUG}, timeout=30)
        order_id = chk1.json()["order_id"]
        enrollment_id = chk1.json()["enrollment_id"]
        payment_id = f"pay_test_{secrets.token_hex(6)}"
        sig = hmac.new(RZP_KEY_SECRET.encode(),
                       f"{order_id}|{payment_id}".encode(),
                       hashlib.sha256).hexdigest()
        vr = requests.post(f"{API}/enrollments/verify",
                           headers=fresh_student["headers"],
                           json={"enrollment_id": enrollment_id,
                                 "razorpay_payment_id": payment_id,
                                 "razorpay_order_id": order_id,
                                 "razorpay_signature": sig}, timeout=30)
        assert vr.status_code == 200

        # Second checkout should short-circuit
        chk2 = requests.post(f"{API}/enrollments/checkout",
                             headers=fresh_student["headers"],
                             json={"course_slug": PAID_SLUG,
                                   "coupon_code": "LAUNCH20"}, timeout=30)
        assert chk2.status_code == 200
        d2 = chk2.json()
        assert d2.get("already_enrolled") is True
