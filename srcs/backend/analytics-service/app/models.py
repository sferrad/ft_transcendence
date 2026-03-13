from sqlalchemy import Column, Integer, String, DateTime, Float, func, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base
from .database import Base

class UserStats(Base):
    __tablename__ = "user_stats"
    __table_args__ = (UniqueConstraint("user_id", name="uq_user_stats_user_id"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)

    total_matches = Column(Integer, nullable=False, default=0)
    wins = Column(Integer, nullable=False, default=0)
    losses = Column(Integer, nullable=False, default=0)
    draws = Column(Integer, nullable=False, default=0)

    win_rate = Column(Float, nullable=False, default=0.0)

    last_match_at = Column(DateTime(timezone=True), nullable=True)


class GlobalMetric(Base):
    __tablename__ = "global_metrics"
    __table_args__ = (UniqueConstraint("metric_name", "metric_date", name="uq_global_metrics_name_date"),)

    id = Column(Integer, primary_key=True, index=True)
    metric_name = Column(String(100), index=True, nullable=False)
    metric_date = Column(DateTime(timezone=True), index=True, nullable=False)

    value = Column(Float, nullable=False, default=0.0)


class EventLog(Base):
    __tablename__ = "events_log"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(100), index=True, nullable=False)
    user_id = Column(Integer, index=True, nullable=True)

    payload = Column(JSONB, nullable=True)

    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

Index("idx_events_log_event_type_timestamp", EventLog.event_type, EventLog.timestamp)