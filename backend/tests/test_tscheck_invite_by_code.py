"""Criterion: Invite by code."""

from tests.helpers import default_space_payload, new_client, signup


def test_invite_by_code_redeemed_by_third_account():
    with new_client() as owner_c, new_client() as redeemer_c:
        owner = signup(owner_c, "invite-code-owner")
        redeemer = signup(redeemer_c, "invite-code-redeemer")

        space = owner_c.post(
            "/spaces", json=default_space_payload("tscheck-space-invite-code")
        ).json()
        space_id = space["id"]

        # "Create invite code" — no email attached.
        invite = owner_c.post(
            f"/spaces/{space_id}/invitations", json={"email": None, "role": "viewer"}
        )
        assert invite.status_code == 200, invite.text
        invite_body = invite.json()
        assert invite_body["email"] is None
        code = invite_body["code"]
        assert code

        # Shows under Pending for the owner.
        pending = owner_c.get(f"/spaces/{space_id}/invitations").json()
        assert any(i["code"] == code for i in pending)

        redeem = redeemer_c.post("/invitations/redeem", json={"code": code})
        assert redeem.status_code == 200, redeem.text

        # Space appears in the redeemer's sidebar list with the invited role.
        their_spaces = redeemer_c.get("/spaces").json()
        assert any(s["id"] == space_id and s["role"] == "viewer" for s in their_spaces)

        members = owner_c.get(f"/spaces/{space_id}/members").json()
        roles = {m["email"]: m["role"] for m in members}
        assert roles[redeemer["email"]] == "viewer"
        assert roles[owner["email"]] == "owner"


def test_redeem_invalid_code_rejected():
    with new_client() as c:
        signup(c, "invite-code-invalid")
        r = c.post("/invitations/redeem", json={"code": "not-a-real-code-xyz"})
        assert r.status_code == 404
