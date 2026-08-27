"""Criterion: Cross-user data isolation and URL tampering."""

from tests.helpers import default_space_payload, new_client, signup


def test_non_member_gets_404_from_members_and_cannot_act_on_space():
    with new_client() as owner_c, new_client() as outsider_c:
        signup(owner_c, "isolation-owner")
        signup(outsider_c, "isolation-outsider")

        space = owner_c.post(
            "/spaces", json=default_space_payload("tscheck-space-isolation")
        ).json()
        space_id = space["id"]

        # Outsider's own space list never includes the owner's Space.
        outsider_spaces = outsider_c.get("/spaces").json()
        assert all(s["id"] != space_id for s in outsider_spaces)

        # A non-member gets 404 from the members endpoint (URL tampering reveals nothing).
        members = outsider_c.get(f"/spaces/{space_id}/members")
        assert members.status_code == 404

        # Outsider cannot invite themselves or others into a Space they don't belong to.
        invite_attempt = outsider_c.post(
            f"/spaces/{space_id}/invitations", json={"email": None, "role": "viewer"}
        )
        assert invite_attempt.status_code == 404

        # Outsider cannot delete the Space either.
        delete_attempt = outsider_c.delete(f"/spaces/{space_id}")
        assert delete_attempt.status_code == 404

        # Sanity: the owner (an actual member) still gets a normal 200 view.
        owner_members = owner_c.get(f"/spaces/{space_id}/members")
        assert owner_members.status_code == 200
