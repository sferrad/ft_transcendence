from __future__ import annotations

from sqlalchemy import and_, or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from . import models


def is_blocked(db: Session, user_a: int, user_b: int) -> bool:
	return (
		db.query(models.Block)
		.filter(
			or_(
				and_(models.Block.user_id == user_a, models.Block.blocked_user_id == user_b),
				and_(models.Block.user_id == user_b, models.Block.blocked_user_id == user_a),
			)
		)
		.first()
		is not None
	)


def are_friends(db: Session, user_id: int, friend_id: int) -> bool:
	return (
		db.query(models.Friends)
		.filter(models.Friends.user_id == user_id, models.Friends.friend_id == friend_id)
		.first()
		is not None
	)


def create_friend_request(db: Session, from_user_id: int, to_user_id: int) -> models.FriendsRequest:
	request = models.FriendsRequest(from_user_id=from_user_id, to_user_id=to_user_id)
	try:
		db.add(request)
		db.commit()
		db.refresh(request)
		return request
	except SQLAlchemyError:
		db.rollback()
		raise


def get_friend_request(db: Session, request_id: int) -> models.FriendsRequest | None:
	return db.query(models.FriendsRequest).filter(models.FriendsRequest.id == request_id).first()


def get_pending_request_between(db: Session, user_a: int, user_b: int) -> models.FriendsRequest | None:
	return (
		db.query(models.FriendsRequest)
		.filter(
			models.FriendsRequest.status == "pending",
			or_(
				and_(models.FriendsRequest.from_user_id == user_a, models.FriendsRequest.to_user_id == user_b),
				and_(models.FriendsRequest.from_user_id == user_b, models.FriendsRequest.to_user_id == user_a),
			),
		)
		.first()
	)


def list_incoming_requests(db: Session, user_id: int) -> list[models.FriendsRequest]:
	return (
		db.query(models.FriendsRequest)
		.filter(models.FriendsRequest.to_user_id == user_id, models.FriendsRequest.status == "pending")
		.order_by(models.FriendsRequest.created_at.desc())
		.all()
	)


def list_friends(db: Session, user_id: int) -> list[models.Friends]:
	return (
		db.query(models.Friends)
		.filter(models.Friends.user_id == user_id)
		.order_by(models.Friends.created_at.desc())
		.all()
	)


def accept_request(db: Session, request: models.FriendsRequest) -> None:
	request.status = "accepted"
	try:
		db.add(models.Friends(user_id=request.from_user_id, friend_id=request.to_user_id))
		db.add(models.Friends(user_id=request.to_user_id, friend_id=request.from_user_id))
		db.add(request)
		db.commit()
	except SQLAlchemyError:
		db.rollback()
		raise


def reject_request(db: Session, request: models.FriendsRequest) -> None:
	request.status = "rejected"
	try:
		db.add(request)
		db.commit()
	except SQLAlchemyError:
		db.rollback()
		raise


def block_user(db: Session, user_id: int, blocked_user_id: int) -> models.Block:
	block = models.Block(user_id=user_id, blocked_user_id=blocked_user_id)
	db.query(models.Friends).filter(
		or_(
			and_(models.Friends.user_id == user_id, models.Friends.friend_id == blocked_user_id),
			and_(models.Friends.user_id == blocked_user_id, models.Friends.friend_id == user_id),
		)
	).delete(synchronize_session=False)
	db.query(models.FriendsRequest).filter(
		or_(
			and_(models.FriendsRequest.from_user_id == user_id, models.FriendsRequest.to_user_id == blocked_user_id),
			and_(models.FriendsRequest.from_user_id == blocked_user_id, models.FriendsRequest.to_user_id == user_id),
		)
	).delete(synchronize_session=False)

	try:
		db.add(block)
		db.commit()
		db.refresh(block)
		return block
	except SQLAlchemyError:
		db.rollback()
		raise


def unblock_user(db: Session, user_id: int, blocked_user_id: int) -> bool:
	deleted = (
		db.query(models.Block)
		.filter(models.Block.user_id == user_id, models.Block.blocked_user_id == blocked_user_id)
		.delete(synchronize_session=False)
	)
	try:
		db.commit()
	except SQLAlchemyError:
		db.rollback()
		raise
	return deleted > 0


def cleanup_user_data(db: Session, user_id: int) -> dict:
	try:
		deleted_friends = (db.query(models.Friends).filter(or_(models.Friends.user_id ==user_id, models.Friends.friend_id == user_id))).delete(synchronize_session=False)
		deleted_requests = (db.query(models.FriendsRequest).filter(or_(models.FriendsRequest.from_user_id == user_id, models.FriendsRequest.to_user_id == user_id))).delete(synchronize_session=False)
		deleted_blocks = (db.query(models.Block).filter(or_(models.Block.user_id == user_id, models.Block.blocked_user_id == user_id))).delete(synchronize_session=False)
		db.commit()
	except SQLAlchemyError:
		db.rollback()
		raise
	return {
		"ok": True,
		"user_id": user_id,
		"deleted_friends": deleted_friends,
		"deleted_requests": deleted_requests,
		"deleted_blocks": deleted_blocks
	 }


def unfriend_user(db: Session, user_id: int, friend_user_id: int) -> bool:
	deleted = (
		db.query(models.Friends)
		.filter(or_(and_(models.Friends.user_id == user_id, models.Friends.friend_id == friend_user_id), and_(models.Friends.user_id == friend_user_id, models.Friends.friend_id == user_id)))
		.delete(synchronize_session=False)
	)
	try:
		db.commit()
	except SQLAlchemyError:
		db.rollback()
		raise
	return deleted > 0