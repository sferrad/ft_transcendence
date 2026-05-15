# ft_transcendence

*This project has been created as part of the 42 curriculum by ankammer, sferrad, ilkaddou, itaharbo, moel-hal.*

---

## Description

**ft_transcendence** is a full-stack social + gaming web application built as a microservices architecture. The platform lets users register, manage a profile, build a friends list, chat in real time, and play a Headball-style browser game — all secured behind a WAF (Web Application Firewall).

Key features:

- Secure authentication with hashed and salted passwords
- User profiles with avatar upload, bio, country, and language preference
- Friends system: add, accept, block/unblock users, online status
- Real-time chat: public channels, groups, and private direct messages (DM)
- Advanced chat: typing indicators, read receipts, game invites from chat, profile access from chat, block from chat
- Browser-based game: solo vs AI, local 2-player, and online matchmaking
- Online mode: ranked and friendly, real-time synchronisation, reconnection and forfeit handling
- Gamification: 6 achievements, XP/level system, tier ranking (Iron → Diamond), leaderboard
- Game statistics: win/loss/draw history, win rate, match history with opponent details
- Game customisation: themes, score limit, timer
- Account deletion with GDPR-compliant data anonymisation and JSON data export
- Internationalisation: English, French, Spanish
- Monitoring with Prometheus and Grafana
- Secrets management with HashiCorp Vault
- WAF (Nginx + ModSecurity OWASP CRS) as the single public entry point
- Privacy Policy and Terms of Service pages accessible from the footer

---

## Team information

| Login | Role(s) | Responsibilities |
|---|---|---|
| ankammer | Technical Lead / Architect | Microservices architecture, API gateway, WAF configuration, TLS orchestration |
| sferrad | Product Owner | Functional scope, evaluation criteria, documentation |
| ilkaddou | Developer — Frontend & Gameplay | React UI, WebSocket client, game engine, AI, i18n, online mode |
| itaharbo | Project Manager / DevOps | Docker/Podman orchestration, deployment scripts, Prometheus/Grafana |
| moel-hal | Developer — Backend & Persistence | Chat, messages, GDPR deletion/anonymisation, game stats, DB integrity |

---

## Project management

**Work organisation:**
Tasks were broken down into service-level issues on GitHub Issues and assigned at the start of each week. Each microservice was owned by one developer to limit merge conflicts while shared components (auth, API gateway) were reviewed by at least two members before merging.

**Meetings:**
Weekly sync every Monday to review progress, unblock issues, and adjust priorities. Quick async standups on WhatsApp throughout the week.

**Tools:**
- GitHub Issues for task tracking
- WhatsApp for daily communication
- Git branches per feature/service, PR review before merge to `dev`

**Code reviews:**
All changes to the API gateway and WAF configuration were reviewed by the Technical Lead before merging. Backend service changes were reviewed by at least one other backend developer.

---

## Technical stack

**Frontend:**
- React 19 + TypeScript
- Vite (dev server and build tool)
- Tailwind CSS (styling)
- Socket.IO client (real-time)
- react-i18next (internationalisation)
- React Router v6 (client-side routing)

**Backend:**
- FastAPI (Python) — one instance per microservice
- Pydantic (validation)
- SQLAlchemy ORM
- Uvicorn (ASGI server)
- httpx (inter-service HTTP calls)

**Database:**
- PostgreSQL — one logical database per service, chosen for its strong ACID guarantees, rich JSON support, and native SQLAlchemy integration

**Real-time:**
- WebSockets via Socket.IO managed by the API gateway

**Security:**
- Nginx + ModSecurity v3 + OWASP CRS 4.x (WAF)
- HashiCorp Vault for secrets (JWT secret, DB credentials, API keys)
- JWT authentication with Redis blacklist for revocation
- bcrypt password hashing

**Observability:**
- Prometheus for metrics scraping
- Grafana for dashboards and alerting
- Alertmanager

**Infrastructure:**
- Docker / Podman + docker-compose / podman-compose
- All secrets stored in `.env` (gitignored); `.env.example` provided

**Justification of major choices:**
- FastAPI over Django/Flask: async-native, automatic OpenAPI docs, Pydantic validation out of the box, lightweight per-service
- PostgreSQL over SQLite/MySQL: production-grade, handles concurrent writes safely, good SQLAlchemy support
- Microservices over monolith: allows independent deployment and scaling per service, aligns with the DevOps module requirement
- Vault over plain `.env` in production: secrets are encrypted at rest, auditable, and rotatable without redeployment

---

## Database schema

Models are defined in SQLAlchemy and serve as the single source of truth.

**User service** (`srcs/backend/user-service/app/models.py`)

| Table | Key fields |
|---|---|
| `users` | `id`, `email` (unique), `username` (unique), `hashed_password`, `created_at` |

**Profile service** (`srcs/backend/profile-service/app/models.py`)

| Table | Key fields |
|---|---|
| `profiles` | `id`, `user_id`, `display_name`, `avatar_url`, `bio`, `language`, `country`, `updated_at` |

**Friends service** (`srcs/backend/friends-service/app/models.py`)

| Table | Key fields |
|---|---|
| `friendsrequest` | `id`, `from_user_id`, `to_user_id`, `status` (pending/accepted/blocked), `created_at` |

**Chat service** (`srcs/backend/chat-service/app/models.py`)

| Table | Key fields |
|---|---|
| `rooms` | `id`, `name`, `is_private`, `owner_user_id`, `created_at` |
| `messages` | `id`, `room_id`, `sender_user_id`, `content`, `created_at` |

**Game service** (`srcs/backend/game-service/app/models.py`)

| Table | Key fields |
|---|---|
| `matches` | `id`, `player1_id`, `player2_id`, `winner_id`, `score_player1`, `score_player2`, `status`, `game_mode`, `started_at`, `finished_at` |

> Note: Because services are independent, foreign keys across service boundaries are not enforced at the DB level. Referential integrity is maintained at the application layer in the API gateway. Only primary tables are displayed — see `srcs/backend/<service>/app/models.py` for the full schema.

---

## Features list

| Feature | Description | Team member(s) |
|---|---|---|
| Register / login | Email + password, bcrypt hash, JWT issued by API gateway | ankammer |
| JWT auth & revocation | JWT secret from Vault, Redis blacklist on logout/deletion | ankammer |
| User profile | Avatar upload, bio, language, country, display name | sferrad |
| Friends system | Send/accept/decline/block/unblock, online status | sferrad |
| Public chat rooms | Create, join, leave rooms; send/receive messages in real time | sferrad, ilkaddou |
| Private messages (DM) | Find-or-create DM room, bilateral message deletion on account removal | sferrad, ilkaddou |
| Advanced chat | Typing indicators, read receipts, game invites from chat, profile access from chat, block from chat | ilkaddou |
| Real-time (WebSocket) | Socket.IO via API gateway, room events broadcast, presence | itaharbo, sferrad |
| Browser game — solo | Headball-style game vs AI opponent | ilkaddou, moel-hal |
| Browser game — local | Two players on the same screen | ilkaddou, moel-hal |
| Browser game — online | Matchmaking (ranked/friendly), P1-authoritative sync, reconnection, forfeit | ilkaddou |
| AI opponent | Rule-based AI with probabilistic shooting, defend/attack modes, happenings awareness | ilkaddou |
| Game customisation | Theme, score limit, timer — respected by AI and all game modes | ilkaddou |
| Happenings (power-ups) | 6 types (freeze, speed boost, mega kick, slow ball, shrink/grow goal), deterministic via seeded PRNG | ilkaddou |
| Game statistics | Wins, losses, draws, win rate, level, XP bar, tier (Iron→Diamond), LP | moel-hal, ilkaddou |
| Match history | Per-match results with opponent name, score, date, game mode | moel-hal |
| Achievements | 6 unlockable achievements stored in DB (first win, 5 wins, 10 games, 25 wins, clean sheet, level 5) | moel-hal |
| Leaderboard | Ranked top players with tier colour coding, click to view profile | ilkaddou |
| GDPR data export | User can download all their personal data as JSON | ankammer |
| GDPR account deletion | Messages anonymised, DMs deleted, JWT blacklisted, socket closed | ankammer, moel-hal |
| Internationalisation | EN / FR / ES with language switcher | ilkaddou, sferrad |
| WAF | Nginx + ModSecurity OWASP CRS, rate limiting, TLS termination | ankammer |
| Secrets management | HashiCorp Vault for JWT secret, DB credentials | ankammer |
| Monitoring | Prometheus metrics on all services, Grafana dashboards, Alertmanager | itaharbo |
| Privacy Policy & ToS | Accessible from footer, real content | ankammer |
| Containerisation | docker-compose / podman-compose, single `make` command | itaharbo |

---

## Modules

### Validated modules — 27 points

> The minimum threshold is 14 points. Only fully functional and demonstrated modules are counted.

| # | Module | Category | Type | Points | Proof |
|---|---|---|---|---|---|
| 1 | **Framework** — React 19 + TypeScript (frontend) + FastAPI (backend) | Web | Major | 2 | `srcs/frontend/`, `srcs/backend/*/app/main.py` |
| 2 | **Real-time WebSockets** — Socket.IO with room broadcast, presence, graceful disconnect | Web | Major | 2 | `srcs/backend/api-gateway/app/websocket.py`, `srcs/frontend/src/hooks/useWebSocket.ts` |
| 3 | **User interaction** — chat system, profile system, friends system | Web | Major | 2 | `srcs/backend/chat-service/`, `srcs/backend/friends-service/`, `srcs/backend/profile-service/` |
| 4 | **ORM** — SQLAlchemy across all services, no raw SQL | Web | Minor | 1 | `srcs/backend/*/app/models.py` |
| 5 | **Standard user management** — profile update, avatar upload, friends + online status, profile page | User Management | Major | 2 | `srcs/backend/user-service/`, `srcs/backend/profile-service/` |
| 6 | **Game statistics & match history** — wins/losses/draws, win rate, match log, achievements, leaderboard | User Management | Minor | 1 | `srcs/backend/game-service/app/crud.py`, `srcs/frontend/src/features/profile/components/MatchHistory.tsx` |
| 7 | **AI opponent** — rule-based AI with defend/attack modes, probabilistic shooting, happenings awareness | Artificial Intelligence | Major | 2 | `srcs/frontend/src/features/game/engine/ai.ts` |
| 8 | **WAF + HashiCorp Vault** — ModSecurity OWASP CRS + Vault secrets management | Cybersecurity | Major | 2 | `srcs/waf/`, `srcs/vault/` |
| 9 | **Prometheus + Grafana** — metrics on all services, dashboards, alerting rules | DevOps | Major | 2 | `srcs/monitoring/` |
| 10 | **Backend as microservices** — user, profile, friends, chat, game, api-gateway — each with own DB | DevOps | Major | 2 | `srcs/backend/` |
| 11 | **GDPR compliance** — data export (JSON), account deletion with anonymisation, confirmation email | Data & Analytics | Minor | 1 | `srcs/backend/profile-service/app/main.py` (export + delete endpoints) |
| 12 | **Complete web-based game** — Headball physics engine, 2D canvas, rules, win/loss conditions | Gaming & UX | Major | 2 | `srcs/frontend/src/features/game/engine/` |
| 13 | **Remote players** — online matchmaking, P1-authoritative real-time sync, reconnection logic, forfeit handling | Gaming & UX | Major | 2 | `srcs/frontend/src/features/game/modes/online/`, `srcs/backend/game-service/app/main.py` |
| 14 | **Game customisation** — themes, score limit, timer; defaults always available; AI respects settings | Gaming & UX | Minor | 1 | `srcs/frontend/src/features/game/engine/constants.ts`, `srcs/frontend/src/features/game/themes.ts` |
| 15 | **Advanced chat features** — block from chat, game invites, typing indicators, read receipts, history persistence, profile access | Gaming & UX | Minor | 1 | `srcs/frontend/src/features/chat/` |
| 16 | **Gamification** — 6 achievements, XP/level system, tier leaderboard (Iron→Diamond), visual progress bar | Gaming & UX | Minor | 1 | `srcs/backend/game-service/app/crud.py`, `srcs/frontend/src/features/profile/components/MatchHistory.tsx` |
| 17 | **Internationalisation** — EN / FR / ES, i18n system, language switcher, all UI text translatable | Accessibility & i18n | Minor | 1 | `srcs/frontend/public/locales/`, `srcs/frontend/src/i18n/` |

**Total: 10 Major × 2 pts + 7 Minor × 1 pt = 27 points** (threshold: 14 pts)

---

### Module justifications

**1 — Framework (Major/Web):**
React 19 + TypeScript on the frontend provides a full framework with component lifecycle, React Router v6 for client-side routing, and state management via Context + hooks. FastAPI on each backend service provides structured routing, Pydantic schema validation, dependency injection, and async support. Both clearly satisfy the subject definition of a frontend and backend framework.

**2 — Real-time WebSockets (Major/Web):**
Socket.IO is managed centrally by the API gateway and handles: room join/leave events, message broadcasting, online/offline presence updates (pinged every 30 s), game state synchronisation in online mode, typing indicators, read receipts, and game invite notifications. Connection and disconnection are handled gracefully with room cleanup and reconnection logic in the game session.

**3 — User interaction (Major/Web):**
All three sub-requirements are met: (a) a chat system with public channels, groups, and private DMs with full message persistence; (b) a profile system with avatar, bio, country, language, and per-user stats; (c) a friends system with request/accept/decline/block/unblock and real-time online status.

**4 — ORM (Minor/Web):**
SQLAlchemy is used across all five backend services for model definition, relationship mapping, session management, and query building. No raw SQL is written anywhere in the codebase.

**5 — Standard user management (Major/User Management):**
Users can update all profile fields (display name, bio, country, language, avatar). Avatar upload is stored on a named Docker volume with a default fallback. Users can add friends and see their online status. Each user has a profile page showing their information.

**6 — Game statistics & match history (Minor/User Management):**
The game service tracks every match result (score, winner, game mode, timestamps). The profile page displays: wins, losses, draws, win rate, current level and XP bar, tier and LP, a full match history list with opponent details, and 6 unlockable achievements. The leaderboard ranks all players by LP with tier colour coding.

**7 — AI opponent (Major/AI):**
The AI in `ai.ts` uses a rule-based engine with two speed modes (attack: 4.5 px/tick, defend: 7.5 px/tick), probabilistic shooting (base 20 % chance, boosted by power-ups), awareness of active happenings (targeting beneficial power-ups), and a double-dash repositioning behaviour when stuck. It can win against a passive player and simulates human-like imprecision through probabilistic decisions rather than perfect play. It respects all game customisation settings (theme, duration, score). The implementation can be fully explained during evaluation.

**8 — WAF + HashiCorp Vault (Major/Cybersecurity):**
Nginx with ModSecurity v3 and OWASP CRS 4 at paranoia level 3 is the single public entry point — no service is exposed directly. HashiCorp Vault stores the JWT secret and all database credentials; secrets are fetched at container startup via Vault AppRole auth and never stored in plain text on disk or in environment variables in production containers.

**9 — Prometheus + Grafana (Major/DevOps):**
Prometheus scrapes `/metrics` on all FastAPI services via `prometheus-fastapi-instrumentator`. Grafana provides dashboards for request rates, error rates, latency histograms, and container health. Alertmanager is configured with alerting rules for critical service-down events. Access to Grafana is secured.

**10 — Microservices (Major/DevOps):**
Five independent FastAPI services (user, profile, friends, chat, game) each with their own PostgreSQL schema and no shared database state. The API gateway handles authentication, routing, and inter-service HTTP calls via httpx. Services are loosely coupled with clear REST interfaces and can be rebuilt independently.

**11 — GDPR compliance (Minor/Data & Analytics):**
Users can request a full JSON export of their personal data (profile, matches, messages) from the settings page. Account deletion triggers an orchestrated flow: public chat messages are anonymised (`sender_user_id = 0`), private messages are deleted bilaterally, the JWT is blacklisted, active WebSocket connections are closed, and a confirmation email is sent via Mailhog.

**12 — Complete web-based game (Major/Gaming & UX):**
A Headball-style browser game with a full physics engine (gravity, bounce, kick impulse, orbital angle calculation, substepping to prevent tunnelling), real-time rendering on HTML5 Canvas, solo mode vs AI, and local 2-player mode on the same screen. Game rules and win/loss conditions are clearly displayed.

**13 — Remote players (Major/Gaming & UX):**
Two players on separate computers can play in real time via the online matchmaking system. Player 1 is authoritative: it simulates the full game state and broadcasts it via WebSocket every tick; Player 2 sends inputs and receives state. Network latency is handled by a dedicated game room on the Socket.IO gateway. Disconnection is handled gracefully: the opponent sees a countdown, and if reconnection occurs within the window the game resumes; otherwise a forfeit is declared with the correct winner. Both reconnection (rejoin) and voluntary forfeit paths are implemented.

**14 — Game customisation (Minor/Gaming & UX):**
The character select screen exposes controls for visual theme (Classic / Neon with distinct colours and ball effects), game duration (30 s / 60 s / unlimited), and winning score (3 / 5 / unlimited). Default options are always pre-selected. The AI opponent respects all customisation settings. The happenings (power-up) system adds further in-game variety with 6 types of effects.

**15 — Advanced chat features (Minor/Gaming & UX):**
Built on top of the validated basic chat module. Implemented features: (a) block users — blocked users cannot send messages; (b) game invites directly from the chat DM panel; (c) game/match notifications via toast overlays; (d) profile access from any conversation header; (e) full chat history persistence in PostgreSQL; (f) typing indicators (WebSocket `chat.typing` event); (g) read receipts (last-seen tracking per user per room).

**16 — Gamification (Minor/Gaming & UX):**
Implements four of the required gamification features, all persistent in the database: (a) **achievements** — 6 unlockable badges (First Win, 5 Wins, 10 Games, 25 Wins, Clean Sheet, Level 5) with emoji icons and unlock state stored server-side; (b) **XP/level system** — XP earned per match (win: 30 XP, draw: 10 XP, loss: 5 XP), level computed from cumulative XP with a visual progress bar; (c) **leaderboard** — global ranking by LP with tier colour coding; (d) **tier ranking** — Iron / Bronze / Silver / Gold / Platinum / Diamond tiers based on LP. Visual feedback is provided via the profile page stats panel, XP progress bar, and tier badge.

**17 — Internationalisation (Minor/Accessibility & i18n):**
react-i18next with three complete translation JSON files (English, French, Spanish). All user-facing strings are externalised — no hardcoded UI text. A language switcher is available in the settings menu and the choice is persisted in `localStorage`. Both static UI text and dynamic strings (interpolation, pluralisation) are covered.

---

## Individual contributions

**ankammer — Technical Lead / Architect**
- Designed the overall microservices architecture and decided service boundaries
- Implemented the API gateway (routing, JWT validation, Redis blacklist, proxy to microservices)
- Configured the WAF: nginx.conf (rate limiting, location routing, TLS, WebSocket upgrade), ModSecurity rules and OWASP CRS setup, exclusions for avatar upload and Vite dev assets
- Integrated HashiCorp Vault: Vault policies, AppRole auth, secret injection at startup
- Set up TLS: self-signed certificates for dev, certificate mounting for internal Prometheus scraping
- Resolved the Podman DNS issue (127.0.0.11 vs 10.89.x.1) and documented it
- *Challenge:* Nginx upstream DNS caching caused 502s after every container rebuild. Solved with `resolver` + `server ... resolve` + `valid=10s` for dynamic re-resolution.

**sferrad — Product Owner**
- Defined the product scope, feature list, and acceptance criteria for each module
- Maintained the product backlog and prioritised work at weekly meetings
- Wrote and validated the Privacy Policy and Terms of Service pages
- Produced evaluation documentation and the defense plan
- Coordinated between team members to ensure module requirements were fully met
- *Challenge:* Keeping the scope realistic given the timeline while reaching 14 module points.

**ilkaddou — Developer (Frontend & Gameplay)**
- Built the React 19 + TypeScript frontend: all pages, routing, component architecture (feature-based structure)
- Implemented the WebSocket client (Socket.IO singleton) for real-time chat and game events
- Developed the full browser game engine: fixed-timestep loop, substepped physics, kick impulse with orbital angle, happenings system
- Implemented the AI opponent (probabilistic, defend/attack modes, happening awareness)
- Built the online game mode: matchmaking lobby, P1-authoritative synchronisation, reconnection and forfeit flows, seeded PRNG for deterministic state
- Added internationalisation with react-i18next (EN/FR/ES) and all translation files
- Implemented game customisation (themes, score, timer) and gamification UI (stats panel, XP bar, achievements, leaderboard)
- *Challenge:* Keeping both clients in sync without a server-side simulation. Solved with a seeded Mulberry32 PRNG (same seed from server → same random sequence on both clients) and a P1-authoritative broadcast architecture.

**itaharbo — Project Manager / DevOps**
- Managed the sprint board, weekly meetings, and delivery deadlines
- Wrote and maintained the docker-compose file and all Dockerfiles
- Implemented the single `make` command startup (Makefile)
- Configured Prometheus, Grafana, and Alertmanager: scrape configs, dashboards, alert rules
- Handled Podman-specific deployment differences (DNS resolver, rootless networking)
- Set up internal TLS certificates for Prometheus HTTPS scraping
- *Challenge:* Podman uses a different internal DNS than Docker. Fixed by detecting the runtime and patching the resolver directive accordingly.

**moel-hal — Developer (Backend Services & Persistence)**
- Implemented user service (registration, password hashing, credential verification)
- Implemented profile service (avatar upload, bio, cache layer with Redis)
- Implemented friends service (request/accept/block state machine)
- Implemented chat service: rooms, room members, messages, private messages
- Fixed the `NotNullViolation` bug on `private_messages.room_id` by ensuring find-or-create of the DM room before inserting messages
- Implemented the GDPR account deletion flow: public message anonymisation (`sender_user_id=0`), bilateral DM deletion, room owner transfer, JWT blacklisting trigger
- Added game statistics and match history endpoints with XP, level, tier, and achievement computation
- *Challenge:* Ensuring data consistency across the GDPR deletion flow without cross-service DB foreign keys. Solved with an orchestrated deletion sequence in the API gateway calling each service in order, with rollback logging on failure.

---

## Instructions

### Prerequisites

- `git`
- `make`
- Docker + docker-compose **or** Podman + podman-compose
- A `.env` file filled from the provided `.env.example`

**Note for Podman users:** Podman uses a different internal DNS resolver than Docker. If you see 502 errors or resolver timeouts, check `/etc/resolv.conf` inside the WAF container and update the `resolver` directive in `srcs/waf/conf/nginx.conf` accordingly. See the Troubleshooting section below.

### Setup

```bash
# 1. Clone the repository
git clone <repo_url>
cd ft_transcendence

# 2. Create your .env file
cp .env.example .env
# Edit .env and fill in all required variables
# (DB passwords, Vault token, Cloudinary keys, JWT secret seed, etc.)

# 3. Start everything with a single command
make
# This runs: docker compose up --build
# or: podman-compose up --build (if Podman is detected)
```

### Service endpoints (after startup)

| Service | URL |
|---|---|
| Application (HTTP) | http://localhost:8080 |
| Application (HTTPS) | https://localhost:8443 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (admin / see .env) |
| Mailhog (dev email) | http://localhost:8025 |

### Stopping the project

```bash
make down
# or
docker compose down
```

### Useful commands

```bash
# View logs for a specific service
docker compose logs -f chat-service

# Rebuild a single service after code changes
docker compose up -d --build profile-service

# Check WAF logs
docker logs -f transcendence_waf_1

# Connect to the services database
docker exec -it <transcendence-DB> psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

# Test the API health endpoint
curl -k https://localhost:8443/api/health

# Monitor Redis rate limit keys in real time
docker exec -it transcendence_redis_1 redis-cli monitor | grep "rate:"
```

---

## Resources

### Documentation and references used

- [Nginx documentation](https://nginx.org/en/docs/) — reverse proxy, upstream, location matching, rate limiting
- [ModSecurity Reference Manual v3](https://github.com/owasp-modsecurity/ModSecurity/wiki/Reference-Manual-(v3.x)) — SecRule syntax, phases, actions
- [OWASP Core Rule Set documentation](https://coreruleset.org/docs/) — paranoia levels, anomaly scoring, exclusion patterns
- [FastAPI documentation](https://fastapi.tiangolo.com/) — routing, dependency injection, middleware, WebSocket
- [SQLAlchemy documentation](https://docs.sqlalchemy.org/) — ORM models, sessions
- [HashiCorp Vault documentation](https://developer.hashicorp.com/vault/docs) — AppRole auth, KV secrets engine, agent injection
- [Prometheus documentation](https://prometheus.io/docs/) — scrape configs, recording rules, alerting
- [react-i18next documentation](https://react.i18next.com/) — translation files, language detection
- [Socket.IO documentation](https://socket.io/docs/) — rooms, events, namespaces
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — threat model reference for WAF rule tuning
- [RFC 7235](https://datatracker.ietf.org/doc/html/rfc7235) — HTTP authentication
- [RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750) — Bearer token usage

### How AI was used in this project

AI tools (primarily ChatGPT) were used for the following tasks:

- **Code review assistance:** Identifying the `NotNullViolation` bug in the private message creation flow and proposing the fix.
- **WAF configuration debugging:** Analysing Nginx and ModSecurity logs to identify the root cause of rate limit false positives (rate limit was keyed by IP rather than user ID; two users on the same machine were sharing a counter). AI helped explain the anomaly scoring mechanism and suggested the fix (key by JWT `sub` claim via Redis).
- **Explaining complex configuration syntax:** Deep-dive explanations of `limit_req_zone`, `location` priority rules, `resolver`/`resolve` DNS behaviour, ModSecurity phase processing, and OWASP CRS paranoia levels — used to build genuine understanding before writing or modifying configuration.

All AI-generated content was reviewed and validated by the responsible team member before being committed. No code was merged that a team member could not explain and defend during evaluation.
