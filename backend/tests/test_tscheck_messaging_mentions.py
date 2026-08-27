"""Criterion: Messaging (DM + Space team chat) and mentions/unread counts."""

from tests.helpers import default_space_payload, new_client, signup


def test_dm_send_receive_and_thread_isolation():
    with new_client() as a_c, new_client() as b_c:
        a = signup(a_c, "msg-a", name="Msg Sender A")
        b = signup(b_c, "msg-b", name="Msg Recipient B")

        thread = a_c.post("/conversations", json={"kind": "direct", "email": b["email"]})
        assert thread.status_code == 200, thread.text
        thread_id = thread.json()["id"]

        # BUG: the thread title must show "the other person's name" for EACH viewer.
        # The backend stores one static title (the name of whoever the creator
        # messaged), so the recipient (b) sees their OWN name instead of "a"'s name.
        b_view_of_thread = next(t for t in b_c.get("/conversations").json() if t["id"] == thread_id)
        assert b_view_of_thread["title"] == a["name"], (
            f"recipient should see the other person's name ('{a['name']}') as the thread "
            f"title, but the API returned '{b_view_of_thread['title']}' (a static title "
            "computed only from the creator's side)"
        )

        msg = a_c.post(f"/conversations/{thread_id}/messages", json={"body": "tscheck-hello-b"})
        assert msg.status_code == 200, msg.text

        # Appears immediately in sender's thread.
        sender_view = a_c.get(f"/conversations/{thread_id}/messages").json()
        assert any(m["body"] == "tscheck-hello-b" for m in sender_view)

        # Reaches the other user's thread (same conversation id — no separate copy created).
        recipient_threads = b_c.get("/conversations").json()
        assert any(t["id"] == thread_id for t in recipient_threads)
        recipient_view = b_c.get(f"/conversations/{thread_id}/messages").json()
        assert any(m["body"] == "tscheck-hello-b" for m in recipient_view)

        # A second, unrelated DM thread never receives this message (no cross-thread bleed).
        with new_client() as c_c:
            c = signup(c_c, "msg-c")
            other_thread = a_c.post(
                "/conversations", json={"kind": "direct", "email": c["email"]}
            ).json()
            other_msgs = a_c.post(
                f"/conversations/{other_thread['id']}/messages", json={"body": "tscheck-hello-c"}
            )
            assert other_msgs.status_code == 200
            first_thread_msgs = a_c.get(f"/conversations/{thread_id}/messages").json()
            assert not any(m["body"] == "tscheck-hello-c" for m in first_thread_msgs)


def test_dm_participant_names_aligned_and_idempotent_reopen():
    with new_client() as a_c, new_client() as b_c:
        a = signup(a_c, "msg-align-a", name="Msg Sender A2")
        b = signup(b_c, "msg-align-b", name="Msg Recipient B2")

        first = a_c.post("/conversations", json={"kind": "direct", "email": b["email"]})
        assert first.status_code == 200, first.text
        first_body = first.json()
        thread_id = first_body["id"]

        # participant_names must be the same length as participant_ids and aligned
        # index-for-index (participant_ids[i] <-> participant_names[i]).
        pids = first_body["participant_ids"]
        pnames = first_body["participant_names"]
        assert len(pids) == len(pnames) == 2, first_body
        name_by_id = dict(zip(pids, pnames))
        assert name_by_id[a["id"]] == a["name"]
        assert name_by_id[b["id"]] == b["name"]

        # A's own view never shows A's own name as the title; it shows B's.
        assert first_body["title"] == b["name"]

        # Re-requesting the same direct thread from A's side is idempotent (same id).
        reopened_a = a_c.post("/conversations", json={"kind": "direct", "email": b["email"]})
        assert reopened_a.status_code == 200, reopened_a.text
        assert reopened_a.json()["id"] == thread_id
        assert reopened_a.json()["title"] == b["name"]

        # Re-requesting from B's side also returns the SAME id, with B's viewer-specific
        # title (A's name) -- never B's own name.
        reopened_b = b_c.post("/conversations", json={"kind": "direct", "email": a["email"]})
        assert reopened_b.status_code == 200, reopened_b.text
        b_body = reopened_b.json()
        assert b_body["id"] == thread_id
        assert b_body["title"] == a["name"]
        b_name_by_id = dict(zip(b_body["participant_ids"], b_body["participant_names"]))
        assert b_name_by_id[a["id"]] == a["name"]
        assert b_name_by_id[b["id"]] == b["name"]


def test_space_team_thread_and_title():
    with new_client() as owner_c:
        signup(owner_c, "msg-space-owner")
        space = owner_c.post(
            "/spaces", json=default_space_payload("tscheck-space-teamchat")
        ).json()
        thread = owner_c.post(
            "/conversations", json={"kind": "space", "space_id": space["id"]}
        )
        assert thread.status_code == 200, thread.text
        body = thread.json()
        assert body["kind"] == "space"
        assert space["name"] in body["title"]

        msg = owner_c.post(
            f"/conversations/{body['id']}/messages", json={"body": "tscheck-team-hello"}
        )
        assert msg.status_code == 200, msg.text

        # New member joins the space (via invite by code) -> reopening the team
        # thread keeps its title and syncs participant_ids/participant_names to
        # include the new member, and the new member can read it.
        code_resp = owner_c.post(f"/spaces/{space['id']}/invitations", json={"email": None})
        assert code_resp.status_code == 200, code_resp.text
        code = code_resp.json()["code"]

        with new_client() as newmember_c:
            newmember = signup(newmember_c, "msg-space-newmember", name="Msg Space New Member")
            redeem = newmember_c.post("/invitations/redeem", json={"code": code})
            assert redeem.status_code == 200, redeem.text

            reopened = owner_c.post(
                "/conversations", json={"kind": "space", "space_id": space["id"]}
            )
            assert reopened.status_code == 200, reopened.text
            reopened_body = reopened.json()
            assert reopened_body["id"] == body["id"]
            assert space["name"] in reopened_body["title"]
            assert newmember["id"] in reopened_body["participant_ids"]
            name_by_id = dict(
                zip(reopened_body["participant_ids"], reopened_body["participant_names"])
            )
            assert name_by_id[newmember["id"]] == newmember["name"]

            # The new member is now a genuine participant and can read the thread.
            new_member_msgs = newmember_c.get(f"/conversations/{body['id']}/messages")
            assert new_member_msgs.status_code == 200, new_member_msgs.text
            assert any(m["body"] == "tscheck-team-hello" for m in new_member_msgs.json())


def test_mention_and_unread_badge_clears_on_read():
    with new_client() as a_c, new_client() as b_c:
        a = signup(a_c, "mention-a")
        b = signup(b_c, "mention-b")

        thread_id = a_c.post(
            "/conversations", json={"kind": "direct", "email": b["email"]}
        ).json()["id"]

        mention_body = f"tscheck-fyi @{b['email']} please look"
        sent = a_c.post(f"/conversations/{thread_id}/messages", json={"body": mention_body})
        assert sent.status_code == 200, sent.text

        # Mentioned user sees it in Inbox -> Mentions.
        mentions = b_c.get("/mentions").json()
        assert any(m["message"]["body"] == mention_body for m in mentions)

        # Unread badge (inbox counts) is non-zero for the recipient before reading.
        counts_before = b_c.get("/inbox/counts").json()
        assert counts_before["messages"] >= 1
        assert counts_before["total"] >= 1

        # Reading the thread clears its unread contribution.
        read = b_c.post(f"/conversations/{thread_id}/read")
        assert read.status_code == 200, read.text

        threads_after = b_c.get("/conversations").json()
        this_thread = next(t for t in threads_after if t["id"] == thread_id)
        assert this_thread["unread"] == 0
