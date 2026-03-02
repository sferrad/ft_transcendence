from sqlalchemy import Column, Integer, String, DateTime, func, ForeignKey, Index
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import JSONB

Base = declarative_base()

class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    
    player1_id = Column(Integer, index=True, nullable=False)
    player2_id = Column(Integer, index=True, nullable=False)
    
    winner_id = Column(Integer, index=True, nullable=False)
    
    score_player1 = Column(Integer, nullable=False, default=0)
    score_player2 = Column(Integer, nullable=False, default=0)

    status = Column(String(20), nullable=False, server_default="pending")

    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    events = relationship("MatchEvent", back_populates="match", cascade="all, delet-orphan", passive_deletes=True)


class MatchEvent(Base):
    __tablename__ = "match event"

    id = Column(Integer, primary_key=True, index=True)

    match_id = Column(Integer, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False, index=True)

    event_type = Column(String(50), nullable=False)

    payload = Column(JSONB, nullable=True)

    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    match = relationship("Match", back_populates="events")
    
Index("idx_match_events_match_id_timestamp", MatchEvent.match_id, MatchEvent.timestamp)