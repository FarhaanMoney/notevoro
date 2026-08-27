"""Criterion: Invite by email, accept, and membership visible to both users."""

from tests.helpers import default_space_payload, new_client, signup


def test_invite_by_email_accept_and_both_see_membership():
    with new_client() as owner_c, new_client() as invitee_c:
        owner = signup(owner_c, "invite-owner")
        invitee = signup(invitee_c, "invite-invitee")

        space = owner_c.post(
            "/spaces", json=default_space_payload("tscheck-space-invite-email")
        ).json()
        space_id = space["id"]

        invite = owner_c.post(
            f"/spaces/{space_id}/invitations",
            json={"email": invitee["email"], "role": "editor"},
        )
        assert invite.status_code == 200, invite.text
        invite_body = invite.json()
        assert invite_body["status"] == "pending"
        assert invite_body["role"] == "editor"

        # Owner sees it pending on the Space.
        pending = owner_c.get(f"/spaces/{space_id}/invitations")
        assert pending.status_code == 200
        assert any(i["id"] == invite_body["id"] for i in pending.json())

        # Invitee sees it in their own invitations (Inbox -> Invitations).
        mine = invitee_c.get("/invitations")
        assert mine.status_code == 200
        matching = [i for i in mine.json() if i["id"] == invite_body["id"]]
        assert len(matching) == 1

        accept = invitee_c.post(f"/invitations/{invite_body['id']}/accept")
        assert accept.status_code == 200, accept.text

        # Space now appears in invitee's sidebar list.
        invitee_spaces = invitee_c.get("/spaces").json()
        assert any(s["id"] == space_id and s["role"] == "editor" for s in invitee_spaces)

        # Owner's member list now lists both people with correct roles.
        members = owner_c.get(f"/spaces/{space_id}/members").json()
        roles = {m["email"]: m["role"] for m in members}
        assert roles[owner["email"]] == "owner"
        assert roles[invitee["email"]] == "editor"


def test_invite_declined_does_not_grant_membership():
    with new_client() as owner_c, new_client() as invitee_c:
        signup(owner_c, "invite-decline-owner")
        invitee = signup(invitee_c, "invite-decline-invitee")

        space = owner_c.post(
            "/spaces", json=default_space_payload("tscheck-space-invite-decline")
        ).json()
        invite_body = owner_c.post(
            f"/spaces/{space['id']}/invitations",
            json={"email": invitee["email"], "role": "viewer"},
        ).json()

        decline = invitee_c.post(f"/invitations/{invite_body['id']}/decline")
        assert decline.status_code == 200, decline.text

        # Not a member: members endpoint 404s for the declining user.
        members_check = invitee_c.get(f"/spaces/{space['id']}/members")
        assert members_check.status_code == 404
