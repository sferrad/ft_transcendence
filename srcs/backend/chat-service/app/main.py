import os

from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from . import models
from . import database
from .database import Base, get_db, init_db, init_engine

app = FastAPI()


@app.on_event("startup")
def ensure_user_schema() -> None:
	"""Best-effort dev migration for `username`.

	`create_all()` doesn't alter existing tables.
	"""
	try:
		init_engine()  # lit Vault -> crée engine + SessionLocal
		init_db() # a mettre on event("startup")???
		with database.engine.begin() as conn:
			conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50)"))
			conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username)"))
	except Exception:
		# Don't block startup if DB isn't reachable yet.
		return