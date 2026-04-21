# Global Food Security Monitor

A dashboard for monitoring global food security conditions, aggregating data from IPC, FAO, WFP, FEWS NET, and UNICEF.

> 🛠️ **Modernization in progress** — The original PHP/jQuery/MySQL stack is being replaced. The backend has been rewritten in **Node.js + TypeScript (Fastify)** and lives in [`backend/`](./backend). A new frontend lives in [`frontend/`](./frontend). See [MODERNIZATION_PLAN.md](./MODERNIZATION_PLAN.md) for the full roadmap.

## Current Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js 22 + TypeScript + Fastify (in `backend/`) |
| Frontend | Modern SPA (in `frontend/`) — replaces the legacy jQuery UI |
| Database | MySQL 8.0 |
| Container runtime | Docker + Docker Compose |

## Project Structure

```
├── backend/               # Node.js + TypeScript + Fastify API (Dockerfile lives here)
├── frontend/              # Frontend SPA
├── db.sql                 # Database schema + seed data (loaded by MySQL container init)
├── docker-compose.yml     # App + MySQL one-command setup
├── Makefile               # Convenience commands (run, dev, stop, clean, logs)
├── MODERNIZATION_PLAN.md  # 7-phase modernization roadmap
└── README.md
```

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

## Quick Start

```bash
make run
```

This builds and starts the **Node/TypeScript API** at **http://localhost:8000** plus a MySQL 8 container. The API is JSON-only (no UI is served by the backend) — to use the dashboard, run the frontend separately:

```bash
cd frontend && npm run dev
```

Other commands:

| Command | Description |
|---------|-------------|
| `make run` | Build and start the backend + MySQL via Docker |
| `make dev` | Install backend deps and run `npm run dev` (tsx watch) locally without Docker |
| `make stop` | Stop all containers |
| `make clean` | Stop and remove all containers + data volumes |
| `make logs` | Follow container logs |

MySQL is also exposed on **localhost:3307** (user: `root`, password: `root_password_123`).

## Backend (TypeScript)

The backend is a Fastify app written in TypeScript and lives in [`backend/`](./backend).

**Run it:**

- **Docker (recommended):** `make run` — builds [`backend/Dockerfile`](./backend/Dockerfile) (multi-stage Node 22 Alpine), starts MySQL, and exposes the API on port 8000.
- **Local dev:** `make dev` — runs `npm install && npm run dev` inside `backend/` for fast tsx-watch reloads. You'll need a MySQL instance reachable via the env vars below (the easiest is `docker compose up -d db`).

**Environment variables** are documented in [`backend/.env.example`](./backend/.env.example). Key ones:

| Var | Purpose |
|---|---|
| `PORT` | HTTP port (default `8000`) |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASS` | MySQL connection |
| `SESSION_SECRET` | Signing secret for session cookies (≥ 32 chars) |
| `CORS_ORIGIN` | Allowed CORS origin(s) for the frontend |
| `FAO_API_BASE` / `FAO_API_KEY` | FAO upstream proxy config |
| `WFP_API_BASE` / `WFP_API_KEY` | WFP upstream proxy config |

**API surface (selected):**

| Endpoint | Description |
|---|---|
| `GET /health` | Liveness/health check (used by the Docker healthcheck) |
| `GET /api/countries` | List monitored countries |
| `GET /api/dashboard/summary` | Aggregated KPI data for the dashboard |
| `POST /api/auth/login` | Session-based authentication |
| `GET /api_proxy.php?action=...` | **Drop-in compatibility shim** for the legacy PHP proxy — supports the same `action=` values (`countries`, `country_detail`, `ipc_data`, `alerts`, `commodity_prices`, `nutrition`, `dashboard_summary`, `fao_*`, `wfp_*`, `login`, `logout`) so existing clients keep working during the migration. |

## Features

- **Dashboard** — KPI cards, IPC phase distribution chart, nutrition indicators chart, alert feed
- **Alerts** — Food security alerts with severity filtering (emergency, critical, warning, info)
- **Countries** — Searchable country list with region filtering and detail modals
- **Prices** — Commodity price data with charts and data tables
- **Country Detail** — Per-country view with IPC history, active alerts, prices, and nutrition data

## Data Sources

> **Note:** The application ships with **mock seed data** in `db.sql`. The local dashboard (countries, IPC classifications, alerts, prices, nutrition) works out of the box with this sample data. The external API proxy endpoints (`fao_*`, `wfp_*`) require valid API keys to return real data — without them those calls will fail, but the rest of the app is fully functional.

### Sources

- **[IPC](https://www.ipcinfo.org/)** — Integrated Food Security Phase Classification
- **[FAO/FAOSTAT](https://www.fao.org/faostat/)** — Food and agriculture statistics
- **[WFP VAM](https://dataviz.vam.wfp.org/)** — Vulnerability Analysis and Mapping
- **[FEWS NET](https://fews.net/)** — Famine Early Warning Systems Network
- **[UNICEF](https://data.unicef.org/)** — Child nutrition data

### Connecting to Real APIs

To use live data from external APIs, set the relevant keys in `backend/.env` (see [`backend/.env.example`](./backend/.env.example)):

| API | Auth Type | How to Get Access |
|-----|-----------|-------------------|
| **WFP Data Bridges** | Bearer token (API key) | Sign up at [databridges.vam.wfp.org](https://databridges.vam.wfp.org/), wait for approval, then generate a key in the API Access section. Drop-in replacement for `WFP_API_KEY`. |
| **FAOSTAT** | JWT (email + password) | Register at [fao.org/faostat](https://www.fao.org/faostat/en/#data). Auth uses short-lived JWT tokens (60 min) — the current proxy sends a static key, so production use would need token refresh logic. |
| **FEWS NET** | None (public) | No key required. Most endpoints are open at [fews.net/fews-net/1](https://fews.net/fews-net/1). |

## Modernization

See [MODERNIZATION_PLAN.md](./MODERNIZATION_PLAN.md) for the 7-phase modernization roadmap:

1. **Phase 1:** Containerization (Docker) & environment config
2. **Phase 2:** Backend rewrite (PHP → Node.js + TypeScript + Fastify) ✅ in progress
3. **Phase 3:** Frontend modernization (jQuery → React/Vite)
4. **Phase 4:** API gateway, caching (Redis), rate limiting
5. **Phase 5:** CI/CD pipeline, testing, observability
6. **Phase 6:** Cloud-native deployment (Kubernetes)
7. **Phase 7:** ML-powered food security forecasting

## Disclaimer

This is a monitoring tool for informational purposes only. Food security assessments should be verified against official IPC/CH analyses and humanitarian situation reports before being used for operational decision-making.
