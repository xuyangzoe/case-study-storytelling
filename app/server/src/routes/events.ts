import { Router } from 'express';

import { resolveUser } from '../auth.js';
import type { AppContext } from '../context.js';
import { ApiError } from '../errors.js';

/**
 * Live household updates over server-sent events, so one member's change shows
 * up on everyone else's screen without a refresh.
 */
export function createEventsRouter(ctx: AppContext): Router {
  const router = Router();

  router.get('/', (req, res, next) => {
    const user = resolveUser(ctx, req);
    if (!user) return next(ApiError.unauthorized());
    if (!user.householdId) return next(new ApiError(409, 'Join a household first', 'no_household'));

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`data: ${JSON.stringify({ type: 'connected', at: new Date().toISOString() })}\n\n`);

    const unsubscribe = ctx.events.subscribe(user.householdId, res);
    req.on('close', unsubscribe);
    return undefined;
  });

  return router;
}
