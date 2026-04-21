import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import { config } from './config.js';
import { logger } from './logger.js';
import { pool } from './db.js';
import { registerLocalRoutes } from './routes/local.js';
import { registerProxyRoutes } from './routes/proxy.js';
import { registerAuthRoutes } from './routes/auth.js';

declare module 'fastify' {
  interface Session {
    user_id?: number;
    username?: string;
    role?: string;
  }
}

async function buildServer() {
  const app = Fastify<any, any, any, any>({ loggerInstance: logger });

  await app.register(cors, {
    origin: config.CORS_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.register(cookie);
  await app.register(session, {
    secret: config.SESSION_SECRET,
    cookieName: config.SESSION_NAME,
    cookie: {
      secure: config.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: config.SESSION_LIFETIME * 1000,
      sameSite: 'lax',
    },
    saveUninitialized: false,
  });

  app.get('/health', async () => ({ status: 'ok' }));

  // Action-based dispatcher kept for drop-in compatibility with the legacy
  // PHP api_proxy.php endpoint. New clients should prefer the RESTful routes.
  await registerLocalRoutes(app);
  await registerProxyRoutes(app);
  await registerAuthRoutes(app);

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({ status: 'error', message: `Not found: ${req.url}` });
  });

  app.setErrorHandler((err, _req, reply) => {
    app.log.error({ err }, 'Unhandled error');
    const statusCode = (err as any)?.statusCode ?? 500;
    const message =
      statusCode < 500
        ? (err as any)?.message || 'Bad request'
        : config.NODE_ENV === 'production'
          ? 'Internal server error'
          : (err as any)?.message || 'Internal server error';
    reply.code(statusCode).send({
      status: 'error',
      message,
    });
  });

  return app;
}

async function main() {
  const app = await buildServer();
  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Shutting down');
    await app.close();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void main();
