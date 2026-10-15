import { readFileSync, writeFileSync } from "node:fs";

const source = process.argv[2];
if (source === undefined) {
  console.error("Usage: node scripts/ingest-schedule.mjs <schedule.json>");
  process.exit(1);
}

const TO_BREF = { BKN: "BRK", CHA: "CHO", PHX: "PHO" };

const codeOf = (label) => {
  const code = String(label).split(" ")[0]?.trim() ?? "";
  if (code === "") return "";
  return TO_BREF[code] ?? code;
};

const payload = source.startsWith("http")
  ? await fetch(source).then((response) => {
      if (!response.ok) throw new Error(`Schedule fetch failed: ${response.status}`);
      return response.json();
    })
  : JSON.parse(readFileSync(source, "utf8"));
const games = [];
for (const game of payload.games ?? []) {
  if (game.season_type !== "Regular Season" || game.is_tbd) continue;
  const home = codeOf(game.home_team);
  const away = codeOf(game.away_team);
  const date = String(game.tip_et ?? "").slice(0, 10);
  if (home === "" || away === "" || date.length !== 10) continue;
  games.push({ date, home, away });
}
games.sort((left, right) => left.date.localeCompare(right.date) || left.home.localeCompare(right.home));

const mondayOf = (iso) => {
  const date = new Date(`${iso}T12:00:00Z`);
  const day = date.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
};

const addDays = (iso, count) => {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
};

const starts = [...new Set(games.map((game) => mondayOf(game.date)))].sort();
const weeks = starts.map((start, index) => ({
  id: index + 1,
  label: `Week ${index + 1}`,
  start,
  end: addDays(start, 6),
  dates: Array.from({ length: 7 }, (_, offset) => addDays(start, offset)),
}));

const snapshot = {
  season: payload.season ?? "2025-26",
  label:
    "2025-26 regular-season schedule. Weeks run Monday through Sunday, in Eastern tip dates. Last-season dates, matching the player snapshot.",
  weeks,
  games,
};

writeFileSync(new URL("../data/schedule.json", import.meta.url), `${JSON.stringify(snapshot)}\n`);
console.error(`Wrote ${games.length} games across ${weeks.length} weeks`);
