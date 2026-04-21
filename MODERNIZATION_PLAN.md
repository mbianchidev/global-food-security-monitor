# Global Food Security Monitor — Modernization Plan

> **Status:** Planning  
> **Current State:** Legacy monolithic PHP/jQuery/MySQL application  
> **Target State:** Cloud-native, ML-powered food security monitoring platform

---

## Executive Summary

The Global Food Security Monitor is currently a monolithic PHP application with hardcoded credentials, no containerization, no tests, and no CI/CD pipeline. This document outlines a 7-phase modernization roadmap to transform it into a production-grade, cloud-native platform with machine learning capabilities for food security forecasting.

### Current Architecture (Legacy)

```
┌─────────────────────────────────────────┐
│              Browser (Client)            │
│  jQuery 3.7 + Chart.js + DataTables     │
└──────────────────┬──────────────────────┘
                   │ HTTP
┌──────────────────▼──────────────────────┐
│           Apache/Nginx + PHP            │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ │
│  │index.php│ │config.php│ │api_proxy │ │
│  │(monolith)│ │(hardcoded│ │  .php    │ │
│  │HTML+CSS │ │  creds)  │ │(no cache)│ │
│  │+JS+PHP  │ └──────────┘ └──────────┘ │
│  └─────────┘                            │
└──────────────────┬──────────────────────┘
                   │ PDO
┌──────────────────▼──────────────────────┐
│              MySQL 5.7+                 │
│         (no migrations, raw SQL)        │
└─────────────────────────────────────────┘
```

### Target Architecture (Post-Modernization)

```
┌────────────────────────────────────────────────────────────────────┐
│                        CDN (CloudFront/Cloudflare)                 │
└───────────────────────────┬────────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────────┐
│                     React SPA (Vite + TypeScript)                  │
│              Mapbox GL │ Recharts │ TanStack Table                 │
└───────────────────────────┬────────────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼────────────────────────────────────────┐
│                      API Gateway (Kong / Traefik)                  │
│              Rate limiting │ Auth │ Request routing                │
└──────┬─────────────┬──────────────┬──────────────┬─────────────────┘
       │             │              │              │
┌──────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐ ┌────▼──────────┐
│  Data API   │ │ Auth API │ │ Alert API  │ │ ML Forecast   │
│  (FastAPI)  │ │ (FastAPI)│ │ (FastAPI)  │ │   Service     │
└──────┬──────┘ └────┬─────┘ └─────┬──────┘ └────┬──────────┘
       │             │              │              │
┌──────▼─────────────▼──────────────▼──────────────▼─────────────────┐
│                     Service Mesh (Kubernetes)                       │
└──────┬─────────────┬──────────────┬──────────────┬─────────────────┘
       │             │              │              │
┌──────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐ ┌────▼──────────┐
│ PostgreSQL  │ │  Redis   │ │ TimescaleDB│ │  ML Model     │
│  (primary)  │ │ (cache)  │ │ (time-ser.)│ │  Registry     │
└─────────────┘ └──────────┘ └────────────┘ └───────────────┘
```

---

## Known Technical Debt (Current State)

| Issue | Severity | File(s) |
|-------|----------|---------|
| Hardcoded database credentials | 🔴 Critical | `config.php` |
| Hardcoded API keys in source | 🔴 Critical | `config.php` |
| SSL verification disabled | 🔴 Critical | `api_proxy.php` |
| No authentication on dashboard | 🟠 High | `index.php` |
| No input sanitization on some params | 🟠 High | `api_proxy.php` |
| No caching — every request hits upstream | 🟠 High | `api_proxy.php` |
| No database migrations | 🟡 Medium | `db.sql` |
| No tests of any kind | 🟡 Medium | — |
| No CI/CD pipeline | 🟡 Medium | — |
| No error boundaries in JS | 🟡 Medium | `index.php` |
| Monolithic PHP with inline CSS/JS | 🟡 Medium | `index.php` |
| No `.env` / environment separation | 🟡 Medium | `config.php` |
| jQuery + global state management | 🟢 Low | `index.php` |
| CDN dependencies with no SRI hashes | 🟢 Low | `index.php` |
| No accessibility considerations | 🟢 Low | `index.php` |

---

## Phase 1: Containerization & Environment Configuration

**Goal:** Make the application runnable anywhere with proper secrets management.

### 1.1 Docker Setup

- Create `Dockerfile` for the PHP application (Apache + PHP 8.2 + required extensions)
- Create `docker-compose.yml` with services:
  - `app` — PHP/Apache container
  - `db` — MySQL 8.0 container
  - `adminer` — Database admin UI (development only)
- Add `.dockerignore` for build optimization

### 1.2 Environment Configuration

- Create `.env.example` with all configuration variables (no real values)
- Refactor `config.php` to read from environment variables with fallbacks
- Use `getenv()` / `$_ENV` instead of hardcoded `define()` constants
- Add validation for required environment variables at startup

### 1.3 Secrets Management

- Remove all hardcoded credentials from source code
- Use Docker secrets or environment variables for sensitive data
- Add pre-commit hook to scan for accidental credential commits (e.g., `gitleaks`)

### 1.4 Database Initialization

- Convert `db.sql` into an initialization script that runs on first container start
- Add seed data script separate from schema
- Add health check endpoint (`/health`) for container orchestration

### Deliverables
- [ ] `Dockerfile`
- [ ] `docker-compose.yml`
- [ ] `.env.example`
- [ ] Refactored `config.php` with env var support
- [ ] `/health` endpoint
- [ ] `.dockerignore`
- [ ] Pre-commit hook configuration

---

## Phase 2: Backend Rewrite (PHP → Python/FastAPI)

> **Update — chosen stack:** The backend is being rewritten in **Node.js + TypeScript + Fastify** (not Python/FastAPI as originally scoped below). The high-level architecture, endpoint surface, caching, and migration goals described in this section still apply — only the language/framework choice has changed. The implementation lives in `backend/`.

**Goal:** Replace the monolithic PHP backend with a modern, typed, async Python API.

### 2.1 Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry
│   ├── config.py             # Pydantic settings (env-based)
│   ├── database.py           # SQLAlchemy async engine
│   ├── models/               # SQLAlchemy ORM models
│   │   ├── country.py
│   │   ├── ipc.py
│   │   ├── alert.py
│   │   ├── commodity.py
│   │   ├── nutrition.py
│   │   └── user.py
│   ├── schemas/              # Pydantic request/response schemas
│   │   ├── country.py
│   │   ├── ipc.py
│   │   ├── alert.py
│   │   └── commodity.py
│   ├── routers/              # API route handlers
│   │   ├── countries.py
│   │   ├── ipc.py
│   │   ├── alerts.py
│   │   ├── commodities.py
│   │   ├── nutrition.py
│   │   ├── dashboard.py
│   │   ├── external_apis.py
│   │   └── auth.py
│   ├── services/             # Business logic layer
│   │   ├── data_aggregation.py
│   │   ├── external_api.py
│   │   └── auth.py
│   └── middleware/
│       ├── cors.py
│       ├── logging.py
│       └── error_handler.py
├── alembic/                  # Database migrations
│   ├── versions/
│   └── env.py
├── tests/
│   ├── conftest.py
│   ├── test_countries.py
│   ├── test_ipc.py
│   ├── test_alerts.py
│   └── test_dashboard.py
├── alembic.ini
├── pyproject.toml
├── requirements.txt
└── Dockerfile
```

### 2.2 Key Technical Decisions

- **Framework:** FastAPI (async, auto-docs, type validation)
- **ORM:** SQLAlchemy 2.0 with async support
- **Migrations:** Alembic for version-controlled schema changes
- **Validation:** Pydantic v2 models for all request/response contracts
- **Auth:** JWT-based authentication (replacing session-based PHP auth)
- **Database:** Migrate from MySQL to PostgreSQL
- **HTTP Client:** `httpx` (async) for external API calls, replacing `curl`

### 2.3 Migration Strategy

1. Stand up FastAPI service alongside existing PHP app
2. Implement all existing `api_proxy.php` endpoints as FastAPI routes
3. Add OpenAPI/Swagger documentation (auto-generated by FastAPI)
4. Run both services in parallel, route traffic gradually
5. Validate data parity between PHP and Python responses
6. Decommission PHP backend once all traffic is migrated

### 2.4 Database Migration (MySQL → PostgreSQL)

- Write Alembic migration scripts to create PostgreSQL schema
- Create data migration script to transfer existing MySQL data
- Add proper indexes, constraints, and foreign keys
- Implement connection pooling with `asyncpg`

### Deliverables
- [ ] FastAPI application with all endpoints
- [ ] SQLAlchemy models + Alembic migrations
- [ ] Pydantic schemas for all data contracts
- [ ] JWT authentication system
- [ ] Auto-generated API documentation
- [ ] PostgreSQL migration scripts
- [ ] Backend Dockerfile
- [ ] Unit + integration tests (>80% coverage target)

---

## Phase 3: Frontend Modernization (jQuery → React)

**Goal:** Replace inline jQuery with a modern React SPA for better UX and maintainability.

### 3.1 Project Structure

```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── api/                  # API client (axios/fetch wrapper)
│   │   └── client.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── dashboard/
│   │   │   ├── KPICards.tsx
│   │   │   ├── IPCChart.tsx
│   │   │   ├── AlertsFeed.tsx
│   │   │   ├── NutritionChart.tsx
│   │   │   └── WorldMap.tsx
│   │   ├── countries/
│   │   │   ├── CountryList.tsx
│   │   │   ├── CountryDetail.tsx
│   │   │   └── CountryCard.tsx
│   │   ├── alerts/
│   │   │   ├── AlertList.tsx
│   │   │   └── AlertCard.tsx
│   │   ├── prices/
│   │   │   ├── PriceTable.tsx
│   │   │   └── PriceChart.tsx
│   │   └── common/
│   │       ├── Loading.tsx
│   │       ├── ErrorBoundary.tsx
│   │       └── IPCBadge.tsx
│   ├── hooks/
│   │   ├── useCountries.ts
│   │   ├── useAlerts.ts
│   │   └── useDashboard.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   └── formatters.ts
│   └── styles/
│       └── globals.css
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── Dockerfile
└── nginx.conf
```

### 3.2 Key Technical Decisions

- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite (fast builds, HMR)
- **State Management:** TanStack Query (server state) + Zustand (client state)
- **Routing:** React Router v6
- **Charting:** Recharts or Chart.js react wrapper
- **Maps:** Mapbox GL JS or Leaflet for geospatial visualization
- **Data Tables:** TanStack Table (replacing jQuery DataTables)
- **Styling:** Tailwind CSS (replacing inline styles)
- **Testing:** Vitest + React Testing Library + Playwright (E2E)

### 3.3 Migration Strategy

1. Set up Vite + React project in `frontend/` directory
2. Build component library matching existing UI (dark theme)
3. Implement API client connecting to new FastAPI backend
4. Port each tab (Dashboard, Alerts, Countries, Prices) as React routes
5. Add interactive world map with IPC phase coloring
6. Implement real-time updates with WebSockets or SSE
7. Accessibility audit and WCAG 2.1 AA compliance

### 3.4 New Frontend Features

- Interactive choropleth world map
- Real-time alert notifications
- Advanced filtering and search
- Data export (CSV, PDF)
- Responsive mobile layout
- Dark/light theme toggle
- Offline support (service worker)

### Deliverables
- [ ] React + TypeScript SPA
- [ ] All existing views ported to React components
- [ ] Interactive world map component
- [ ] Responsive design (mobile-first)
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Frontend Dockerfile + nginx config
- [ ] Component tests + E2E tests

---

## Phase 4: API Gateway, Caching & Rate Limiting

**Goal:** Add infrastructure for performance, reliability, and security.

### 4.1 API Gateway

- Deploy Kong or Traefik as API gateway
- Configure routing rules for backend services
- Implement request/response transformation
- Add API versioning (`/api/v1/`, `/api/v2/`)
- Set up mutual TLS between services

### 4.2 Caching Layer (Redis)

- Deploy Redis for multi-level caching:
  - **API response cache** — Cache external API responses with configurable TTL
  - **Session cache** — Store JWT sessions in Redis
  - **Query cache** — Cache frequently accessed database queries
  - **Rate limit counters** — Track API usage per client
- Cache invalidation strategy:
  - Time-based TTL (external APIs: 1 hour, dashboards: 5 minutes)
  - Event-based invalidation (new data imports trigger cache clear)
- Redis Sentinel for high availability

### 4.3 Rate Limiting

- Client-based rate limiting (per API key)
- Endpoint-based rate limiting (stricter for external API proxies)
- Sliding window algorithm
- Configurable limits:
  - General API: 100 requests/minute
  - Dashboard: 30 requests/minute
  - External API proxy: 10 requests/minute
- Rate limit headers in responses (`X-RateLimit-*`)

### 4.4 External API Resilience

- Circuit breaker pattern for upstream API calls
- Retry with exponential backoff
- Fallback to cached data when upstream is unavailable
- Health monitoring for each external API
- Request queuing for batch operations

### Deliverables
- [ ] API gateway configuration (Kong/Traefik)
- [ ] Redis deployment + caching implementation
- [ ] Rate limiting middleware
- [ ] Circuit breaker for external APIs
- [ ] API versioning
- [ ] Performance benchmarks (before/after)

---

## Phase 5: CI/CD Pipeline, Testing & Observability

**Goal:** Establish automated quality gates and operational visibility.

### 5.1 CI/CD Pipeline (GitHub Actions)

```yaml
# Pipeline stages:
# 1. Lint & Format Check
# 2. Unit Tests
# 3. Integration Tests
# 4. Security Scan (SAST + dependency audit)
# 5. Build Docker Images
# 6. E2E Tests (against staging)
# 7. Deploy to Staging
# 8. Smoke Tests
# 9. Deploy to Production (manual gate)
```

- Branch protection rules (require PR reviews, passing CI)
- Automated dependency updates (Dependabot/Renovate)
- Container image scanning (Trivy/Snyk)
- SAST scanning (Bandit for Python, ESLint security plugin)
- Secret scanning (gitleaks)

### 5.2 Testing Strategy

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Unit (Backend) | pytest + pytest-asyncio | 85% |
| Unit (Frontend) | Vitest + RTL | 80% |
| Integration | pytest + httpx test client | 70% |
| E2E | Playwright | Critical paths |
| API Contract | Schemathesis (OpenAPI fuzz) | All endpoints |
| Load | Locust | Key endpoints |
| Security | Bandit + npm audit | All code |

### 5.3 Observability Stack

- **Metrics:** Prometheus + Grafana
  - Application metrics (request latency, error rates, cache hit ratios)
  - Infrastructure metrics (CPU, memory, disk, network)
  - Business metrics (data freshness, API call volumes)
- **Logging:** Structured JSON logging → ELK Stack or Loki
  - Correlation IDs for request tracing
  - Log levels: ERROR, WARN, INFO, DEBUG
  - Log retention: 30 days hot, 1 year cold
- **Tracing:** OpenTelemetry → Jaeger/Tempo
  - Distributed tracing across all services
  - External API call tracing
- **Alerting:** Grafana alerting or PagerDuty
  - SLO-based alerts (99.5% availability target)
  - Error rate spike detection
  - External API degradation alerts
  - Data staleness alerts (no fresh data in >4 hours)

### 5.4 Dashboards

- **Operations Dashboard:** Service health, error rates, latency percentiles
- **Data Pipeline Dashboard:** API call success rates, data freshness, cache stats
- **Business Dashboard:** User activity, most-viewed countries, alert engagement

### Deliverables
- [ ] GitHub Actions CI/CD pipeline
- [ ] Comprehensive test suite (unit + integration + E2E)
- [ ] Prometheus + Grafana monitoring
- [ ] Structured logging with correlation IDs
- [ ] OpenTelemetry distributed tracing
- [ ] Alerting rules and on-call runbook
- [ ] Dependency update automation

---

## Phase 6: Cloud-Native Deployment (Kubernetes)

**Goal:** Deploy on Kubernetes for scalability, resilience, and operational maturity.

### 6.1 Kubernetes Architecture

```
Namespace: food-security-monitor
├── Deployments
│   ├── api (FastAPI) — 2-5 replicas, HPA
│   ├── frontend (Nginx + React) — 2 replicas
│   ├── redis (StatefulSet) — 3 nodes (Sentinel)
│   ├── ml-service — 1-3 replicas, GPU nodepool
│   └── data-ingestion (CronJob) — hourly
├── Services
│   ├── api-service (ClusterIP)
│   ├── frontend-service (ClusterIP)
│   ├── redis-service (ClusterIP)
│   └── ml-service (ClusterIP)
├── Ingress
│   └── main-ingress (Nginx/Traefik → frontend + api)
├── ConfigMaps
│   ├── app-config
│   └── nginx-config
├── Secrets
│   ├── db-credentials
│   ├── api-keys
│   └── jwt-secret
├── PersistentVolumeClaims
│   ├── postgres-data
│   └── redis-data
└── HPA / VPA
    ├── api-hpa (CPU > 70% → scale up)
    └── ml-service-vpa
```

### 6.2 Infrastructure as Code

- **Helm Charts** for application deployment
- **Terraform** for cloud infrastructure provisioning:
  - Managed Kubernetes (EKS/GKE/AKS)
  - Managed PostgreSQL (RDS/Cloud SQL)
  - Managed Redis (ElastiCache/Memorystore)
  - S3/GCS for ML model storage and data backups
  - CDN for frontend static assets
- **GitOps** with ArgoCD or Flux for declarative deployment

### 6.3 Database

- Managed PostgreSQL with:
  - Read replicas for analytics queries
  - Automated backups (daily + point-in-time recovery)
  - Connection pooling (PgBouncer)
- TimescaleDB extension for time-series data (commodity prices, IPC history)

### 6.4 Security

- Network policies (pod-to-pod communication rules)
- Pod security standards (restricted profile)
- Secrets encryption at rest (KMS)
- RBAC for cluster access
- Container image signing and verification
- Regular vulnerability scanning

### 6.5 Disaster Recovery

- Multi-AZ deployment
- Database replication across AZs
- Automated failover
- RTO: < 15 minutes, RPO: < 1 hour
- Regular DR drills

### Deliverables
- [ ] Helm charts for all services
- [ ] Terraform modules for cloud infrastructure
- [ ] GitOps pipeline (ArgoCD/Flux)
- [ ] Network policies and RBAC
- [ ] Disaster recovery plan and runbook
- [ ] Load testing results and scaling recommendations
- [ ] Cost estimation and optimization plan

---

## Phase 7: ML-Powered Food Security Forecasting

**Goal:** Add predictive analytics to provide early warnings of emerging food crises.

### 7.1 ML Service Architecture

```
ml-service/
├── app/
│   ├── main.py               # FastAPI service entry
│   ├── models/
│   │   ├── ipc_forecaster.py  # IPC phase prediction
│   │   ├── price_forecaster.py # Commodity price forecasting
│   │   ├── crisis_detector.py  # Anomaly detection
│   │   └── risk_scorer.py      # Composite risk scoring
│   ├── features/
│   │   ├── climate.py         # Weather/climate features
│   │   ├── conflict.py        # Conflict event features
│   │   ├── economic.py        # Economic indicators
│   │   └── seasonal.py        # Seasonal patterns
│   ├── training/
│   │   ├── pipeline.py        # Training pipeline
│   │   ├── evaluation.py      # Model evaluation
│   │   └── registry.py        # Model versioning
│   └── inference/
│       ├── predictor.py       # Real-time prediction
│       └── batch.py           # Batch forecasting
├── notebooks/
│   ├── 01_eda.ipynb
│   ├── 02_feature_engineering.ipynb
│   ├── 03_model_training.ipynb
│   └── 04_evaluation.ipynb
├── data/
│   ├── raw/
│   └── processed/
├── models/                    # Serialized model artifacts
├── tests/
├── Dockerfile
└── requirements.txt
```

### 7.2 Forecasting Models

#### IPC Phase Forecaster
- **Input Features:** Historical IPC data, climate data (CHIRPS rainfall, NDVI vegetation index), conflict events (ACLED), commodity prices, economic indicators
- **Model:** Gradient boosted trees (XGBoost/LightGBM) + LSTM for temporal patterns
- **Output:** Predicted IPC phase per country/region for 3-6 month horizon
- **Evaluation:** Accuracy, F1-score per phase, lead time of correct crisis predictions

#### Commodity Price Forecaster
- **Input Features:** Historical prices, global commodity indices, exchange rates, seasonal patterns, trade flow data
- **Model:** Prophet / NeuralProphet for time-series forecasting
- **Output:** Price forecasts with confidence intervals for key commodities per market
- **Evaluation:** MAPE, RMSE, coverage of prediction intervals

#### Crisis Anomaly Detector
- **Input Features:** Multi-source data streams (prices, conflict, climate, displacement)
- **Model:** Isolation Forest + attention-based neural network
- **Output:** Anomaly scores and early warning signals
- **Evaluation:** Precision/recall of early warnings vs. confirmed IPC Phase 3+ outcomes

#### Composite Risk Scorer
- **Input:** Outputs from all above models + static risk factors (fragile states index, infrastructure quality)
- **Model:** Ensemble weighted scoring with domain expert calibration
- **Output:** 0-100 risk score per country with contributing factor breakdown

### 7.3 Data Pipeline

- **Ingestion:** Scheduled jobs (CronJobs) to fetch data from FAO, WFP, CHIRPS, ACLED, World Bank
- **Processing:** Apache Airflow or Prefect for orchestrating ETL pipelines
- **Feature Store:** Store computed features for training and inference consistency
- **Model Training:** Scheduled retraining (weekly) with automatic evaluation
- **Model Registry:** MLflow for model versioning, comparison, and promotion

### 7.4 Integration with Dashboard

- New "Forecasts" tab in the React frontend
- Risk heatmap overlay on the world map
- Trend lines with confidence intervals on charts
- Automated alerts when predicted risk crosses thresholds
- Explainability: display top contributing factors for each prediction

### 7.5 Responsible AI Considerations

- Model documentation (model cards) for each forecasting model
- Bias testing: ensure models don't systematically under-predict for certain regions
- Human-in-the-loop: forecasts are advisory, not automatic triggers
- Regular validation against ground truth from IPC analyses
- Uncertainty quantification: always show confidence intervals

### Deliverables
- [ ] ML service with prediction API endpoints
- [ ] IPC phase forecasting model
- [ ] Commodity price forecasting model
- [ ] Crisis anomaly detection model
- [ ] Data ingestion pipeline (Airflow/Prefect)
- [ ] Model training and evaluation pipeline
- [ ] MLflow model registry
- [ ] Frontend "Forecasts" tab with risk heatmap
- [ ] Model cards and documentation
- [ ] A/B testing framework for model comparison

---

## Implementation Timeline Overview

| Phase | Focus | Dependencies |
|-------|-------|-------------|
| Phase 1 | Containerization & env config | None |
| Phase 2 | Backend rewrite (FastAPI) | Phase 1 |
| Phase 3 | Frontend modernization (React) | Phase 2 |
| Phase 4 | API gateway, caching, rate limiting | Phase 2 |
| Phase 5 | CI/CD, testing, observability | Phase 2 + 3 |
| Phase 6 | Kubernetes deployment | Phase 4 + 5 |
| Phase 7 | ML forecasting | Phase 6 |

> **Note:** Phases 3 and 4 can be executed in parallel once Phase 2 is substantially complete.

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| External API breaking changes | High | Versioned API contracts, integration tests, fallback to cached data |
| Data quality issues from sources | High | Validation pipelines, anomaly detection on ingested data |
| ML model degradation | Medium | Automated monitoring, retraining triggers, fallback to rule-based alerts |
| Cost overruns on cloud infra | Medium | Resource quotas, auto-scaling with limits, regular cost reviews |
| Team skill gaps (ML/K8s) | Medium | Training budget, pair programming, phased rollout |
| Upstream API rate limits | Low | Request queuing, caching, negotiate higher limits |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Page load time | ~3s | < 1s |
| API response time (p95) | ~800ms | < 200ms |
| External API cache hit rate | 0% | > 80% |
| Test coverage | 0% | > 80% |
| Deployment frequency | Manual | Multiple per day |
| Mean time to recovery | Hours | < 15 minutes |
| Crisis prediction lead time | N/A | > 30 days |
| Forecast accuracy (IPC phase) | N/A | > 75% |
