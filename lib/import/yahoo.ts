import type { PlayerSeason, ScoringMode } from "../types";
import { buildLeague } from "./build";
import { matchPlayerId } from "./names";

export type YahooImport = ReturnType<typeof leagueFromYahoo>;

type TeamDraft = {
  key: string;
  name: string;
  owned: boolean;
  names: string[];
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/** Walk Yahoo's nested fantasy JSON in document order. */
export const leagueFromYahoo = (
  payload: unknown,
  players: readonly PlayerSeason[],
  id: string,
) => {
  const teams: TeamDraft[] = [];
  let leagueName = "Yahoo league";
  let scoring = "";
  let current: TeamDraft | null = null;

  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    const record = asRecord(node);
    if (record === null) return;
    if (typeof record.league_key === "string" && typeof record.name === "string") {
      leagueName = record.name;
      if (typeof record.scoring_type === "string") scoring = record.scoring_type;
    }
    if (typeof record.team_key === "string" && typeof record.name === "string") {
      const existing = teams.find((team) => team.key === record.team_key);
      if (existing !== undefined) {
        current = existing;
      } else {
        current = { key: record.team_key, name: record.name, owned: false, names: [] };
        teams.push(current);
      }
    }
    if (record.is_owned_by_current_login === 1 && current !== null) current.owned = true;
    const name = asRecord(record.name);
    if (typeof record.player_key === "string" && name !== null && typeof name.full === "string" && current !== null) {
      current.names.push(name.full);
    }
    for (const value of Object.values(record)) visit(value);
  };
  visit(payload);

  const mode: ScoringMode = scoring.toLowerCase().includes("point") ? "points" : "categories";
  const unmatched: string[] = [];
  const league = buildLeague({
    id,
    name: leagueName,
    mode,
    teams: teams.map((team) => ({
      name: team.name,
      isMine: team.owned,
      playerIds: team.names.flatMap((playerName) => {
        const playerId = matchPlayerId(playerName, null, players);
        if (playerId === null) {
          unmatched.push(playerName);
          return [];
        }
        return [playerId];
      }),
    })),
  });
  if (!league.teams.some((team) => team.isMine) && league.teams[0] !== undefined) {
    league.teams[0].isMine = true;
  }
  return { league, unmatched };
};
