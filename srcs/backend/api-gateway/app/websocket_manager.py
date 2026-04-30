"""
In-memory Socket.IO connection manager.

This gateway runs as a single process/container in the current compose stack, so
local memory is enough. If the gateway is scaled to several replicas later, this
state must move to a shared adapter such as Redis.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from socketio import AsyncServer

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class ClientSession:
    sid: str
    user_id: int
    username: str
    connected_at: datetime
    rooms: set[str] = field(default_factory=set)

    def to_dict(self) -> dict[str, Any]:
        return {
            "sid": self.sid,
            "user_id": self.user_id,
            "username": self.username,
            "connected_at": self.connected_at.isoformat(),
            "rooms": sorted(self.rooms),
        }


class WebSocketManager:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self.sessions: dict[str, ClientSession] = {}
        self.user_sids: dict[int, set[str]] = {}
        self.room_sids: dict[str, set[str]] = {}
        self.room_members: dict[str, set[int]] = {}
        self.rooms_data: dict[str, dict[str, Any]] = {}

    async def register_connection(self, sid: str, user_id: int, username: str) -> ClientSession:
        session = ClientSession(
            sid=sid,
            user_id=user_id,
            username=username,
            connected_at=datetime.now(timezone.utc),
        )
        async with self._lock:
            self.sessions[sid] = session
            self.user_sids.setdefault(user_id, set()).add(sid)
        logger.info("WebSocket connected sid=%s user_id=%s", sid, user_id)
        return session

    async def unregister_connection(self, sid: str) -> ClientSession | None:
        async with self._lock:
            session = self.sessions.pop(sid, None)
            if session is None:
                return None

            if session.user_id in self.user_sids:
                self.user_sids[session.user_id].discard(sid)
                if not self.user_sids[session.user_id]:
                    del self.user_sids[session.user_id]

            for room_id in list(session.rooms):
                self._leave_room_locked(session, room_id)

        logger.info("WebSocket disconnected sid=%s user_id=%s", sid, session.user_id)
        return session

    async def get_session(self, sid: str) -> ClientSession | None:
        async with self._lock:
            return self.sessions.get(sid)

    async def join_room(self, sid: str, room_id: str) -> ClientSession | None:
        async with self._lock:
            session = self.sessions.get(sid)
            if session is None:
                return None
            session.rooms.add(room_id)
            self.room_sids.setdefault(room_id, set()).add(sid)
            self.room_members.setdefault(room_id, set()).add(session.user_id)
            return session

    async def leave_room(self, sid: str, room_id: str) -> ClientSession | None:
        async with self._lock:
            session = self.sessions.get(sid)
            if session is None:
                return None
            self._leave_room_locked(session, room_id)
            return session

    def _leave_room_locked(self, session: ClientSession, room_id: str) -> None:
        session.rooms.discard(room_id)

        sids = self.room_sids.get(room_id)
        if sids is not None:
            sids.discard(session.sid)
            if not sids:
                self.room_sids.pop(room_id, None)
                self.room_members.pop(room_id, None)
                self.rooms_data.pop(room_id, None)
                return

        members = self.room_members.get(room_id)
        if members is None:
            return

        user_still_in_room = any(
            self.sessions.get(other_sid) is not None
            and self.sessions[other_sid].user_id == session.user_id
            for other_sid in self.room_sids.get(room_id, set())
        )
        if not user_still_in_room:
            members.discard(session.user_id)
        if not members:
            self.room_members.pop(room_id, None)

    async def get_room_members(self, room_id: str) -> list[int]:
        async with self._lock:
            return sorted(self.room_members.get(room_id, set()))

    async def get_room_sids(self, room_id: str) -> list[str]:
        async with self._lock:
            return sorted(self.room_sids.get(room_id, set()))

    async def get_session_rooms(self, sid: str, prefix: str | None = None) -> list[str]:
        async with self._lock:
            session = self.sessions.get(sid)
            if session is None:
                return []
            rooms = session.rooms
            if prefix is None:
                return sorted(rooms)
            return sorted(room for room in rooms if room.startswith(prefix))

    async def set_room_data(self, room_id: str, key: str, value: Any) -> None:
        async with self._lock:
            self.rooms_data.setdefault(room_id, {})[key] = value

    async def get_room_data(self, room_id: str, key: str) -> Any:
        async with self._lock:
            return self.rooms_data.get(room_id, {}).get(key)

    async def send_to_user(self, sio: AsyncServer, user_id: int, event: str, data: dict[str, Any]) -> int:
        async with self._lock:
            sids = sorted(self.user_sids.get(user_id, set()))
        for sid in sids:
            await sio.emit(event, data, to=sid)
        return len(sids)

    async def broadcast_to_room(
        self,
        sio: AsyncServer,
        room_id: str,
        event: str,
        data: dict[str, Any],
        *,
        skip_sid: str | None = None,
        exclude_user_id: int | None = None,
    ) -> int:
        async with self._lock:
            target_sids = set(self.room_sids.get(room_id, set()))
            skip_sids: set[str] = set()
            if skip_sid:
                skip_sids.add(skip_sid)
            if exclude_user_id is not None:
                skip_sids.update(self.user_sids.get(exclude_user_id, set()))
            reached = len(target_sids - skip_sids)

        await sio.emit(
            event,
            data,
            room=room_id,
            skip_sid=sorted(skip_sids) if skip_sids else None,
        )
        return reached

    async def get_stats(self) -> dict[str, int]:
        async with self._lock:
            return {
                "total_connections": len(self.sessions),
                "total_users": len(self.user_sids),
                "total_rooms": len(self.room_sids),
            }

    async def get_connection_info(self) -> dict[str, Any]:
        async with self._lock:
            return {
                "clients": {sid: session.to_dict() for sid, session in self.sessions.items()},
                "users": {
                    str(user_id): sorted(sids)
                    for user_id, sids in self.user_sids.items()
                },
                "rooms": {
                    room_id: sorted(user_ids)
                    for room_id, user_ids in self.room_members.items()
                },
            }


_manager: WebSocketManager | None = None


def get_manager() -> WebSocketManager:
    global _manager
    if _manager is None:
        _manager = WebSocketManager()
    return _manager


def reset_manager() -> None:
    global _manager
    _manager = None
