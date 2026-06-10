"""Backend API tests for Phase 2: Admin CRUD, Site Assets, Book Cover Images.
Targets /api/site/assets, /api/admin/books, /api/admin/blog, /api/admin/courses,
/api/admin/site, /api/admin/newsletter, /api/admin/contacts.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@vishnuraghav.in"
ADMIN_PASSWORD = "Admin@12345"


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
    creds = {"name": "TestPhase2 Student", "email": f"TEST_phase2_{ts}@example.com", "password": "Student@123"}
    r = session.post(f"{API}/auth/register", json=creds)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def H(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ───── Site Assets ─────
class TestSiteAssets:
    def test_site_assets_default(self, session):
        r = session.get(f"{API}/site/assets")
        assert r.status_code == 200
        d = r.json()
        assert "author_photo" in d
        assert "hero_quote" in d
        # Default author photo must contain customer-assets URL with y6mn6cdy_WhatsApp
        assert "customer-assets.emergentagent.com" in d["author_photo"]
        assert "y6mn6cdy_WhatsApp" in d["author_photo"]


# ───── Book Covers ─────
class TestBookCovers:
    def test_books_have_cover_images(self, session):
        r = session.get(f"{API}/books")
        assert r.status_code == 200
        books = r.json()
        assert len(books) == 3
        for b in books:
            assert b.get("cover_image"), f"book {b['slug']} missing cover_image"
            assert "customer-assets.emergentagent.com" in b["cover_image"], \
                f"book {b['slug']} cover_image not from customer-assets: {b['cover_image']}"


# ───── Mongo-backed reads ─────
class TestMongoReads:
    def test_books_count(self, session):
        r = session.get(f"{API}/books")
        assert r.status_code == 200
        assert len(r.json()) == 3

    def test_courses_count(self, session):
        r = session.get(f"{API}/courses")
        assert r.status_code == 200
        assert len(r.json()) == 4

    def test_blog_count(self, session):
        r = session.get(f"{API}/blog")
        assert r.status_code == 200
        assert len(r.json()) == 5


# ───── Admin Auth Required ─────
class TestAdminAuth:
    def test_patch_book_no_token(self, session):
        r = requests.patch(f"{API}/admin/books/jo-mai-kah-na-saka", json={"price": "₹999"})
        assert r.status_code == 401

    def test_patch_book_student_token(self, session, student_token):
        r = session.patch(f"{API}/admin/books/jo-mai-kah-na-saka",
                          json={"price": "₹999"}, headers=H(student_token))
        assert r.status_code == 403


# ───── Admin Books CRUD ─────
class TestAdminBooks:
    def test_update_existing_book_and_revert(self, session, admin_token):
        # Update
        r = session.patch(f"{API}/admin/books/dagmagate-pair",
                          json={"price": "₹250"}, headers=H(admin_token))
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True
        # Verify persisted
        r2 = session.get(f"{API}/books/dagmagate-pair")
        assert r2.status_code == 200
        assert r2.json()["price"] == "₹250"
        # Revert
        r3 = session.patch(f"{API}/admin/books/dagmagate-pair",
                           json={"price": "₹220"}, headers=H(admin_token))
        assert r3.status_code == 200
        r4 = session.get(f"{API}/books/dagmagate-pair")
        assert r4.json()["price"] == "₹220"

    def test_create_and_delete_book(self, session, admin_token):
        slug = f"TEST_book_{int(time.time())}"
        payload = {"slug": slug, "title": "TEST Book"}
        r = session.post(f"{API}/admin/books", json=payload, headers=H(admin_token))
        assert r.status_code == 200, r.text
        assert r.json()["slug"] == slug
        # GET
        r2 = session.get(f"{API}/books/{slug}")
        assert r2.status_code == 200
        assert r2.json()["title"] == "TEST Book"
        # DELETE
        r3 = session.delete(f"{API}/admin/books/{slug}", headers=H(admin_token))
        assert r3.status_code == 200
        # GET 404 (after delete: should fall back? slug not in BOOKS static so 404 expected)
        r4 = session.get(f"{API}/books/{slug}")
        assert r4.status_code == 404


# ───── Admin Blog CRUD ─────
class TestAdminBlog:
    def test_blog_crud_cycle(self, session, admin_token):
        slug = f"TEST_blog_{int(time.time())}"
        payload = {
            "slug": slug, "title": "TEST Post", "category": "productivity",
            "excerpt": "x", "body": "y", "date": "Feb 20, 2026",
            "read_min": 3, "icon": "Zap", "palette": ["#1a1228", "#3a2865"],
        }
        r = session.post(f"{API}/admin/blog", json=payload, headers=H(admin_token))
        assert r.status_code == 200, r.text
        # GET
        r2 = session.get(f"{API}/blog/{slug}")
        assert r2.status_code == 200
        assert r2.json()["title"] == "TEST Post"
        # PATCH
        r3 = session.patch(f"{API}/admin/blog/{slug}",
                           json={"title": "TEST Updated"}, headers=H(admin_token))
        assert r3.status_code == 200
        r4 = session.get(f"{API}/blog/{slug}")
        assert r4.json()["title"] == "TEST Updated"
        # DELETE
        r5 = session.delete(f"{API}/admin/blog/{slug}", headers=H(admin_token))
        assert r5.status_code == 200
        r6 = session.get(f"{API}/blog/{slug}")
        assert r6.status_code == 404


# ───── Admin Course Update ─────
class TestAdminCourses:
    def test_course_update_and_revert(self, session, admin_token):
        r = session.patch(f"{API}/admin/courses/time-management-mastery",
                          json={"price": 1799}, headers=H(admin_token))
        assert r.status_code == 200, r.text
        r2 = session.get(f"{API}/courses/time-management-mastery")
        assert r2.json()["price"] == 1799
        # Revert
        r3 = session.patch(f"{API}/admin/courses/time-management-mastery",
                           json={"price": 1999}, headers=H(admin_token))
        assert r3.status_code == 200
        r4 = session.get(f"{API}/courses/time-management-mastery")
        assert r4.json()["price"] == 1999


# ───── Admin Site Update ─────
class TestAdminSite:
    def test_site_hero_quote_update_revert(self, session, admin_token):
        r = session.patch(f"{API}/admin/site",
                          json={"hero_quote": "New quote"}, headers=H(admin_token))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["hero_quote"] == "New quote"
        # Verify via /site/assets
        r2 = session.get(f"{API}/site/assets")
        assert r2.json()["hero_quote"] == "New quote"
        # Revert
        r3 = session.patch(f"{API}/admin/site",
                           json={"hero_quote": ""}, headers=H(admin_token))
        assert r3.status_code == 200
        assert r3.json()["hero_quote"] == ""


# ───── Admin Read-only endpoints ─────
class TestAdminReadOnly:
    def test_admin_newsletter_list(self, session, admin_token):
        r = session.get(f"{API}/admin/newsletter", headers=H(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_contacts_list(self, session, admin_token):
        r = session.get(f"{API}/admin/contacts", headers=H(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_newsletter_forbidden_for_student(self, session, student_token):
        r = session.get(f"{API}/admin/newsletter", headers=H(student_token))
        assert r.status_code == 403

    def test_admin_contacts_forbidden_for_student(self, session, student_token):
        r = session.get(f"{API}/admin/contacts", headers=H(student_token))
        assert r.status_code == 403


# ───── Regression: existing flows unaffected ─────
class TestRegression:
    def test_register_login_me_enroll(self, session):
        ts = int(time.time())
        creds = {"name": "TEST_reg", "email": f"TEST_reg_{ts}@example.com", "password": "Pass@1234"}
        r = session.post(f"{API}/auth/register", json=creds)
        assert r.status_code == 200
        tok = r.json()["token"]
        r2 = session.get(f"{API}/auth/me", headers=H(tok))
        assert r2.status_code == 200
        assert r2.json()["email"] == creds["email"].lower()
        # Login again
        r3 = session.post(f"{API}/auth/login", json={"email": creds["email"], "password": creds["password"]})
        assert r3.status_code == 200
        # Enroll mock
        r4 = session.post(f"{API}/enrollments/checkout",
                          json={"course_slug": "overcoming-overthinking"}, headers=H(tok))
        assert r4.status_code == 200
        assert r4.json()["status"] == "paid"
