import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { queryOne, query } from '../db.js';
import { registerLegacyAction } from './_legacy.js';

type Role = 'admin' | 'analyst' | 'viewer';

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  email: string;
  role: Role;
  full_name: string | null;
  is_active: number;
}

const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(255),
});

type LoginInput = z.infer<typeof loginSchema>;

interface LoginSuccess {
  status: 'ok';
  data: { username: string; role: Role; full_name: string | null };
}
interface ErrorResponse {
  status: 'error';
  message: string;
}

const INVALID_CREDENTIALS: ErrorResponse = { status: 'error', message: 'Invalid credentials' };

async function regenerateSession(request: FastifyRequest): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    request.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

async function destroySession(request: FastifyRequest): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    request.session.destroy((err) => (err ? reject(err) : resolve()));
  });
}

/**
 * Performs login with already-validated input. Returns the success payload
 * or null if credentials are invalid. Throws on unexpected internal errors.
 */
async function performLogin(
  request: FastifyRequest,
  input: LoginInput,
): Promise<LoginSuccess | null> {
  let user: UserRow | null;
  try {
    user = await queryOne<UserRow>(
      'SELECT id, username, password_hash, email, role, full_name, is_active FROM users WHERE username = ? AND is_active = 1',
      [input.username],
    );
  } catch (err) {
    request.log.error({ err }, 'auth: db lookup failed');
    throw new Error('Internal authentication error');
  }

  let ok = false;
  if (user) {
    try {
      ok = await bcrypt.compare(input.password, user.password_hash);
    } catch (err) {
      request.log.error({ err }, 'auth: bcrypt compare failed');
      throw new Error('Internal authentication error');
    }
  }

  if (!user || !ok) {
    request.log.warn({ username: input.username, ip: request.ip }, 'auth: failed login attempt');
    return null;
  }

  await regenerateSession(request);
  request.session.user_id = user.id;
  request.session.username = user.username;
  request.session.role = user.role;

  try {
    await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
  } catch (err) {
    // Non-fatal: log but still consider the login successful.
    request.log.warn({ err, user_id: user.id }, 'auth: failed to update last_login');
  }

  request.log.info({ user_id: user.id, username: user.username }, 'auth: login success');

  return {
    status: 'ok',
    data: {
      username: user.username,
      role: user.role,
      full_name: user.full_name,
    },
  };
}

export const authMiddleware: preHandlerHookHandler = async (request, reply) => {
  if (!request.session.user_id) {
    await reply.code(401).send({ status: 'error', message: 'Authentication required' });
  }
};

export function requireRole(role: Role): preHandlerHookHandler {
  return async (request, reply) => {
    if (!request.session.user_id) {
      await reply.code(401).send({ status: 'error', message: 'Authentication required' });
      return;
    }
    if (request.session.role !== role) {
      await reply.code(403).send({ status: 'error', message: 'Forbidden' });
    }
  };
}

async function handleLogin(request: FastifyRequest, reply: FastifyReply) {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    await reply.code(400).send({ status: 'error', message: 'Invalid request body' });
    return;
  }

  let result: LoginSuccess | null;
  try {
    result = await performLogin(request, parsed.data);
  } catch {
    await reply.code(500).send({ status: 'error', message: 'Internal authentication error' });
    return;
  }

  if (!result) {
    await reply.code(401).send(INVALID_CREDENTIALS);
    return;
  }
  await reply.send(result);
}

async function handleLogout(request: FastifyRequest, reply: FastifyReply) {
  try {
    await destroySession(request);
  } catch (err) {
    request.log.error({ err }, 'auth: session destroy failed');
    await reply.code(500).send({ status: 'error', message: 'Logout failed' });
    return;
  }
  await reply.send({ status: 'ok', message: 'Logged out' });
}

async function handleMe(request: FastifyRequest, reply: FastifyReply) {
  if (!request.session.user_id) {
    await reply.code(401).send({ status: 'error', message: 'Not authenticated' });
    return;
  }
  await reply.send({
    status: 'ok',
    data: {
      user_id: request.session.user_id,
      username: request.session.username,
      role: request.session.role,
    },
  });
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/auth/login', handleLogin);
  app.post('/api/auth/logout', handleLogout);
  app.get('/api/auth/me', handleMe);

  // Legacy compatibility: expose login/logout via the shared action dispatcher
  // used by the old api_proxy.php (?action=login|logout) clients.
  registerLegacyAction('login', handleLogin);
  registerLegacyAction('logout', handleLogout);
  app.log.info('auth: registered login/logout into legacyActionHandlers');
}
