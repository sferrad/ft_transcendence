from __future__ import annotations
from sqlalchemy import and_, or_

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

def list_rooms(db: Session, *, user_id: int, skip: int = 0, limit: int = 50) -> list[models.Room]:
    # Public rooms are visible to everyone; private rooms only to members.
    return (
        db.query(models.Room)
        .outerjoin(models.RoomMember, (models.RoomMember.room_id == models.Room.id) & (models.RoomMember.user_id == user_id))
        .filter(
            (models.Room.is_private == False) |  # noqa: E712
            (models.RoomMember.user_id != None)  # noqa: E711
        )
        .order_by(models.Room.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

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
        db.query(models.RoomMember.user_id)
        .filter(models.RoomMember.room_id == room_id)
        .order_by(models.RoomMember.user_id.asc())
    )
    return list(db.scalars(stmt).all())


def _get_or_create_private_room(db: Session, *, sender_user_id: int, receiver_user_id: int) -> models.Room:
    first_user_id, second_user_id = sorted((sender_user_id, receiver_user_id))
    room_name = f"dm-{first_user_id}-{second_user_id}"

    room = (
        db.query(models.Room)
        .filter(models.Room.is_private.is_(True), models.Room.name == room_name)
        .first()
    )
    if room is not None:
        return room
# La room est deja cree par le front avec l'appel a l'endpoint create_room, on suppose que la room existe deja et on la recupere, sinon on la cree
    room = models.Room(name=room_name, is_private=True, owner_user_id=sender_user_id)
    room.members = [
        models.RoomMember(user_id=sender_user_id, role="owner"),
        models.RoomMember(user_id=receiver_user_id, role="member"),
    ]
    db.add(room)
    db.flush()
    return room

def cleanup_user_data(db: Session, *, user_id: int) -> dict:
    if user_id <= 0:
        raise ValueError("Invalid user id")
    try:
        deleted_private_messages = db.query(models.PrivateMessage).filter(
            or_(
                models.PrivateMessage.sender_user_id == user_id,
                models.PrivateMessage.receiver_user_id == user_id,
            )
        ).delete(synchronize_session=False)

        public_rooms = (
            db.query(models.Room)
            .join(models.Room.members)
            .filter(
                models.Room.is_private.is_(False),
                or_(models.Room.owner_user_id == user_id, models.RoomMember.user_id == user_id),
            )
            .all()
        )

        public_room_ids = [room.id for room in public_rooms]
        anonymized_public_messages = 0
        if public_room_ids:
            anonymized_public_messages = (
                db.query(models.Message)
                .filter(
                    models.Message.room_id.in_(public_room_ids),
                    models.Message.sender_user_id == user_id,
                )
                .update({"sender_user_id": 0}, synchronize_session=False)
            )

        removed_public_memberships = 0
        deleted_public_rooms = 0
        orphaned_public_rooms = 0

        for room in public_rooms:
            room_members = list(room.members)
            remaining_members = [member for member in room_members if member.user_id != user_id]

            membership = next((member for member in room_members if member.user_id == user_id), None)
            if membership is not None:
                db.delete(membership)
                removed_public_memberships += 1

            if not remaining_members:
                db.delete(room)
                deleted_public_rooms += 1
                continue

            if room.owner_user_id == user_id:
                room.owner_user_id = 0
                orphaned_public_rooms += 1

        deleted_private_rooms = 0
        for room in (
            db.query(models.Room)
            .join(models.Room.members)
            .filter(models.Room.is_private.is_(True), models.RoomMember.user_id == user_id)
            .all()
        ):
            db.delete(room)
            deleted_private_rooms += 1

        db.commit()
        return {
            "ok": True,
            "deleted_private_messages": deleted_private_messages,
            "removed_public_memberships": removed_public_memberships,
            "deleted_public_rooms": deleted_public_rooms,
            "orphaned_public_rooms": orphaned_public_rooms,
            "anonymized_public_messages": anonymized_public_messages,
            "deleted_private_rooms": deleted_private_rooms,
        }
    except SQLAlchemyError:
        db.rollback()
        raise
    

def create_private_message(db: Session, *, sender_user_id: int, receiver_user_id: int, content: str) -> models.PrivateMessage:
    room = _get_or_create_private_room(db, sender_user_id=sender_user_id, receiver_user_id=receiver_user_id)
    message = models.PrivateMessage(
        room_id=room.id,
        sender_user_id=sender_user_id,
        receiver_user_id=receiver_user_id,
        content=content,
    )
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