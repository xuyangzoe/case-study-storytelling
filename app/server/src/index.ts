import { createApp } from './app.js';
import { CONFIG } from './config.js';
import type { AppContext } from './context.js';
import { EventHub } from './events.js';
import { Store } from './store.js';

const ctx: AppContext = {
  store: Store.open(CONFIG.dataFile),
  events: new EventHub(),
  now: () => new Date(),
};

const app = createApp(ctx, { webDist: CONFIG.webDist });

const server = app.listen(CONFIG.port, () => {
  console.log(`[multicat] API listening on http://localhost:${CONFIG.port}`);
  console.log(`[multicat] data file: ${CONFIG.dataFile}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    ctx.events.closeAll();
    server.close(() => process.exit(0));
  });
}
