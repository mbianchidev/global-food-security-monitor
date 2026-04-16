# Global Food Security Monitor

A dashboard for monitoring global food security conditions, aggregating data from IPC, FAO, WFP, FEWS NET, and UNICEF.

> ⚠️ **Legacy Application** — This is an intentionally legacy PHP/jQuery/MySQL application with known technical debt. See [MODERNIZATION_PLAN.md](./MODERNIZATION_PLAN.md) for the roadmap to modernize it.

## Current Stack

| Component | Technology |
|-----------|------------|
| Backend | PHP 7.4+ (monolithic) |
| Frontend | jQuery 3.7, Chart.js 4, DataTables 1.13, Bootstrap 4 |
| Database | MySQL 5.7+ / MariaDB 10.3+ |
| Web Server | Apache with `mod_php` or Nginx + PHP-FPM |

## Project Structure

```
├── index.php              # Monolithic entry point (HTML + CSS + JS + PHP)
├── config.php             # Configuration with hardcoded credentials (!)
├── api_proxy.php          # API proxy for local data + external APIs (no caching)
├── db.sql                 # Database schema + seed data (no migrations)
├── Dockerfile             # PHP 8.2 + Apache container
├── docker-compose.yml     # App + MySQL one-command setup
├── Makefile               # Convenience commands (run, stop, clean, logs)
├── MODERNIZATION_PLAN.md  # 7-phase modernization roadmap
└── README.md
```

## Known Technical Debt (Intentional)

This application was built as a legacy baseline. The following issues are **by design**:

- 🔴 Hardcoded database credentials in `config.php`
- 🔴 Hardcoded API keys in source code
- 🔴 SSL verification disabled on external API calls
- 🟠 No `.env` file — all config hardcoded
- 🟠 No caching on API proxy — every request hits upstream
- 🟠 No authentication on the dashboard
- 🟡 No tests, no CI/CD
- 🟡 No database migrations
- 🟡 Monolithic PHP with inline CSS/JS
- 🟡 jQuery + global mutable state

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

## Quick Start

```bash
make run
```

That's it. Open **http://localhost:8000** once the containers are ready.

Other commands:

| Command | Description |
|---------|-------------|
| `make run` | Build and start the app + MySQL |
| `make stop` | Stop all containers |
| `make clean` | Stop and remove all containers + data volumes |
| `make logs` | Follow container logs |

MySQL is also exposed on **localhost:3307** (user: `root`, password: `root_password_123`).

### Manual Setup (without Docker)

<details>
<summary>Click to expand</summary>

Requires PHP 7.4+ (with `pdo_mysql`, `curl`, `json`, `mbstring`) and MySQL 5.7+.

1. Create the database:
   ```bash
   mysql -u root -p < db.sql
   ```
2. Edit `config.php` — update `DB_USER` and `DB_PASS` to match your local MySQL.
3. Start the dev server:
   ```bash
   php -S localhost:8000
   ```
4. Open http://localhost:8000

</details>

## Features

- **Dashboard** — KPI cards, IPC phase distribution chart, nutrition indicators chart, alert feed
- **Alerts** — Food security alerts with severity filtering (emergency, critical, warning, info)
- **Countries** — Searchable country list with region filtering and detail modals
- **Prices** — Commodity price data with charts and data tables
- **Country Detail** — Per-country view with IPC history, active alerts, prices, and nutrition data

## API Endpoints

All API requests go through `api_proxy.php?action=<action>`:

| Action | Method | Description |
|--------|--------|-------------|
| `countries` | GET | List all monitored countries |
| `country_detail` | GET | Full country profile (`?iso3=AFG`) |
| `ipc_data` | GET | IPC classifications |
| `alerts` | GET | Food security alerts (`?severity=emergency`) |
| `commodity_prices` | GET | Commodity price data |
| `nutrition` | GET | Child nutrition indicators |
| `dashboard_summary` | GET | Aggregated KPI data |
| `fao_food_prices` | GET | Proxy to FAO food price API |
| `fao_production` | GET | Proxy to FAO production API |
| `wfp_food_security` | GET | Proxy to WFP food security API |
| `wfp_market_prices` | GET | Proxy to WFP market prices API |
| `wfp_economic_data` | GET | Proxy to WFP economic data API |
| `login` | POST | Session-based authentication |
| `logout` | GET | Destroy session |

## Data Sources

- **[IPC](https://www.ipcinfo.org/)** — Integrated Food Security Phase Classification
- **[FAO/FAOSTAT](https://www.fao.org/faostat/)** — Food and agriculture statistics
- **[WFP VAM](https://dataviz.vam.wfp.org/)** — Vulnerability Analysis and Mapping
- **[FEWS NET](https://fews.net/)** — Famine Early Warning Systems Network
- **[UNICEF](https://data.unicef.org/)** — Child nutrition data

## Modernization

See [MODERNIZATION_PLAN.md](./MODERNIZATION_PLAN.md) for the 7-phase modernization roadmap:

1. **Phase 1:** Containerization (Docker) & environment config
2. **Phase 2:** Backend rewrite (PHP → Python/FastAPI)
3. **Phase 3:** Frontend modernization (jQuery → React/Vite)
4. **Phase 4:** API gateway, caching (Redis), rate limiting
5. **Phase 5:** CI/CD pipeline, testing, observability
6. **Phase 6:** Cloud-native deployment (Kubernetes)
7. **Phase 7:** ML-powered food security forecasting

## Disclaimer

This is a monitoring tool for informational purposes only. Food security assessments should be verified against official IPC/CH analyses and humanitarian situation reports before being used for operational decision-making.
