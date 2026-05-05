from __future__ import annotations
from operator import and_, or_

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from . import models



def create_room(db: Session, *, name: str, is_private: bool, owner_user_id: int) -> models.Room:
    try:
        with db.begin():
            room = models.Room(name=name, is_private=is_private, owner_user_id=owner_user_id)
            member = models.RoomMember(user_id=owner_user_id, role="owner")
            member.room = room
            db.add(room)
            db.add(member)
        return room
    except SQLAlchemyError:
        db.rollback()
        raise

def list_rooms(db: Session, *, skip: int = 0, limit: int = 50) -> list[models.Room]:
    return db.query(models.Room).order_by(models.Room.created_at.desc()).offset(skip).limit(limit).all()

def get_room(db: Session, *, room_id: int) -> models.Room | None:
    return db.query(models.Room).filter(models.Room.id == room_id).first()

def is_member(db: Session, *, room_id: int, user_id: int) -> bool:
    return db.query(models.RoomMember).filter(models.RoomMember.room_id == room_id, models.RoomMember.user_id == user_id).first() is not None


def get_membership(db: Session, *, room_id: int, user_id: int) -> models.RoomMember | None:
    return (
        db.query(models.RoomMember)
        .filter(models.RoomMember.room_id == room_id, models.RoomMember.user_id == user_id)
        .first()
    )

def join_room(db: Session, *, room_id: int, user_id: int) -> None:
    if is_member(db, room_id=room_id, user_id=user_id):
        return
    room = get_room(db, room_id=room_id)
    member = models.RoomMember(user_id=user_id, role="member")
    member.room = room
    try:
        db.add(member)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise


def leave_room(db: Session, *, room_id: int, user_id: int) -> None:
    membership = get_membership(db, room_id=room_id, user_id=user_id)
    if not membership:
        return
    if membership.role == "owner":
        raise ValueError("owner_cannot_leave")
    try:
        db.delete(membership)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise


def delete_room(db: Session, *, room_id: int, owner_user_id: int) -> None:
    room = get_room(db, room_id=room_id)
    if not room:
        raise ValueError("room_not_found")
    if room.owner_user_id != owner_user_id:
        raise ValueError("not_owner")
    try:
        db.delete(room)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise
    
def list_messages(db: Session, *, room_id: int, limit: int = 50) -> list[models.Message]:
    messages_list = db.query(models.Message).filter(models.Message.room_id == room_id).order_by(models.Message.created_at.desc(), models.Message.id.desc()).limit(limit).all()
    return list(reversed(messages_list))

def create_message(db: Session, *, room_id: int, sender_user_id: int, content: str) -> models.Message:
    room = get_room(db, room_id=room_id)
    message = models.Message(sender_user_id=sender_user_id, content=content)
    message.room = room
    try:
        db.add(message)
        db.commit()
        db.refresh(message)
        return message
    except SQLAlchemyError:
        db.rollback()
        raise

def list_room_member_ids(db: Session, *, room_id: int) -> list[int]:
    stmt = (
        select(models.RoomMember.user_id)
        .where(models.RoomMember.room_id == room_id)
        .order_by(models.RoomMember.user_id.asc())
    )
    return list(db.scalars(stmt).all())

def cleanup_user_data(db: Session, *, user_id: int) -> dict:
    if user_id <= 0:
        raise ValueError("Invalid user id")
    try:
        deleted_membership = db.query(models.RoomMember).filter(models.RoomMember.user_id == user_id).delete(synchronize_session=False)
        randomized_messages = db.query(models.Message).filter(models.Message.sender_user_id == user_id).update({"sender_user_id": 0, "content": "[deleted]"}, synchronize_session=False)
        randomized_private_messages = db.query(models.PrivateMessage).filter(models.PrivateMessage.sender_user_id == user_id).update({"sender_user_id": 0, "content": "[deleted]"}, synchronize_session=False)
        owned_rooms = db.query(models.Room).filter(models.Room.owner_user_id == user_id).all()
        deleted_private_room = 0
        orphaned_public_rooms = 0
        for room in owned_rooms:
            if bool(room.is_private):
                db.delete(room)
                deleted_private_room += 1
            else:
                room.owner_user_id = 0
                orphaned_public_rooms += 1
        db.commit()
        return {"ok": True, "deleted_membership": deleted_membership, "randomized_messages": randomized_messages, "randomized_private_messages": randomized_private_messages, "deleted_private_room": deleted_private_room, "orphaned_public_rooms": orphaned_public_rooms}
    except SQLAlchemyError:
        db.rollback()
        raise
    

def create_private_message(db: Session, *, sender_user_id: int, receiver_user_id: int, content: str) -> models.PrivateMessage:
    message = models.PrivateMessage(sender_user_id=sender_user_id, receiver_user_id=receiver_user_id, content=content)
    try:
        db.add(message)
        db.commit()
        db.refresh(message)
        return message
    except SQLAlchemyError:
        db.rollback()
        raise 

def list_private_messages(db: Session, *, sender_user_id: int, receiver_user_id: int, limit: int = 50) -> list[models.PrivateMessage]:
    messages_list = db.query(models.PrivateMessage).filter(
        or_(
            and_(
                models.PrivateMessage.sender_user_id == sender_user_id,
                models.PrivateMessage.receiver_user_id == receiver_user_id
            ),
            and_(
                models.PrivateMessage.sender_user_id == receiver_user_id,
                models.PrivateMessage.receiver_user_id == sender_user_id
            )
        )
    ).order_by(models.PrivateMessage.created_at.desc()).limit(limit).all()
    return list(reversed(messages_list))

def list_my_private_messages(db: Session, *, user_id: int, limit: int = 10000) -> list[models.PrivateMessage]:
    my_private_messages = db.query(models.PrivateMessage).filter(
        or_(
            models.PrivateMessage.receiver_user_id == user_id,
            models.PrivateMessage.sender_user_id == user_id
        )
    ).order_by(models.PrivateMessage.created_at.desc()).limit(limit).all()
    return list(reversed(my_private_messages))