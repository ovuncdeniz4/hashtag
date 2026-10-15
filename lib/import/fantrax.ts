import type { PlayerSeason, ScoringMode } from "../types";
import { buildLeague } from "./build";
import { matchPlayerId } from "./names";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const text = (value: unknown): string | null => (typeof value === "string" && value.trim() !== "" ? value : null);

type RosterDraft = { name: string; names: string[] };

const playerNameOf = (item: Record<string, unknown>): string | null =>
  text(item.name) ?? text(item.playerName) ?? text(item.fullName);

/** Pull team names and player names out of Fantrax league and roster payloads. */
export const leagueFromFantrax = (
  info: unknown,
  rosters: unknown,
  players: readonly PlayerSeason[],
  id: string,
) => {
  const infoRecord = asRecord(info);
  const scoringRecord = asRecord(infoRecord?.scoringSystem);
  const scoring = (text(scoringRecord?.type) ?? JSON.stringify(infoRecord?.scoringSystem ?? "")).toUpperCase();
  const mode: ScoringMode = scoring.includes("POINT") ? "points" : "categories";
  const leagueName = text(infoRecord?.name) ?? text(infoRecord?.leagueName) ?? "Fantrax league";
  const drafts = new Map<string, RosterDraft>();

  const ensure = (key: string, name: string): RosterDraft => {
    const existing = drafts.get(key);
    if (existing !== undefined) {
      if (existing.name.startsWith("Team ") && name !== "") existing.name = name;
      return existing;
    }
    const created = { name, names: [] };
    drafts.set(key, created);
    return created;
  };

  const listed = infoRecord?.teams;
  if (Array.isArray(listed)) {
    for (const entry of listed) {
      const record = asRecord(entry);
      if (record === null) continue;
      const teamId = text(record.id) ?? text(record.teamId);
      const teamName = text(record.name) ?? text(record.teamName);
      if (teamId !== null && teamName !== null) ensure(teamId, teamName);
    }
  }

  const addRoster = (key: string, name: string, items: unknown): void => {
    const draft = ensure(key, name);
    const list = Array.isArray(items) ? items : [];
    for (const item of list) {
      const record = asRecord(item);
      if (record === null) continue;
      const playerName = playerNameOf(record);
      if (playerName !== null) draft.names.push(playerName);
    }
  };

  const rosterRecord = asRecord(rosters);
  const rosterCollection = rosterRecord?.rosters ?? rosters;
  if (Array.isArray(rosterCollection)) {
    rosterCollection.forEach((entry, index) => {
      const record = asRecord(entry);
      if (record === null) return;
      addRoster(
        text(record.teamId) ?? text(record.id) ?? `team-${index + 1}`,
        text(record.teamName) ?? text(record.name) ?? `Team ${index + 1}`,
        record.rosterItems ?? record.players,
      );
    });
  } else {
    const map = asRecord(rosterCollection);
    if (map !== null) {
      for (const [key, value] of Object.entries(map)) {
        const record = asRecord(value);
        if (record === null) continue;
        addRoster(key, text(record.teamName) ?? text(record.name) ?? key, record.rosterItems ?? record.players);
      }
    }
  }

  const unmatched: string[] = [];
  const league = buildLeague({
    id,
    name: leagueName,
    mode,
    teams: [...drafts.values()].map((team) => ({
      name: team.name,
      isMine: false,
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
  if (league.teams[0] !== undefined) league.teams[0].isMine = true;
  return { league, unmatched };
};
