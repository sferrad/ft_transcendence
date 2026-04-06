# """schemas.py

# Ce fichier définit les *contrats API* (Pydantic) exposés par le game-service.

# Pourquoi c'est important :
# - Ces schémas sont la "source de vérité" de ce que l'API accepte/retourne.
# - Ils servent aussi à générer la doc OpenAPI/Swagger.

# Conventions utilisées ici :
# - `MatchCreateMe` = payload attendu quand on crée un match en tant qu'utilisateur authentifié.
# - `MatchUpdate` = payload partiel (champs optionnels) pour patcher un match.
# - `*InDB` = ce qu'on renvoie côté API quand l'objet vient de la DB (contient `id`, `created_at`, etc.).
# - `MatchEventType` = Enum fermé pour éviter les typos et standardiser les events.
# """

# Enum : permet de créer une liste "fermée" de valeurs acceptées.
from enum import Enum

# BaseModel : classe de base Pydantic qui valide/parse les données.
from pydantic import BaseModel, ConfigDict

# Typing : Optional, List, Dict... pour documenter/valider les shapes.
from typing import Optional, List, Any, Dict

# datetime : timestamps (started_at, finished_at, created_at, timestamp event).
from datetime import datetime

class MatchBase(BaseModel):
	# Identifiants des joueurs.
	# On attend des ints (ids) car les users sont gérés dans un autre service.
	player1_id: int
	player2_id: int

	# Scores "cumulés" (pratique pour affichage rapide sans rejouer la timeline).
	score_player1: int = 0
	score_player2: int = 0

	# Statut du match côté API.
	# Valeur par défaut : "pending" si le client n'envoie rien.
	status: str = "pending"

	# Timestamps optionnels : un match peut ne pas être encore démarré/terminé.
	started_at: Optional[datetime] = None
	finished_at: Optional[datetime] = None

	# """Payload minimal pour créer un match *en tant qu'utilisateur authentifié*.

	# Pourquoi ce schéma existe :
	# - Quand on passe par l'api-gateway, on connaît déjà l'id du user (via JWT).
	# - Le gateway le transmet au microservice via `X-User-Id`.
	# - Donc le client n'a PAS à (et ne doit pas) envoyer `player1_id`.

	# Dans ce modèle, le client ne fournit que l'adversaire (`player2_id`).
	# """
class MatchCreateMe(BaseModel):
	player2_id: int

class MatchUpdate(BaseModel):
	# Update partiel : tout est Optional.
	# `exclude_unset=True` côté CRUD permet de ne modifier que ce qui est présent.
	score_player1: Optional[int] = None
	score_player2: Optional[int] = None
	status: Optional[str] = None
	winner_id: Optional[int] = None
	started_at: Optional[datetime] = None
	finished_at: Optional[datetime] = None

class MatchInDB(MatchBase):
	# Champs ajoutés quand l'objet est stocké en DB.
	id: int
	winner_id: Optional[int]
	created_at: datetime

	# Pydantic v2 : autorise la conversion depuis des objets ORM (lecture via attributs).
	# Équivalent de `orm_mode=True` (Pydantic v1).
	model_config = ConfigDict(from_attributes=True)

class MatchEventBase(BaseModel):
	# `event_type` est volontairement une liste fermée (Enum) pour éviter les typos
	# et avoir des events cohérents côté analytics.
	# Exemple : "goal_scored" au lieu de "goal_score" ou "goalscored".
	event_type: "MatchEventType"

	# JSON libre mais structuré: idéalement { v, t_ms, actor_user_id, ... }
	# - `v` : version de schéma de payload (ex: 1)
	# - `t_ms` : timestamp client (ms) si tu veux corréler avec le gameplay
	# - `actor_user_id` : qui a causé l'évènement (si applicable)
	# Ensuite, des champs spécifiques selon `event_type`.
	payload: Optional[Dict[str, Any]] = None

	# Timestamp côté serveur (DB). Souvent rempli en réponse (pas forcément envoyé en create).
	timestamp: Optional[datetime] = None

	# `sequence` : ordre stable dans un match.
	# En create, on peut l'omettre : le serveur l'alloue.
	sequence: Optional[int] = None


	# Enum d'events MVP "Head Ball".
	# Important : c'est volontairement minimal et stable.
	# Tu peux en ajouter ensuite sans casser les anciens clients.
class MatchEventType(str, Enum):
	match_started = "match_started"
	goal_scored = "goal_scored"
	powerup_spawned = "powerup_spawned"
	powerup_collected = "powerup_collected"
	powerup_expired = "powerup_expired"
	match_paused = "match_paused"
	match_resumed = "match_resumed"
	player_disconnected = "player_disconnected"
	match_finished = "match_finished"
	match_cancelled = "match_cancelled"

	# Payload attendu à la création d'un event.
	# Le serveur fixera `timestamp` (DB) et `sequence` si non fournis.
class MatchEventCreate(MatchEventBase):
	pass

	# Champs présents quand l'event vient de la DB.
class MatchEventInDB(MatchEventBase):
	id: int
	match_id: int
	timestamp: datetime
	sequence: int

	# Pydantic v2 : conversion ORM -> schema.
	model_config = ConfigDict(from_attributes=True)

	# Schéma pratique pour renvoyer un match + sa timeline.
	# Par défaut liste vide (pas None) pour simplifier côté front.
class MatchWithEvents(MatchInDB):
	events: List[MatchEventInDB] = []
