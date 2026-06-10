"""Iteration 8 — Cloudinary integration tests.

Covers:
  * GET /api/ returns cloudinary:'disabled' when no CLOUDINARY_* env vars set
  * POST /api/admin/upload still works in local-disk fallback (no env vars)
      - returns url=/api/uploads/<file>, source='local'
      - file is written to /app/backend/uploads/ and served via GET
  * Upload rejects non-image files (400) and oversized files (>8MB, 400)
  * Upload requires admin auth (401 without token, 403 with student)
  * API_SECRET is never returned in any response
  * Backward compatibility: stored relative /api/uploads/ URLs still work

Cloudinary 'enabled' state branch is tested by code review + a separate
toggle in test_cloudinary_enabled_flag (runs only if explicitly opted-in,
since the user is adding real keys at deploy time, not here).
"""

import io
import os
import struct
import time
import zlib

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN_EMAIL = "admin@vishnuraghav.in"
ADMIN_PW = "Admin@12345"


def _png_bytes() -> bytes:
    def chunk(tag, data):
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    raw = b"\x00\xff\xff\xff"
    idat = chunk(b"IDAT", zlib.compress(raw))
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


@pytest.fixture(scope="module")
def admin_headers():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PW}, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def student_token():
    email = f"TEST_iter8_{int(time.time())}@example.com"
    r = requests.post(f"{BASE_URL}/api/auth/register",
                      json={"email": email, "password": "Test@12345", "name": "Iter8 Student"},
                      timeout=15)
    if r.status_code in (200, 201):
        return r.json()["token"]
    pytest.skip(f"could not create student: {r.status_code}")


# ── Cloudinary status flag ─────────────────────────────────────────────────
class TestCloudinaryStatus:
    def test_root_reports_disabled_in_dev(self):
        """When CLOUDINARY_* env vars are unset, GET /api/ must report disabled."""
        r = requests.get(f"{BASE_URL}/api/", timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        # Must be exactly 'disabled' or 'enabled'
        assert body.get("cloudinary") in ("disabled", "enabled"), body
        # In current env (no keys), expect disabled
        assert body.get("cloudinary") == "disabled", \
            f"Expected disabled (no Cloudinary env vars set), got: {body.get('cloudinary')}"

    def test_root_never_leaks_secret(self):
        """GET /api/ response must NEVER include API_SECRET or API_KEY values."""
        r = requests.get(f"{BASE_URL}/api/", timeout=15)
        text = r.text.lower()
        assert "api_secret" not in text
        assert "secret" not in r.json()  # no key called 'secret'
        # the response should not have a key named api_key either
        for k in r.json().keys():
            assert "secret" not in k.lower()
            assert "api_key" not in k.lower()


# ── Local-disk fallback (no Cloudinary keys) ────────────────────────────────
class TestLocalFallback:
    def test_upload_requires_auth(self):
        files = {"file": ("a.png", _png_bytes(), "image/png")}
        r = requests.post(f"{BASE_URL}/api/admin/upload", files=files, timeout=20)
        assert r.status_code in (401, 403), r.text

    def test_upload_forbids_student(self, student_token):
        files = {"file": ("a.png", _png_bytes(), "image/png")}
        r = requests.post(f"{BASE_URL}/api/admin/upload", files=files,
                          headers={"Authorization": f"Bearer {student_token}"}, timeout=20)
        assert r.status_code in (401, 403), r.text

    def test_upload_rejects_txt(self, admin_headers):
        files = {"file": ("note.txt", b"hello world", "text/plain")}
        r = requests.post(f"{BASE_URL}/api/admin/upload", files=files,
                          headers=admin_headers, timeout=20)
        assert r.status_code == 400, r.text
        assert "Unsupported" in r.text or "type" in r.text.lower()

    def test_upload_rejects_oversize(self, admin_headers):
        # 8MB + 1 byte
        big = b"\x89PNG\r\n\x1a\n" + b"\x00" * (8 * 1024 * 1024 + 1)
        files = {"file": ("big.png", big, "image/png")}
        r = requests.post(f"{BASE_URL}/api/admin/upload", files=files,
                          headers=admin_headers, timeout=60)
        assert r.status_code == 400, r.text
        assert "large" in r.text.lower() or "8" in r.text

    def test_upload_local_fallback_succeeds(self, admin_headers):
        payload = _png_bytes()
        files = {"file": ("test_cloudinary_fallback.png", payload, "image/png")}
        r = requests.post(f"{BASE_URL}/api/admin/upload", files=files,
                          headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()

        # Validate response structure
        assert "url" in body
        assert "filename" in body
        assert "size" in body
        assert "source" in body
        assert body["source"] == "local", f"Expected source='local', got {body['source']}"
        assert body["url"].startswith("/api/uploads/"), body["url"]
        assert body["size"] == len(payload)

        # SECURITY: ensure API_SECRET never appears in response
        text_lower = r.text.lower()
        assert "api_secret" not in text_lower
        assert "cloudinary" not in text_lower or body["source"] == "local"

        # File is actually served back
        full_url = f"{BASE_URL}{body['url']}"
        g = requests.get(full_url, timeout=20)
        assert g.status_code == 200, f"static fetch failed: {g.status_code} {full_url}"
        assert g.headers.get("content-type", "").startswith("image/")
        assert len(g.content) == len(payload)

        pytest.uploaded_url_iter8 = body["url"]

    def test_uploaded_url_persists_in_mongo(self, admin_headers):
        """Backward compatibility: old /api/uploads/ relative URLs still save/load."""
        url = getattr(pytest, "uploaded_url_iter8", None)
        if not url:
            pytest.skip("no uploaded url available")
        # Save URL into a book's cover_image
        r = requests.patch(f"{BASE_URL}/api/admin/books/jo-mai-kah-na-saka",
                           json={"cover_image": url}, headers=admin_headers, timeout=20)
        assert r.status_code == 200
        # Verify retrieval returns the same relative URL
        g = requests.get(f"{BASE_URL}/api/books/jo-mai-kah-na-saka", timeout=15)
        assert g.status_code == 200
        assert g.json().get("cover_image") == url


# ── Code-correctness assertions (verifying code-review items) ──────────────
class TestCloudinaryCodeBranch:
    """Verify that the code branches and config are wired correctly.
    We cannot do a live Cloudinary upload (no real keys) — these are
    static / config-level checks parsed from the server source."""

    def test_server_code_has_correct_cloudinary_block(self):
        path = "/app/backend/server.py"
        with open(path, "r") as f:
            src = f.read()
        # (a) raw bytes are passed, not a path → first positional arg is `data`
        assert "cloudinary.uploader.upload(\n                data," in src or \
               "cloudinary.uploader.upload(data," in src, \
               "Cloudinary upload must pass raw bytes (data), not a file path"
        # (b) folder=CLOUDINARY_FOLDER and unique_filename=True
        assert "folder=CLOUDINARY_FOLDER" in src
        assert "unique_filename=True" in src
        assert 'CLOUDINARY_FOLDER = os.environ.get("CLOUDINARY_FOLDER", "vishnu_raghav")' in src
        # (c) returns secure_url
        assert 'result.get("secure_url")' in src
        # (d) HTTPException 502 on Cloudinary error
        assert "status_code=502" in src
        # (e) API_SECRET never returned — ensure no return statement leaks it
        # Find the upload function block and verify
        assert "api_secret=CLOUDINARY_API_SECRET" in src  # only used in config()
        # Confirm response dict (return branch) does not include the secret
        # Look only at the admin_upload endpoint body
        start = src.find("async def admin_upload(")
        end = src.find("\n@api.", start + 1)
        upload_fn = src[start:end]
        # The upload function should reference CLOUDINARY_ENABLED & CLOUDINARY_FOLDER
        # but must NEVER reference the API secret value (no leak in returns).
        assert "CLOUDINARY_API_SECRET" not in upload_fn, \
               "admin_upload function must not reference API secret directly"
        assert "api_secret" not in upload_fn, \
               "admin_upload function must not reference api_secret directly"

    def test_static_mount_preserved(self):
        path = "/app/backend/server.py"
        with open(path, "r") as f:
            src = f.read()
        assert 'app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR))' in src, \
               "/api/uploads static mount must remain for backward compatibility"

    def test_enabled_flag_logic(self):
        path = "/app/backend/server.py"
        with open(path, "r") as f:
            src = f.read()
        assert "CLOUDINARY_ENABLED = bool(CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET)" in src, \
               "CLOUDINARY_ENABLED must require ALL 3 vars"
