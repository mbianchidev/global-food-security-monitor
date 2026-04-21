import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { query, queryOne, type Row } from '../db.js';
import { registerLegacyAction, registerLegacyDispatcher } from './_legacy.js';

export { dispatchLegacyAction } from './_legacy.js';

const boolish = z
  .union([z.literal('1'), z.literal('0'), z.literal('true'), z.literal('false'), z.boolean()])
  .transform((v) => v === true || v === '1' || v === 'true');

const countriesQuery = z.object({
  region: z.string().min(1).optional(),
});

const countryDetailParams = z.object({
  iso3: z.string().min(1),
});

const ipcQuery = z.object({
  country_id: z.coerce.number().int().positive().optional(),
});

const alertsQuery = z.object({
  severity: z.enum(['info', 'warning', 'critical', 'emergency']).optional(),
  active_only: boolish.optional().default(true),
});

const commodityPricesQuery = z.object({
  country_id: z.coerce.number().int().positive().optional(),
  commodity: z.string().min(1).optional(),
});

const nutritionQuery = z.object({
  country_id: z.coerce.number().int().positive().optional(),
});

type ApiOk<T> = { status: 'ok'; data: T };
type ApiErr = { status: 'error'; message: string };

function ok<T>(data: T): ApiOk<T> {
  return { status: 'ok', data };
}

function err(reply: FastifyReply, code: number, message: string): ApiErr {
  reply.code(code);
  return { status: 'error', message };
}

// ---------------------------------------------------------------------------
// Handlers — each mirrors the equivalent `case` in api_proxy.php exactly.
// ---------------------------------------------------------------------------

async function handleCountries(req: FastifyRequest): Promise<unknown> {
  const { region } = countriesQuery.parse(req.query ?? {});
  const params: unknown[] = [];
  let sql = 'SELECT * FROM countries';
  if (region) {
    sql += ' WHERE region = ?';
    params.push(region);
  }
  sql += ' ORDER BY name ASC';
  return ok(await query(sql, params));
}

async function handleCountryDetail(
  req: FastifyRequest,
  reply: FastifyReply,
  iso3Override?: string,
): Promise<unknown> {
  const iso3Raw =
    iso3Override ??
    (req.params as { iso3?: string } | undefined)?.iso3 ??
    (req.query as { iso3?: string } | undefined)?.iso3 ??
    '';
  if (!iso3Raw) {
    return err(reply, 400, 'Missing iso3 parameter');
  }
  const { iso3 } = countryDetailParams.parse({ iso3: iso3Raw });

  const country = await queryOne<Row & { id: number }>(
    'SELECT * FROM countries WHERE iso3 = ?',
    [iso3],
  );
  if (!country) {
    return err(reply, 404, 'Country not found');
  }

  const [ipc, prices, alerts, nutrition] = await Promise.all([
    query(
      'SELECT * FROM ipc_classifications WHERE country_id = ? ORDER BY period_start DESC LIMIT 5',
      [country.id],
    ),
    query(
      'SELECT * FROM commodity_prices WHERE country_id = ? ORDER BY price_date DESC LIMIT 20',
      [country.id],
    ),
    query(
      'SELECT * FROM alerts WHERE country_id = ? AND is_active = 1 ORDER BY alert_date DESC LIMIT 10',
      [country.id],
    ),
    query('SELECT * FROM nutrition_data WHERE country_id = ? ORDER BY year DESC', [country.id]),
  ]);

  return ok({ country, ipc, prices, alerts, nutrition });
}

async function handleIpcData(req: FastifyRequest): Promise<unknown> {
  const { country_id } = ipcQuery.parse(req.query ?? {});
  let sql =
    'SELECT i.*, c.name as country_name, c.iso3 FROM ipc_classifications i JOIN countries c ON i.country_id = c.id';
  const params: unknown[] = [];
  if (country_id) {
    sql += ' WHERE i.country_id = ?';
    params.push(country_id);
  }
  sql += ' ORDER BY i.period_start DESC';
  return ok(await query(sql, params));
}

async function handleAlerts(req: FastifyRequest): Promise<unknown> {
  const { severity, active_only } = alertsQuery.parse(req.query ?? {});
  let sql =
    'SELECT a.*, c.name as country_name, c.iso3 FROM alerts a JOIN countries c ON a.country_id = c.id WHERE 1=1';
  const params: unknown[] = [];
  if (active_only) {
    sql += ' AND a.is_active = 1';
  }
  if (severity) {
    sql += ' AND a.severity = ?';
    params.push(severity);
  }
  sql += ' ORDER BY a.alert_date DESC';
  return ok(await query(sql, params));
}

async function handleCommodityPrices(req: FastifyRequest): Promise<unknown> {
  const { country_id, commodity } = commodityPricesQuery.parse(req.query ?? {});
  let sql =
    'SELECT cp.*, c.name as country_name, c.iso3 FROM commodity_prices cp JOIN countries c ON cp.country_id = c.id WHERE 1=1';
  const params: unknown[] = [];
  if (country_id) {
    sql += ' AND cp.country_id = ?';
    params.push(country_id);
  }
  if (commodity) {
    sql += ' AND cp.commodity LIKE ?';
    params.push(`%${commodity}%`);
  }
  sql += ' ORDER BY cp.price_date DESC';
  return ok(await query(sql, params));
}

async function handleNutrition(req: FastifyRequest): Promise<unknown> {
  const { country_id } = nutritionQuery.parse(req.query ?? {});
  let sql =
    'SELECT n.*, c.name as country_name, c.iso3 FROM nutrition_data n JOIN countries c ON n.country_id = c.id WHERE 1=1';
  const params: unknown[] = [];
  if (country_id) {
    sql += ' AND n.country_id = ?';
    params.push(country_id);
  }
  sql += ' ORDER BY n.year DESC, c.name ASC';
  return ok(await query(sql, params));
}

async function handleDashboardSummary(): Promise<unknown> {
  const latestIpcJoin = `
    FROM ipc_classifications ic
    INNER JOIN (
      SELECT country_id, MAX(period_start) as latest
      FROM ipc_classifications
      GROUP BY country_id
    ) latest ON ic.country_id = latest.country_id AND ic.period_start = latest.latest
  `;

  const [
    countriesRow,
    activeAlertsRow,
    emergencyAlertsRow,
    criticalAlertsRow,
    crisisRow,
    famineRow,
  ] = await Promise.all([
    queryOne<Row & { cnt: number | string }>('SELECT COUNT(*) as cnt FROM countries'),
    queryOne<Row & { cnt: number | string }>(
      'SELECT COUNT(*) as cnt FROM alerts WHERE is_active = 1',
    ),
    queryOne<Row & { cnt: number | string }>(
      "SELECT COUNT(*) as cnt FROM alerts WHERE is_active = 1 AND severity = 'emergency'",
    ),
    queryOne<Row & { cnt: number | string }>(
      "SELECT COUNT(*) as cnt FROM alerts WHERE is_active = 1 AND severity = 'critical'",
    ),
    queryOne<Row & { total: number | string | null }>(
      `SELECT SUM(phase3_population + phase4_population + phase5_population) as total ${latestIpcJoin}`,
    ),
    queryOne<Row & { total: number | string | null }>(
      `SELECT SUM(phase5_population) as total ${latestIpcJoin}`,
    ),
  ]);

  const num = (v: unknown): number => Number(v ?? 0) || 0;

  return ok({
    countries_monitored: num(countriesRow?.cnt),
    active_alerts: num(activeAlertsRow?.cnt),
    emergency_alerts: num(emergencyAlertsRow?.cnt),
    critical_alerts: num(criticalAlertsRow?.cnt),
    crisis_population: num(crisisRow?.total),
    famine_population: num(famineRow?.total),
  });
}

// ---------------------------------------------------------------------------
// Public registry of action-name → handler. Other route modules (auth,
// proxy, …) extend the shared `_legacy.ts` registry with their own handlers
// so that the single `/api_proxy.php` dispatcher keeps working as a drop-in
// replacement for the old PHP endpoint.
// ---------------------------------------------------------------------------

export const localActionHandlers: Record<
  string,
  (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>
> = {
  countries: handleCountries,
  country_detail: handleCountryDetail,
  ipc_data: handleIpcData,
  alerts: handleAlerts,
  commodity_prices: handleCommodityPrices,
  nutrition: handleNutrition,
  dashboard_summary: handleDashboardSummary,
};

export async function registerLocalRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/countries', async (req) => handleCountries(req));

  app.get<{ Params: { iso3: string } }>('/api/countries/:iso3', async (req, reply) =>
    handleCountryDetail(req, reply, req.params.iso3),
  );

  app.get('/api/ipc', async (req) => handleIpcData(req));
  app.get('/api/alerts', async (req) => handleAlerts(req));
  app.get('/api/commodity-prices', async (req) => handleCommodityPrices(req));
  app.get('/api/nutrition', async (req) => handleNutrition(req));
  app.get('/api/dashboard/summary', async () => handleDashboardSummary());

  for (const [action, handler] of Object.entries(localActionHandlers)) {
    registerLegacyAction(action, handler);
  }

  registerLegacyDispatcher(app);
}
