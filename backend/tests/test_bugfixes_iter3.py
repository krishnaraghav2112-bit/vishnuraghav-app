"""Iteration 3 — Bug fix tests for Vishnu Raghav site.
Focus:
 - /api/site/assets now includes youtube_videos + youtube_channel_url
 - PATCH /api/admin/site accepts youtube_videos list
 - Admin role enforcement on PATCH /admin/site (401 without token, 403 for student)
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vishnu-books.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@vishnuraghav.in"
ADMIN_PASSWORD = "Admin@12345"


def auth_h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def student_token(session):
    ts = int(time.time())
    creds = {"name": "TEST_b3", "email": f"TEST_bug3_{ts}@example.com", "password": "Student@123"}
    r = session.post(f"{API}/auth/register", json=creds)
    assert r.status_code == 200, r.text
    return r.json()["token"]


# /api/site/assets — new fields
class TestSiteAssetsNewFields:
    def test_assets_contains_youtube_videos(self, session):
        r = session.get(f"{API}/site/assets")
        assert r.status_code == 200
        d = r.json()
        assert "youtube_videos" in d, "Missing youtube_videos key"
        assert isinstance(d["youtube_videos"], list)
        assert len(d["youtube_videos"]) == 3, f"Expected 3 default videos, got {len(d['youtube_videos'])}"
        for v in d["youtube_videos"]:
            assert "title" in v
            assert "url" in v
            assert "palette" in v
            assert isinstance(v["palette"], list)

    def test_assets_contains_youtube_channel_url(self, session):
        r = session.get(f"{API}/site/assets")
        assert r.status_code == 200
        d = r.json()
        assert "youtube_channel_url" in d
        assert d["youtube_channel_url"] == "https://youtube.com/@vishnuraghav"

    def test_assets_still_returns_author_photo_and_hero(self, session):
        r = session.get(f"{API}/site/assets")
        assert r.status_code == 200
        d = r.json()
        assert "author_photo" in d and d["author_photo"].startswith("http")
        assert "hero_quote" in d


# PATCH /admin/site youtube_videos
class TestAdminSiteYouTubeUpdate:
    def test_patch_youtube_videos_persists(self, session, admin_token):
        payload = {
            "youtube_videos": [
                {"title": "Test Video 1", "url": "https://youtu.be/abc12345678", "palette": ["#111111", "#222222"]}
            ]
        }
        r = session.patch(f"{API}/admin/site", json=payload, headers=auth_h(admin_token))
        assert r.status_code == 200, r.text
        d = r.json()
        assert "youtube_videos" in d
        assert len(d["youtube_videos"]) == 1
        assert d["youtube_videos"][0]["title"] == "Test Video 1"
        assert d["youtube_videos"][0]["url"] == "https://youtu.be/abc12345678"

        # GET to verify persistence
        r2 = session.get(f"{API}/site/assets")
        assert r2.status_code == 200
        d2 = r2.json()
        assert len(d2["youtube_videos"]) == 1
        assert d2["youtube_videos"][0]["url"] == "https://youtu.be/abc12345678"

    def test_patch_youtube_channel_url(self, session, admin_token):
        payload = {"youtube_channel_url": "https://youtube.com/@testchannel"}
        r = session.patch(f"{API}/admin/site", json=payload, headers=auth_h(admin_token))
        assert r.status_code == 200
        assert r.json()["youtube_channel_url"] == "https://youtube.com/@testchannel"

    def test_revert_defaults(self, session, admin_token):
        # Revert to default 3 videos and channel URL
        defaults = [
            {"title": "Time Management की पूरी Guide", "url": "", "palette": ["#1a1228", "#3a2865"]},
            {"title": "Overthinking को कैसे रोकें — 5 Steps", "url": "", "palette": ["#120c28", "#2c1870"]},
            {"title": "Failure के बाद कैसे उठें — Real Talk", "url": "", "palette": ["#1a0a10", "#4a1030"]},
        ]
        payload = {
            "youtube_videos": defaults,
            "youtube_channel_url": "https://youtube.com/@vishnuraghav",
        }
        r = session.patch(f"{API}/admin/site", json=payload, headers=auth_h(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert len(d["youtube_videos"]) == 3
        assert d["youtube_channel_url"] == "https://youtube.com/@vishnuraghav"


# Role enforcement on /admin/site PATCH
class TestAdminSiteRoleEnforcement:
    def test_patch_site_without_token(self, session):
        r = requests.patch(f"{API}/admin/site", json={"hero_quote": "x"})
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"

    def test_patch_site_student_forbidden(self, session, student_token):
        r = session.patch(f"{API}/admin/site", json={"hero_quote": "x"}, headers=auth_h(student_token))
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
