from fastapi import Depends, FastAPI, Header, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from . import models  # ensure SQLAlchemy models are imported before create_all()
from . import crud, schemas
from .database import get_db, init_db, init_engine

app = FastAPI(title="profile-service")


@app.on_event("startup")
def on_startup() -> None:
	"""Initialize DB engine (Vault creds) and create this service's tables."""
	try:
		init_engine()
		init_db()
	except Exception:
		# Don't block startup if DB/Vault isn't reachable yet.
		return


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