# """crud.py

# Ce fichier contient toutes les fonctions "CRUD" (Create / Read / Update / Delete)
# qui parlent à la base de données via SQLAlchemy.

# Ici, on a deux ressources :
# - Match : l'état global (joueurs, scores, statut, timestamps)
# - MatchEvent : la timeline (évènements) d'un match

# Point clé : `sequence`
# - On alloue un `sequence` croissant par match pour avoir un ordre stable.
# - On trie ensuite les events par `(sequence, timestamp)`.

# Mini-cours SQLAlchemy (très concret) :
# - `db.query(Model)` : prépare une requête SELECT sur la table de `Model`.
# - `.filter(condition)` : ajoute un `WHERE condition`.
# - `.offset(n)` : saute n lignes (SQL: OFFSET n), ou commence la page d'affichage.
# |---> offset = 10 limit 20 la page sera de 10 a 30 les 10 premieres lignes seront skip
# - `.limit(n)` : limite à n lignes (SQL: LIMIT n) nombre de ligne a afficher.
# - `.order_by(col.asc())` : ajoute un ORDER BY.

# Mini-cours "résultats" :
# - `.first()` : exécute la requête et renvoie la 1ère ligne (ou `None`).
# - `.all()` : exécute et renvoie une liste (peut être vide).
# - `.scalar()` : exécute et renvoie UNE valeur (1ère colonne de la 1ère ligne), pratique pour SELECT max(...).

# Mini-cours `func.*` :
# - `func` représente des fonctions SQL côté base de données.
# 	Exemple : `func.max(col)` => SQL `MAX(col)`.

# Mini-cours transaction :
# - `db.add(obj)` : met l'objet dans la session (pas encore écrit dans la DB).
# - `db.commit()` : écrit vraiment (INSERT/UPDATE/DELETE) et termine la transaction.
# - `db.rollback()` : annule la transaction en cours (obligatoire après une erreur DB).
# - `db.refresh(obj)` : relit l'objet depuis la DB (récupère id auto, defaults DB, timestamps).
# """

# Session SQLAlchemy : représente une transaction/unité de travail.
import math
from sqlalchemy.orm import Session

# func : fonctions SQL (ex: max, now...).
from sqlalchemy import func, distinct

# or_ : construit un OR SQL (condition1 OR condition2).
from sqlalchemy import or_

# IntegrityError : erreur levée quand une contrainte DB est violée
# (ex: unique constraint sur (match_id, sequence)).
from sqlalchemy.exc import IntegrityError

# Import des modèles DB (SQLAlchemy) et des schémas API (Pydantic).
from . import models, schemas

# Typing pour clarifier les retours.
from typing import List, Optional


class MatchEventSequenceAllocationError(RuntimeError):
	pass


# =========================
# MATCH CRUD
# =========================

	# """Crée un match en fixant explicitement les deux players côté serveur.

	# Pourquoi utile :
	# - Quand l'utilisateur est authentifié via api-gateway, `player1_id` doit venir du header `X-User-Id`.
	# - Ça empêche un client malveillant de créer un match "au nom" d'un autre user.
	# """
def create_match_for_players(db: Session, *, player1_id: int, player2_id: int, game_mode: str = "solo") -> models.Match:
	db_match = models.Match(player1_id=player1_id, player2_id=player2_id, game_mode=game_mode)
	db.add(db_match)
	db.commit()
	db.refresh(db_match)
	return db_match


	# """Récupère un match par id (ou None si absent)."""
	# Traduction SQL (approximative) :
	# SELECT * FROM matches WHERE id = :match_id LIMIT 1;
	#
	# `.first()` : renvoie un objet ORM `Match` ou `None`.
def get_match(db: Session, match_id: int) -> Optional[models.Match]:
	return db.query(models.Match).filter(models.Match.id == match_id).first()


	# """Récupère un match seulement si `user_id` en fait partie.

	# But sécurité :
	# - empêcher un user de lire/modifier un match auquel il ne participe pas.

	# SQL (approx) :
	# SELECT * FROM matches
	# WHERE id = :match_id
	#   AND (player1_id = :user_id OR player2_id = :user_id)
	# LIMIT 1;
	# """
def get_match_for_user(db: Session, *, match_id: int, user_id: int) -> Optional[models.Match]:
	return (
		db.query(models.Match)
		.filter(models.Match.id == match_id)
		.filter(or_(models.Match.player1_id == user_id, models.Match.player2_id == user_id))
		.first()
	)


	# """Liste paginée de matchs."""
	# Traduction SQL (approximative) :
	# SELECT * FROM matches OFFSET :skip LIMIT :limit;
	#
	# `.all()` : renvoie une liste de `Match` (éventuellement vide).
def get_matches(db: Session, skip: int = 0, limit: int = 100) -> List[models.Match]:
	return db.query(models.Match).offset(skip).limit(limit).all()


	# """Retourne uniquement les matchs où `user_id` participe.

	# Condition :
	# - user est player1 OU player2

	# Note pagination :
	# - Pour une pagination stable, on ajoute un `order_by(created_at desc)`.
	#   Sinon, la DB peut renvoyer un ordre "non garanti" (surtout quand il y a des insertions).
	# """
def get_matches_for_user(db: Session, *, user_id: int, skip: int = 0, limit: int = 100) -> List[models.Match]:
	return (
		db.query(models.Match)
		.filter(or_(models.Match.player1_id == user_id, models.Match.player2_id == user_id))
		.order_by(models.Match.created_at.desc())
		.offset(skip)
		.limit(limit)
		.all()
	)


	# """Met à jour un match (update partiel).

	# - On ne modifie que les champs effectivement envoyés par le client.
	# - Retourne None si le match n'existe pas.
	# """
def update_match(db: Session, match_id: int, match_update: schemas.MatchUpdate) -> Optional[models.Match]:
	# On charge d'abord le match.
	db_match = get_match(db, match_id)
	if not db_match:
		return None
	# exclude_unset=True : ignore les champs non fournis dans la requête.
	# Exemple : si le client envoie {"status": "running"}, on ne touche PAS aux scores.
	for field, value in match_update.model_dump(exclude_unset=True).items():
		# `.items()` : itère sur des paires (clé, valeur) du dict.
		# Exemple : ("status", "running")
		#
		# `setattr(obj, "status", "running")` = `obj.status = "running"`.
		# C'est pratique quand le nom du champ est dans une variable.
		setattr(db_match, field, value)
	# Commit : écrit les modifications.
	db.commit()
	# Refresh : récupère la version DB.
	db.refresh(db_match)
	return db_match


	# """Supprime un match.

	# Grâce à la FK `ondelete=CASCADE`, les events associés sont supprimés côté DB.
	# """
def delete_match(db: Session, match_id: int) -> bool:
	db_match = get_match(db, match_id)
	if not db_match:
		return False
	# Marque l'objet pour suppression.
	db.delete(db_match)
	# Commit : exécute le DELETE.
	db.commit()
	return True


# =========================
# MATCH EVENT CRUD
# =========================

	# """Crée un évènement dans la timeline d'un match.

	# Point important : allocation de `sequence`.
	# - On calcule `next_seq = max(sequence)+1` pour ce match.
	# - En cas de concurrence (deux events créés en même temps),
	#   la contrainte unique (match_id, sequence) peut lever IntegrityError.
	# - Dans ce cas, on rollback et on retry quelques fois.
	# """
def create_match_event(db: Session, match_id: int, event: schemas.MatchEventCreate) -> models.MatchEvent:
	# Donne un ordre stable des events par match.
	# NOTE: en cas de concurrence, la contrainte unique (match_id, sequence) peut déclencher
	# une IntegrityError; on retry.
	# `for _ in range(3)` : on tente 3 fois.
	# `_` est une convention Python qui signifie "variable jetable" (on ne l'utilise pas).
	for _ in range(3):
		# -----------------------------
		# 1) Trouver le dernier numéro de séquence
		# -----------------------------
		# `func.max(models.MatchEvent.sequence)` :
		# - `func.max(...)` = la fonction SQL `MAX(...)`.
		# - `models.MatchEvent.sequence` = la colonne `sequence` de la table `match_event`.
		# => On demande à la DB "donne-moi la plus grande sequence pour ce match".
		#
		# Traduction SQL (approximative) :
		# SELECT MAX(sequence) FROM match_event WHERE match_id = :match_id;
		#
		# `.scalar()` :
		# - exécute la requête,
		# - récupère la 1ère colonne de la 1ère ligne,
		# - renvoie donc directement un int ou `None`.
		last_seq = (
			db.query(func.max(models.MatchEvent.sequence))
			.filter(models.MatchEvent.match_id == match_id)
			.scalar()
		)
		# Si aucun event => last_seq = None => next_seq = 1.
		next_seq = (last_seq or 0) + 1

		# -----------------------------
		# 2) Construire l'objet ORM à insérer
		# -----------------------------
		# event.model_dump(exclude_unset=True) :
		# - transforme le Pydantic en dict,
		# - ignore les champs non envoyés.
		# Exemple : {"event_type": "goal_scored", "payload": {...}}
		#
		# Attention : on fixe explicitement `match_id` et `sequence` côté serveur.
		# Le client n'a pas à gérer `sequence`.
		# Sécurité/robustesse : on exclut aussi les champs gérés par le serveur (timestamp/sequence)
		# pour éviter un overwrite involontaire (ou malveillant).
		event_data = event.model_dump(exclude_unset=True, exclude={"sequence", "timestamp"})
		db_event = models.MatchEvent(
			match_id=match_id,
			sequence=next_seq,
			**event_data,
		)
		# Ajout dans la session.
		db.add(db_event)
		try:
			# -----------------------------
			# 3) Commit (écriture DB)
			# -----------------------------
			# Pourquoi ça peut échouer ? (concurrence)
			# - Deux requêtes arrivent en même temps.
			# - Les deux lisent last_seq=5.
			# - Les deux tentent d'insérer next_seq=6.
			# - La contrainte UNIQUE (match_id, sequence) bloque la 2ème.
			# => SQLAlchemy lève IntegrityError.
			#
			# Le retry permet à la 2ème requête de relire MAX(sequence) (qui sera alors 6)
			# et d'insérer 7.
			db.commit()
		except IntegrityError:
			# Rollback :
			# - indispensable après une erreur DB,
			# - sinon la session reste "cassée" et toutes les prochaines requêtes échouent.
			db.rollback()
			continue
		# Refresh : récupère id + timestamp DB.
		db.refresh(db_event)
		return db_event
	# Après 3 tentatives, on abandonne.
	raise MatchEventSequenceAllocationError("Failed to allocate match event sequence after retries")


	# """Retourne la timeline d'un match, triée de manière déterministe."""
	# Chaîne SQLAlchemy lisible comme une phrase :
	# - query(MatchEvent) : SELECT ... FROM match_event
	# - filter(match_id==...) : WHERE match_id = :match_id
	# - order_by(...) : ORDER BY sequence ASC, timestamp ASC
	# - all() : exécute et renvoie une liste
	#
	# Traduction SQL (approximative) :
	# SELECT * FROM match_event
	# WHERE match_id = :match_id
	# ORDER BY sequence ASC, timestamp ASC;
def get_match_events(db: Session, match_id: int) -> List[models.MatchEvent]:
	return (
		db.query(models.MatchEvent)
		.filter(models.MatchEvent.match_id == match_id)
		# Tri principal : sequence (ordre stable), puis timestamp (au cas où).
		.order_by(models.MatchEvent.sequence.asc(), models.MatchEvent.timestamp.asc())
		.all()
	)

_ACHIEVEMENTS_DEF = [
	{"id": "first_blood", "emoji": "⚽"},
	{"id": "on_fire",     "emoji": "🔥"},
	{"id": "veteran",     "emoji": "🎮"},
	{"id": "champion",    "emoji": "🏆"},
	{"id": "clean_sheet", "emoji": "🛡️"},
	{"id": "centurion",   "emoji": "💯"},
]

_LP_WIN  =  20
_LP_DRAW =   5
_LP_LOSS = -13

_RANKS = [
	(750, "Diamond"),
	(500, "Platinum"),
	(300, "Gold"),
	(150, "Silver"),
	(50,  "Bronze"),
	(0,   "Iron"),
]

def _rank_from_lp(lp: int) -> str:
	for threshold, name in _RANKS:
		if lp >= threshold:
			return name
	return "Iron"

def _xp_to_level(xp: int) -> int:
	if xp <= 0:
		return 1
	return max(1, int((1 + math.sqrt(1 + 4 * xp / 25)) / 2))

def _level_start_xp(level: int) -> int:
	return 25 * level * (level - 1)

def compute_user_stats(db: Session, user_id: int) -> dict:
	matches = (
		db.query(models.Match)
		.filter(
			or_(models.Match.player1_id == user_id, models.Match.player2_id == user_id),
			models.Match.status == "finished",
		)
		.order_by(models.Match.created_at.asc())
		.all()
	)

	wins = losses = draws = 0
	has_clean_sheet = False
	lp = 0

	for m in matches:
		ranked = getattr(m, "game_mode", "solo") == "online"
		if m.winner_id is None:
			draws += 1
			if ranked:
				lp += _LP_DRAW
		elif m.winner_id == user_id:
			wins += 1
			if ranked:
				lp += _LP_WIN
			if m.player1_id == user_id and m.score_player2 == 0:
				has_clean_sheet = True
			elif m.player2_id == user_id and m.score_player1 == 0:
				has_clean_sheet = True
		else:
			losses += 1
			if ranked:
				lp = max(0, lp + _LP_LOSS)

	total = wins + losses + draws
	xp = wins * 30 + draws * 10 + losses * 5
	level = _xp_to_level(xp)
	xp_in_level = xp - _level_start_xp(level)
	xp_to_next = _level_start_xp(level + 1) - xp
	win_rate = round(wins / total * 100) if total > 0 else 0
	tier = _rank_from_lp(lp)

	achievements = [
		{"id": "first_blood", "emoji": "⚽", "unlocked": wins >= 1},
		{"id": "on_fire",     "emoji": "🔥", "unlocked": wins >= 5},
		{"id": "veteran",     "emoji": "🎮", "unlocked": total >= 10},
		{"id": "champion",    "emoji": "🏆", "unlocked": wins >= 25},
		{"id": "clean_sheet", "emoji": "🛡️", "unlocked": has_clean_sheet},
		{"id": "centurion",   "emoji": "💯", "unlocked": level >= 5},
	]

	return {
		"wins": wins, "losses": losses, "draws": draws, "total": total,
		"xp": xp, "level": level, "xp_in_level": xp_in_level, "xp_to_next": xp_to_next,
		"win_rate": win_rate, "lp": lp, "tier": tier, "achievements": achievements,
	}

def get_leaderboard(db: Session, limit: int = 10) -> list:
	online_filter = (models.Match.status == "finished", models.Match.game_mode == "online")
	p1_ids = db.query(distinct(models.Match.player1_id)).filter(*online_filter).all()
	p2_ids = db.query(distinct(models.Match.player2_id)).filter(*online_filter).all()

	all_ids = (set(r[0] for r in p1_ids) | set(r[0] for r in p2_ids)) - {0}

	entries = []
	for uid in all_ids:
		s = compute_user_stats(db, uid)
		entries.append({"user_id": uid, **s})

	entries.sort(key=lambda x: (x["lp"], x["wins"]), reverse=True)

	return [
		{
			"user_id": e["user_id"],
			"rank": i + 1,
			"wins": e["wins"], "losses": e["losses"], "draws": e["draws"],
			"xp": e["xp"], "level": e["level"], "win_rate": e["win_rate"],
			"lp": e["lp"], "tier": e["tier"],
		}
		for i, e in enumerate(entries[:limit])
	]


def cleanup_user_data(db: Session, *, user_id: int) -> dict:
	if user_id <= 0:
		raise ValueError("invalid user id")
	user = db.query(models.Match).filter(or_(models.Match.player1_id == user_id, models.Match.player2_id == user_id))
	count_match = user.count()
	user.delete(synchronize_session=False)
	db.commit()
	return {"ok": True, "deleted_matches": count_match}
