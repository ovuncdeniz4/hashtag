/**
 * Refreshes data/players.json from a local CSV, a saved per-game HTML table,
 * or BALLDONTLIE when BALLDONTLIE_API_KEY is set.
 *
 * CSV columns: id,name,team,positions,age,games,pts,reb,ast,stl,blk,tpm,to,fgm,fga,ftm,fta
 * Positions are separated with |.
 *
 * node scripts/ingest-players.mjs --csv players.csv
 * node scripts/ingest-players.mjs --html per-game.html
 * BALLDONTLIE_API_KEY=... node scripts/ingest-players.mjs --balldontlie
 */
import { writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const seasonLabel = "2025-26";

const countingKeys = [
  "pts",
  "reb",
  "ast",
  "stl",
  "blk",
  "tpm",
  "to",
  "fgm",
  "fga",
  "ftm",
  "fta",
];

const emptyStats = () =>
  Object.fromEntries(countingKeys.map((key) => [key, 0]));

const outputPath = resolve("data/players.json");

const writeSnapshot = (players, label) => {
  const snapshot = {
    season: seasonLabel,
    label,
    players,
  };
  writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Wrote ${players.length} players to ${outputPath}`);
};

const fromCsv = (text) => {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const columns = header.split(",");
  return lines.filter(Boolean).map((line) => {
    const cells = line.split(",");
    const row = Object.fromEntries(columns.map((column, index) => [column, cells[index] ?? ""]));
    const stats = emptyStats();
    for (const key of countingKeys) stats[key] = Number(row[key] ?? 0);
    return {
      id: row.id,
      name: row.name,
      team: row.team,
      positions: row.positions.split("|").filter(Boolean),
      age: row.age === "" ? null : Number(row.age),
      games: Number(row.games ?? 0),
      stats,
    };
  });
};

const cellText = (row, stat) => {
  const match = row.match(
    new RegExp(`data-stat="${stat}"[^>]*>([\\s\\S]*?)</td>`),
  );
  if (match === null) return "";
  return match[1].replace(/<[^>]+>/g, "").trim();
};

const fromHtml = (html) => {
  const groups = new Map();
  const order = [];
  for (const row of html.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    const id = row.match(/data-append-csv="([^"]+)"/)?.[1];
    if (id === undefined) continue;
    if (!groups.has(id)) {
      groups.set(id, []);
      order.push(id);
    }
    groups.get(id).push(row);
  }
  return order.map((id) => {
    const rows = groups.get(id);
    const combined =
      rows.find((row) => cellText(row, "team_name_abbr") === "TOT") ?? rows[0];
    const teams = rows
      .map((row) => cellText(row, "team_name_abbr"))
      .filter((team) => team !== "" && team !== "TOT");
    const number = (stat) => {
      const raw = cellText(combined, stat);
      return raw === "" ? 0 : Number(raw);
    };
    const age = cellText(combined, "age");
    return {
      id,
      name: cellText(combined, "name_display"),
      team: teams.at(-1) ?? cellText(combined, "team_name_abbr"),
      positions: cellText(combined, "pos").split("-").filter(Boolean),
      age: age === "" ? null : Number(age),
      games: number("games"),
      stats: {
        pts: number("pts_per_g"),
        reb: number("trb_per_g"),
        ast: number("ast_per_g"),
        stl: number("stl_per_g"),
        blk: number("blk_per_g"),
        tpm: number("fg3_per_g"),
        to: number("tov_per_g"),
        fgm: number("fg_per_g"),
        fga: number("fga_per_g"),
        ftm: number("ft_per_g"),
        fta: number("fta_per_g"),
      },
    };
  });
};

const paged = async (url, key) => {
  const rows = [];
  let cursor = null;
  do {
    const next = new URL(url);
    if (cursor !== null) next.searchParams.set("cursor", String(cursor));
    const response = await fetch(next, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!response.ok) {
      throw new Error(`BALLDONTLIE ${response.status} for ${next.pathname}`);
    }
    const body = await response.json();
    rows.push(...(body.data ?? []));
    cursor = body.meta?.next_cursor ?? null;
  } while (cursor !== null);
  return rows;
};

const fromBalldontlie = async (key) => {
  const season = process.env.BALLDONTLIE_SEASON ?? "2025";
  const averages = await paged(
    `https://api.balldontlie.io/nba/v1/season_averages/general?season=${season}&season_type=regular&per_page=100`,
    key,
  );
  const people = await paged(
    "https://api.balldontlie.io/nba/v1/players?per_page=100",
    key,
  );
  const byId = new Map(people.map((player) => [player.id, player]));
  return averages.map((row) => {
    const person = byId.get(row.player_id) ?? row.player ?? {};
    const name = [person.first_name, person.last_name].filter(Boolean).join(" ");
    return {
      id: String(row.player_id ?? person.id),
      name: name || String(row.player_id),
      team: person.team?.abbreviation ?? "",
      positions: String(person.position ?? "")
        .split("-")
        .filter(Boolean),
      age: null,
      games: Number(row.games_played ?? 0),
      stats: {
        pts: Number(row.pts ?? 0),
        reb: Number(row.reb ?? 0),
        ast: Number(row.ast ?? 0),
        stl: Number(row.stl ?? 0),
        blk: Number(row.blk ?? 0),
        tpm: Number(row.fg3m ?? 0),
        to: Number(row.turnover ?? 0),
        fgm: Number(row.fgm ?? 0),
        fga: Number(row.fga ?? 0),
        ftm: Number(row.ftm ?? 0),
        fta: Number(row.fta ?? 0),
      },
    };
  });
};

const argument = (flag) => {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
};

const csvPath = argument("--csv");
const htmlPath = argument("--html");
const useApi = process.argv.includes("--balldontlie");

if (csvPath !== undefined) {
  writeSnapshot(
    fromCsv(await readFile(csvPath, "utf8")),
    `${seasonLabel} per-game rates imported from CSV. These are last-season averages, not a projection.`,
  );
} else if (htmlPath !== undefined) {
  writeSnapshot(
    fromHtml(await readFile(htmlPath, "utf8")),
    `${seasonLabel} regular-season per-game rates. These are last-season averages, not a projection.`,
  );
} else if (useApi) {
  const key = process.env.BALLDONTLIE_API_KEY;
  if (key === undefined || key === "") {
    throw new Error("Set BALLDONTLIE_API_KEY to refresh from BALLDONTLIE.");
  }
  writeSnapshot(
    await fromBalldontlie(key),
    `${seasonLabel} per-game rates from BALLDONTLIE. These are last-season averages, not a projection.`,
  );
} else {
  console.log("Pass --csv, --html, or --balldontlie. The committed snapshot was left unchanged.");
}
