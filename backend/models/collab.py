import uuid
from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field

Role = Literal["owner", "editor", "viewer"]
InviteStatus = Literal["pending", "accepted", "declined"]


def new_id() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------- auth / profiles

class SignupIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RecoverIn(BaseModel):
    email: EmailStr


class Profile(BaseModel):
    id: str
    email: str
    name: str
    created_at: str


class MessageOut(BaseModel):
    message: str


# ---------------------------------------------------------------------- spaces

class SpaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    template_id: str
    icon: str
    color: str
    modules: List[str]


class Space(BaseModel):
    id: str = Field(default_factory=new_id)
    owner_id: str
    name: str
    template_id: str
    icon: str
    color: str
    modules: List[str]
    created_at: str
    role: Role = "owner"


class SpaceMember(BaseModel):
    space_id: str
    user_id: str
    email: str
    name: str
    role: Role
    joined_at: str


class RoleUpdate(BaseModel):
    role: Role


# ------------------------------------------------------------------ invitations

class InvitationCreate(BaseModel):
    email: Optional[EmailStr] = None
    role: Role = "editor"


class Invitation(BaseModel):
    id: str = Field(default_factory=new_id)
    space_id: str
    space_name: str
    email: Optional[str] = None
    code: str
    role: Role
    status: InviteStatus
    invited_by_id: str
    invited_by_name: str
    created_at: str


class RedeemIn(BaseModel):
    code: str


# ------------------------------------------------------------------- messaging

class ConversationCreate(BaseModel):
    kind: Literal["direct", "space"]
    email: Optional[EmailStr] = None
    space_id: Optional[str] = None


class Conversation(BaseModel):
    id: str = Field(default_factory=new_id)
    kind: Literal["direct", "space"]
    space_id: Optional[str] = None
    title: str
    participant_ids: List[str]
    participant_names: List[str]
    created_at: str
    updated_at: str
    last_message: str = ""
    unread: int = 0


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class Message(BaseModel):
    id: str = Field(default_factory=new_id)
    conversation_id: str
    sender_id: str
    sender_name: str
    body: str
    mention_ids: List[str] = []
    read_by: List[str] = []
    created_at: str


class MentionOut(BaseModel):
    message: Message
    conversation_title: str


# -------------------------------------------------------------------- activity

class Activity(BaseModel):
    id: str = Field(default_factory=new_id)
    user_id: str
    kind: str
    text: str
    created_at: str


class InboxCounts(BaseModel):
    messages: int
    mentions: int
    invitations: int
    activity: int
    total: int
