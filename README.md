# ft_transcendence

ft_transcendence is a full-stack social gaming platform built as a microservice-based web application.
It combines authentication, user profiles, friends, real-time chat, multiplayer gameplay, data export,
and secure deployment behind a WAF.

## Project Overview

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: FastAPI microservices
- Database: PostgreSQL per service
- Edge: Nginx + ModSecurity + OWASP CRS
- Secrets: HashiCorp Vault
- Realtime: Socket.IO / WebSockets
- Monitoring: Prometheus + Grafana + Alertmanager

The application is exposed through the WAF and the public entrypoint is the single origin at
`https://localhost:8443` or `http://localhost:8080` in development.

## Team Organization

Main contributors from the Git history:

- Andy Kammerer
- Sabry Ferrad
- Ilias Kaddouri
- Idriss Taharbouche
- Mohamed Bilal El Halimi

Recommended role split for evaluation:

| Role | Suggested owner |
| --- | --- |
| Product Owner | Sabry Ferrad |
| Project Manager / Scrum Master | Idriss Taharbouche |
| Technical Lead / Architect | Andy Kammerer |
| Developers | Ilias Kaddouri, Mohamed Bilal El Halimi |

## Main Features

- Secure email/password authentication with hashed passwords
- User profile page with avatar upload, bio, country, and language
- Friends system with online presence
- Real-time chat and direct messages
- Solo and local gameplay modes
- Data export and account deletion flows
- Internationalization in English, French, and Spanish
- Privacy Policy and Terms of Service pages accessible from the application footer

## Privacy Policy and Terms of Service

These pages are implemented in the frontend and are reachable from the global footer links:

- Privacy Policy: `/privacy-policy`
- Terms of Service: `/terms-of-service`

They describe the data handled by the project, including account data, profile data, chat data,
friends relationships, avatar uploads, exports, and deletion flows.

## Module Selection and Scoring

### Validated Modules (22 points)

| # | Module | Type | Points | Status | Proof Location |
|---|--------|------|--------|--------|----------------|
| 1 | Framework (frontend: React + TypeScript, backend: FastAPI) | Major | 2 | ✅ Validé | [srcs/frontend/](srcs/frontend/), [srcs/backend/api-gateway/](srcs/backend/api-gateway/) |
| 2 | Real-time features (WebSockets via Socket.IO) | Major | 2 | ✅ Validé | [srcs/backend/api-gateway/app/websocket.py](srcs/backend/api-gateway/app/websocket.py), [srcs/frontend/src/chat/](srcs/frontend/src/chat/) |
| 3 | User interaction (chat, friends, profiles, presence) | Major | 2 | ✅ Validé | [srcs/backend/chat-service/](srcs/backend/chat-service/), [srcs/backend/friends-service/](srcs/backend/friends-service/), [srcs/backend/profile-service/](srcs/backend/profile-service/) |
| 4 | Standard user management & authentication | Major | 2 | ✅ Validé | [srcs/backend/user-service/](srcs/backend/user-service/), password hashing + JWT tokens |
| 5 | ORM (SQLAlchemy) | Minor | 1 | ✅ Validé | [srcs/backend/*/app/models.py](srcs/backend/), ORM layer for all services |
| 6 | Internationalization (3 languages: EN, FR, ES) | Minor | 1 | ✅ Validé | [srcs/frontend/public/locales/](srcs/frontend/public/locales/), i18next configuration |
| 7 | AI Opponent (game engine with AI logic) | Major | 2 | ✅ Validé | [srcs/frontend/src/Gameplay/engine/](srcs/frontend/src/Gameplay/engine/), ai.ts behavioral logic |
| 8 | WAF + Vault (ModSecurity + HashiCorp Vault) | Major | 2 | ✅ Validé | [srcs/waf/](srcs/waf/), [srcs/vault/](srcs/vault/) |
| 9 | Monitoring (Prometheus + Grafana) | Major | 2 | ✅ Validé | [srcs/monitoring/](srcs/monitoring/), metrics exposure on all services |
| 10 | Microservices architecture | Major | 2 | ✅ Validé | [srcs/backend/](srcs/backend/) - user, chat, friends, game, profile, api-gateway |
| 11 | GDPR compliance (data export + account deletion) | Minor | 1 | ✅ Validé | [srcs/backend/profile-service/app/main.py](srcs/backend/profile-service/app/main.py) delete endpoint |
| 12 | Game customization options | Minor | 1 | ✅ Validé | [srcs/frontend/src/Gameplay/GameSettings.tsx](srcs/frontend/src/Gameplay/), theme/duration/score settings |
| 13 | Complete web-based game (solo + local multiplayer) | Major | 2 | ✅ Validé | [srcs/frontend/src/Gameplay/](srcs/frontend/src/Gameplay/), full game engine with engine, physics, AI |

**Conservative Total: 22 points** (minimum threshold is 14 points)

### In Progress Modules (Not Counted)

| # | Module | Type | Points | Status | Notes |
|---|--------|------|--------|--------|-------|
| 14 | Remote players (real-time multiplayer sync) | Major | 0 | 🔄 En cours | Network sync foundation exists but not fully implemented |
| 15 | Game statistics & match history | Minor | 0 | 🔄 En cours | Backend data collection present, UI/stats module incomplete |

**Important**: These modules are NOT counted in the final score because they are incomplete or partially implemented. Per evaluation criteria, only fully functional modules count.

## Security and Architecture Notes

- The WAF is the single public entrypoint and routes `/` to the frontend and `/api/*` to the API gateway.
- ModSecurity is enabled globally and tuned with targeted exclusions only where needed.
- Vault is used to keep credentials out of the codebase.
- Passwords are hashed server-side.
- User-facing forms are validated both in the frontend and backend.

## Setup

The project is designed to start with a single compose command from `srcs/`:

```bash
docker compose up --build
```

For Podman, use the equivalent `podman compose` / `podman-compose` command in the same folder.

## Development Endpoints

- Frontend + API via WAF: `http://localhost:8080`
- HTTPS via WAF: `https://localhost:8443`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`
- Mailhog: `http://localhost:8025`
