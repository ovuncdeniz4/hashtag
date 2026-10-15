# Courtbook

Fantasy basketball workbook. Rankings, a custom league, draft tracker, weekly schedule, matchup planner, beast and smash weeks, dynasty and auction values, trades, waivers, and a scouting report.

Rates are 2025-26 per-game averages stored in `data/players.json`. They are last-season numbers, not a projection. The schedule in `data/schedule.json` is the matching regular season. Refresh them with:

```bash
node scripts/ingest-players.mjs --csv players.csv
node scripts/ingest-players.mjs --html per-game.html
BALLDONTLIE_API_KEY=... node scripts/ingest-players.mjs --balldontlie
node scripts/ingest-schedule.mjs path-or-url-to-schedule.json
```

Sleeper and Fantrax import use the public league id. Yahoo import needs `YAHOO_CLIENT_ID` and `YAHOO_CLIENT_SECRET`, with the callback `/api/import/yahoo/callback` registered on that app. ESPN cookie import is not included.

```bash
npm run dev
npm run test
npm run lint
```

Leagues stay in this browser. An import replaces that same league object.
