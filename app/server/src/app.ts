import fs from 'node:fs';
import path from 'node:path';

import cors from 'cors';
import express, { type Express } from 'express';

import type { AppContext } from './context.js';
import { errorHandler } from './errors.js';
import { createAuthRouter } from './routes/auth.js';
import { createCatsRouter } from './routes/cats.js';
import { createDashboardRouter } from './routes/dashboard.js';
import { createEventsRouter } from './routes/events.js';
import { createFoodRouter } from './routes/food.js';
import { createHouseholdRouter } from './routes/household.js';
import { createPurchasesRouter } from './routes/purchases.js';
import { createShoppingRouter } from './routes/shopping.js';

export function createApp(ctx: AppContext, options: { webDist?: string } = {}): Express {
  const app = express();

  app.use(cors());
  // Cat profile photos arrive as data URLs, so the default 100kb is too small.
  app.use(express.json({ limit: '6mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', at: ctx.now().toISOString() });
  });

  app.use('/api/auth', createAuthRouter(ctx));
  app.use('/api/household', createHouseholdRouter(ctx));
  app.use('/api/cats', createCatsRouter(ctx));
  app.use('/api/food-items', createFoodRouter(ctx));
  app.use('/api/shopping-list', createShoppingRouter(ctx));
  app.use('/api/purchases', createPurchasesRouter(ctx));
  app.use('/api/events', createEventsRouter(ctx));
  app.use('/api', createDashboardRouter(ctx));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Unknown endpoint', code: 'not_found' });
  });

  // In production one process serves the API and the built client.
  const webDist = options.webDist;
  if (webDist && fs.existsSync(path.join(webDist, 'index.html'))) {
    app.use(express.static(webDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
