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
| Product Owner | Fill with your actual team member |
| Project Manager / Scrum Master | Fill with your actual team member |
| Technical Lead / Architect | Fill with your actual team member |
| Developers | Fill with your actual team members |

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

## Module Selection

Conservative module count used by this project:

- Frontend framework: 1 point
- Backend framework: 1 point
- WebSockets / realtime: 2 points
- User interaction: 2 points
- User management: 2 points
- ORM: 1 point
- Internationalization: 1 point
- Advanced chat features: 1 point
- GDPR / data export / deletion: 1 point
- Cybersecurity: WAF + Vault: 2 points
- DevOps: Monitoring with Prometheus + Grafana: 2 points
- DevOps: Microservices architecture: 2 points

Total conservative score: 18 points.

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
