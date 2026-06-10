"""
Iteration 7 — Razorpay webhook handler tests.

Covers POST /api/razorpay/webhook:
- 503 fail-closed when RAZORPAY_WEBHOOK_SECRET unset (NOT tested live — needs env unset)
- 400 missing signature
- 400 invalid signature (HMAC mismatch)
- Happy path payment.captured -> enrollment paid, paid_via=webhook
- Happy path with LAUNCH20 coupon -> used_count incremented by exactly 1
- Idempotency on replay (no double-write, no double-increment)
- /enrollments/verify first then webhook = no-op (no double-increment)
- order.paid event accepted (order_id from order.entity.id)
- payment.failed event marks enrollment failed
- Unknown event ignored -> 200 ok
- Unknown order_id -> 200 ok, no crash
- Regression: /enrollments/verify still rejects bad sig (400) / accepts good sig (200)

NOTE: pre-test the operator added RAZORPAY_WEBHOOK_SECRET="test_webhook_secret_xyz_iter7"
to /app/backend/.env and restarted backend.
"""
import asyncio
import hashlib
import hmac
import json
import os
import secrets

import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://raghav-portfolio-2.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"

RZP_KEY_ID = "rzp_test_Sz5OWC87AMxkyO"
RZP_KEY_SECRET = "6l04X9vZRhE4pxuleTrdTkge"
WEBHOOK_SECRET = "test_webhook_secret_xyz_iter7"

PAID_SLUG = "time-management-mastery"
PAID_PRICE_INR = 1999
COUPON_CODE = "LAUNCH20"  # 20% off (active in seed)

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


# ── Helpers ─────────────────────────────────────────────────────────────

def _sign(raw_body_bytes: bytes) -> str:
    return hmac.new(WEBHOOK_SECRET.encode(), raw_body_bytes, hashlib.sha256).hexdigest()


def _build_captured_payload(order_id: str, payment_id: str) -> str:
    return json.dumps({
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "order_id": order_id,
                    "status": "captured",
                    "amount": PAID_PRICE_INR * 100,
                    "currency": "INR",
                }
            }
        },
    })


def _post_webhook(raw_body: str, signature: str | None):
    headers = {"Content-Type": "application/json"}
    if signature is not None:
        headers["X-Razorpay-Signature"] = signature
    return requests.post(f"{API}/razorpay/webhook", data=raw_body, headers=headers, timeout=30)


def _db():
    return AsyncIOMotorClient(MONGO_URL)[DB_NAME]


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro) if False else asyncio.run(coro)


def _find_enrollment(order_id: str):
    async def _q():
        return await _db().enrollments.find_one({"razorpay_order_id": order_id})
    return _run(_q())


def _get_coupon_used_count(code: str) -> int:
    async def _q():
        c = await _db().coupons.find_one({"code": code})
        return int((c or {}).get("used_count", 0))
    return _run(_q())


def _register_student(prefix: str = "wh") -> dict:
    tok = secrets.token_hex(4)
    email = f"TEST_{prefix}_{tok}@example.com"
    r = requests.post(
        f"{API}/auth/register",
        json={"name": f"WH Student {tok}", "email": email,
              "password": "Student@12345", "phone": "9999999999"},
        timeout=30,
    )
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    return {"email": email, "token": data["token"],
            "headers": {"Authorization": f"Bearer {data['token']}"}}


def _checkout(headers, coupon=None):
    body = {"course_slug": PAID_SLUG}
    if coupon:
        body["coupon_code"] = coupon
    r = requests.post(f"{API}/enrollments/checkout", headers=headers, json=body, timeout=30)
    assert r.status_code == 200, f"checkout failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("mode") == "razorpay", f"unexpected mode {data}"
    return data["order_id"], data["enrollment_id"]


# ── Signature & config tests ────────────────────────────────────────────

class TestWebhookSignature:

    def test_missing_signature_returns_400(self):
        r = _post_webhook('{"event":"payment.captured"}', signature=None)
        assert r.status_code == 400, f"expected 400, got {r.status_code} {r.text}"
        assert "signature" in r.json().get("detail", "").lower()

    def test_invalid_signature_returns_400(self):
        raw = _build_captured_payload("order_fake", "pay_fake")
        bogus_sig = "0" * 64
        r = _post_webhook(raw, signature=bogus_sig)
        assert r.status_code == 400, f"expected 400, got {r.status_code} {r.text}"
        assert "invalid" in r.json().get("detail", "").lower()


# ── Happy path ───────────────────────────────────────────────────────────

class TestWebhookHappyPath:

    def test_payment_captured_marks_paid(self):
        student = _register_student("p1")
        order_id, enrollment_id = _checkout(student["headers"])

        payment_id = f"pay_test_{secrets.token_hex(6)}"
        raw = _build_captured_payload(order_id, payment_id)
        sig = _sign(raw.encode())
        r = _post_webhook(raw, sig)
        assert r.status_code == 200, f"webhook failed: {r.status_code} {r.text}"
        assert r.json().get("ok") is True

        enr = _find_enrollment(order_id)
        assert enr is not None, "enrollment not found"
        assert enr.get("status") == "paid", f"status={enr.get('status')}"
        assert enr.get("razorpay_payment_id") == payment_id
        assert enr.get("paid_via") == "webhook"

    def test_payment_captured_with_coupon_increments_used_count_once(self):
        student = _register_student("p2")
        order_id, enrollment_id = _checkout(student["headers"], coupon=COUPON_CODE)

        before = _get_coupon_used_count(COUPON_CODE)

        payment_id = f"pay_test_{secrets.token_hex(6)}"
        raw = _build_captured_payload(order_id, payment_id)
        r = _post_webhook(raw, _sign(raw.encode()))
        assert r.status_code == 200, f"webhook failed: {r.status_code} {r.text}"

        enr = _find_enrollment(order_id)
        assert enr and enr.get("status") == "paid"
        assert enr.get("coupon_code") == COUPON_CODE

        after = _get_coupon_used_count(COUPON_CODE)
        assert after == before + 1, f"used_count: before={before} after={after}"

        # Stash for the idempotency replay test below
        TestWebhookHappyPath._coupon_order_id = order_id
        TestWebhookHappyPath._coupon_payment_id = payment_id
        TestWebhookHappyPath._coupon_after = after

    def test_replay_is_idempotent(self):
        order_id = getattr(TestWebhookHappyPath, "_coupon_order_id", None)
        payment_id = getattr(TestWebhookHappyPath, "_coupon_payment_id", None)
        after = getattr(TestWebhookHappyPath, "_coupon_after", None)
        if not order_id:
            pytest.skip("previous test did not stash order id")

        raw = _build_captured_payload(order_id, payment_id)
        r = _post_webhook(raw, _sign(raw.encode()))
        assert r.status_code == 200, f"replay failed: {r.status_code} {r.text}"

        enr = _find_enrollment(order_id)
        assert enr and enr.get("status") == "paid"

        again = _get_coupon_used_count(COUPON_CODE)
        assert again == after, f"used_count incremented on replay: {after}->{again}"


# ── Verify-first then webhook = no-op ────────────────────────────────────

class TestVerifyThenWebhookNoop:

    def test_verify_first_then_webhook_no_double_increment(self):
        student = _register_student("vfw")
        order_id, enrollment_id = _checkout(student["headers"], coupon=COUPON_CODE)

        before = _get_coupon_used_count(COUPON_CODE)

        # client verify with correct Razorpay signature (uses KEY_SECRET, not webhook secret)
        fake_payment = f"pay_test_{secrets.token_hex(6)}"
        msg = f"{order_id}|{fake_payment}".encode()
        client_sig = hmac.new(RZP_KEY_SECRET.encode(), msg, hashlib.sha256).hexdigest()
        rv = requests.post(
            f"{API}/enrollments/verify",
            headers=student["headers"],
            json={"enrollment_id": enrollment_id,
                  "razorpay_payment_id": fake_payment,
                  "razorpay_order_id": order_id,
                  "razorpay_signature": client_sig},
            timeout=30,
        )
        assert rv.status_code == 200, f"verify failed: {rv.status_code} {rv.text}"

        mid = _get_coupon_used_count(COUPON_CODE)
        assert mid == before + 1, f"verify did not increment: {before}->{mid}"

        # Now webhook arrives — should be a no-op
        webhook_payment = f"pay_test_{secrets.token_hex(6)}"
        raw = _build_captured_payload(order_id, webhook_payment)
        r = _post_webhook(raw, _sign(raw.encode()))
        assert r.status_code == 200, f"webhook failed: {r.status_code} {r.text}"

        enr = _find_enrollment(order_id)
        assert enr and enr.get("status") == "paid"
        # payment_id should be the one set by /verify, not the webhook's fake
        assert enr.get("razorpay_payment_id") == fake_payment, \
            f"webhook overwrote payment_id: {enr.get('razorpay_payment_id')}"

        after = _get_coupon_used_count(COUPON_CODE)
        assert after == mid, f"webhook double-incremented: {mid}->{after}"


# ── order.paid event ─────────────────────────────────────────────────────

class TestOrderPaidEvent:

    def test_order_paid_event_accepted(self):
        student = _register_student("op")
        order_id, _ = _checkout(student["headers"])

        payment_id = f"pay_test_{secrets.token_hex(6)}"
        payload = {
            "event": "order.paid",
            "payload": {
                "order": {"entity": {"id": order_id, "amount": PAID_PRICE_INR * 100,
                                     "currency": "INR", "status": "paid"}},
                "payment": {"entity": {"id": payment_id, "order_id": order_id,
                                       "status": "captured"}},
            },
        }
        raw = json.dumps(payload)
        r = _post_webhook(raw, _sign(raw.encode()))
        assert r.status_code == 200, f"order.paid failed: {r.status_code} {r.text}"

        enr = _find_enrollment(order_id)
        assert enr and enr.get("status") == "paid"
        assert enr.get("razorpay_payment_id") == payment_id
        assert enr.get("paid_via") == "webhook"


# ── payment.failed event ────────────────────────────────────────────────

class TestPaymentFailedEvent:

    def test_payment_failed_marks_failed_not_paid(self):
        student = _register_student("pf")
        order_id, _ = _checkout(student["headers"])

        payload = {
            "event": "payment.failed",
            "payload": {
                "payment": {"entity": {
                    "id": f"pay_test_{secrets.token_hex(6)}",
                    "order_id": order_id,
                    "status": "failed",
                    "error_description": "Insufficient funds (test)",
                }},
            },
        }
        raw = json.dumps(payload)
        r = _post_webhook(raw, _sign(raw.encode()))
        assert r.status_code == 200, f"payment.failed webhook failed: {r.status_code} {r.text}"

        enr = _find_enrollment(order_id)
        assert enr is not None
        assert enr.get("status") == "failed", f"status={enr.get('status')}"
        assert enr.get("status") != "paid"
        assert enr.get("failure_reason"), "failure_reason should be populated"


# ── Unknown event / unknown order ───────────────────────────────────────

class TestUnknownEventAndOrder:

    def test_unknown_event_returns_200(self):
        payload = {"event": "subscription.activated", "payload": {}}
        raw = json.dumps(payload)
        r = _post_webhook(raw, _sign(raw.encode()))
        assert r.status_code == 200, f"unknown event should be 200: {r.status_code} {r.text}"
        assert r.json().get("ok") is True

    def test_unknown_order_id_returns_200(self):
        raw = _build_captured_payload("order_does_not_exist_xyz", "pay_dne")
        r = _post_webhook(raw, _sign(raw.encode()))
        assert r.status_code == 200, f"unknown order should ack 200: {r.status_code} {r.text}"
        assert r.json().get("ok") is True


# ── Regression: /enrollments/verify still works ─────────────────────────

class TestVerifyRegression:

    def test_verify_rejects_bad_signature(self):
        student = _register_student("rg")
        order_id, enrollment_id = _checkout(student["headers"])
        rv = requests.post(
            f"{API}/enrollments/verify",
            headers=student["headers"],
            json={"enrollment_id": enrollment_id,
                  "razorpay_payment_id": "pay_fake",
                  "razorpay_order_id": order_id,
                  "razorpay_signature": "deadbeef" * 8},
            timeout=20,
        )
        assert rv.status_code == 400, f"expected 400, got {rv.status_code} {rv.text}"

    def test_verify_accepts_correct_signature(self):
        student = _register_student("rg2")
        order_id, enrollment_id = _checkout(student["headers"])
        payment_id = f"pay_test_{secrets.token_hex(6)}"
        msg = f"{order_id}|{payment_id}".encode()
        sig = hmac.new(RZP_KEY_SECRET.encode(), msg, hashlib.sha256).hexdigest()
        rv = requests.post(
            f"{API}/enrollments/verify",
            headers=student["headers"],
            json={"enrollment_id": enrollment_id,
                  "razorpay_payment_id": payment_id,
                  "razorpay_order_id": order_id,
                  "razorpay_signature": sig},
            timeout=20,
        )
        assert rv.status_code == 200, f"expected 200, got {rv.status_code} {rv.text}"
        body = rv.json()
        assert body.get("status") == "paid"

    def test_coupons_validate_still_works(self):
        student = _register_student("rg3")
        r = requests.post(
            f"{API}/coupons/validate",
            headers=student["headers"],
            json={"code": COUPON_CODE, "course_slug": PAID_SLUG},
            timeout=15,
        )
        assert r.status_code == 200, f"validate failed: {r.status_code} {r.text}"
        data = r.json()
        assert data.get("valid") is True
        assert data.get("code") == COUPON_CODE
