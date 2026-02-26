from sqlalchemy import Column, Integer, Text, String, DateTime, func
from sqlalchemy.orm import declarative_base

base = declarative_base()
# profil public / ce qui est visible des autres users
class profile(base):


    __tablename__ = "profiles"
# id -> propre a profil user_id -> identique a la base user (value dans le JWT)
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)

    display_name = Column(String(100), nullable=False)
    avatar_url = Column(String(512), nullable=True)
    bio = Column(Text, nullable=True)
    country = Column(String(50), nullable=True)
    language = Column(String(10), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

# preferences user key=value (theme = dark, notif = false, ....)
class UserSetting(base):
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)

    key = Column(String(100), index=True, nullable=False)
    value = Column(String(255), nullable=False)
    
