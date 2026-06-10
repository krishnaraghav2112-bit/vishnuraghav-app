"""Backend API tests for Vishnu Raghav Platform"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vishnu-books.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@vishnuraghav.in"
ADMIN_PASSWORD = "Admin@12345"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def student_creds():
    ts = int(time.time())
    return {"name": "Test Student", "email": f"TEST_student_{ts}@example.com", "password": "Student@123"}


@pytest.fixture(scope="session")
def student_token(session, student_creds):
    r = session.post(f"{API}/auth/register", json=student_creds)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def auth_h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# Health
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        d = r.json()
        assert d["app"] == "Vishnu Raghav Platform"
        assert d["ok"] is True


# Content - Books
class TestBooks:
    def test_list_books(self, session):
        r = session.get(f"{API}/books")
        assert r.status_code == 200
        books = r.json()
        assert len(books) == 3
        slugs = [b["slug"] for b in books]
        assert "jo-mai-kah-na-saka" in slugs
        assert "dagmagate-pair" in slugs
        assert "uljha-jeevan" in slugs
        for b in books:
            assert "hindi" in b and b["hindi"]
            assert isinstance(b.get("takeaways"), list)
        dag = next(b for b in books if b["slug"] == "dagmagate-pair")
        assert dag["amazon"].startswith("http")
        assert dag["flipkart"].startswith("http")


# Content - Courses
class TestCourses:
    def test_list_courses(self, session):
        r = session.get(f"{API}/courses")
        assert r.status_code == 200
        courses = r.json()
        slugs = [c["slug"] for c in courses]
        for s in ["time-management-mastery", "overcoming-overthinking",
                  "mind-control-meditation", "relationship-emotional-clarity"]:
            assert s in slugs
        for c in courses:
            assert "price" in c and "original_price" in c
            assert isinstance(c["modules_detail"], list)

    def test_get_course(self, session):
        r = session.get(f"{API}/courses/time-management-mastery")
        assert r.status_code == 200
        d = r.json()
        assert d["slug"] == "time-management-mastery"
        assert d["title"] == "Time Management Mastery"

    def test_get_course_404(self, session):
        r = session.get(f"{API}/courses/non-existent")
        assert r.status_code == 404


# Content - Blog
class TestBlog:
    def test_list_blog(self, session):
        r = session.get(f"{API}/blog")
        assert r.status_code == 200
        posts = r.json()
        assert len(posts) == 5

    def test_blog_filter_category(self, session):
        r = session.get(f"{API}/blog", params={"category": "productivity"})
        assert r.status_code == 200
        posts = r.json()
        assert len(posts) >= 1
        assert all(p["category"] == "productivity" for p in posts)

    def test_blog_search(self, session):
        r = session.get(f"{API}/blog", params={"q": "habits"})
        assert r.status_code == 200
        posts = r.json()
        assert len(posts) >= 1

    def test_blog_get_single(self, session):
        r = session.get(f"{API}/blog/5-productivity-habits")
        assert r.status_code == 200
        d = r.json()
        assert d["slug"] == "5-productivity-habits"
        assert "body" in d and len(d["body"]) > 10


# Auth
class TestAuth:
    def test_register_and_token(self, student_token):
        assert isinstance(student_token, str) and len(student_token) > 10

    def test_register_duplicate(self, session, student_creds):
        r = session.post(f"{API}/auth/register", json=student_creds)
        assert r.status_code == 400

    def test_login_success(self, session, student_creds):
        r = session.post(f"{API}/auth/login", json={"email": student_creds["email"], "password": student_creds["password"]})
        assert r.status_code == 200
        assert "token" in r.json()

    def test_login_wrong_password(self, session, student_creds):
        r = session.post(f"{API}/auth/login", json={"email": student_creds["email"], "password": "wrongpass"})
        assert r.status_code == 401

    def test_me_with_token(self, session, student_token, student_creds):
        r = session.get(f"{API}/auth/me", headers=auth_h(student_token))
        assert r.status_code == 200
        assert r.json()["email"] == student_creds["email"].lower()

    def test_me_without_token(self, session):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_profile_update(self, session, student_token):
        r = session.patch(f"{API}/auth/profile",
                          json={"phone": "+919999911111", "city": "Mumbai", "occupation": "Engineer"},
                          headers=auth_h(student_token))
        assert r.status_code == 200
        d = r.json()
        assert d["phone"] == "+919999911111"
        assert d["city"] == "Mumbai"
        assert d["occupation"] == "Engineer"


# Enrollment & Mock Payment
class TestEnrollment:
    def test_access_before_enroll(self, session, student_token):
        r = session.get(f"{API}/enrollments/access/time-management-mastery", headers=auth_h(student_token))
        assert r.status_code == 200
        assert r.json()["access"] is False

    def test_checkout_mock(self, session, student_token):
        r = session.post(f"{API}/enrollments/checkout",
                         json={"course_slug": "time-management-mastery"},
                         headers=auth_h(student_token))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["mode"] == "mock"
        assert d["status"] == "paid"
        assert "enrollment_id" in d

    def test_access_after_enroll(self, session, student_token):
        r = session.get(f"{API}/enrollments/access/time-management-mastery", headers=auth_h(student_token))
        assert r.status_code == 200
        d = r.json()
        assert d["access"] is True
        assert "enrollment_id" in d
        assert d["course"]["slug"] == "time-management-mastery"

    def test_my_enrollments(self, session, student_token):
        r = session.get(f"{API}/enrollments/me", headers=auth_h(student_token))
        assert r.status_code == 200
        items = r.json()
        assert any(e["course_slug"] == "time-management-mastery" and e["status"] == "paid" for e in items)

    def test_checkout_already_enrolled(self, session, student_token):
        r = session.post(f"{API}/enrollments/checkout",
                         json={"course_slug": "time-management-mastery"},
                         headers=auth_h(student_token))
        assert r.status_code == 200
        d = r.json()
        assert d.get("already_enrolled") is True

    def test_progress_update(self, session, student_token):
        # need enrollment_id
        acc = session.get(f"{API}/enrollments/access/time-management-mastery", headers=auth_h(student_token)).json()
        eid = acc["enrollment_id"]
        r = session.post(f"{API}/enrollments/progress",
                         json={"enrollment_id": eid, "lesson_id": "l-1", "progress_pct": 25},
                         headers=auth_h(student_token))
        assert r.status_code == 200
        assert r.json()["ok"] is True
        # verify persisted
        acc2 = session.get(f"{API}/enrollments/access/time-management-mastery", headers=auth_h(student_token)).json()
        assert acc2["progress_pct"] == 25
        assert "l-1" in acc2["completed_lessons"]


# Newsletter & Contact
class TestNewsletterContact:
    def test_newsletter_subscribe(self, session):
        ts = int(time.time())
        email = f"TEST_nl_{ts}@example.com"
        r = session.post(f"{API}/newsletter/subscribe", json={"email": email})
        assert r.status_code == 200
        assert r.json()["ok"] is True
        # duplicate
        r2 = session.post(f"{API}/newsletter/subscribe", json={"email": email})
        assert r2.status_code == 200
        assert "Already" in r2.json()["message"]

    def test_contact(self, session):
        r = session.post(f"{API}/contact", json={
            "name": "TEST_user", "email": "TEST_contact@example.com",
            "message": "Hello, this is a test"
        })
        assert r.status_code == 200
        assert r.json()["ok"] is True


# Admin
class TestAdmin:
    def test_admin_login(self, admin_token):
        assert isinstance(admin_token, str)

    def test_admin_stats(self, session, admin_token):
        r = session.get(f"{API}/admin/stats", headers=auth_h(admin_token))
        assert r.status_code == 200
        d = r.json()
        for k in ["users", "enrollments", "revenue", "contacts", "newsletter_subs"]:
            assert k in d

    def test_admin_users(self, session, admin_token):
        r = session.get(f"{API}/admin/users", headers=auth_h(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_enrollments(self, session, admin_token):
        r = session.get(f"{API}/admin/enrollments", headers=auth_h(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_forbidden_for_student(self, session, student_token):
        r = session.get(f"{API}/admin/stats", headers=auth_h(student_token))
        assert r.status_code == 403
