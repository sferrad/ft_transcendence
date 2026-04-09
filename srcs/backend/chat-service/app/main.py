from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from prometheus_fastapi_instrumentator import Instrumentator

from . import models
from .database import get_db, init_db, init_engine

app = FastAPI(title="chat-service")

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
	return {"status": "ok", "service": "chat-service"}


@app.get("/db/ping")
async def db_ping(db: Session = Depends(get_db)):
	try:
		db.execute(text("SELECT 1"))
		return {"status": "ok"}
	except Exception as e:
		raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))