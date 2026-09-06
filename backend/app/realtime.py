import asyncio
import json
import logging
from collections import defaultdict

from fastapi import WebSocket

log = logging.getLogger("notevoro.realtime")


class Hub:
    """In-process realtime delivery. Durable state always lives in Postgres; this is delivery only."""

    def __init__(self):
        self.sockets: dict[str, set[WebSocket]] = defaultdict(set)
        self.typing: dict[str, dict[str, float]] = defaultdict(dict)

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        first = not self.sockets[user_id]
        self.sockets[user_id].add(ws)
        return first

    def disconnect(self, user_id: str, ws: WebSocket):
        self.sockets[user_id].discard(ws)
        if not self.sockets[user_id]:
            del self.sockets[user_id]
            return True
        return False

    def is_online(self, user_id: str):
        return user_id in self.sockets

    def online_users(self):
        return list(self.sockets.keys())

    async def send_to_users(self, user_ids, event: str, payload: dict):
        data = json.dumps({"event": event, "payload": payload}, default=str)
        dead = []
        for uid in set(user_ids):
            for ws in list(self.sockets.get(uid, ())):
                try:
                    await ws.send_text(data)
                except Exception:
                    dead.append((uid, ws))
        for uid, ws in dead:
            self.disconnect(uid, ws)

    async def broadcast(self, event: str, payload: dict):
        await self.send_to_users(list(self.sockets.keys()), event, payload)


hub = Hub()
