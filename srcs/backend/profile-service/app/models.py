from sqlalchemy import Column, Integer, Text, String, DateTime, func, UniqueConstraint, Index
from sqlalchemy.orm import declarative_base
from .database import Base

# profil public / ce qui est visible des autres users
class Profile(Base):


    __tablename__ = "profiles"
    __table_args__ = (UniqueConstraint("user_id", name="uq_profiles_user_id"),)
# id -> propre a profil user_id -> identique a la Base user (value dans le JWT)
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
class UserSetting(Base):
    __tablename__ = "user_settings"
    __table_args__ = (UniqueConstraint("user_id", "key", name="uq_user_settings_user_id_key"),)
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)

    key = Column(String(100), index=True, nullable=False)
    value = Column(String(255), nullable=False)
    
Index("idx_user_settings_user_id_key", UserSetting.user_id, UserSetting.key)