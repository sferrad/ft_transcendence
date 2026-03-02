from sqlalchemy import Column, Integer, String, DateTime, func, UniqueConstraint, Index
from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Demande d'amis
class FriendsRequest(Base):
    __tablename__ = "friends requests"
    __table_args__ = UniqueConstraint("from_user_id", "to_user_id", name = "uq_friend_requests_from_to")

# Ids
    id = Column(Integer, primary_key=True, index=True)
    from_user_id = Column(Integer, index=True, nullable=False)
    to_user_id = Column(Integer, index=True, nullable=False)
# Status
    status = Column(String(20), nullable=False, server_default="pending")
# Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())



# liste effective
class Friends(Base):
    __tablename__ = "friends"
    __table_args__ = UniqueConstraint("user_id", "friend_id", name = "uq_friend_user_friend")
# Ids
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    friend_id = Column(Integer, index=True, nullable=False)
# Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())



# liste user bloques
class Block(Base):
    __tablename__ = "blocks"
    __table_args__ = UniqueConstraint("user_id", "blocked_user_id", name = "uq_blocks_user_blocked")
# Ids
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    blocked_user_id = Column(Integer, index=True, nullable=False)
# Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())

Index("idx_friends_pair", Friends.user_id, Friends.friend_id)