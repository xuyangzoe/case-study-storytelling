import type { NextFunction, Request, Response } from 'express';

import type { Household, User } from '../../shared/types.js';
import type { AppContext } from './context.js';
import { ApiError } from './errors.js';
import { newId, newToken } from './ids.js';

/**
 * Authentication is deliberately lightweight for the MVP: a household member
 * identifies themself with a name and an email address and gets a bearer token.
 *
 * It is enough to answer the PRD's real question — "who changed this?" — while
 * keeping the sign-in flow to a single screen. Passwords, verification and
 * invite-link security belong to the same later pass as a real database.
 */
export async function signIn(
  ctx: AppContext,
  input: { name: string; email: string },
): Promise<{ token: string; user: User }> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  return ctx.store.mutate((db) => {
    let user = db.users.find((candidate) => candidate.email === email);

    if (!user) {
      user = {
        id: newId(),
        name,
        email,
        householdId: null,
        createdAt: ctx.now().toISOString(),
      };
      db.users.push(user);
    } else if (name && name !== user.name) {
      user.name = name;
    }

    const token = newToken();
    db.sessions.push({ token, userId: user.id, createdAt: ctx.now().toISOString() });
    return { token, user };
  });
}

export function readToken(req: Request): string | null {
  const header = req.header('authorization');
  if (header?.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  // EventSource cannot set headers, so the SSE endpoint passes the token along.
  const queryToken = req.query.token;
  return typeof queryToken === 'string' && queryToken ? queryToken : null;
}

export function resolveUser(ctx: AppContext, req: Request): User | null {
  const token = readToken(req);
  if (!token) return null;
  const session = ctx.store.data.sessions.find((candidate) => candidate.token === token);
  if (!session) return null;
  return ctx.store.data.users.find((user) => user.id === session.userId) ?? null;
}

export function authenticate(ctx: AppContext) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = resolveUser(ctx, req);
    if (!user) {
      next(ApiError.unauthorized());
      return;
    }
    req.user = user;
    next();
  };
}

/** Loads the caller's household, rejecting members who have not joined one yet. */
export function requireHousehold(ctx: AppContext) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!user.householdId) {
      next(new ApiError(409, 'Create or join a household first', 'no_household'));
      return;
    }
    const household = ctx.store.data.households.find(
      (candidate) => candidate.id === user.householdId,
    );
    if (!household) {
      next(ApiError.notFound('Household not found'));
      return;
    }
    req.household = household;
    next();
  };
}

/** Narrowing helpers so handlers do not repeat the same non-null assertions. */
export function currentUser(req: Request): User {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export function currentHousehold(req: Request): Household {
  if (!req.household) throw ApiError.forbidden();
  return req.household;
}

export async function signOut(ctx: AppContext, req: Request): Promise<void> {
  const token = readToken(req);
  if (!token) return;
  await ctx.store.mutate((db) => {
    db.sessions = db.sessions.filter((session) => session.token !== token);
  });
}
