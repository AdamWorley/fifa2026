# FIFA World Cup 2026 · Office Sweepstake

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

To exercise the results function (and KV) locally you need the Cloudflare runtime:

```bash
npm run build
npm run pages:dev                  # serves the built site + /api/results
```

## Results data

Results come from the public-domain
**[openfootball](https://github.com/openfootball/worldcup.json)** World Cup 2026
dataset (`WC_DATA_URL` in `wrangler.toml`). The `/api/results` Pages Function
fetches it, normalizes it, and stores it in the `RESULTS_KV` namespace; that
stored copy is served instantly and refreshed in the background (~10 min) so no
visitor request ever blocks on the upstream. No API key required.

openfootball drives scores and goals (standings, **Golden Boot**, **Wooden
Spoon**) but has **no card data**. Cards (for **Referee's Favourite**) are
filled **best-effort from the Wikipedia group articles** via the MediaWiki API:
the function parses each played match's lineup templates (`{{yel}}`, `{{sent
off}}`) to count yellows/reds per team. This is approximate — it depends on
editors having filled in lineups — so it can be **overridden by hand** in
`public/overrides.json` (entries matched by `home`/`away` team name; the
override's `cards` replaces the parsed value and always wins). Overrides can
also correct any wrong score.

> Note: both sources are community-maintained and update roughly daily, not
> strictly live. For fully-live, authoritative cards you'd need a paid feed
> (e.g. [API-FOOTBALL](https://www.api-sports.io/) or football-data.org's
> deep-data add-on) — the free tiers don't cover 2026 cards. See
> `?debug=1` on `/api/results` for a parse summary.

The static fixtures/groups/bracket are also seeded from openfootball
(`src/data/*.source.json`); the live feed overlays scores on top.

## Deploy to Cloudflare Pages

The repo is connected to Cloudflare Pages via its native Git integration —
every push to `main` builds and deploys automatically, with preview deployments
for other branches/PRs.

**This is a Vite project, not Next.js.** In the Pages project's
**Settings → Builds & deployments → Build configuration**, set:

| Field | Value |
| --- | --- |
| Framework preset | **Vite** (or None) |
| Build command | `npm run build` |
| Build output directory | `dist` |

`wrangler.toml` supplies the rest (output dir, `[vars]`, and the `RESULTS_KV`
binding) to the build. Confirm the KV binding shows under
**Settings → Functions → KV namespace bindings**.

Then add the football API key as a secret (server-side, never in git) under
**Settings → Environment variables** (or via the CLI):

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
