from __future__ import annotations

import asyncio
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

CHAT_SERVICE_URL = os.getenv("CHAT_SERVICE_URL", "https://chat-service:8002")
GAME_SERVICE_URL = os.getenv("GAME_SERVICE_URL", "https://game-service:8005")
INTERNAL_CA_CERT = os.getenv("INTERNAL_CA_CERT", "/certs/ca.crt")
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
    "sync",
    "forfeit",
}

FORFEIT_TIMEOUT_S = 20

# task_key → asyncio.Task running the 20-s forfeit countdown (in-memory, cancellable)
_disconnect_tasks: dict[str, asyncio.Task[None]] = {}
# room_name → forfeit result persisted after the timer fires (survives room cleanup)
_forfeit_results: dict[str, dict[str, Any]] = {}

# ─────────────────────────────────────────────────────────────────────────────
# État "match actif" par user — source de vérité unique, persistée dans Redis.
#
# Une seule clé `match:active:<user_id>` par joueur, avec un champ `status` :
#   - "playing"      → le joueur est dans la partie, socket connecté
#   - "disconnected" → le joueur a perdu sa connexion, grace period en cours
#
# Écrite dès `game.join`/`game.rejoin` (statut "playing"), basculée en
# "disconnected" au `disconnect`. Comme l'état existe AVANT toute déconnexion,
# il survit à tout : fermeture d'onglet, perte réseau, redémarrage du
# container, navigation privée. Le frontend interroge `/ws/active-match` qui
# ne renvoie un match à rejoindre QUE si `status == "disconnected"`.
# ─────────────────────────────────────────────────────────────────────────────

# TTL de la clé "playing" : la partie ne dépasse jamais quelques minutes.
# Renouvelé à chaque game.update via `_redis_touch_match`.
_MATCH_PLAYING_TTL_S = 600


def _redis_match_key(user_id: int) -> str:
    return f"match:active:{user_id}"


def _redis_forfeit_notif_key(user_id: int) -> str:
    return f"match:forfeited:{user_id}"


async def _redis_set_match_playing(user_id: int, game_room_id: str, role: str) -> None:
    """Marque le joueur comme étant DANS la partie (socket connecté)."""
    from .middleware.redis import redis_client
    payload = json.dumps({
        "status": "playing",
        "game_room_id": game_room_id,
        "role": role,
    })
    try:
        await redis_client.setex(_redis_match_key(user_id), _MATCH_PLAYING_TTL_S, payload)
        logger.info("[REJOIN] match PLAYING user=%s room=%s role=%s", user_id, game_room_id, role)
    except Exception as exc:
        logger.warning("[REJOIN] FAILED to set match playing user=%s: %s", user_id, exc)


async def _redis_set_match_disconnected(user_id: int) -> bool:
    """
    Bascule l'état du joueur en "disconnected" et démarre le compte à rebours.
    Retourne True si un match "playing" existait (donc le grace period démarre),
    False sinon (pas de match en cours → rien à faire).
    """
    from .middleware.redis import redis_client
    import time as _time
    try:
        raw = await redis_client.get(_redis_match_key(user_id))
        if not raw:
            logger.info("[REJOIN] disconnect user=%s: no active match in Redis, skip", user_id)
            return False
        data = json.loads(raw)
        if data.get("status") == "disconnected":
            # Déjà en grace period (autre socket / double event) — ne pas resetter le timer.
            return True
        data["status"] = "disconnected"
        data["disconnected_at"] = _time.time()
        await redis_client.setex(
            _redis_match_key(user_id), FORFEIT_TIMEOUT_S + 5, json.dumps(data)
        )
        logger.info("[REJOIN] match DISCONNECTED user=%s room=%s", user_id, data.get("game_room_id"))
        return True
    except Exception as exc:
        logger.warning("[REJOIN] FAILED to set match disconnected user=%s: %s", user_id, exc)
        return False


async def _redis_clear_match(user_id: int) -> None:
    """Supprime l'état match (partie finie, forfait, ou rejoin réussi)."""
    from .middleware.redis import redis_client
    try:
        deleted = await redis_client.delete(_redis_match_key(user_id))
        if deleted:
            logger.info("[REJOIN] match CLEARED user=%s", user_id)
    except Exception as exc:
        logger.warning("[REJOIN] FAILED to clear match user=%s: %s", user_id, exc)


async def _redis_touch_match(user_id: int) -> None:
    """
    Rafraîchit le TTL de l'état "playing" pendant que la partie tourne.
    No-op si le joueur n'est pas en statut "playing" (ex: déjà disconnected —
    on ne veut surtout pas écraser le compte à rebours de forfait).
    """
    from .middleware.redis import redis_client
    try:
        raw = await redis_client.get(_redis_match_key(user_id))
        if not raw:
            return
        data = json.loads(raw)
        if data.get("status") != "playing":
            return
        await redis_client.expire(_redis_match_key(user_id), _MATCH_PLAYING_TTL_S)
    except Exception:
        pass


async def _redis_save_forfeit_notif(user_id: int) -> None:
    from .middleware.redis import redis_client
    try:
        # Garde la notif 5 minutes, largement suffisant
        await redis_client.setex(_redis_forfeit_notif_key(user_id), 300, "1")
    except Exception:
        pass


async def get_active_match_for_user(user_id: int) -> dict[str, Any] | None:
    """
    Renvoie le match à rejoindre SEULEMENT si le joueur est en grace period
    (status == "disconnected" et compteur non écoulé). Sinon None.
    """
    from .middleware.redis import redis_client
    import time as _time
    try:
        raw = await redis_client.get(_redis_match_key(user_id))
        if not raw:
            return None
        data = json.loads(raw)
        if data.get("status") != "disconnected":
            # Le joueur est "playing" → pas de popup de reconnexion à afficher.
            return None
        disconnected_at = float(data.get("disconnected_at", 0))
        elapsed = _time.time() - disconnected_at
        time_remaining = max(0.0, FORFEIT_TIMEOUT_S - elapsed)
        if time_remaining <= 0:
            await redis_client.delete(_redis_match_key(user_id))
            logger.info("[REJOIN] active-match expired user=%s", user_id)
            return None
        logger.info(
            "[REJOIN] active-match HIT user=%s room=%s remaining=%ss",
            user_id, data.get("game_room_id"), round(time_remaining, 1),
        )
        return {
            "game_room_id": data["game_room_id"],
            "role": data["role"],
            "time_remaining": round(time_remaining, 1),
        }
    except Exception as exc:
        logger.warning("[REJOIN] get_active_match error user=%s: %s", user_id, exc)
        return None


async def get_forfeit_notification_for_user(user_id: int) -> bool:
    """Returns True if a forfeit notification is pending (key persists until ack'd)."""
    from .middleware.redis import redis_client
    try:
        val = await redis_client.get(_redis_forfeit_notif_key(user_id))
        return bool(val)
    except Exception:
        pass
    return False


async def ack_forfeit_notification_for_user(user_id: int) -> None:
    """Deletes the forfeit notification key (called when user dismisses the popup)."""
    from .middleware.redis import redis_client
    try:
        await redis_client.delete(_redis_forfeit_notif_key(user_id))
    except Exception:
        pass


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def game_room_name(game_room_id: Any) -> str:
    room_id = str(game_room_id or "default").strip()[:80]
    return f"game:{room_id or 'default'}"


def chat_room_name(room_id: Any) -> str:
    return f"chat:{int(room_id)}"


def dm_room_name(user_a: Any, user_b: Any) -> str:
    a = int(user_a)
    b = int(user_b)
    low, high = (a, b) if a <= b else (b, a)
    return f"dm:{low}-{high}"


def public_room_id(room_name: str) -> str:
    return room_name.split(":", 1)[1] if ":" in room_name else room_name


def payload_size(data: Any) -> int:
    try:
        return len(json.dumps(data, separators=(",", ":"), default=str).encode("utf-8"))
    except (TypeError, ValueError):
        return MAX_GAME_PAYLOAD_BYTES + 1


def _parse_match_id(room_name: str) -> int | None:
    try:
        match_id = int(public_room_id(room_name))
    except (TypeError, ValueError):
        return None
    return match_id if match_id > 0 else None


async def _do_forfeit(
    sio: AsyncServer,
    room_name: str,
    forfeit_user_id: int,
    forfeit_username: str,
    roles: dict[str, Any],
) -> None:
    """Persist forfeit result to DB and broadcast game.forfeit immediately."""
    manager = get_manager()

    match_saved = await manager.get_room_data(room_name, "match_saved")
    if match_saved:
        return

    winner_role: str | None = None
    winner_id: int | None = None
    if roles.get("p1") == forfeit_user_id:
        winner_role = "player2"
        winner_id = roles.get("p2")
    elif roles.get("p2") == forfeit_user_id:
        winner_role = "player1"
        winner_id = roles.get("p1")

    # Score officiel forfait : 3-0 comme au football
    score_p1 = 3 if winner_role == "player1" else 0
    score_p2 = 3 if winner_role == "player2" else 0

    match_id = _parse_match_id(room_name)
    if match_id and winner_id:
        payload = {
            "status": "finished",
            "score_player1": score_p1,
            "score_player2": score_p2,
            "winner_id": winner_id,
            "finished_at": utc_now(),
        }
        try:
            async with httpx.AsyncClient(timeout=5.0, verify=INTERNAL_CA_CERT) as client:
                await client.put(
                    f"{GAME_SERVICE_URL}/matches/{match_id}",
                    headers={"X-User-Id": str(winner_id)},
                    json=payload,
                )
            await manager.set_room_data(room_name, "match_saved", True)
        except httpx.RequestError as exc:
            logger.warning("Failed to persist forfeit for match_id=%s: %s", match_id, exc)

    forfeit_result: dict[str, Any] = {
        "forfeit_user_id": forfeit_user_id,
        "forfeit_username": forfeit_username,
        "winner_role": winner_role,
        "score_player1": score_p1,
        "score_player2": score_p2,
        "timestamp": utc_now(),
    }
    _forfeit_results[room_name] = forfeit_result

    # La partie est terminée : aucun des deux joueurs ne doit garder un état
    # "match à rejoindre". On efface les deux côtés.
    for uid in (roles.get("p1"), roles.get("p2")):
        if isinstance(uid, int):
            await _redis_clear_match(uid)

    await manager.broadcast_to_room(
        sio,
        room_name,
        "game.forfeit",
        {"game_room_id": public_room_id(room_name), **forfeit_result},
    )


async def _forfeit_timer(
    sio: AsyncServer,
    room_name: str,
    disconnected_user_id: int,
    disconnected_username: str,
    roles: dict[str, Any],
) -> None:
    await asyncio.sleep(FORFEIT_TIMEOUT_S)

    task_key = f"{room_name}:{disconnected_user_id}"
    _disconnect_tasks.pop(task_key, None)

    # Le grace period est écoulé : on efface l'état match et on dépose la
    # notification "tu as déclaré forfait" que le joueur verra à son retour.
    await _redis_clear_match(disconnected_user_id)
    await _redis_save_forfeit_notif(disconnected_user_id)

    # Push la notification directement si le user est déjà reconnecté.
    try:
        manager = get_manager()
        info = await manager.get_connection_info()
        sids = info.get("users", {}).get(str(disconnected_user_id), [])
        for target_sid in sids:
            await sio.emit("ws.forfeit_notification", {"forfeited": True}, to=target_sid)
    except Exception:
        pass

    await _do_forfeit(sio, room_name, disconnected_user_id, disconnected_username, roles)


async def _persist_match_result(
    *,
    session: ClientSession,
    room_name: str,
    state: dict[str, Any],
) -> None:
    manager = get_manager()
    already_saved = await manager.get_room_data(room_name, "match_saved")
    if already_saved:
        return

    match_id = _parse_match_id(room_name)
    if match_id is None:
        return

    status = str(state.get("status") or "")
    if status != "finished":
        return

    winner = str(state.get("winner") or "")
    roles = await manager.get_room_data(room_name, "game_roles")
    roles = roles if isinstance(roles, dict) else {}

    winner_id = None
    if winner == "player1":
        winner_id = roles.get("p1")
    elif winner == "player2":
        winner_id = roles.get("p2")

    payload = {
        "status": "finished",
        "score_player1": int(state.get("player1", {}).get("score", 0)),
        "score_player2": int(state.get("player2", {}).get("score", 0)),
        "winner_id": winner_id,
        "finished_at": utc_now(),
    }

    try:
        async with httpx.AsyncClient(timeout=5.0, verify=INTERNAL_CA_CERT) as client:
            response = await client.put(
                f"{GAME_SERVICE_URL}/matches/{match_id}",
                headers={"X-User-Id": str(session.user_id)},
                json=payload,
            )
        if response.status_code < 400:
            await manager.set_room_data(room_name, "match_saved", True)
        else:
            logger.warning(
                "Match persistence rejected for match_id=%s: %s %s",
                match_id, response.status_code, response.text[:200],
            )
    except httpx.RequestError as exc:
        logger.warning("Failed to persist match result for match_id=%s: %s", match_id, exc)


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
        async with httpx.AsyncClient(timeout=5.0, verify=INTERNAL_CA_CERT) as client:
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
        # Push active match + forfeit notification on connect so the frontend
        # doesn't need to poll these endpoints at all.
        try:
            active = await get_active_match_for_user(user_id)
            if active:
                await sio.emit("ws.active_match", {**active, "active": True}, to=sid)
            else:
                await sio.emit("ws.active_match", {"active": False}, to=sid)
        except Exception:
            pass
        try:
            forfeited = await get_forfeit_notification_for_user(user_id)
            if forfeited:
                await sio.emit("ws.forfeit_notification", {"forfeited": True}, to=sid)
        except Exception:
            pass

    @sio.event
    async def disconnect(sid: str) -> None:
        session = await manager.get_session(sid)
        rooms = await manager.get_session_rooms(sid) if session else []
        logger.info("[REJOIN] disconnect sid=%s user=%s rooms=%s",
                    sid, session.user_id if session else None, rooms)

        # Capture game room data before unregister_connection may clean up rooms_data.
        game_snapshots: dict[str, dict[str, Any]] = {}
        for room_name in rooms:
            if room_name.startswith("game:"):
                game_snapshots[room_name] = {
                    "roles": await manager.get_room_data(room_name, "game_roles") or {},
                    "last_state": await manager.get_room_data(room_name, "last_game_state"),
                    "match_saved": bool(await manager.get_room_data(room_name, "match_saved")),
                }

        removed = await manager.unregister_connection(sid)
        if removed is None:
            logger.info("[REJOIN] disconnect sid=%s: removed is None, abort", sid)
            return

        for room_name in rooms:
            if room_name.startswith("game:"):
                # Avec le socket singleton côté front, un user n'a qu'UN socket.
                # On garde quand même ce garde-fou : si une autre connexion du
                # même user reste dans la room (multi-onglets), ce n'est pas une
                # vraie déconnexion.
                remaining_members = await manager.get_room_members(room_name)
                if removed.user_id in remaining_members:
                    logger.info("[REJOIN] disconnect user=%s room=%s: still has another socket in room, skip",
                                removed.user_id, room_name)
                    continue

                snap = game_snapshots.get(room_name, {})
                last_state = snap.get("last_state") or {}
                game_finished = last_state.get("status") == "finished" if last_state else False
                match_saved = snap.get("match_saved", False)
                already_forfeit = room_name in _forfeit_results
                logger.info("[REJOIN] disconnect user=%s room=%s: game_finished=%s match_saved=%s already_forfeit=%s",
                            removed.user_id, room_name, game_finished, match_saved, already_forfeit)

                if not game_finished and not match_saved and not already_forfeit:
                    # Partie active : on bascule l'état Redis en "disconnected"
                    # et on démarre le compte à rebours de forfait. La bascule
                    # ne réussit que si un match "playing" existait pour ce user.
                    started = await _redis_set_match_disconnected(removed.user_id)
                    if not started:
                        # Pas d'état match en Redis → rien à faire (le joueur
                        # n'avait jamais émis game.join, ou état déjà nettoyé).
                        continue

                    await manager.broadcast_to_room(
                        sio,
                        room_name,
                        "game.opponent_disconnected",
                        {
                            "game_room_id": public_room_id(room_name),
                            "user_id": removed.user_id,
                            "username": removed.username,
                            "timeout_seconds": FORFEIT_TIMEOUT_S,
                            "timestamp": utc_now(),
                        },
                    )
                    task_key = f"{room_name}:{removed.user_id}"
                    existing = _disconnect_tasks.pop(task_key, None)
                    if existing:
                        existing.cancel()
                    roles_snap = dict(snap.get("roles", {}))
                    _disconnect_tasks[task_key] = asyncio.create_task(
                        _forfeit_timer(sio, room_name, removed.user_id, removed.username, roles_snap)
                    )
                else:
                    # Partie déjà finie / sauvegardée : pas de grace period,
                    # on nettoie juste l'état match résiduel.
                    await _redis_clear_match(removed.user_id)
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

        # Cancel any pending forfeit timer for this user in this room. This
        # makes game.join idempotent: if the client reloaded or remounted
        # between disconnect and now, we treat the rejoin as a reconnect
        # rather than letting the 20-s timer expire mid-game.
        task_key = f"{room_name}:{session.user_id}"
        cancelled_task = _disconnect_tasks.pop(task_key, None)
        if cancelled_task:
            cancelled_task.cancel()

        # Store the player role so _persist_match_result can identify winner_id.
        role = str(data.get("role") or "")
        if role in ("player1", "player2"):
            existing_roles = await manager.get_room_data(room_name, "game_roles") or {}
            if not isinstance(existing_roles, dict):
                existing_roles = {}
            existing_roles["p1" if role == "player1" else "p2"] = session.user_id
            await manager.set_room_data(room_name, "game_roles", existing_roles)

        # État match → "playing". C'est ICI que la source de vérité est créée :
        # tant que ce socket vit, le joueur est dans la partie. Au moindre
        # disconnect, le handler bascule cet état en "disconnected".
        await _redis_set_match_playing(
            session.user_id, public_room_id(room_name),
            role if role in ("player1", "player2") else "player1",
        )

        room_members = await manager.get_room_members(room_name)
        last_state = await manager.get_room_data(room_name, "last_game_state")

        # If we just cancelled a forfeit task, the opponent's UI still shows
        # the disconnect countdown overlay — clear it.
        if cancelled_task:
            await manager.broadcast_to_room(
                sio,
                room_name,
                "game.opponent_reconnected",
                {
                    "game_room_id": public_room_id(room_name),
                    "user_id": session.user_id,
                    "username": session.username,
                    "room_members": room_members,
                    "timestamp": utc_now(),
                },
                skip_sid=sid,
            )

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

    @sio.on("game.rejoin")
    async def game_rejoin(sid: str, data: dict[str, Any] | None) -> None:
        session = await manager.get_session(sid)
        if session is None:
            await emit_error(sio, sid, "Session not found", "not_authenticated")
            return

        data = data if isinstance(data, dict) else {}
        room_name = game_room_name(data.get("game_room_id"))

        # Cancel any pending forfeit timer for this player.
        task_key = f"{room_name}:{session.user_id}"
        task = _disconnect_tasks.pop(task_key, None)
        if task:
            task.cancel()

        # If forfeit already fired, send the result directly to this player.
        forfeit_result = _forfeit_results.get(room_name)
        if forfeit_result:
            # La partie est perdue : on s'assure qu'aucun état "à rejoindre"
            # ne traîne en Redis.
            await _redis_clear_match(session.user_id)
            await sio.emit(
                "game.forfeit",
                {"game_room_id": public_room_id(room_name), **forfeit_result},
                to=sid,
            )
            return

        # Restore role mapping.
        role = str(data.get("role") or "")
        if role in ("player1", "player2"):
            existing_roles = await manager.get_room_data(room_name, "game_roles") or {}
            if not isinstance(existing_roles, dict):
                existing_roles = {}
            existing_roles["p1" if role == "player1" else "p2"] = session.user_id
            await manager.set_room_data(room_name, "game_roles", existing_roles)

        # Reconnexion réussie dans le grace period → l'état repasse à "playing".
        await _redis_set_match_playing(
            session.user_id, public_room_id(room_name),
            role if role in ("player1", "player2") else "player1",
        )

        await join_socket_room(sio, sid, room_name)

        room_members = await manager.get_room_members(room_name)
        last_state = await manager.get_room_data(room_name, "last_game_state")

        await manager.broadcast_to_room(
            sio,
            room_name,
            "game.opponent_reconnected",
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
            "game.rejoined",
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
        """
        Sortie volontaire d'une partie (l'utilisateur quitte la page de jeu).

        Avec le socket partagé, quitter `/online-gameplay` ne coupe plus le
        socket : c'est `game.leave` qui prévient le backend. Si la partie
        n'est PAS terminée, on traite ça exactement comme une déconnexion
        accidentelle → grace period de 20 s + popup de reconnexion. Le joueur
        peut donc revenir, ou déclarer forfait depuis la popup.
        """
        session = await manager.get_session(sid)
        if session is None:
            return

        data = data if isinstance(data, dict) else {}
        requested_room = data.get("game_room_id")
        room_names = [game_room_name(requested_room)] if requested_room else await manager.get_session_rooms(sid, "game:")

        for room_name in room_names:
            if room_name not in await manager.get_session_rooms(sid, "game:"):
                continue

            # Snapshot AVANT leave (rooms_data peut être wipé si last member).
            last_state = await manager.get_room_data(room_name, "last_game_state") or {}
            game_finished = last_state.get("status") == "finished" if last_state else False
            match_saved = bool(await manager.get_room_data(room_name, "match_saved"))
            roles_snap = dict(await manager.get_room_data(room_name, "game_roles") or {})
            already_forfeit = room_name in _forfeit_results

            await leave_socket_room(sio, sid, room_name)

            if not game_finished and not match_saved and not already_forfeit:
                # Partie active : on démarre le grace period, comme un disconnect.
                started = await _redis_set_match_disconnected(session.user_id)
                if started:
                    await manager.broadcast_to_room(
                        sio,
                        room_name,
                        "game.opponent_disconnected",
                        {
                            "game_room_id": public_room_id(room_name),
                            "user_id": session.user_id,
                            "username": session.username,
                            "timeout_seconds": FORFEIT_TIMEOUT_S,
                            "timestamp": utc_now(),
                        },
                    )
                    task_key = f"{room_name}:{session.user_id}"
                    existing = _disconnect_tasks.pop(task_key, None)
                    if existing:
                        existing.cancel()
                    _disconnect_tasks[task_key] = asyncio.create_task(
                        _forfeit_timer(sio, room_name, session.user_id, session.username, roles_snap)
                    )
                    continue

            # Partie déjà finie : sortie nette, on nettoie l'état match.
            await _redis_clear_match(session.user_id)
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

        if action_type == "forfeit":
            # Cancel any pending disconnect timer for this player (they chose to forfeit).
            task_key = f"{room_name}:{session.user_id}"
            task = _disconnect_tasks.pop(task_key, None)
            if task:
                task.cancel()
            roles = await manager.get_room_data(room_name, "game_roles") or {}
            await _do_forfeit(sio, room_name, session.user_id, session.username, dict(roles))
            return

        # Touche le TTL "playing" : tant que le joueur agit, son match reste actif.
        await _redis_touch_match(session.user_id)

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
        await _persist_match_result(session=session, room_name=room_name, state=data)

        if str(data.get("status") or "") == "finished":
            # Partie terminée normalement : on efface l'état "match actif" des
            # deux joueurs pour qu'aucune popup de reconnexion ne ressorte.
            roles = await manager.get_room_data(room_name, "game_roles") or {}
            for uid in (roles.get("p1"), roles.get("p2")):
                if isinstance(uid, int):
                    await _redis_clear_match(uid)
        else:
            await _redis_touch_match(session.user_id)

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

    @sio.on("dm.join")
    async def dm_join(sid: str, data: dict[str, Any] | None) -> None:
        session = await manager.get_session(sid)
        if session is None:
            await emit_error(sio, sid, "Session not found", "not_authenticated")
            return

        if not isinstance(data, dict) or data.get("target_user_id") is None:
            await emit_error(sio, sid, "Missing target_user_id")
            return

        try:
            target_user_id = int(data.get("target_user_id"))
        except (TypeError, ValueError):
            await emit_error(sio, sid, "Invalid target_user_id")
            return
        if target_user_id <= 0 or target_user_id == session.user_id:
            await emit_error(sio, sid, "Invalid target_user_id")
            return

        room_name = dm_room_name(session.user_id, target_user_id)
        joined_session = await join_socket_room(sio, sid, room_name)
        if joined_session is None:
            await emit_error(sio, sid, "Failed to join DM room locally", "internal_error")
            return

        room_members = await manager.get_room_members(room_name)
        await sio.emit(
            "dm.joined",
            {
                "room": room_name,
                "room_members": room_members,
                "target_user_id": target_user_id,
                "timestamp": utc_now(),
            },
            to=sid,
        )

    @sio.on("dm.leave")
    async def dm_leave(sid: str, data: dict[str, Any] | None) -> None:
        session = await manager.get_session(sid)
        if session is None:
            return

        if not isinstance(data, dict) or data.get("target_user_id") is None:
            await emit_error(sio, sid, "Missing target_user_id")
            return

        try:
            target_user_id = int(data.get("target_user_id"))
        except (TypeError, ValueError):
            await emit_error(sio, sid, "Invalid target_user_id")
            return
        if target_user_id <= 0 or target_user_id == session.user_id:
            await emit_error(sio, sid, "Invalid target_user_id")
            return

        room_name = dm_room_name(session.user_id, target_user_id)
        if room_name not in await manager.get_session_rooms(sid, "dm:"):
            return

        await leave_socket_room(sio, sid, room_name)

    @sio.on("dm.message")
    async def dm_message(sid: str, data: dict[str, Any] | None) -> None:
        session = await manager.get_session(sid)
        if session is None:
            await emit_error(sio, sid, "Session not found", "not_authenticated")
            return

        if not isinstance(data, dict):
            await emit_error(sio, sid, "Invalid DM payload")
            return

        content = str(data.get("content") or "").strip()
        if not content:
            await emit_error(sio, sid, "Message content is empty")
            return
        if len(content) > MAX_CHAT_MESSAGE_CHARS:
            await emit_error(sio, sid, f"Message too long (max {MAX_CHAT_MESSAGE_CHARS} chars)", "message_too_long")
            return

        try:
            target_user_id = int(data.get("target_user_id"))
        except (TypeError, ValueError):
            await emit_error(sio, sid, "Invalid target_user_id")
            return
        if target_user_id <= 0 or target_user_id == session.user_id:
            await emit_error(sio, sid, "Invalid target_user_id")
            return

        room_name = dm_room_name(session.user_id, target_user_id)
        if room_name not in await manager.get_session_rooms(sid, "dm:"):
            await emit_error(sio, sid, "Join the DM room before sending messages", "not_in_room")
            return

        status_code, body = await chat_service_request(
            "POST",
            f"/{target_user_id}/messages",
            user_id=session.user_id,
            json_body={"content": content},
        )
        if status_code >= 400:
            await emit_error(sio, sid, str(body.get("detail", "Unable to send message")), "dm_message_failed")
            return

        payload = {
            "id": body.get("id"),
            "sender_user_id": body.get("sender_user_id", session.user_id),
            "receiver_user_id": body.get("receiver_user_id", target_user_id),
            "username": session.username,
            "content": body.get("content", content),
            "created_at": body.get("created_at"),
            "timestamp": utc_now(),
        }

        room_members = await manager.get_room_members(room_name)
        await manager.broadcast_to_room(sio, room_name, "dm.message", payload)
        if target_user_id not in room_members:
            await manager.send_to_user(sio, target_user_id, "dm.message", payload)

    # ─── Typing indicator (public channels + DMs) ─────────────────────────
    @sio.on("chat.typing")
    async def chat_typing(sid: str, data: dict[str, Any] | None) -> None:
        session = await manager.get_session(sid)
        if session is None or not isinstance(data, dict):
            return
        try:
            room_name = chat_room_name(data.get("room_id"))
        except (TypeError, ValueError):
            return
        if room_name not in await manager.get_session_rooms(sid, "chat:"):
            return
        await manager.broadcast_to_room(
            sio,
            room_name,
            "chat.typing",
            {
                "room_id": int(public_room_id(room_name)),
                "user_id": session.user_id,
                "username": session.username,
                "timestamp": utc_now(),
            },
            skip_sid=sid,
        )

    @sio.on("dm.typing")
    async def dm_typing(sid: str, data: dict[str, Any] | None) -> None:
        session = await manager.get_session(sid)
        if session is None or not isinstance(data, dict):
            return
        try:
            target_user_id = int(data.get("target_user_id"))
        except (TypeError, ValueError):
            return
        if target_user_id <= 0 or target_user_id == session.user_id:
            return
        room_name = dm_room_name(session.user_id, target_user_id)
        await manager.broadcast_to_room(
            sio,
            room_name,
            "dm.typing",
            {
                "from_user_id": session.user_id,
                "username": session.username,
                "timestamp": utc_now(),
            },
            skip_sid=sid,
        )
        # If recipient isn't currently in the DM room, push the event
        # directly to their user channel so the chat list can show a hint.
        room_members = await manager.get_room_members(room_name)
        if target_user_id not in room_members:
            await manager.send_to_user(
                sio,
                target_user_id,
                "dm.typing",
                {
                    "from_user_id": session.user_id,
                    "username": session.username,
                    "timestamp": utc_now(),
                },
            )

    # ─── Read receipts (DM only) ──────────────────────────────────────────
    @sio.on("dm.read")
    async def dm_read(sid: str, data: dict[str, Any] | None) -> None:
        session = await manager.get_session(sid)
        if session is None or not isinstance(data, dict):
            return
        try:
            target_user_id = int(data.get("target_user_id"))
        except (TypeError, ValueError):
            return
        if target_user_id <= 0 or target_user_id == session.user_id:
            return
        last_read_at = data.get("last_read_at")
        room_name = dm_room_name(session.user_id, target_user_id)
        payload = {
            "reader_user_id": session.user_id,
            "last_read_at": last_read_at,
            "timestamp": utc_now(),
        }
        await manager.broadcast_to_room(sio, room_name, "dm.read", payload, skip_sid=sid)
        # Always notify the target user directly too, in case they're not
        # focused on this DM room.
        room_members = await manager.get_room_members(room_name)
        if target_user_id not in room_members:
            await manager.send_to_user(sio, target_user_id, "dm.read", payload)

    @sio.on("chat.invite_member")
    async def chat_invite_member(sid: str, data: dict[str, Any] | None) -> None:
        """Invite a user to a private group room. Adds them as member + pushes a notification."""
        session = await manager.get_session(sid)
        if session is None:
            await emit_error(sio, sid, "Session not found", "not_authenticated")
            return

        if not isinstance(data, dict):
            await emit_error(sio, sid, "Invalid payload")
            return

        try:
            room_id = int(data.get("room_id"))
            target_user_id = int(data.get("user_id"))
        except (TypeError, ValueError):
            await emit_error(sio, sid, "Invalid room_id or user_id")
            return

        if target_user_id <= 0 or target_user_id == session.user_id:
            await emit_error(sio, sid, "Invalid user_id")
            return

        room_name = chat_room_name(room_id)

        # Add to room via chat-service
        status_code, body = await chat_service_request(
            "POST",
            f"/rooms/{room_id}/invite",
            user_id=session.user_id,
            json_body={"user_id": target_user_id},
        )
        if status_code >= 400:
            await emit_error(sio, sid, str(body.get("detail", "Invite failed")), "invite_failed")
            return

        # Notify the invitee via their personal channel
        room_name_str = room_name
        await manager.send_to_user(
            sio,
            target_user_id,
            "chat.group_invite",
            {
                "room_id": room_id,
                "room_name": data.get("room_name", ""),
                "invited_by_user_id": session.user_id,
                "invited_by_username": session.username,
                "timestamp": utc_now(),
            },
        )

        # Also broadcast to existing room members so their member list refreshes
        await manager.broadcast_to_room(
            sio,
            room_name_str,
            "chat.user_joined",
            {
                "room_id": room_id,
                "user_id": target_user_id,
                "username": data.get("target_username", ""),
                "timestamp": utc_now(),
            },
        )

        await sio.emit("chat.invite_sent", {"ok": True, "room_id": room_id, "user_id": target_user_id}, to=sid)

    @sio.on("ping")
    async def ping(sid: str) -> None:
        await sio.emit("pong", {"timestamp": utc_now()}, to=sid)

    @sio.on("get_stats")
    async def get_stats(sid: str) -> None:
        await sio.emit("stats", await manager.get_stats(), to=sid)
