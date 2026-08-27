"""Criterion: Signup, session persistence and logout."""

from tests.helpers import PASSWORD, new_client, unique_email


def test_signup_session_persists_and_logout_clears_it():
    email = unique_email("auth-session")
    with new_client() as c:
        r = c.post("/auth/signup", json={"name": "Auth Session", "email": email, "password": PASSWORD})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["email"] == email
        assert "id" in body

        # Session persists (cookie) across a subsequent request, like a page reload.
        me = c.get("/auth/me")
        assert me.status_code == 200, me.text
        assert me.json()["email"] == email

        # Logging in again with correct password from a separate client also works.
        with new_client() as c2:
            login = c2.post("/auth/login", json={"email": email, "password": PASSWORD})
            assert login.status_code == 200, login.text
            assert login.json()["email"] == email

            bad = c2.post("/auth/login", json={"email": email, "password": "wrongpassword"})
            assert bad.status_code in (400, 401), bad.text

        logout = c.post("/auth/logout")
        assert logout.status_code == 200, logout.text

        me_after = c.get("/auth/me")
        assert me_after.status_code == 401, me_after.text
