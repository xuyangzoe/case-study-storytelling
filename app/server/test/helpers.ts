import express from 'express';
import request from 'supertest';

import { createApp } from '../src/app.js';
import type { AppContext } from '../src/context.js';
import { EventHub } from '../src/events.js';
import { Store } from '../src/store.js';

export const FIXED_NOW = new Date('2026-08-26T09:00:00.000Z');

export interface TestHarness {
  ctx: AppContext;
  app: express.Express;
  signIn: (name: string, email: string) => Promise<string>;
}

export function createHarness(now: Date = FIXED_NOW): TestHarness {
  const ctx: AppContext = {
    store: Store.open(null),
    events: new EventHub(),
    now: () => now,
  };
  const app = createApp(ctx);

  return {
    ctx,
    app,
    async signIn(name, email) {
      const response = await request(app).post('/api/auth/session').send({ name, email }).expect(201);
      return response.body.token as string;
    },
  };
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` } as const;
}

/** A signed-in member who has created a household — the usual starting point. */
export async function createHouseholdWithMember(harness: TestHarness, name = 'Yang') {
  const token = await harness.signIn(name, `${name.toLowerCase()}@example.com`);
  const response = await request(harness.app)
    .post('/api/household')
    .set(auth(token))
    .send({ name: "Yang's Cat Household" })
    .expect(201);
  return { token, household: response.body.household };
}
