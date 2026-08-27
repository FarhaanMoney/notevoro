"""Shared helpers for tscheck backend tests."""

import time
import uuid

import httpx

from tests.conftest import API_URL

PASSWORD = "notevoro123"


def unique_email(slug: str) -> str:
    return f"tscheck-{slug}-{uuid.uuid4().hex[:8]}@example.com"


def signup(client: httpx.Client, slug: str, name: str = "Test User") -> dict:
    """Sign up a fresh user on the given client (cookies persist on the client)."""
    email = unique_email(slug)
    r = client.post("/auth/signup", json={"name": name, "email": email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    body = r.json()
    body["email"] = email
    return body


class _ForceCookieTransport(httpx.HTTPTransport):
    """The backend sets `Secure` on its session cookie (correct for real HTTPS
    deployments). httpx's cookie jar honours that and refuses to resend it over
    plain http, so a same-process test client would look "logged out" on every
    request after signup even though the browser (served over the real ingress
    origin) never hits this problem. Capture the cookie once and pin it onto
    every subsequent request so tests exercise the real auth logic instead of
    this http-vs-https transport quirk.
    """

    def __init__(self, *a, **kw):
        super().__init__(*a, **kw)
        self._session_cookie: str | None = None

    def handle_request(self, request: httpx.Request) -> httpx.Response:
        if self._session_cookie:
            request.headers["cookie"] = f"nv_session={self._session_cookie}"
        response = super().handle_request(request)
        set_cookie = response.headers.get("set-cookie", "")
        if "nv_session=" in set_cookie:
            value = set_cookie.split("nv_session=", 1)[1].split(";", 1)[0]
            self._session_cookie = value or None
            if not value:
                self._session_cookie = None
        return response


def new_client() -> httpx.Client:
    return httpx.Client(base_url=API_URL, timeout=30.0, transport=_ForceCookieTransport())


def default_space_payload(name: str, template_id: str = "student") -> dict:
    return {
        "name": name,
        "template_id": template_id,
        "icon": "graduation-cap",
        "color": "#6366f1",
        "modules": ["tasks", "knowledge", "calendar"],
    }
