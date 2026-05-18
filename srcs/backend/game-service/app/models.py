# """models.py

# Ce fichier définit le *schéma SQLAlchemy* (donc les tables Postgres) pour le game-service.

# Objectif :
# - stocker les matchs (`matches`),
# - stocker une timeline d'évènements (`match_event`) sous forme d'évènements typés + payload JSON,
# - garantir un ordre *déterministe* des évènements grâce à `sequence` (plus fiable qu'un timestamp seul).

# Note :
# - SQLAlchemy décrit la structure, mais ne crée pas/altère la DB tout seul.
#     Si tu ajoutes une colonne (ex: `sequence`), il faut une migration (Alembic) ou un reset DB en dev.
# """

# Imports SQLAlchemy :
# - Column/... : description des colonnes et types
# - func : fonctions SQL côté DB (ex: now())
# - ForeignKey : relation entre tables
# - Index/UniqueConstraint : index/contraintes pour performances et intégrité
from sqlalchemy import Column, Integer, String, DateTime, func, ForeignKey, Index, UniqueConstraint

# relationship : relier des modèles (Match -> MatchEvent) via ORM.
from sqlalchemy.orm import relationship

# JSONB : type Postgres optimisé pour JSON (indexable, stockage binaire).
from sqlalchemy.dialects.postgresql import JSONB

# Base : classe déclarative commune SQLAlchemy (contient la metadata des tables).
from .database import Base

class Match(Base):
    # Nom de table SQL.
    __tablename__ = "matches"

    # Clé primaire du match.
    id = Column(Integer, primary_key=True, index=True)
    
    # Identifiants des deux joueurs.
    # Ici, on stocke des ids (int) plutôt qu'une FK vers un user-service,
    # car les users sont dans un autre service (microservices => pas de FK cross-DB).
    player1_id = Column(Integer, index=True, nullable=False)
    player2_id = Column(Integer, index=True, nullable=False)
    
    # Gagnant éventuel : NULL tant que le match n'est pas terminé.
    winner_id = Column(Integer, index=True, nullable=True)
    
    # Scores persistés (facile à query sans re-jouer les events).
    score_player1 = Column(Integer, nullable=False, default=0)
    score_player2 = Column(Integer, nullable=False, default=0)

    # Statut du match (ex: pending, running, finished...).
    # server_default : valeur par défaut *côté DB* (si l'app n'envoie rien).
    # Très important :
    # - `default=...` (param SQLAlchemy) s'applique côté Python/ORM.
    # - `server_default=...` s'applique côté base de données.
    # Ici, `server_default="pending"` veut dire : si une requête INSERT ne fournit pas `status`,
    # Postgres mettra "pending".
    status = Column(String(20), nullable=False, server_default="pending")

    # Mode de jeu : 'solo' (vs IA), 'local' (2 joueurs même machine), 'online' (ranked).
    # Seuls les matchs 'online' comptent pour le leaderboard et les LP.
    game_mode = Column(String(20), nullable=False, server_default="solo")

    # Timestamps de début/fin (optionnels : match pas encore démarré/terminé).
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    finished_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamp de création (auto côté DB).
    # `func.now()` = fonction SQL NOW() exécutée par la DB.
    # => avantage : tu n'utilises pas l'heure de la machine Python (qui peut être décalée),
    # et c'est la DB qui garantit la cohérence.
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relation ORM Match -> MatchEvent.
    # - back_populates : lien bidirectionnel avec MatchEvent.match
    # - cascade delete-orphan : supprime les events si on supprime le match
    # - passive_deletes + FK ondelete=CASCADE : la DB gère le delete (plus robuste)
    events = relationship("MatchEvent", back_populates="match", cascade="all, delete-orphan", passive_deletes=True)


class MatchEvent(Base):
    # Table SQL pour les évènements d'un match.
    __tablename__ = "match_event"

    # Options au niveau table.
    __table_args__ = (
        # Garantit un ordre stable par match (utile pour replays/analytics).
        UniqueConstraint("match_id", "sequence", name="uq_match_event_match_id_sequence"),
    )

    # PK de l'évènement.
    id = Column(Integer, primary_key=True, index=True)

    # FK vers le match.
    # ondelete=CASCADE : si un match est supprimé, ses events disparaissent automatiquement.
    match_id = Column(Integer, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False, index=True)

    # Numéro d'ordre des events DANS un match (1, 2, 3...).
    # On l'utilise pour trier de manière déterministe (le timestamp peut être identique).
    # Important :
    # - `timestamp` dépend de l'horloge / de la précision DB
    # - plusieurs events peuvent tomber la même milliseconde
    # => `sequence` force un ordre stable : replay identique côté client.
    sequence = Column(Integer, nullable=False)

    # Type d'évènement (string), mais on le contraint côté API via un Enum (voir schemas.py).
    event_type = Column(String(50), nullable=False)

    # Payload JSON libre (JSONB) : détails spécifiques à l'event.
    # Exemple: pour goal_scored -> {"scorer_user_id": 42, "team": 1, "score": {"p1": 1, "p2": 0}}
    payload = Column(JSONB, nullable=True)

    # Timestamp de l'event (auto côté DB) : utile pour analytics, mais pas suffisant pour l'ordre.
    # Même logique que `created_at` : NOW() côté DB.
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relation inverse : MatchEvent -> Match.
    match = relationship("Match", back_populates="events")
    
# Index "historique" : retrouver rapidement les events d'un match par timestamp.
Index("idx_match_events_match_id_timestamp", MatchEvent.match_id, MatchEvent.timestamp)

# Index principal "ordre stable" : très utile pour GET timeline (ORDER BY sequence).
Index("idx_match_events_match_id_sequence", MatchEvent.match_id, MatchEvent.sequence)