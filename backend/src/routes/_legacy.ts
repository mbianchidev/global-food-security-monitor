import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export type LegacyHandler = (req: FastifyRequest, reply: FastifyReply) => Promise<unknown> | unknown;

/**
 * Shared registry of action-name → handler for the legacy `?action=` dispatch
 * compatible with the old `api_proxy.php` URL. Route modules mutate this map
 * at registration time so the `/api_proxy.php` route below dispatches to all
 * of them through a single endpoint.
 */
export const legacyActionHandlers: Record<string, LegacyHandler> = {};

export function registerLegacyAction(name: string, handler: LegacyHandler): void {
  legacyActionHandlers[name] = handler;
}

export async function dispatchLegacyAction(
  req: FastifyRequest,
  reply: FastifyReply,
  handlers: Record<string, LegacyHandler> = legacyActionHandlers,
): Promise<unknown> {
  const action = (req.query as { action?: string } | undefined)?.action ?? '';
  const handler = handlers[action];
  if (!handler) {
    reply.code(400);
    return {
      status: 'error',
      message: `Unknown action: ${action}`,
      available_actions: Object.keys(handlers).sort(),
    };
  }
  return handler(req, reply);
}

/**
 * Mounts the `/api_proxy.php` drop-in endpoint that dispatches by `?action=`
 * to handlers registered in {@link legacyActionHandlers}. Call this AFTER all
 * route modules have registered their handlers.
 */
export function registerLegacyDispatcher(app: FastifyInstance): void {
  const handler = (req: FastifyRequest, reply: FastifyReply) => dispatchLegacyAction(req, reply);
  app.get('/api_proxy.php', handler);
  app.post('/api_proxy.php', handler);
}
