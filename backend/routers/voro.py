import os

import httpx
from fastapi import APIRouter, HTTPException

from models.voro import ChatRequest, ChatResponse, ProviderStatus

router = APIRouter(tags=["voro"])

NOT_CONFIGURED = (
    "No AI provider is configured. Add AI_BASE_URL, AI_API_KEY and AI_MODEL to the "
    "backend environment (Settings -> AI Providers explains where), then Voro will answer here."
)


def _cfg() -> tuple[str, str, str]:
    return (
        os.environ.get("AI_BASE_URL", "").strip().rstrip("/"),
        os.environ.get("AI_API_KEY", "").strip(),
        os.environ.get("AI_MODEL", "").strip(),
    )


def _system_prompt(req: ChatRequest) -> str:
    if req.space_name:
        role = {
            "student": "an AI study assistant",
            "educator": "an AI teaching assistant",
            "professional": "an AI business and project assistant",
        }.get(req.space_template or "", "a focused workspace assistant")
        scope = (
            f'You are Voro, {role} working inside the user\'s "{req.space_name}" Space. '
            f"Only reason about information belonging to this Space; never reference other Spaces."
        )
    else:
        scope = (
            "You are Voro, the user's personal AI assistant in the global My Day context. "
            "You may aggregate across all of the user's Spaces."
        )
    if req.context:
        scope += f"\n\nWorkspace context:\n{req.context}"
    return scope


@router.get("/voro/provider", response_model=ProviderStatus)
async def provider_status():
    base_url, api_key, model = _cfg()
    if base_url and api_key and model:
        return ProviderStatus(
            configured=True,
            provider=base_url,
            model=model,
            message="AI provider is configured.",
        )
    return ProviderStatus(
        configured=False, provider=base_url or "none", model=model or None, message=NOT_CONFIGURED
    )


@router.post("/voro/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not req.messages:
        raise HTTPException(status_code=422, detail="messages must not be empty")

    base_url, api_key, model = _cfg()
    if not (base_url and api_key and model):
        raise HTTPException(status_code=503, detail=NOT_CONFIGURED)

    payload = {
        "model": model,
        "messages": [{"role": "system", "content": _system_prompt(req)}]
        + [m.model_dump() for m in req.messages],
    }
    try:
        async with httpx.AsyncClient(timeout=60) as http:
            resp = await http.post(
                f"{base_url}/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {api_key}"},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"AI provider unreachable: {exc}") from exc

    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"AI provider error: {resp.text[:400]}")

    data = resp.json()
    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        raise HTTPException(status_code=502, detail="Unexpected AI provider response shape")
    return ChatResponse(content=content, model=data.get("model", model))
