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

def get_db():
    db= SessionLocal()
    try:
        yield db
    finally:
        db.close()
