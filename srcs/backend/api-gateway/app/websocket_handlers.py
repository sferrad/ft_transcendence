from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

import httpx
import jwt
from jwt import InvalidTokenError
from socketio import AsyncServer

from .auth import is_blacklisted
from .websocket_manager import ClientSession, get_manager

logger = logging.getLogger(__name__)

CHAT_SERVICE_URL = os.getenv("CHAT_SERVICE_URL", "http://chat-service:8002")
MAX_GAME_PAYLOAD_BYTES = 4096
MAX_CHAT_MESSAGE_CHARS = 2000
ALLOWED_GAME_ACTIONS = {
    "move",
    "stop",
    "jump",
    "kick",
    "dash",
    "ready",
    "pause",
    "resume",
    "input",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def game_room_name(game_room_id: Any) -> str:
    room_id = str(game_room_id or "default").strip()[:80]
    return f"game:{room_id or 'default'}"


def chat_room_name(room_id: Any) -> str:
    return f"chat:{int(room_id)}"


def public_room_id(room_name: str) -> str:
    return room_name.split(":", 1)[1] if ":" in room_name else room_name


def payload_size(data: Any) -> int:
    try:
        return len(json.dumps(data, separators=(",", ":"), default=str).encode("utf-8"))
    except (TypeError, ValueError):
        return MAX_GAME_PAYLOAD_BYTES + 1


async def authenticate_socket(auth: dict[str, Any] | None) -> tuple[int, str, dict[str, Any]]:
    if not isinstance(auth, dict):
        raise ConnectionRefusedError("Missing authentication")

    token = str(auth.get("token") or auth.get("access_token") or "").strip()
    if token.lower().startswith("bearer "):
        token = token.split(" ", 1)[1].strip()
    if not token:
        raise ConnectionRefusedError("Missing authentication token")

    from .main import app

    secret_key = getattr(app.state, "jwt_secret_key", None)
    algorithm = getattr(app.state, "jwt_algorithm", None)
    if not secret_key or not algorithm:
        raise ConnectionRefusedError("JWT secret not initialized")

    try:
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
    except InvalidTokenError as exc:
        raise ConnectionRefusedError("Invalid or expired token") from exc

    if await is_blacklisted(token, payload):
        raise ConnectionRefusedError("Token revoked")

    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError) as exc:
        raise ConnectionRefusedError("Invalid token subject") from exc

    username = str(payload.get("username") or payload.get("email") or f"User{user_id}")
    return user_id, username, payload


async def emit_error(sio: AsyncServer, sid: str, message: str, code: str = "bad_request") -> None:
    await sio.emit("ws.error", {"code": code, "message": message, "timestamp": utc_now()}, to=sid)


async def chat_service_request(
    method: str,
    path: str,
    *,
    user_id: int,
    json_body: dict[str, Any] | None = None,
) -> tuple[int, Any]:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.request(
                method,
                f"{CHAT_SERVICE_URL}{path}",
                headers={"X-User-Id": str(user_id)},
                json=json_body,
            )
    except httpx.RequestError as exc:
        logger.warning("chat-service request failed: %s %s: %s", method, path, exc)
        return 503, {"detail": "chat-service unavailable"}
    try:
        body = response.json()
    except ValueError:
        body = {"detail": response.text}
    return response.status_code, body


async def join_socket_room(
    sio: AsyncServer,
    sid: str,
    room_name: str,
) -> ClientSession | None:
    await sio.enter_room(sid, room_name)
    session = await get_manager().join_room(sid, room_name)
    if session is None:
        await sio.leave_room(sid, room_name)
    return session


async def leave_socket_room(sio: AsyncServer, sid: str, room_name: str) -> ClientSession | None:
    await sio.leave_room(sid, room_name)
    return await get_manager().leave_room(sid, room_name)


async def _cleanup_chat_room_on_disconnect(
    sio: AsyncServer,
    sid: str,
    session: ClientSession,
    room_name: str,
) -> None:
    """Cleanup local socket state on disconnect without removing membership or broadcasting."""
    await leave_socket_room(sio, sid, room_name)


def register_websocket_handlers(sio: AsyncServer) -> None:
    manager = get_manager()

    @sio.event
    async def connect(sid: str, environ: dict[str, Any], auth: dict[str, Any] | None) -> None:
        user_id, username, _payload = await authenticate_socket(auth)
        await manager.register_connection(sid, user_id, username)
        await sio.emit(
            "ws.connected",
            {"user_id": user_id, "username": username, "timestamp": utc_now()},
            to=sid,
        )

    @sio.event
    async def disconnect(sid: str) -> None:
        session = await manager.get_session(sid)
        rooms = await manager.get_session_rooms(sid) if session else []
        removed = await manager.unregister_connection(sid)
        if removed is None:
            return

        for room_name in rooms:
            if room_name.startswith("game:"):
                room_members = await manager.get_room_members(room_name)
                await manager.broadcast_to_room(
                    sio,
                    room_name,
                    "game.user_left",
                    {
                        "game_room_id": public_room_id(room_name),
                        "user_id": removed.user_id,
                        "username": removed.username,
                        "room_members": room_members,
                        "timestamp": utc_now(),
                    },
                )
            elif room_name.startswith("chat:"):
                await _cleanup_chat_room_on_disconnect(sio, sid, removed, room_name)

    @sio.on("game.join")
    async def game_join(sid: str, data: dict[str, Any] | None) -> None:
        session = await manager.get_session(sid)
        if session is None:
            await emit_error(sio, sid, "Session not found", "not_authenticated")
            return

        data = data if isinstance(data, dict) else {}
        room_name = game_room_name(data.get("game_room_id"))

        for old_room in await manager.get_session_rooms(sid, "game:"):
            if old_room != room_name:
                await leave_socket_room(sio, sid, old_room)

        await join_socket_room(sio, sid, room_name)
        room_members = await manager.get_room_members(room_name)
        last_state = await manager.get_room_data(room_name, "last_game_state")

        await manager.broadcast_to_room(
            sio,
            room_name,
            "game.user_joined",
            {
                "game_room_id": public_room_id(room_name),
                "user_id": session.user_id,
                "username": session.username,
                "room_members": room_members,
                "timestamp": utc_now(),
            },
            skip_sid=sid,
        )
        await sio.emit(
            "game.joined",
            {
                "game_room_id": public_room_id(room_name),
                "your_user_id": session.user_id,
                "room_members": room_members,
                "last_state": last_state,
                "timestamp": utc_now(),
            },
            to=sid,
        )

    @sio.on("game.leave")
    async def game_leave(sid: str, data: dict[str, Any] | None) -> None:
        session = await manager.get_session(sid)
        if session is None:
            return

        data = data if isinstance(data, dict) else {}
        requested_room = data.get("game_room_id")
        room_names = [game_room_name(requested_room)] if requested_room else await manager.get_session_rooms(sid, "game:")

        for room_name in room_names:
            if room_name not in await manager.get_session_rooms(sid, "game:"):
                continue
            await leave_socket_room(sio, sid, room_name)
            room_members = await manager.get_room_members(room_name)
            await manager.broadcast_to_room(
                sio,
                room_name,
                "game.user_left",
                {
                    "game_room_id": public_room_id(room_name),
                    "user_id": session.user_id,
                    "username": session.username,
                    "room_members": room_members,
                    "timestamp": utc_now(),
                },
            )

    @sio.on("game.action")
    async def game_action(sid: str, data: dict[str, Any] | None) -> None:
        session = await manager.get_session(sid)
        game_rooms = await manager.get_session_rooms(sid, "game:")
        if session is None or not game_rooms:
            await emit_error(sio, sid, "Join a game room before sending actions", "not_in_room")
            return

        if not isinstance(data, dict):
            await emit_error(sio, sid, "Invalid game action payload")
            return
        if payload_size(data) > MAX_GAME_PAYLOAD_BYTES:
            await emit_error(sio, sid, "Game action payload too large", "payload_too_large")
            return

        action_type = str(data.get("type") or "")
        if action_type not in ALLOWED_GAME_ACTIONS:
            await emit_error(sio, sid, "Unsupported game action type", "invalid_action")
            return

        room_name = game_rooms[0]
        await manager.broadcast_to_room(
            sio,
            room_name,
            "game.action",
            {
                "game_room_id": public_room_id(room_name),
                "user_id": session.user_id,
                "action": data,
                "timestamp": utc_now(),
            },
            skip_sid=sid,
        )

    @sio.on("game.update")
    async def game_update(sid: str, data: dict[str, Any] | None) -> None:
        session = await manager.get_session(sid)
        game_rooms = await manager.get_session_rooms(sid, "game:")
        if session is None or not game_rooms:
            return
        if not isinstance(data, dict) or payload_size(data) > MAX_GAME_PAYLOAD_BYTES:
            await emit_error(sio, sid, "Invalid game update payload", "invalid_payload")
            return

        room_name = game_rooms[0]
        await manager.set_room_data(room_name, "last_game_state", data)
        await manager.broadcast_to_room(
            sio,
            room_name,
            "game.update",
            {
                "game_room_id": public_room_id(room_name),
                "user_id": session.user_id,
                "state": data,
                "timestamp": utc_now(),
            },
            skip_sid=sid,
        )

    @sio.on("chat.join")
    async def chat_join(sid: str, data: dict[str, Any] | None) -> None:
        """Join a chat room: validate → notify service → join locally → broadcast."""
        session = await manager.get_session(sid)
        if session is None:
            await emit_error(sio, sid, "Session not found", "not_authenticated")
            return

        # Validate data
        if not isinstance(data, dict) or data.get("room_id") is None:
            await emit_error(sio, sid, "Missing room_id")
            return

        try:
            room_name = chat_room_name(data.get("room_id"))
        except (TypeError, ValueError):
            await emit_error(sio, sid, "Invalid room_id")
            return

        # Step 1: Notify chat service
        status_code, body = await chat_service_request(
            "POST",
            f"/rooms/{public_room_id(room_name)}/join",
            user_id=session.user_id,
        )
        if status_code >= 400:
            await emit_error(sio, sid, str(body.get("detail", "Unable to join room")), "chat_join_failed")
            return

        # Step 2: Add to socket room and manager
        joined_session = await join_socket_room(sio, sid, room_name)
        if joined_session is None:
            await emit_error(sio, sid, "Failed to join room locally", "internal_error")
            # Try to rollback on service
            await chat_service_request("POST", f"/rooms/{public_room_id(room_name)}/leave", user_id=session.user_id)
            return

        # Step 3: Get updated room members
        room_members = await manager.get_room_members(room_name)

        # Step 4: Notify other users
        await manager.broadcast_to_room(
            sio,
            room_name,
            "chat.user_joined",
            {
                "room_id": int(public_room_id(room_name)),
                "user_id": session.user_id,
                "username": session.username,
                "room_members": room_members,
                "timestamp": utc_now(),
            },
            skip_sid=sid,
        )

        # Step 5: Confirm to joining user
        await sio.emit(
            "chat.joined",
            {
                "room_id": int(public_room_id(room_name)),
                "room_members": room_members,
                "timestamp": utc_now(),
            },
            to=sid,
        )

    @sio.on("chat.leave")
    async def chat_leave(sid: str, data: dict[str, Any] | None) -> None:
        """Leave a chat room: validate → notify service → leave locally → broadcast."""
        session = await manager.get_session(sid)
        if session is None:
            await emit_error(sio, sid, "Session not found", "not_authenticated")
            return

        # Validate data
        if not isinstance(data, dict) or data.get("room_id") is None:
            await emit_error(sio, sid, "Missing room_id")
            return

        try:
            room_name = chat_room_name(data.get("room_id"))
        except (TypeError, ValueError):
            await emit_error(sio, sid, "Invalid room_id")
            return

        # Check if actually in room
        if room_name not in await manager.get_session_rooms(sid, "chat:"):
            await emit_error(sio, sid, "Not in this chat room", "not_in_room")
            return

        # Step 1: Notify chat service
        status_code, body = await chat_service_request(
            "POST",
            f"/rooms/{public_room_id(room_name)}/leave",
            user_id=session.user_id,
        )
        if status_code >= 400:
            await emit_error(sio, sid, str(body.get("detail", "Unable to leave room")), "chat_leave_failed")
            return

        # Step 2: Remove from socket room
        await leave_socket_room(sio, sid, room_name)

        # Step 3: Get remaining room members
        room_members = await manager.get_room_members(room_name)

        # Step 4: Notify other users
        await manager.broadcast_to_room(
            sio,
            room_name,
            "chat.user_left",
            {
                "room_id": int(public_room_id(room_name)),
                "user_id": session.user_id,
                "username": session.username,
                "room_members": room_members,
                "reason": "leave",
                "timestamp": utc_now(),
            },
        )

        # Step 5: Confirm to leaving user
        await sio.emit(
            "chat.left",
            {"room_id": int(public_room_id(room_name)), "timestamp": utc_now()},
            to=sid,
        )

    @sio.on("chat.message")
    async def chat_message(sid: str, data: dict[str, Any] | None) -> None:
        """Send a message to a chat room."""
        session = await manager.get_session(sid)
        if session is None:
            await emit_error(sio, sid, "Session not found", "not_authenticated")
            return

        # Validate data
        if not isinstance(data, dict):
            await emit_error(sio, sid, "Invalid chat message payload")
            return

        content = str(data.get("content") or "").strip()
        if not content:
            await emit_error(sio, sid, "Message content is empty")
            return
        if len(content) > MAX_CHAT_MESSAGE_CHARS:
            await emit_error(sio, sid, f"Message too long (max {MAX_CHAT_MESSAGE_CHARS} chars)", "message_too_long")
            return

        try:
            room_name = chat_room_name(data.get("room_id"))
        except (TypeError, ValueError):
            await emit_error(sio, sid, "Invalid room_id")
            return

        # Check if user is in this room
        if room_name not in await manager.get_session_rooms(sid, "chat:"):
            await emit_error(sio, sid, "Join the chat room before sending messages", "not_in_room")
            return

        # Send to chat service
        status_code, body = await chat_service_request(
            "POST",
            f"/rooms/{public_room_id(room_name)}/messages",
            user_id=session.user_id,
            json_body={"content": content},
        )
        if status_code >= 400:
            await emit_error(sio, sid, str(body.get("detail", "Unable to send message")), "chat_message_failed")
            return

        # Broadcast to all in room
        await manager.broadcast_to_room(
            sio,
            room_name,
            "chat.message",
            {
                "id": body.get("id"),
                "room_id": int(public_room_id(room_name)),
                "sender_user_id": body.get("sender_user_id", session.user_id),
                "username": session.username,
                "content": body.get("content", content),
                "created_at": body.get("created_at"),
                "timestamp": utc_now(),
            },
        )

    @sio.on("ping")
    async def ping(sid: str) -> None:
        await sio.emit("pong", {"timestamp": utc_now()}, to=sid)

    @sio.on("get_stats")
    async def get_stats(sid: str) -> None:
        await sio.emit("stats", await manager.get_stats(), to=sid)
