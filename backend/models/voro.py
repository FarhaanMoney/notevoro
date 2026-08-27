from typing import List, Literal, Optional
from pydantic import BaseModel


class ProviderStatus(BaseModel):
    configured: bool
    provider: str
    model: Optional[str] = None
    message: str


class ChatMessageIn(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessageIn]
    space_name: Optional[str] = None
    space_template: Optional[str] = None
    context: Optional[str] = None


class ChatResponse(BaseModel):
    content: str
    model: str
