import secrets

from fastapi import APIRouter, Depends, HTTPException

from lib.db import db
from lib.security import current_user, now_iso
from models.collab import (
    Activity,
    Invitation,
    InvitationCreate,
    MessageOut,
    RedeemIn,
    Role,
    RoleUpdate,
    Space,
    SpaceCreate,
    SpaceMember,
    new_id,
)

router = APIRouter(tags=["spaces"])

RANK = {"owner": 3, "editor": 2, "viewer": 1}


async def log_activity(user_id: str, kind: str, text: str) -> None:
    await db.activity.insert_one(
        {"id": new_id(), "user_id": user_id, "kind": kind, "text": text, "created_at": now_iso()}
    )


async def membership(space_id: str, user_id: str) -> dict:
    member = await db.space_members.find_one({"space_id": space_id, "user_id": user_id})
    if not member:
        # Not found rather than forbidden: a Space you are not a member of does not
        # exist as far as you are concerned. URL tampering reveals nothing.
        raise HTTPException(status_code=404, detail="Space not found")
    return member


async def require_role(space_id: str, user_id: str, minimum: Role) -> dict:
    member = await membership(space_id, user_id)
    if RANK[member["role"]] < RANK[minimum]:
        raise HTTPException(status_code=403, detail=f"Requires {minimum} permission on this Space.")
    return member


def _space(doc: dict, role: str) -> Space:
    return Space(
        id=doc["id"],
        owner_id=doc["owner_id"],
        name=doc["name"],
        template_id=doc["template_id"],
        icon=doc["icon"],
        color=doc["color"],
        modules=doc["modules"],
        created_at=doc["created_at"],
        role=role,  # type: ignore[arg-type]
    )


@router.get("/spaces", response_model=list[Space])
async def list_spaces(user: dict = Depends(current_user)):
    members = await db.space_members.find({"user_id": user["id"]}).to_list(500)
    roles = {m["space_id"]: m["role"] for m in members}
    if not roles:
        return []
    docs = await db.spaces.find({"id": {"$in": list(roles)}}).to_list(500)
    docs.sort(key=lambda d: d["created_at"])
    return [_space(d, roles[d["id"]]) for d in docs]


@router.post("/spaces", response_model=Space)
async def create_space(payload: SpaceCreate, user: dict = Depends(current_user)):
    doc = {
        "id": new_id(),
        "owner_id": user["id"],
        "name": payload.name.strip(),
        "template_id": payload.template_id,
        "icon": payload.icon,
        "color": payload.color,
        "modules": payload.modules,
        "created_at": now_iso(),
    }
    await db.spaces.insert_one(dict(doc))
    await db.space_members.insert_one(
        {
            "space_id": doc["id"],
            "user_id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": "owner",
            "joined_at": now_iso(),
        }
    )
    await log_activity(user["id"], "space_created", f'You created the Space "{doc["name"]}"')
    return _space(doc, "owner")


@router.delete("/spaces/{space_id}", response_model=MessageOut)
async def delete_space(space_id: str, user: dict = Depends(current_user)):
    await require_role(space_id, user["id"], "owner")
    await db.spaces.delete_one({"id": space_id})
    await db.space_members.delete_many({"space_id": space_id})
    await db.invitations.delete_many({"space_id": space_id})
    convs = await db.conversations.find({"space_id": space_id}).to_list(200)
    for c in convs:
        await db.messages.delete_many({"conversation_id": c["id"]})
    await db.conversations.delete_many({"space_id": space_id})
    return MessageOut(message="Space deleted")


@router.get("/spaces/{space_id}/members", response_model=list[SpaceMember])
async def list_members(space_id: str, user: dict = Depends(current_user)):
    await membership(space_id, user["id"])
    rows = await db.space_members.find({"space_id": space_id}).to_list(200)
    rows.sort(key=lambda r: (RANK[r["role"]] * -1, r["name"]))
    return [SpaceMember(**{k: v for k, v in r.items() if k != "_id"}) for r in rows]


@router.patch("/spaces/{space_id}/members/{member_id}", response_model=MessageOut)
async def update_role(
    space_id: str, member_id: str, payload: RoleUpdate, user: dict = Depends(current_user)
):
    await require_role(space_id, user["id"], "owner")
    target = await db.space_members.find_one({"space_id": space_id, "user_id": member_id})
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    if target["role"] == "owner":
        raise HTTPException(status_code=400, detail="The owner's role cannot be changed.")
    await db.space_members.update_one(
        {"space_id": space_id, "user_id": member_id}, {"$set": {"role": payload.role}}
    )
    return MessageOut(message="Role updated")


@router.delete("/spaces/{space_id}/members/{member_id}", response_model=MessageOut)
async def remove_member(space_id: str, member_id: str, user: dict = Depends(current_user)):
    member = await membership(space_id, user["id"])
    leaving_self = member_id == user["id"]
    if not leaving_self and RANK[member["role"]] < RANK["owner"]:
        raise HTTPException(status_code=403, detail="Only the owner can remove members.")
    target = await db.space_members.find_one({"space_id": space_id, "user_id": member_id})
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    if target["role"] == "owner":
        raise HTTPException(status_code=400, detail="The owner cannot be removed. Delete the Space instead.")
    await db.space_members.delete_one({"space_id": space_id, "user_id": member_id})
    return MessageOut(message="Left the Space" if leaving_self else "Member removed")


# ------------------------------------------------------------------ invitations

@router.post("/spaces/{space_id}/invitations", response_model=Invitation)
async def invite(space_id: str, payload: InvitationCreate, user: dict = Depends(current_user)):
    await require_role(space_id, user["id"], "editor")
    space = await db.spaces.find_one({"id": space_id})
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")

    email = payload.email.lower().strip() if payload.email else None
    if email:
        if email == user["email"]:
            raise HTTPException(status_code=400, detail="You are already in this Space.")
        existing_profile = await db.profiles.find_one({"email": email})
        if existing_profile and await db.space_members.find_one(
            {"space_id": space_id, "user_id": existing_profile["id"]}
        ):
            raise HTTPException(status_code=409, detail="That person is already a member.")
        if await db.invitations.find_one({"space_id": space_id, "email": email, "status": "pending"}):
            raise HTTPException(status_code=409, detail="An invitation is already pending for that email.")

    doc = {
        "id": new_id(),
        "space_id": space_id,
        "space_name": space["name"],
        "email": email,
        "code": secrets.token_urlsafe(8),
        "role": payload.role,
        "status": "pending",
        "invited_by_id": user["id"],
        "invited_by_name": user["name"],
        "created_at": now_iso(),
    }
    await db.invitations.insert_one(dict(doc))
    await log_activity(
        user["id"],
        "invite_sent",
        f'You invited {email or "someone via link"} to "{space["name"]}" as {payload.role}',
    )
    return Invitation(**doc)


@router.get("/spaces/{space_id}/invitations", response_model=list[Invitation])
async def space_invitations(space_id: str, user: dict = Depends(current_user)):
    await membership(space_id, user["id"])
    rows = await db.invitations.find({"space_id": space_id, "status": "pending"}).to_list(200)
    return [Invitation(**{k: v for k, v in r.items() if k != "_id"}) for r in rows]


@router.get("/invitations", response_model=list[Invitation])
async def my_invitations(user: dict = Depends(current_user)):
    rows = await db.invitations.find({"email": user["email"], "status": "pending"}).to_list(200)
    rows.sort(key=lambda r: r["created_at"], reverse=True)
    return [Invitation(**{k: v for k, v in r.items() if k != "_id"}) for r in rows]


async def _join(invitation: dict, user: dict) -> None:
    if await db.space_members.find_one({"space_id": invitation["space_id"], "user_id": user["id"]}):
        return
    await db.space_members.insert_one(
        {
            "space_id": invitation["space_id"],
            "user_id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": invitation["role"],
            "joined_at": now_iso(),
        }
    )
    await log_activity(
        user["id"], "space_joined", f'You joined "{invitation["space_name"]}" as {invitation["role"]}'
    )
    await log_activity(
        invitation["invited_by_id"],
        "invite_accepted",
        f'{user["name"]} joined "{invitation["space_name"]}"',
    )


@router.post("/invitations/{invitation_id}/accept", response_model=MessageOut)
async def accept(invitation_id: str, user: dict = Depends(current_user)):
    inv = await db.invitations.find_one({"id": invitation_id, "status": "pending"})
    if not inv or (inv.get("email") and inv["email"] != user["email"]):
        raise HTTPException(status_code=404, detail="Invitation not found")
    await _join(inv, user)
    await db.invitations.update_one({"id": invitation_id}, {"$set": {"status": "accepted"}})
    return MessageOut(message=f'You joined {inv["space_name"]}')


@router.post("/invitations/{invitation_id}/decline", response_model=MessageOut)
async def decline(invitation_id: str, user: dict = Depends(current_user)):
    inv = await db.invitations.find_one({"id": invitation_id, "status": "pending"})
    if not inv or (inv.get("email") and inv["email"] != user["email"]):
        raise HTTPException(status_code=404, detail="Invitation not found")
    await db.invitations.update_one({"id": invitation_id}, {"$set": {"status": "declined"}})
    return MessageOut(message="Invitation declined")


@router.post("/invitations/redeem", response_model=MessageOut)
async def redeem(payload: RedeemIn, user: dict = Depends(current_user)):
    inv = await db.invitations.find_one({"code": payload.code.strip(), "status": "pending"})
    if not inv:
        raise HTTPException(status_code=404, detail="That invite code is not valid or has been used.")
    if inv.get("email") and inv["email"] != user["email"]:
        raise HTTPException(status_code=403, detail="That invite was issued for a different email.")
    await _join(inv, user)
    await db.invitations.update_one({"id": inv["id"]}, {"$set": {"status": "accepted"}})
    return MessageOut(message=f'You joined {inv["space_name"]}')


@router.get("/activity", response_model=list[Activity])
async def activity_feed(user: dict = Depends(current_user)):
    rows = await db.activity.find({"user_id": user["id"]}).to_list(300)
    rows.sort(key=lambda r: r["created_at"], reverse=True)
    return [Activity(**{k: v for k, v in r.items() if k != "_id"}) for r in rows[:60]]
