# Courtbook

Fantasy basketball workbook. Rankings, a custom league, a trade machine, waiver moves, and a scouting report.

Rates are 2025-26 per-game averages stored in `data/players.json`. They are last-season numbers, not a projection. Refresh that file with:

```bash
node scripts/ingest-players.mjs --csv players.csv
node scripts/ingest-players.mjs --html per-game.html
BALLDONTLIE_API_KEY=... node scripts/ingest-players.mjs --balldontlie
```

```bash
npm run dev
npm run test
npm run lint
```

Leagues stay in this browser. Yahoo import is a later step onto the same league object.
