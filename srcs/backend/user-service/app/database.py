import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

db_host = os.getenv("DB_HOST", "user-db")
db_port = os.getenv("DB_PORT", "5432")
db_name = os.getenv("DB_NAME", "user_db")
db_user = os.getenv("POSTGRES_USER", "postgres_user")
db_password = os.getenv("POSTGRES_PASSWORD", "postgres_password")

DATABASE_URL = f"postgresql+psycopg://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

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


####################
# engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# Base = declarative_base()

# Ajout
def init_db() -> None:
    Base.metadata.create_all(bind=engine)
##################################
#  
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
