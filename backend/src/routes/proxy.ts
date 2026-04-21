import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { pool } from '../db.js';
import { registerLegacyAction } from './_legacy.js';

interface ProxyResult {
  status: number;
  contentType: string;
  body: string;
}

async function logApiRequest(
  app: FastifyInstance,
  endpoint: string,
  responseCode: number,
  responseTimeMs: number,
  errorMessage: string | null,
): Promise<void> {
  try {
    await pool.query(
      'INSERT INTO api_request_log (endpoint, method, response_code, response_time_ms, error_message) VALUES (?, ?, ?, ?, ?)',
      [endpoint, 'GET', responseCode, responseTimeMs, errorMessage],
    );
  } catch (err) {
    app.log.error({ err }, 'Failed to log API request');
  }
}

async function proxyRequest(
  app: FastifyInstance,
  url: string,
  label: string,
  extraHeaders: Record<string, string> = {},
): Promise<ProxyResult> {
  const start = Date.now();
  app.log.info({ url, label }, `Proxy request [${label}]`);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'GlobalFoodSecurityMonitor/2.0',
    ...extraHeaders,
  };

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(30_000),
      redirect: 'follow',
    });
    const body = await res.text();
    const elapsed = Date.now() - start;
    app.log.info(
      { url, label, status: res.status, elapsedMs: elapsed },
      `Proxy response [${label}]`,
    );
    void logApiRequest(app, url, res.status, elapsed, null);

    if (res.status >= 400) {
      app.log.warn({ url, label, status: res.status }, `Proxy [${label}] upstream error`);
    }

    return {
      status: res.status,
      contentType: res.headers.get('content-type') ?? 'application/json',
      body,
    };
  } catch (err) {
    const elapsed = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    app.log.error({ err, url, label, elapsedMs: elapsed }, `Proxy [${label}] failed`);
    void logApiRequest(app, url, 0, elapsed, message);
    return {
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'error',
        message: `Upstream API error: ${message}`,
        source: label,
      }),
    };
  }
}

function send(reply: FastifyReply, result: ProxyResult): FastifyReply {
  return reply
    .code(result.status === 0 ? 502 : result.status)
    .header('content-type', result.contentType)
    .send(result.body);
}

const faoFoodPricesSchema = z.object({
  area_code: z.string().min(1).default('4'),
  item_code: z.string().min(1).default('15'),
});

const faoProductionSchema = z.object({
  area_code: z.string().min(1).default(''),
});

const wfpIso3Schema = z.object({
  iso3: z.string().min(1).default(''),
});

function buildUrl(base: string, path: string, params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return `${base}${path}?${qs}`;
}

function wfpAuthHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${config.WFP_API_KEY}` };
}

async function handleFaoFoodPrices(
  app: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = faoFoodPricesSchema.safeParse(req.query);
  if (!parsed.success) {
    return reply.code(400).send({ status: 'error', message: parsed.error.message });
  }
  const url = buildUrl(config.FAO_API_BASE, '/data/Prices_E', {
    area: parsed.data.area_code,
    item: parsed.data.item_code,
    element: '5532',
    year: String(new Date().getFullYear()),
    api_key: config.FAO_API_KEY,
  });
  return send(reply, await proxyRequest(app, url, 'FAO Food Prices'));
}

async function handleFaoProduction(
  app: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = faoProductionSchema.safeParse(req.query);
  if (!parsed.success) {
    return reply.code(400).send({ status: 'error', message: parsed.error.message });
  }
  const url = buildUrl(config.FAO_API_BASE, '/data/QCL', {
    area: parsed.data.area_code,
    element: '5510',
    year: String(new Date().getFullYear() - 1),
    api_key: config.FAO_API_KEY,
  });
  return send(reply, await proxyRequest(app, url, 'FAO Production'));
}

async function handleWfpFoodSecurity(
  app: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = wfpIso3Schema.safeParse(req.query);
  if (!parsed.success) {
    return reply.code(400).send({ status: 'error', message: parsed.error.message });
  }
  const url = buildUrl(config.WFP_API_BASE, '/FoodSecurity/CountryData', {
    iso3: parsed.data.iso3,
  });
  return send(reply, await proxyRequest(app, url, 'WFP Food Security', wfpAuthHeaders()));
}

async function handleWfpMarketPrices(
  app: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = wfpIso3Schema.safeParse(req.query);
  if (!parsed.success) {
    return reply.code(400).send({ status: 'error', message: parsed.error.message });
  }
  const url = buildUrl(config.WFP_API_BASE, '/MarketPrices/CountryPriceList', {
    iso3: parsed.data.iso3,
  });
  return send(reply, await proxyRequest(app, url, 'WFP Market Prices', wfpAuthHeaders()));
}

async function handleWfpEconomicData(
  app: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = wfpIso3Schema.safeParse(req.query);
  if (!parsed.success) {
    return reply.code(400).send({ status: 'error', message: parsed.error.message });
  }
  const url = buildUrl(config.WFP_API_BASE, '/EconomicData/CountryIndicators', {
    iso3: parsed.data.iso3,
  });
  return send(reply, await proxyRequest(app, url, 'WFP Economic Data', wfpAuthHeaders()));
}

export async function registerProxyRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/external/fao/food-prices', (req, reply) =>
    handleFaoFoodPrices(app, req, reply),
  );
  app.get('/api/external/fao/production', (req, reply) =>
    handleFaoProduction(app, req, reply),
  );
  app.get('/api/external/wfp/food-security', (req, reply) =>
    handleWfpFoodSecurity(app, req, reply),
  );
  app.get('/api/external/wfp/market-prices', (req, reply) =>
    handleWfpMarketPrices(app, req, reply),
  );
  app.get('/api/external/wfp/economic-data', (req, reply) =>
    handleWfpEconomicData(app, req, reply),
  );

  registerLegacyAction('fao_food_prices', (req, reply) =>
    handleFaoFoodPrices(app, req, reply),
  );
  registerLegacyAction('fao_production', (req, reply) =>
    handleFaoProduction(app, req, reply),
  );
  registerLegacyAction('wfp_food_security', (req, reply) =>
    handleWfpFoodSecurity(app, req, reply),
  );
  registerLegacyAction('wfp_market_prices', (req, reply) =>
    handleWfpMarketPrices(app, req, reply),
  );
  registerLegacyAction('wfp_economic_data', (req, reply) =>
    handleWfpEconomicData(app, req, reply),
  );
}
