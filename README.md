# ft_transcendence

*This project has been created as part of the 42 curriculum by ankammer, sferrad, ilkaddou, itaharbo, moel-hal.*

---

## Description

**ft_transcendence** is a full-stack social + gaming web application built as a microservices architecture. The platform lets users register, manage a profile, build a friends list, chat in real time, and play a Headball-style browser game — all secured behind a WAF (Web Application Firewall).

Key features:

- Secure authentication with hashed and salted passwords
- User profiles with avatar upload, bio, and language preference
- Friends system: add, accept, block users
- Real-time chat: public rooms and private direct messages (DM)
- Browser-based game: solo vs AI and local 2-player mode
- Account deletion with GDPR-compliant data anonymisation
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
| ilkaddou | Developer — Frontend & Gameplay | React UI, WebSocket client, game engine, i18n |
| itaharbo | Project Manager / DevOps | Docker/Podman orchestration, deployment scripts, CI local |
| moel-hal | Developer — Backend & Persistence | Chat, messages, GDPR deletion/anonymisation, DB integrity |

---

## Project management

**Work organisation:**
Tasks were broken down into service-level issues on GitHub Issues and assigned at the start of each week. Each microservice was owned by one developer to limit merge conflicts while shared components (auth, API gateway) were reviewed by at least two members before merging.

**Meetings:**
Weekly sync every Monday to review progress, unblock issues, and adjust priorities. Quick async standups on Whattsap throughout the week.

**Tools:**
- GitHub Issues for task tracking
- Whattsap for daily communication
- Git branches per feature/service, PR review before merge to `dev`

**Code reviews:**
All changes to the API gateway and WAF configuration were reviewed by the Technical Lead before merging. Backend service changes were reviewed by at least one other backend developer.

---

## Technical stack

**Frontend:**
- React 18 + TypeScript
- Vite (dev server and build tool)
- Tailwind CSS (styling)
- Socket.IO client (real-time)

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
| `profiles` | `id`, `user_id` , `display_name`, `avatar_url`, `bio`, `language`, `country`, `updated_at` |

**Friends service** (`srcs/backend/friends-service/app/models.py`)

| Table | Key fields |
|---|---|
| `friendsrequest` | `id`, `from_user_id`, `to_user_id`, `status` (pending/accepted/blocked), `created_at` |

**Chat service** (`srcs/backend/chat-service/app/models.py`)

| Table | Key fields |
|---|---|
| `rooms` | `id`, `name`, `is_private`, `owner_user_id`, `created_at` |

**Game service** (`srcs/backend/game-service/app/models.py`)

| Table | Key fields |
|---|---|
| `matches` | `id`, `player1_id`, `player2_id`, `winner_id` `score_player1`, `score_player2`, `status`, `started_at`, `finished_at`, `created_at` |


> Note: Because services are independent, foreign keys across service boundaries are not enforced at the DB level. Referential integrity is maintained at the application layer in the API gateway. Only primary tables are displayed, see the files at `srcs/backend/<service>/app/models.py` for more details.

---

## Features list

| Feature | Description | Team member(s) |
|---|---|---|
| Register / login | Email + password, bcrypt hash, JWT issued by API gateway | ankammer, moel-hal |
| JWT auth & revocation | JWT secret from Vault, Redis blacklist on logout/deletion | ankammer |
| User profile | Avatar upload, bio, language, country, display name | moel-hal, ilkaddou |
| Friends system | Send/accept/decline/block requests, online status | moel-hal |
| Public chat rooms | Create rooms, send/receive messages in real time | moel-hal, ilkaddou |
| Private messages (DM) | Find-or-create DM room, bilateral message deletion on account removal | moel-hal |
| Real-time (WebSocket) | Socket.IO via API gateway, room events broadcast | ankammer, ilkaddou |
| Browser game (solo) | Headball-style game vs AI opponent | ilkaddou |
| Browser game (local) | Two players on the same screen | ilkaddou |
| AI opponent | Rule-based AI with adjustable difficulty | ilkaddou |
| GDPR account deletion | Public messages anonymised (`sender_user_id=0`), DMs deleted, JWT blacklisted | moel-hal, ankammer |
| Data export | User can download their data as JSON | moel-hal |
| Internationalisation | EN / FR / ES with language switcher | ilkaddou |
| WAF | Nginx + ModSecurity OWASP CRS, rate limiting, TLS termination | ankammer |
| Secrets management | HashiCorp Vault for JWT secret, DB credentials | ankammer, itaharbo |
| Monitoring | Prometheus metrics on all services, Grafana dashboards | itaharbo |
| Privacy Policy & ToS | Accessible from footer, real content | sferrad |
| Containerisation | docker-compose / podman-compose, single `make` command | itaharbo |

---

## Modules

### Validated modules — 22 points

> The minimum threshold is 14 points. Only fully functional and demonstrated modules are counted.

| # | Module | Category | Type | Points | Status | Proof |
|---|---|---|---|---|---|---|
| 1 | Framework — React + TypeScript (frontend) + FastAPI (backend) | Web | Major | 2 | ✅ Validated | `srcs/frontend/`, `srcs/backend/api-gateway/` |
| 2 | Real-time features — WebSockets via Socket.IO | Web | Major | 2 | ✅ Validated | `srcs/backend/api-gateway/app/websocket.py`, `srcs/frontend/src/chat/` |
| 3 | User interaction — chat, friends, profiles, presence | Web | Major | 2 | ✅ Validated | `srcs/backend/chat-service/`, `srcs/backend/friends-service/`, `srcs/backend/profile-service/` |
| 4 | Standard user management & authentication | User Management | Major | 2 | ✅ Validated | `srcs/backend/user-service/` — bcrypt hashing + JWT tokens |
| 5 | ORM — SQLAlchemy across all services | Web | Minor | 1 | ✅ Validated | `srcs/backend/*/app/models.py` |
| 6 | Internationalisation — EN / FR / ES | Accessibility & i18n | Minor | 1 | ✅ Validated | `srcs/frontend/public/locales/`, i18next configuration |
| 7 | AI opponent — game engine with AI logic | Artificial Intelligence | Major | 2 | ✅ Validated | `srcs/frontend/src/Gameplay/engine/`, `ai.ts` behavioural logic |
| 8 | WAF + Vault — ModSecurity + HashiCorp Vault | Cybersecurity | Major | 2 | ✅ Validated | `srcs/waf/`, `srcs/vault/` |
| 9 | Monitoring — Prometheus + Grafana | DevOps | Major | 2 | ✅ Validated | `srcs/monitoring/`, metrics exposed on all services |
| 10 | Backend as microservices | DevOps | Major | 2 | ✅ Validated | `srcs/backend/` — user, chat, friends, game, profile, api-gateway |
| 11 | GDPR compliance — data export + account deletion | Data & Analytics | Minor | 1 | ✅ Validated | `srcs/backend/profile-service/app/main.py` delete endpoint |
| 12 | Game customisation options | Gaming & UX | Minor | 1 | ✅ Validated | `srcs/frontend/src/Gameplay/GameSettings.tsx` — theme / duration / score settings |
| 13 | Complete web-based game — solo + local multiplayer | Gaming & UX | Major | 2 | ✅ Validated | `srcs/frontend/src/Gameplay/` — full game engine with physics and AI |

**Conservative total: 22 points** (8 Major × 2 + 5 Minor × 1 = 21 — see note below)

> Point breakdown: 9 Major modules (×2 = 18 pts) + 5 Minor modules (×1 = 5 pts) = **22 pts**.
> The project comfortably exceeds the 14-point mandatory threshold.

---

### Modules in progress — not counted

> The following modules have partial implementations but do not yet meet the full evaluation criteria. They are listed for transparency and are **not** included in the score.

| # | Module | Type | Points | Status | Notes |
|---|---|---|---|---|---|
| 14 | Remote players — real-time multiplayer sync | Major | 0 | 🔄 In progress | Network sync foundation exists; not fully implemented |
| 15 | Game statistics & match history | Minor | 0 | 🔄 In progress | Backend data collection present; UI/stats module incomplete |

---

### Module justifications

**Framework (major):** React + TypeScript on the frontend provides a full framework with component lifecycle, routing (React Router), and state management (Context + hooks). FastAPI on each backend service provides structured routing, Pydantic validation, dependency injection, and async support. Both satisfy the subject definition of a framework.

**Real-time WebSockets (major):** Socket.IO is managed by the API gateway and handles room join/leave events, message broadcasting, presence updates (online/offline), and game state synchronisation across all connected clients. Connection and disconnection are handled gracefully with room cleanup.

**User interaction (major):** All three sub-requirements are met: a basic chat system (public rooms + DM with full persistence), a profile system (avatar, bio, stats, language), and a friends system (request / accept / decline / block, online status).

**Standard user management (major):** Users can update all profile fields, upload an avatar (stored on Volume `avatar-profile-service` with a default fallback), add friends and see their online status, and access a profile page showing their information.

**ORM (minor):** SQLAlchemy is used across all backend services for model definition, relationship mapping, and query building. Alembic handles schema migrations. No raw SQL is used.

**Internationalisation (minor):** react-i18next with three complete translation JSON files (EN, FR, ES). All user-facing strings are externalised. A language switcher is available in the user settings menu and the choice is persisted in localStorage.

**AI opponent (major):** The AI in `ai.ts` uses a rule-based engine that predicts ball trajectory, adjusts difficulty by introducing deliberate reaction delay, and simulates human-like imprecision. It can win against a passive player. Customisation options (speed, difficulty) are respected by the AI.

**WAF + Vault (major/cybersecurity):** Nginx with ModSecurity v3 and OWASP CRS 4 at paranoia level 3 is the single public entry point. Anomaly score threshold is set to 10 to balance detection rate and false positives. HashiCorp Vault stores the JWT secret and database credentials; secrets are injected at container startup via Vault AppRole auth — no secrets are stored in plain text on disk or in environment variables in production.

**Monitoring (major/DevOps):** Prometheus scrapes `/metrics` on all FastAPI services via `prometheus-fastapi-instrumentator`. Grafana provides dashboards for request rates, error rates, latency histograms, and container health. Alertmanager is configured for critical service-down alerts.

**Microservices (major/DevOps):** Five independent FastAPI services (user, profile, friends, chat, game) each with their own PostgreSQL schema and no shared database state. The API gateway handles authentication, routing, and inter-service HTTP calls via httpx. Services are loosely coupled and can be rebuilt independently.

**GDPR compliance (minor):** Users can download all their personal data as a JSON file and permanently delete their account. The deletion flow anonymises public chat messages (`sender_user_id = 0`), deletes private messages bilaterally, blacklists the JWT, and closes active WebSocket connections.

**Game customisation (minor):** `GameSettings.tsx` exposes controls for theme (colours / background), game duration, and target score. Default values are always available. The AI opponent respects all customisation settings.

**Complete web-based game (major):** A Headball-style browser game with a full physics engine (gravity, bounce, collision), real-time rendering on HTML5 Canvas, solo mode vs AI, and local 2-player mode on the same screen. Win/loss conditions and game rules are clearly displayed.

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
- Produced evaluation documentation and the defense plan (README/evaluation_fr.md)
- Coordinated between team members to ensure module requirements were fully met
- *Challenge:* Keeping the scope realistic given the timeline while reaching 14 module points.

**ilkaddou — Developer (Frontend & Gameplay)**
- Built the React + TypeScript frontend: all pages, routing, component library
- Implemented the WebSocket client (Socket.IO) for real-time chat and game events
- Developed the browser game engine: physics, collision detection, rendering
- Implemented the AI opponent (rule-based, adjustable difficulty)
- Added internationalisation with react-i18next (EN/FR/ES)
- Integrated all i18n translations and the language switcher
- *Challenge:* ModSecurity false positives on Vite dev assets (/@vite/, /src/). Resolved with targeted `modsecurity off` exclusions in nginx.conf.

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
- Added game statistics and match history endpoints
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

# Check WAF logs
docker logs -f transcendence_waf_1

# Connect to the services database
docker exec -it <transcendence-DB> -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

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
- [SQLAlchemy documentation](https://docs.sqlalchemy.org/) — ORM models, sessions, Alembic migrations
- [HashiCorp Vault documentation](https://developer.hashicorp.com/vault/docs) — AppRole auth, KV secrets engine, agent injection
- [Prometheus documentation](https://prometheus.io/docs/) — scrape configs, recording rules, alerting
- [react-i18next documentation](https://react.i18next.com/) — translation files, language detection
- [Socket.IO documentation](https://socket.io/docs/) — rooms, events, namespaces
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — threat model reference for WAF rule tuning
- [RFC 7235](https://datatracker.ietf.org/doc/html/rfc7235) — HTTP authentication
- [RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750) — Bearer token usage

### How AI was used in this project

AI tools (primarily Chat-gpt) were used for the following tasks:

- **Code review assistance:** Identifying the `NotNullViolation` bug in the private message creation flow and proposing the find-and-explain errors and fix.
- **WAF configuration debugging:** Analysing Nginx and ModSecurity logs to identify the root cause of rate limit false positives (rate limit was keyed by IP rather than user ID; two users on the same machine were sharing a counter). AI helped explain the anomaly scoring mechanism and suggested the fix (key by JWT `sub` claim via Redis).
- **Explaining complex configuration syntax:** Deep-dive explanations of `limit_req_zone`, `location` priority rules, `resolver`/`resolve` DNS behaviour, ModSecurity phase processing, and OWASP CRS paranoia levels — used to build genuine understanding before writing or modifying configuration.

All AI-generated content was reviewed and validated by the responsible team member before being committed. No code was merged that a team member could not explain and defend during evaluation.