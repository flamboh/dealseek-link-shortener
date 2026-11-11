<img src="assets/icon.svg" width="64" height="64" alt="">

# dealseek-link-shortener

Created in [T3 Code](https://t3.codes).

## How it works

One Cloudflare Worker serves the React app and the API.

- `POST /api/links` with `{ "url": "https://..." }` creates a short link.
- `GET /<code>` redirects (302) to the saved URL, or shows a 404 page.
- Codes are 8 characters from a 45-character alphabet with no vowels and no look-alikes (`0 O 1 l I 3 4`). A small blocklist in `worker/blocklist.ts` rerolls any code that still spells something bad.
- Links live in D1 (SQLite). Workers KV caches code → URL for a day, so most redirects never touch the database.

## Develop

```sh
bun install
bun run db:migrate:local
bun dev
```

`bun dev` runs the app and the Worker together on http://localhost:5182.

Checks: `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`.

## Deploy

| Command | What it does |
| --- | --- |
| `bun run deploy` | Applies D1 migrations to production, builds, and deploys `dealseek-link-shortener`. |
| `bun run deploy:preview` | Applies migrations to the preview database, builds, and uploads a preview version of `dealseek-link-shortener-preview` named after the current git branch. Prints the preview URL. |

Production and preview each have their own D1 database and KV namespace, so preview traffic never touches production data.

GitHub Actions does the same thing automatically: every pull request runs the checks and comments a preview URL, and every push to `main` deploys production. The workflows need two repository secrets: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

After changing `wrangler.jsonc`, run `bun run cf-typegen` to refresh `worker-configuration.d.ts`. Add new migrations with `bunx wrangler d1 migrations create DB <name>`.
