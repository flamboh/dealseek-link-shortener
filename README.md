<div>
  <p align="center">
    <img src="public/favicon.svg" alt="" width="128" height="128" />
  </p>

  <h1 align="center">DealSeek links</h1>

  <p align="center">
    A copy-first link shortener for DealSeek deals. <br>
    Paste a long link, get a short one to share anywhere.
    <br />
    <a href="https://link.oli.boo">link.oli.boo</a>
  </p>
</div>

## How it works

One Cloudflare Worker serves the React app and the API.

- `POST /api/links` with `{ "url": "https://..." }` creates a short link.
- `GET /<code>` redirects (302) to the saved URL, or shows a 404 page.
- Codes are 8 characters from a 45-character alphabet with no vowels and no look-alikes (`0 O 1 l I 3 4`). A small blocklist in `worker/blocklist.ts` rerolls any code that still spells something bad.
- Links live in D1 (SQLite). Workers KV caches code → URL for a day, so most redirects never touch the database.

## Click stats

- Each link has its own Durable Object (`LinkStats` in `worker/link-stats.ts`). It runs in a second Worker, `dealseek-link-stats` (`wrangler.stats.jsonc`), and the main Worker binds to it with `script_name`. Cloudflare gives no preview URLs to a Worker that defines a Durable Object, so keeping it out of the main Worker keeps per-branch previews working. It keeps an exact click count and a HyperLogLog sketch (`worker/hll.ts`, 4096 registers, about 1.6% error) that estimates unique visitors.
- A visitor is a SHA-256 hash of IP + User-Agent + the `VISITOR_SALT` secret. The IP and User-Agent are never stored.
- Clicks are recorded after the redirect is sent, so they never slow it down. HEAD requests, prefetches, and link-preview bots (`worker/bots.ts`) are not counted.
- Creating a link returns an `ownerToken`. Only its hash is stored. The browser keeps the token in its history, so only the browser that made a link can read its stats.
- `DELETE /api/links/<code>` with `Authorization: Bearer <ownerToken>` revokes a link (204). A wrong token or unknown code gets the same 404. The row stays in D1 with `revoked_at` set, so the code is never reused, and the redirect returns a 410 page. KV keeps a `revoked` tombstone so repeat hits don't reach D1.
- `POST /api/stats` with `{ "links": [{ "code": "...", "token": "..." }] }` (up to 50) returns `{ "stats": { "<code>": { "clicks": 5, "visitors": 2 } } }`. Codes with a wrong or missing token are left out.

## Abuse protection

Clients are keyed by IPv4 address, or by the /64 prefix for IPv6 (`CF-Connecting-IP`).

- **Creating links:** 20 per rolling 10 minutes. The 21st starts a block of 1 minute. Each block after that doubles (2, 4, 8 … minutes), capped at 24 hours. After each hour without a block, the next block drops back one step. Tries during a block don't make it longer. Blocked creates get a `429` with `Retry-After` and `{ "error", "retryAfter" }`.
- **Guessing codes:** 30 missing codes per minute per client. After that, missing codes get a `429` page with `Retry-After: 60`. Working short links are never limited.
- The create limit lives in a Durable Object (`CreateLimiter`) in a third Worker, `dealseek-link-guard` (`guard/`), bound by `script_name` for the same preview-URL reason as the stats Worker.
- If the limiter errors or takes over 200 ms, the create goes through and the error is logged.

## Develop

```sh
bun install
cp .dev.vars.example .dev.vars
bun run db:migrate:local
bun dev
```

Put any long random string in `.dev.vars` as `VISITOR_SALT`.

`bun dev` runs the app, the main Worker, the stats Worker, and the guard Worker together on http://localhost:5182.

Checks: `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`.

## Deploy

| Command | What it does |
| --- | --- |
| `bun run deploy` | Applies D1 migrations to production, builds, deploys `dealseek-link-stats` and `dealseek-link-guard`, then deploys `dealseek-link-shortener`. |
| `bun run deploy:preview` | Applies migrations to the preview database, builds, deploys `dealseek-link-stats-preview` and `dealseek-link-guard-preview`, and uploads a preview version of `dealseek-link-shortener-preview` named after the current git branch. Prints the preview URL. |

Production and preview each have their own D1 database, KV namespace, Durable Objects, and rate-limit namespace, so preview traffic never touches production data.

Each Worker needs a `VISITOR_SALT` secret: `bunx wrangler secret put VISITOR_SALT` (add `--env preview` for the preview Worker).

Both deploy commands deploy the stats and guard Workers first (`dealseek-link-stats` and `dealseek-link-guard`, or their `-preview` versions for previews), then the main Worker. All preview branches share one stats preview Worker and one guard preview Worker. Never add Durable Object classes or migrations to `wrangler.jsonc`; they go in `wrangler.stats.jsonc` or `guard/wrangler.jsonc`.

GitHub Actions does the same thing automatically: every pull request runs the checks and comments a preview URL, and every push to `main` deploys production. The workflows need two repository secrets: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

After changing `wrangler.jsonc`, `wrangler.stats.jsonc`, or `guard/wrangler.jsonc`, run `bun run cf-typegen` to refresh `worker-configuration.d.ts`. Add new migrations with `bunx wrangler d1 migrations create DB <name>`.
