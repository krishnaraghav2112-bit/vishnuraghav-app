"""Iteration 4 — Image upload + YouTube thumbnail tests.

Covers:
  * POST /api/admin/upload (multipart, admin token required)
  * Static serving of /api/uploads/<file>
  * Non-admin and non-image rejection
  * Auto-save of uploaded URL into:
      - Site Settings (author_photo)
      - Books cover_image
      - Courses thumbnail
      - Blog image
  * youtube_videos persistence on /api/site/assets after PATCH
"""

import io
import os
import struct
import time
import zlib

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://raghav-portfolio-2.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@vishnuraghav.in"
ADMIN_PW = "Admin@12345"


def _png_bytes() -> bytes:
    """Return a tiny valid 1×1 PNG (no external libs)."""
    def chunk(tag, data):
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    raw = b"\x00\xff\xff\xff"  # filter byte + 1 RGB pixel
    idat = chunk(b"IDAT", zlib.compress(raw))
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW}, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def student_token():
    # create a student to verify 403
    email = f"TEST_iter4_{int(time.time())}@example.com"
    r = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "password": "Test@12345", "name": "Iter4 Student"
    }, timeout=15)
    if r.status_code in (200, 201):
        return r.json()["token"]
    # already exists fallback
    r2 = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "Test@12345"}, timeout=15)
    if r2.status_code == 200:
        return r2.json()["token"]
    pytest.skip(f"could not create student: {r.status_code} {r.text}")


# ── Upload endpoint ─────────────────────────────────────────────────────────
class TestUpload:
    def test_upload_requires_auth(self):
        files = {"file": ("a.png", _png_bytes(), "image/png")}
        r = requests.post(f"{BASE_URL}/api/admin/upload", files=files, timeout=20)
        assert r.status_code in (401, 403), r.text

    def test_upload_forbids_student(self, student_token):
        files = {"file": ("a.png", _png_bytes(), "image/png")}
        r = requests.post(f"{BASE_URL}/api/admin/upload", files=files,
                          headers={"Authorization": f"Bearer {student_token}"}, timeout=20)
        assert r.status_code in (401, 403), r.text

    def test_upload_rejects_text(self, admin_headers):
        files = {"file": ("note.txt", b"hello", "text/plain")}
        r = requests.post(f"{BASE_URL}/api/admin/upload", files=files, headers=admin_headers, timeout=20)
        assert r.status_code == 400, r.text

    def test_upload_png_and_serves(self, admin_headers):
        payload = _png_bytes()
        files = {"file": ("test.png", payload, "image/png")}
        r = requests.post(f"{BASE_URL}/api/admin/upload", files=files, headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "url" in body and body["url"].startswith("/api/uploads/")
        assert body["size"] == len(payload)
        # GET it back
        full_url = f"{BASE_URL}{body['url']}"
        g = requests.get(full_url, timeout=20)
        assert g.status_code == 200, f"{g.status_code} {full_url}"
        assert g.headers.get("content-type", "").startswith("image/"), g.headers
        assert len(g.content) == len(payload)
        # Stash for use in subsequent tests
        pytest.uploaded_url = body["url"]


# ── Auto-save to resources ──────────────────────────────────────────────────
class TestAutoSave:
    def test_site_author_photo(self, admin_headers):
        url = getattr(pytest, "uploaded_url", None)
        if not url:
            pytest.skip("no uploaded url")
        r = requests.patch(f"{BASE_URL}/api/admin/site", json={"author_photo": url},
                           headers=admin_headers, timeout=20)
        assert r.status_code == 200, r.text
        g = requests.get(f"{BASE_URL}/api/site/assets", timeout=15)
        assert g.status_code == 200
        assert g.json().get("author_photo") == url

    def test_book_cover_image(self, admin_headers):
        url = getattr(pytest, "uploaded_url", None)
        if not url:
            pytest.skip("no uploaded url")
        slug = "jo-mai-kah-na-saka"
        r = requests.patch(f"{BASE_URL}/api/admin/books/{slug}", json={"cover_image": url},
                           headers=admin_headers, timeout=20)
        assert r.status_code == 200, r.text
        g = requests.get(f"{BASE_URL}/api/books", timeout=15)
        assert g.status_code == 200
        match = [b for b in g.json() if b.get("slug") == slug]
        assert match, "book not found"
        assert match[0].get("cover_image") == url

    def test_course_thumbnail(self, admin_headers):
        url = getattr(pytest, "uploaded_url", None)
        if not url:
            pytest.skip("no uploaded url")
        # discover a course slug
        gg = requests.get(f"{BASE_URL}/api/courses", timeout=15)
        assert gg.status_code == 200
        courses = gg.json()
        assert courses, "no courses"
        slug = courses[0]["slug"]
        r = requests.patch(f"{BASE_URL}/api/admin/courses/{slug}", json={"thumbnail": url},
                           headers=admin_headers, timeout=20)
        assert r.status_code == 200, r.text
        g = requests.get(f"{BASE_URL}/api/courses", timeout=15)
        match = [c for c in g.json() if c.get("slug") == slug]
        assert match and match[0].get("thumbnail") == url

    def test_blog_image(self, admin_headers):
        url = getattr(pytest, "uploaded_url", None)
        if not url:
            pytest.skip("no uploaded url")
        gg = requests.get(f"{BASE_URL}/api/blog", timeout=15)
        assert gg.status_code == 200
        posts = gg.json()
        assert posts, "no blog posts"
        slug = posts[0]["slug"]
        r = requests.patch(f"{BASE_URL}/api/admin/blog/{slug}", json={"image": url},
                           headers=admin_headers, timeout=20)
        assert r.status_code == 200, r.text
        g = requests.get(f"{BASE_URL}/api/blog", timeout=15)
        match = [p for p in g.json() if p.get("slug") == slug]
        assert match and match[0].get("image") == url


# ── YouTube videos persistence (URL formats) ────────────────────────────────
class TestYouTubeVideos:
    def test_patch_multiple_formats(self, admin_headers):
        vids = [
            {"title": "Watch URL", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
            {"title": "Shorts URL", "url": "https://www.youtube.com/shorts/jNQXAC9IVRw"},
            {"title": "Embed URL", "url": "https://www.youtube.com/embed/9bZkp7q19f0"},
        ]
        r = requests.patch(f"{BASE_URL}/api/admin/site", json={"youtube_videos": vids},
                           headers=admin_headers, timeout=20)
        assert r.status_code == 200, r.text
        g = requests.get(f"{BASE_URL}/api/site/assets", timeout=15)
        assert g.status_code == 200
        got = g.json().get("youtube_videos") or []
        assert len(got) == 3
        urls = [v.get("url") for v in got]
        assert "https://www.youtube.com/watch?v=dQw4w9WgXcQ" in urls
        assert "https://www.youtube.com/shorts/jNQXAC9IVRw" in urls
        assert "https://www.youtube.com/embed/9bZkp7q19f0" in urls
