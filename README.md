# Netwealth · World Cup 2026 Sweepstake

A branded, self-updating tracker for an office World Cup 2026 sweepstake. Assign
teams to colleagues, share a link, and watch the leaderboard and prizes update
automatically as results come in.

- **No database.** The entire sweepstake (participants + team assignments) is
  encoded in the URL, so a single shareable link _is_ the state. Open the site
  with no link and every team is unassigned.
- **Live results** come through a thin Cloudflare Pages Function that proxies a
  football data API, keeping the API key server-side.
- **Prizes tracked:** 🏆 1st & 🥈 2nd place (World Cup finalists' owners),
  👟 Golden Boot (most group-stage goals), 🥄 Wooden Spoon (worst group-stage
  goal difference), and 🟨🟥 Referee's Favourite (most group-stage cards).

## Tech stack

Vite + React + TypeScript + Tailwind CSS, deployed to **Cloudflare Pages** with a
Pages Function (`functions/api/results.ts`) for the cached results proxy.

## Local development

```bash
npm install
npm run dev          # Vite dev server (UI only; /api/results returns empty)
npm test             # unit tests (url state, assignments, standings, awards)
```

To exercise the live results proxy locally you need the Cloudflare runtime:

```bash
cp .dev.vars.example .dev.vars     # then put your real key in .dev.vars
npm run build
npm run pages:dev                  # serves the built site + /api/results
```

## Live results data

Results are fetched from **[API-FOOTBALL](https://www.api-sports.io/)** (free
tier covers World Cup 2026 fixtures, goals and card events). Sign up for a free
key, then configure:

| Setting | Where | Purpose |
| --- | --- | --- |
| `FOOTBALL_API_KEY` | Cloudflare **secret** | api-sports.io key (server-side only) |
| `FOOTBALL_LEAGUE_ID` | `wrangler.toml` `[vars]` | World Cup league id (default `1`) |
| `FOOTBALL_SEASON` | `wrangler.toml` `[vars]` | Season year (default `2026`) |

The proxy caches the aggregated payload for 60s and caches finished-match card
stats for 24h, so visitor traffic never exhausts the free-tier quota.

> If the API is ever wrong or missing card data, hand-corrections can be added to
> `public/overrides.json` (matched by `home`/`away` team name) — no code redeploy
> required, just edit the file.

The static fixtures/groups/bracket are seeded from the public-domain
[openfootball](https://github.com/openfootball/worldcup.json) dataset
(`src/data/*.source.json`); live scores and cards overlay on top of them.

## Deploy to Cloudflare Pages

Deploys run automatically from GitHub via
`.github/workflows/deploy.yml`: every push to `main` lints, tests, builds, and
deploys to the `fifa2026-sweepstake` Pages project (Direct Upload).

**One-time setup** — add two repository secrets in GitHub
(Settings → Secrets and variables → Actions):

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | A Cloudflare API token with the **Cloudflare Pages: Edit** permission |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account id |

Then add the football API key as a Cloudflare secret (server-side, never in git):

```bash
npx wrangler pages secret put FOOTBALL_API_KEY
```

To deploy manually instead, run `npm run pages:deploy`.

Share the site URL, run the draw on the **Sweepstake** tab, then **Copy
shareable link** to distribute the assignments.

## How prizes are decided

- **1st / 2nd place** — owners of the team that wins / loses the Final.
- **Golden Boot / Wooden Spoon / Referee's Favourite** — computed from group-stage
  results only; shown as the "current leader" during the group stage and locked in
  as **Final** once all 72 group matches are played. Group standings use
  points → goal difference → goals scored (FIFA's primary tiebreakers).

## Project layout

```
functions/api/results.ts   Cloudflare Pages Function — cached results proxy
src/data/tournament.ts     48 teams, 12 groups, 104 fixtures (typed model)
src/data/teams.ts          country → ISO code / emoji flag
src/lib/urlState.ts        encode/decode sweepstake state into the URL
src/lib/sweepstake.ts      assignment helpers (assign, draw, re-index)
src/lib/standings.ts       group standings + the three group-stage awards
src/lib/prizes.ts          map awards + finalists to participants
src/components/            UI: editor, groups, knockouts, awards, leaderboard
```
