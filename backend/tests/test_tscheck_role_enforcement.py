"""Criterion: Role enforcement (owner vs editor vs viewer)."""

from tests.helpers import default_space_payload, new_client, signup


def _invite_and_accept(owner_c, space_id, invitee_c, invitee_email, role):
    invite_body = owner_c.post(
        f"/spaces/{space_id}/invitations", json={"email": invitee_email, "role": role}
    ).json()
    accept = invitee_c.post(f"/invitations/{invite_body['id']}/accept")
    assert accept.status_code == 200, accept.text


def test_editor_and_viewer_cannot_manage_roles_or_delete_space():
    with new_client() as owner_c, new_client() as editor_c, new_client() as viewer_c:
        owner = signup(owner_c, "role-owner")
        editor = signup(editor_c, "role-editor")
        viewer = signup(viewer_c, "role-viewer")

        space = owner_c.post(
            "/spaces", json=default_space_payload("tscheck-space-roles")
        ).json()
        space_id = space["id"]

        _invite_and_accept(owner_c, space_id, editor_c, editor["email"], "editor")
        _invite_and_accept(owner_c, space_id, viewer_c, viewer["email"], "viewer")

        # Viewer cannot invite (server-side enforcement of "viewer cannot invite").
        viewer_invite = viewer_c.post(
            f"/spaces/{space_id}/invitations", json={"email": None, "role": "viewer"}
        )
        assert viewer_invite.status_code == 403

        # Editor CAN invite.
        editor_invite = editor_c.post(
            f"/spaces/{space_id}/invitations", json={"email": None, "role": "viewer"}
        )
        assert editor_invite.status_code == 200

        # Editor cannot change roles (owner-only).
        role_change = editor_c.patch(
            f"/spaces/{space_id}/members/{viewer['id']}", json={"role": "editor"}
        )
        assert role_change.status_code == 403

        # Editor cannot remove another member (owner-only).
        remove_attempt = editor_c.delete(f"/spaces/{space_id}/members/{viewer['id']}")
        assert remove_attempt.status_code == 403

        # Editor cannot delete the Space (owner-only).
        delete_attempt = editor_c.delete(f"/spaces/{space_id}")
        assert delete_attempt.status_code == 403

        # Owner CAN change editor -> viewer, and it persists after a fresh read.
        owner_change = owner_c.patch(
            f"/spaces/{space_id}/members/{editor['id']}", json={"role": "viewer"}
        )
        assert owner_change.status_code == 200, owner_change.text

        members_after = owner_c.get(f"/spaces/{space_id}/members").json()
        roles = {m["email"]: m["role"] for m in members_after}
        assert roles[editor["email"]] == "viewer"

        # Owner CAN remove a member.
        remove_ok = owner_c.delete(f"/spaces/{space_id}/members/{viewer['id']}")
        assert remove_ok.status_code == 200, remove_ok.text
        members_final = owner_c.get(f"/spaces/{space_id}/members").json()
        assert all(m["email"] != viewer["email"] for m in members_final)
