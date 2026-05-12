from sqlalchemy import Column, Integer, String, Boolean, DateTime, func, Text, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship

from .database import Base


# Salon chat
class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(15), unique=True, index=True, nullable=False)

    is_private = Column(Boolean, nullable=False, server_default="false")
    owner_user_id = Column(Integer, index=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    members = relationship("RoomMember", back_populates="room", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="room", cascade="all, delete-orphan")
    private_messages = relationship("PrivateMessage", back_populates="room", cascade="all, delete-orphan")


# users present sur le salon
class RoomMember(Base):
    __tablename__ = "room_members"
    __table_args__ = (UniqueConstraint("room_id", "user_id", name="uq_room_members_room_id_user_id"),)

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, index=True, nullable=False)

    role = Column(String(20), nullable=False, server_default="member")

    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    room = relationship("Room", back_populates="members")


# messages envoyes sur le salon
class Message(Base):
    __tablename__ = "message"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    sender_user_id = Column(Integer, index=True, nullable=False)

    content = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True)
    room = relationship("Room", back_populates="messages")

class PrivateMessage(Base):
    __tablename__ = "private_messages"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    sender_user_id = Column(Integer, index=True, nullable=False)
    receiver_user_id = Column(Integer, index=True, nullable=False)

    content = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True)

    room = relationship("Room", back_populates="private_messages")

Index("idx_messages_room_id_created_at", Message.room_id, Message.created_at.desc(), Message.id.desc())
Index("idx_private_messages_sender_receiver_created_at", PrivateMessage.receiver_user_id, PrivateMessage.sender_user_id, PrivateMessage.created_at.desc(), PrivateMessage.id.desc())
