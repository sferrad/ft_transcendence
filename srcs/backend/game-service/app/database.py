import os

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.orm.session import Session

from .vault_client import get_vault_client

DB_HOST = os.getenv("DB_HOST", "user-db")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "user_db")

VAULT_DB_CREDS_PATH = os.getenv("VAULT_DB_CREDS_PATH")

engine: Optional[Engine] = None

SessionLocal: Optional[sessionmaker] = None

Base = declarative_base()


def get_db_creds_from_vault() -> tuple[str, str]:
    if not VAULT_DB_CREDS_PATH:
        raise RuntimeError("VAULT_DB_CREDS_PATH is not set")
    client = get_vault_client()
    secret = client.read(VAULT_DB_CREDS_PATH)
    if not secret or "data" not in secret:
        raise RuntimeError(f"Cannot read secret from; {VAULT_DB_CREDS_PATH}")
    data = secret["data"]
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        raise RuntimeError("Vault DB creds missing username/pass")
    return username, password

def build_db_url() -> str:
    username, password = get_db_creds_from_vault()
    return f"postgresql+psycopg://{username}:{password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def init_engine():
    global engine, SessionLocal
    DATABASE_URL = build_db_url()
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
# cette fonction est un generator qui yield des Session
# Generator[YieldType, SendType, ReturnType]
def get_db() ->Generator[Session, None, None]:
    if SessionLocal is None:
        raise RuntimeError("DB session factory not initialized (startup not completed)")

    db = SessionLocal()  # ouvre une session    
    try:
        yield db
    finally:
        db.close()
