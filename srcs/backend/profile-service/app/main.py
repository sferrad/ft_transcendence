from fastapi import Depends, FastAPI, Header, HTTPException, status, UploadFile, File
from sqlalchemy import text
from fastapi.responses import Response, FileResponse
import httpx
import os
import uuid
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from prometheus_fastapi_instrumentator import Instrumentator
import json
from datetime import datetime, timezone

from . import api_gateway_client, crud, schemas, user_service_client, friends_service_client, chat_service_client, game_service_client, email_config
from .database import get_db, init_db, init_engine

AVATAR_UPLOAD_DIR = os.getenv("AVATAR_UPLOAD_DIR", "/app/uploads/avatars")
AVATAR_MAX_BYTES = 5 * 1024 * 1024


app = FastAPI(title="profile-service")

Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

@app.on_event("startup")
def on_startup() -> None:
	try:
		init_engine()
		init_db()
	except Exception as e:
		print(f"[startup] DB init failed: {e}")


@app.get("/health")
async def health():
	return {"status": "ok", "service": "profile-service"}



@app.get("/db/ping")
async def db_ping(db: Session = Depends(get_db)):
	try:
		db.execute(text("SELECT 1"))
		return {"status": "ok"}
	except Exception as e:
		raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
	
	
def _current_user_id(x_user_id: str | None = Header(default=None, alias="X-User-Id")) -> int:
	if not x_user_id:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-User-Id header")
	try:
		user_id = int(x_user_id)
	except ValueError:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid X-User-Id header")
	if user_id <= 0:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid X-User-Id header")
	return user_id



ALLOWED_AVATAR_TYPES = {
	"image/jpeg": ".jpg",
	"image/png": ".png",
	"image/webp": ".webp",
	"image/gif": ".gif",
}


async def _check_magic_bytes(upload: UploadFile) -> None:
	head = await upload.read(16) # lis les 16 premiers bytes (magic bytes)
	try:
		upload.file.seek(0) # retour en arriere au byte 0
	except Exception:
		raise HTTPException(status_code=400, detail="Invalid upload")
	ext = upload.content_type
	if ext == "image/png":
		if not head.startswith(b"\x89PNG\r\n\x1a\n"):
			raise HTTPException(status_code=400, detail="Invalid PNG")
		return
	if ext == "image/jpeg":
		if not head.startswith(b"\xff\xd8\xff"):
			raise HTTPException(status_code=400, detail="Invalid JPEG")
		return
	if ext == "image/gif":
		if not (head.startswith(b"GIF87a") or head.startswith(b"GIF89a")):
			raise HTTPException(status_code=400, detail="Invalid GIF")
		return
	if ext == "image/webp":
		if not (head.startswith(b"RIFF") and head[8:12] == b"WEBP"):
			raise HTTPException(status_code=400, detail="Invalid WebP")
		return
	raise HTTPException(status_code=400, detail="Invalid image type")

async def _save_avatar(upload: UploadFile) -> str:
	if upload.content_type not in ALLOWED_AVATAR_TYPES:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image type")
	await _check_magic_bytes(upload)
	os.makedirs(AVATAR_UPLOAD_DIR, exist_ok=True)
	ext = ALLOWED_AVATAR_TYPES[upload.content_type]
	filename = f"{uuid.uuid4().hex}{ext}"
	path = os.path.join(AVATAR_UPLOAD_DIR, filename)
	size = 0
	with open(path, "wb") as f:
		while True:
			chunk = await upload.read(1024 * 1024)  # 1MB
			if not chunk:
				break
			size += len(chunk)
			if size > AVATAR_MAX_BYTES:
				f.close()
				try:
					os.remove(path)
				except Exception:
					pass
				raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large")
			f.write(chunk)
	return filename

def _try_delete_avatar_file(filename: str | None) -> None:
	if not filename:
		return
	if not _is_safe_filename(filename):
		return
	try:
		path = os.path.join(AVATAR_UPLOAD_DIR, filename)
		if os.path.isfile(path):
			os.remove(path)
	except Exception:
		return

def _is_safe_filename(filename: str) -> bool:
	if not filename:
		return False
	if "/" in filename or "\\" in filename or ".." in filename:
		return False
	return True

def _filename_from_avatar_url(avatar_url: str | None) -> str | None:
	if not avatar_url:
		return None
	prefix = "/profile/avatars/"
	if not avatar_url.startswith(prefix):
		return None
	filename = avatar_url.removeprefix(prefix)
	if not _is_safe_filename(filename):
		return None
	return filename

# consulte son profile
@app.get("/me", response_model=schemas.ProfileOut)
async def get_me(user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	profile = crud.get_profile_by_user_id(db, user_id)
	if not profile:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
	return profile

# cree ou met a jour son profil
@app.put("/me", response_model=schemas.ProfileOut)
async def put_me(payload: schemas.ProfileUpdate, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	profile = crud.get_profile_by_user_id(db, user_id)
	if not profile:
		if not payload.display_name:
			raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="display_name is required")
		try:
			profile = crud.create_profile(db, user_id, schemas.ProfileCreate(**payload.model_dump(exclude_unset=True)))
			# SQLAlchemyError: catch large pour rollback systematique
			# vs
			# IntegrityError: catch spécifique (unique constraint...)
		except IntegrityError:
			# Race condition: possible qu'entre le SELECT et l'INSERT, un autre process ait créé le profil.
			profile = crud.get_profile_by_user_id(db, user_id)
			if not profile:
				raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Profile creation conflict, please retry")
			profile = crud.update_profile(db, profile, payload)
	else:
		data = payload.model_dump(exclude_unset=True)
		if "display_name" in data and data["display_name"] is None:
			raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="display_name cannot be null")
		profile = crud.update_profile(db, profile, payload)
	return profile

# consulte le profile d un autre user
@app.get("/profiles/{user_id}", response_model=schemas.ProfileOut)
async def get_profile(user_id: int, db: Session = Depends(get_db)):
	profile = crud.get_profile_by_user_id(db, user_id)
	if not profile:
		profile = crud.create_profile(db, user_id, schemas.ProfileCreate(display_name=f"User {user_id}"))
	return profile

@app.get("/me/settings", response_model = schemas.UserSettingOut)
async def get_settings(user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)) -> schemas.UserSettingOut:
	settings = crud.get_user_settings(db, user_id)
	if not settings:
		settings = crud.create_user_settings(db, user_id)
	return settings

@app.put("/me/settings", response_model=schemas.UserSettingOut)
async def create_or_update_settings(new_settings: schemas.UserSettingIn, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)) -> schemas.UserSettingOut:
	return crud.update_user_settings(user_id, db, new_settings)

@app.put("/me/settings/user")
async def update_user_infos(payload: schemas.UserUpdateRequest, user_id: int = Depends(_current_user_id)):
	try:
		res = await user_service_client.update_user_in_user_service(user_id, payload)
		return res
	except httpx.RequestError:
		raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="user-service unavailable")
	except httpx.HTTPStatusError as e:
		return Response(
            content=e.response.content,
            status_code=e.response.status_code,
            media_type="application/json"
        )
	except Exception as e:
		raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
	
@app.delete("/me/settings/user")
async def delete_user(
	user_id: int = Depends(_current_user_id),
	authorization: str | None = Header(default=None),
	db: Session = Depends(get_db),
):
	if not authorization:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")
	user_email = None
	username = None
	try:
		user_info = await user_service_client.fetch_user_in_user_service(user_id)
		user_email = user_info.get("email")
		username = user_info.get("username")
	except Exception:
		pass
	email_sent = False
	if user_email:
		try:
			await email_config.send_deletion_request_confirmation(
                email_to=user_email,
                username=username or "Utilisateur",
            )
			email_sent = True
		except Exception as e:
			print(f"[WARN] Failed to send pre-deletion email: {e}")

	try:
		await api_gateway_client.logout_current_token(authorization)
	except httpx.RequestError:
		raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="api-gateway unavailable")
	except httpx.HTTPStatusError as e:
		return Response(
			content=e.response.content,
			status_code=e.response.status_code,
			media_type="application/json"
		)
		
	try:
		user = await user_service_client.delete_user_in_user_service(user_id)
	except httpx.RequestError:
		raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="user-service unavailable")
	except httpx.HTTPStatusError as e:
		return Response(
            content=e.response.content,
            status_code=e.response.status_code,
            media_type="application/json"
        )
	except Exception as e:
		raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
	profile = crud.get_profile_by_user_id(db, user_id)
	if profile:
		old_filename = _filename_from_avatar_url(profile.avatar_url)
	else:
		old_filename = None
	profile_cleanup = {"ok": True}
	try:
		crud.delete_user_settings_by_user_id(db, user_id)
		profile_cleanup["deleted_settings"] = True
	except Exception as e:
		profile_cleanup = {"ok": False, "error": f"profile delete failed: {e}"}
	try:
		crud.delete_profile_by_user_id(db, user_id)
		profile_cleanup["deleted_profile"] = True
	except Exception as e:
		profile_cleanup = {"ok": False, "error": f"profile delete failed: {e}"}
	try:
		_try_delete_avatar_file(old_filename)
		profile_cleanup["deleted_avatar"] = True
	except Exception as e:
		profile_cleanup = {"ok": False, "error": f"profile delete failed: {e}"}
	friends_cleanup = None
	try:
		friends_cleanup = await friends_service_client.delete_friends_in_friends_service(user_id)
	except httpx.RequestError:
		friends_cleanup = {"ok": False, "error": "friends-service unavailable"}
	except httpx.HTTPStatusError as e:
		friends_cleanup = {"ok": False, "status": e.response.status_code}
	try:
		chat_cleanup = await chat_service_client.cleanup_user(user_id=user_id)
	except httpx.RequestError:
		chat_cleanup = {"ok": False, "error": "chat-service unavailable"}
	except httpx.HTTPStatusError as e:
		chat_cleanup = {"ok": False, "status": e.response.status_code}
	try:
		game_cleanup = await game_service_client.cleanup_user(user_id=user_id)
	except httpx.RequestError:
		game_cleanup = {"ok": False, "error": "game-service unavailable"}
	except httpx.HTTPStatusError as e:
		game_cleanup = {"ok": False, "status": e.response.status_code}
	payload = {"ok": True,
			"deleted_at": datetime.now(timezone.utc).isoformat(),
			"profile_service": profile_cleanup,
			"user_service": user,
			"friends_cleanup": friends_cleanup,
			"chat_cleanup": chat_cleanup,
			"game_cleanup": game_cleanup
	}
	email_post_send = False
	if user_email:
		try:
			await email_config.send_deletion_confirmation(
                email_to=user_email,
                username=username or "Utilisateur",
                payload=payload,
            )
			email_post_send = True
		except Exception as e:
			print(f"[WARN] Failed to send post-deletion email: {e}")
			payload["confirmation_email_sent"] = False
			payload["email_error"] = str(e)
	payload["confirmation_email_sent"] = {
			"pre_deletion_email": email_sent,
			"post_deletion_email": email_post_send
	}

	content = json.dumps(payload, indent=2, ensure_ascii=False)
	return Response(content=content, media_type="application/json", headers={"Content-Disposition": "attachment; filename=my_transcendence_deleted-data.json"})



@app.post("/internal/profile/create", response_model=schemas.ProfileOut, status_code=status.HTTP_201_CREATED)
async def internal_create_profile(payload: schemas.InternalProfileCreate, db: Session = Depends(get_db)):
	if payload.user_id <= 0:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user_id")
	if not payload.display_name:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="display_name is required")

	existing = crud.get_profile_by_user_id(db, payload.user_id)
	if existing:
		return existing
	try:
		profile = crud.create_profile(db, payload.user_id, schemas.ProfileCreate(display_name=payload.display_name))
		crud.create_user_settings(db, payload.user_id)
	except IntegrityError:
		# Si une course crée le profil juste avant nous, on relit.
		profile = crud.get_profile_by_user_id(db, payload.user_id)
		if not profile:
			raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Profile creation conflict")
	return profile


@app.post("/me/avatar", response_model=schemas.ProfileOut)
async def post_avatar(avatar: UploadFile = File(...), user_id: int = Depends(_current_user_id),db: Session = Depends(get_db),):
	profile = crud.get_profile_by_user_id(db, user_id)
	if not profile:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
	old_filename = _filename_from_avatar_url(profile.avatar_url)
	filename = await _save_avatar(avatar)
	avatar_url = f"/profile/avatars/{filename}"
	updated = crud.update_profile(db, profile, schemas.ProfileUpdate(avatar_url=avatar_url))
	_try_delete_avatar_file(old_filename)
	return updated


@app.get("/avatars/{filename}")
async def get_avatar(filename: str):
	if "/" in filename or "\\" in filename or ".." in filename:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename")
	path = os.path.join(AVATAR_UPLOAD_DIR, filename)
	if not os.path.isfile(path):
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found")
	return FileResponse(path)

@app.get("/me/export")
async def export_my_data(user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	profile_obj = crud.get_profile_by_user_id(db, user_id)
	settings_obj = crud.get_user_settings(db, user_id)
	profile = schemas.ProfileOut.model_validate(profile_obj).model_dump(mode="json") if profile_obj else None
	settings = schemas.UserSettingOut.model_validate(settings_obj).model_dump(mode="json") if settings_obj else None
	user_email = None
	username = None
	try:
		user = await user_service_client.fetch_user_in_user_service(user_id)
		user_email = user.get("email")
		username = user.get("username")
	except Exception:
		user = {"id": user_id}
	try:
		friends = await friends_service_client.fetch_friends_list_in_friends_service(user_id)
	except Exception:
		friends = []
	try:
		matches = await game_service_client.fetch_my_matches(user_id=user_id)
	except Exception:
		matches = []
	chat = {"rooms": [], "messages_by_room": {}, "my_private_messages": []}
	try:
		rooms = await chat_service_client.fetch_rooms(user_id=user_id)
		chat["rooms"] = rooms
		for room in rooms:
			room_id = int(room.get("id") or 0)
			if room_id > 0:
				chat["messages_by_room"][str(room_id)] = await chat_service_client.fetch_room_messages(user_id=user_id, room_id=room_id)
	except Exception:
		pass
	try:
		chat["my_private_messages"] = await chat_service_client.fetch_my_private_messages(user_id=user_id, limit=10000)
	except Exception:
		pass
	email_send = False
	if user_email:
		try:
			await email_config.send_data_export_confirmation(
                email_to=user_email,
                username=username or "Utilisateur",
            )
			email_send = True
		except Exception as e:
			print(f"[WARN] Failed to send post-deletion email: {e}")
	payload = {
		"user": user,
		"profile": profile,
		"settings": settings,
		"friends": friends,
		"matches": matches,
		"chat": chat,
		"email_sent": email_send,
	}
	content = json.dumps(payload, indent=2, ensure_ascii=False)
	return Response(content=content, media_type="application/json", headers={"Content-Disposition": "attachment; filename=my_transcendence_data.json"})
