# 🐾 MultiCat

**A shared cat-care app that helps multi-cat households manage food inventory, expiry
dates, shopping, reordering and deals in one place.**

> Know what your cats have, what they need, and when to buy it — without the mental load.

Built from the *Multi-Cat Household Food Management App* PRD. The point is not "an app
that tracks cat food" — it is one shared source of truth for a household where several
people buy, feed and restock, and nobody has the whole picture in their head.

---

## Quick start

```bash
cd app
npm install
npm run seed     # optional: loads the demo household from the PRD
npm run dev      # API on :4000, web client on :5173
```

Open <http://localhost:5173> and sign in. With the seed loaded, use
`yang@example.com` or `partner@example.com` — sign in as both in two browsers to watch
one shared inventory update live in each.

For a production-style run, one process serves the API and the built client:

```bash
npm run build
npm start        # http://localhost:4000
```

| Command | What it does |
|---|---|
| `npm run dev` | API with reload + Vite dev server |
| `npm run build` | Compiles the server and bundles the client |
| `npm start` | Serves the API and the built client from one process |
| `npm run seed` | Replaces the data file with the PRD's demo household |
| `npm test` | Domain, formatting and API test suites |
| `npm run typecheck` | Typechecks both workspaces |

Environment: `PORT` (default `4000`), `DATA_FILE` (default `server/data/multicat.json`),
`WEB_DIST` (default `web/dist`).

---

## What the app does

### One household, one inventory
Create a household, share the six-character invite code, and everyone sees the same
stock. Every change is attributed and streamed to the other members over server-sent
events, so a count adjusted in the kitchen updates on a phone in the supermarket.

### Quick inventory updates
The most-used control is a single `−`/`+` stepper on every item. Taps are applied
optimistically and batched, so a burst of taps is one request and one feed entry —
"Partner used 3 cans of Royal Canin Chicken" rather than three separate lines.

### Expiry, surfaced not buried
Every item carries an expiry status — 🟢 normal, 🟡 expiring within 30 days, 🔴 expired —
and the inventory sorts by soonest expiry by default, which is what first-expire-first-out
actually needs.

### Reorder prediction from real consumption
The activity feed doubles as consumption history. Units used are divided by the days
actually observed, so a household that has been tracking for a week still gets an
estimate, and a quiet week correctly drags the rate down. Below the reorder horizon the
app says how long the stock will last and how long you can still wait:

> About 8 days of stock left — order within the next 2 days.

The app declines to guess when the history is too thin rather than inventing a number.

### Duplicate purchase prevention
Adding something already on the shared list is refused with the detail that matters:

> Already on the list — added by Partner · 2 hours ago

### Price history and deal comparison
Purchases record retailer, quantity, what you paid and the deal type; unit price is
computed and stored so history stays comparable. The deal checker compares an offer
against your own cheapest purchase:

> 🟢 **Good deal** — this offer is $2.92 per can. Your previous best was $3.00 per can at
> Petbarn. **$2.00 cheaper than your previous best.**

### Closing the loop
Marking a shopping-list item bought can, in one step, restock the shelf and file the
price — so the inventory and the price reference stay current without separate bookkeeping.

---

## PRD coverage

**P0 — all implemented.** Household creation and invites, shared inventory, multiple cat
profiles, food items with category / flavour / package type / quantity, increase and
decrease, shared updates, expiry dates with status and sorting, and purchase price
history with quantity, bundle price and retailer.

**P1 — all implemented.** Shared shopping list, low-stock warnings, purchase history,
activity feed, consumption history, reorder prediction and actionable notifications.

**P2 — deliberately not built.** Retailer integrations, receipt scanning, barcode
scanning, automatic inventory updates, feeding tracking, cat-specific consumption and
household task management. Automatic deal comparison is present as an on-demand checker
driven by your own price history; without a retailer feed there is no live price to
compare against on its own.

Section-by-section: §7 household setup, §8 cat profiles, §9 food inventory, §10
dashboard, §11 quick updates and activity, §12 shopping list, §13 duplicate prevention,
§14 expiry management, §15 purchase and deal history, §16 deal comparison, §17 reorder
prediction, §18 notifications, §19 all eleven user stories.

---

## Architecture

```
app/
├── shared/          Types and pure domain logic used by BOTH sides
│   ├── types.ts       Household, Cat, FoodItem, Purchase, read models
│   ├── config.ts      Thresholds: expiring-soon window, reorder horizon, lead time
│   ├── domain.ts      Expiry status, stock status, consumption, deal comparison
│   └── format.ts      Labels, pluralisation, dates, money
├── server/          Express + TypeScript API
│   ├── src/store.ts   JSON document store with atomic writes
│   ├── src/views.ts   Read models: item views, dashboard, notifications
│   ├── src/events.ts  Server-sent events, one stream per household
│   └── src/routes/    auth, household, cats, food, shopping, purchases, dashboard
└── web/             React + TypeScript + Vite client
    ├── src/lib/       API client, app state, live subscription
    ├── src/components/ UI primitives, item rows, forms
    └── src/pages/     Dashboard, Inventory, Cats, Shopping, Deals, Household
```

**Why `shared/` matters.** A "low stock" badge, an "expiring soon" threshold and a
"good deal" verdict mean exactly the same thing on the server and in the browser,
because both import the same functions. The deal comparison in the buy dialog updates as
you type using the same code the API would run.

**Storage.** One household's data is a few hundred rows, so the MVP uses an in-memory
snapshot flushed to a JSON file with write-then-rename, and no native dependencies.
Every read and write goes through `Store`, so moving to SQLite or Postgres is a contained
change.

**Live updates.** Each mutation broadcasts a small event to that household's subscribers;
clients refetch. Payloads stay tiny and there is no client-side cache to invalidate
incorrectly.

---

## API

All endpoints are under `/api` and take `Authorization: Bearer <token>` unless noted.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/session` | Sign in or register (no auth) |
| `DELETE` | `/auth/session` | Sign out |
| `GET` | `/auth/me` | Current user and household |
| `POST` | `/household` | Create a household |
| `POST` | `/household/join` | Join with an invite code |
| `GET` `PATCH` | `/household` | Read / rename |
| `POST` | `/household/invite-code` | Rotate the invite code |
| `POST` | `/household/leave` | Leave the household |
| `GET` `POST` | `/cats` | List / create cat profiles |
| `PATCH` `DELETE` | `/cats/:catId` | Update / remove |
| `GET` `POST` | `/food-items` | List (filter, sort) / create |
| `GET` `PATCH` `DELETE` | `/food-items/:itemId` | Read / update / remove |
| `POST` | `/food-items/:itemId/adjust` | Change quantity by delta or recount |
| `GET` `POST` | `/shopping-list` | List / add (409 on duplicates) |
| `POST` | `/shopping-list/:entryId/purchase` | Mark bought, restock, file price |
| `DELETE` | `/shopping-list/:entryId` | Remove from the list |
| `GET` `POST` | `/purchases` | Price history / record a purchase |
| `POST` | `/purchases/compare` | Compare an offer against history |
| `GET` | `/dashboard` | Everything the home screen needs |
| `GET` | `/activity` | Household activity feed |
| `GET` | `/notifications` | Actionable notifications |
| `GET` | `/events?token=…` | Server-sent event stream |

`GET /food-items` accepts `category`, `catId`, `search`, `expiry`, `stock` and
`sort` (`expiry`, `expiry_desc`, `name`, `quantity`, `recent`).

Errors return `{ error, code, details? }`. Validation failures come back as
`code: "validation_failed"` with per-field messages; duplicate shopping-list additions
return `409` with the existing entry attached.

---

## Tests

```bash
npm test
```

50 tests across three suites:

- **domain** — expiry boundaries, stock thresholds, consumption estimation (including
  the PRD's "8 days left, order within 2 days" example), price-per-unit, best-price
  selection and both deal-comparison examples from §16.
- **format** — unit pluralisation, day pluralisation, money.
- **api** — access control and household isolation, joining by invite code, attribution,
  inventory floors and recounts, expiry sorting, filters, shopping-list duplicate
  prevention, the buy-restock-price loop, deal comparison, dashboard aggregation and
  notification suppression.

---

## Known limitations

- **Authentication is deliberately minimal.** A member signs in with a name and email and
  receives a bearer token; there are no passwords, verification or rate limiting. It is
  enough to answer "who changed this?" while keeping sign-in to one screen. Real auth
  belongs with the real database.
- **Invite codes do not expire.** They can be rotated manually.
- **The JSON store is single-process.** Two server processes pointed at one data file
  would overwrite each other.
- **Reorder prediction is a rate estimate, not a model.** It does not yet account for
  per-cat consumption, meal schedules or seasonality.
- **Prices are stored as plain numbers with no currency field**, and are formatted as
  dollars throughout.
