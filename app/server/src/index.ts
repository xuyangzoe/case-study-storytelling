import { createApp } from './app.js';
import { CONFIG } from './config.js';
import type { AppContext } from './context.js';
import { EventHub } from './events.js';
import { buildDemoDatabase } from './seed.js';
import { Store } from './store.js';

const ctx: AppContext = {
  store: Store.open(CONFIG.dataFile),
  events: new EventHub(),
  now: () => new Date(),
};

async function main(): Promise<void> {
  // Staging convenience: a host with an ephemeral disk (e.g. Render's free
  // tier) starts from an empty store on every deploy and every wake from
  // idle. Load the PRD's demo household instead of showing a blank app.
  if (CONFIG.seedIfEmpty && ctx.store.data.households.length === 0) {
    await ctx.store.reset(buildDemoDatabase(ctx.now()));
    console.log('[multicat] SEED_IF_EMPTY: loaded the demo household');
  }

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
}

main().catch((error: unknown) => {
  console.error('[multicat] failed to start', error);
  process.exit(1);
});
