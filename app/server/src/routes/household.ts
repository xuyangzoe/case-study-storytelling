import { Router } from 'express';

import type { Household, HouseholdMember } from '../../../shared/types.js';
import { recordActivity } from '../activity.js';
import { authenticate, currentHousehold, currentUser, requireHousehold } from '../auth.js';
import type { AppContext } from '../context.js';
import { ApiError, asyncRoute } from '../errors.js';
import { newId, newInviteCode } from '../ids.js';
import { createHouseholdSchema, joinHouseholdSchema, updateHouseholdSchema } from '../schemas.js';

export function createHouseholdRouter(ctx: AppContext): Router {
  const router = Router();
  router.use(authenticate(ctx));

  /** Create the shared workspace (PRD §7). The creator becomes its owner. */
  router.post(
    '/',
    asyncRoute(async (req, res) => {
      const user = currentUser(req);
      const input = createHouseholdSchema.parse(req.body);
      if (user.householdId) {
        throw ApiError.conflict('You are already part of a household');
      }

      const now = ctx.now();
      const household = await ctx.store.mutate((db) => {
        const owner: HouseholdMember = {
          userId: user.id,
          name: user.name,
          email: user.email,
          role: 'owner',
          joinedAt: now.toISOString(),
        };
        const created: Household = {
          id: newId(),
          name: input.name,
          inviteCode: newInviteCode(),
          members: [owner],
          createdBy: user.id,
          createdAt: now.toISOString(),
        };
        db.households.push(created);

        const stored = db.users.find((candidate) => candidate.id === user.id);
        if (stored) stored.householdId = created.id;

        recordActivity(db, {
          householdId: created.id,
          type: 'household_created',
          actor: user,
          summary: `${user.name} created ${created.name}`,
          at: now,
        });
        return created;
      });

      res.status(201).json({ household });
    }),
  );

  /** Join an existing household with the code another member shared. */
  router.post(
    '/join',
    asyncRoute(async (req, res) => {
      const user = currentUser(req);
      const input = joinHouseholdSchema.parse(req.body);
      const code = input.inviteCode.trim().toUpperCase();

      const target = ctx.store.data.households.find((h) => h.inviteCode === code);
      if (!target) throw ApiError.notFound('No household matches that invite code');

      if (user.householdId && user.householdId !== target.id) {
        throw ApiError.conflict('Leave your current household before joining another');
      }

      const now = ctx.now();
      const household = await ctx.store.mutate((db) => {
        const stored = db.households.find((h) => h.id === target.id)!;
        const alreadyMember = stored.members.some((member) => member.userId === user.id);

        if (!alreadyMember) {
          stored.members.push({
            userId: user.id,
            name: user.name,
            email: user.email,
            role: 'member',
            joinedAt: now.toISOString(),
          });
          recordActivity(db, {
            householdId: stored.id,
            type: 'member_joined',
            actor: user,
            summary: `${user.name} joined the household`,
            at: now,
          });
        }

        const storedUser = db.users.find((candidate) => candidate.id === user.id);
        if (storedUser) storedUser.householdId = stored.id;
        return stored;
      });

      ctx.events.broadcast(household.id, { type: 'household:changed' });
      res.json({ household });
    }),
  );

  router.get(
    '/',
    requireHousehold(ctx),
    asyncRoute(async (req, res) => {
      res.json({ household: currentHousehold(req) });
    }),
  );

  router.patch(
    '/',
    requireHousehold(ctx),
    asyncRoute(async (req, res) => {
      const household = currentHousehold(req);
      const input = updateHouseholdSchema.parse(req.body);

      const updated = await ctx.store.mutate((db) => {
        const stored = db.households.find((h) => h.id === household.id)!;
        if (input.name) stored.name = input.name;
        return stored;
      });

      ctx.events.broadcast(updated.id, { type: 'household:changed' });
      res.json({ household: updated });
    }),
  );

  /** Rotating the code revokes an invite that was shared too widely. */
  router.post(
    '/invite-code',
    requireHousehold(ctx),
    asyncRoute(async (req, res) => {
      const household = currentHousehold(req);
      const updated = await ctx.store.mutate((db) => {
        const stored = db.households.find((h) => h.id === household.id)!;
        stored.inviteCode = newInviteCode();
        return stored;
      });
      ctx.events.broadcast(updated.id, { type: 'household:changed' });
      res.json({ household: updated });
    }),
  );

  router.post(
    '/leave',
    requireHousehold(ctx),
    asyncRoute(async (req, res) => {
      const user = currentUser(req);
      const household = currentHousehold(req);

      await ctx.store.mutate((db) => {
        const stored = db.households.find((h) => h.id === household.id)!;
        stored.members = stored.members.filter((member) => member.userId !== user.id);
        const storedUser = db.users.find((candidate) => candidate.id === user.id);
        if (storedUser) storedUser.householdId = null;
      });

      ctx.events.broadcast(household.id, { type: 'household:changed' });
      res.status(204).end();
    }),
  );

  return router;
}
