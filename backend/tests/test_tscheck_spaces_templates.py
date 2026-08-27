"""Criterion: Space creation, switching and template-driven modules."""

from tests.helpers import default_space_payload, new_client, signup


def test_create_space_each_template_and_membership():
    with new_client() as c:
        signup(c, "spaces-templates")
        created = []
        for template_id in ["student", "educator", "professional", "blank"]:
            payload = default_space_payload(f"tscheck-space-{template_id}", template_id)
            r = c.post("/spaces", json=payload)
            assert r.status_code == 200, r.text
            body = r.json()
            assert body["template_id"] == template_id
            assert body["name"] == payload["name"]
            assert body["role"] == "owner"
            created.append(body)

        # Listing spaces shows all created ones with the right template ids.
        listed = c.get("/spaces")
        assert listed.status_code == 200
        by_id = {s["id"]: s for s in listed.json()}
        for space in created:
            assert space["id"] in by_id
            assert by_id[space["id"]]["template_id"] == space["template_id"]

        # Members endpoint shows the creator as owner.
        first = created[0]
        members = c.get(f"/spaces/{first['id']}/members")
        assert members.status_code == 200, members.text
        rows = members.json()
        assert len(rows) == 1
        assert rows[0]["role"] == "owner"
