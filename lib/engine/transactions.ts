import type { League, LeagueTeam } from "../types";

export type RosterMove = {
  teamId: string;
  addPlayerId?: string;
  dropPlayerId?: string;
};

const cloneLeague = (league: League): League => structuredClone(league);

const findTeam = (
  teams: LeagueTeam[],
  teamId: string,
): LeagueTeam | undefined => teams.find((team) => team.id === teamId);

/** Drop first, then add. A player already on another team is not copied. */
export const applyMoves = (league: League, moves: readonly RosterMove[]): League => {
  const next = cloneLeague(league);
  for (const move of moves) {
    if (move.dropPlayerId === undefined) continue;
    const team = findTeam(next.teams, move.teamId);
    if (team === undefined) continue;
    team.playerIds = team.playerIds.filter((id) => id !== move.dropPlayerId);
  }
  for (const move of moves) {
    if (move.addPlayerId === undefined) continue;
    const team = findTeam(next.teams, move.teamId);
    if (team === undefined) continue;
    const taken = next.teams.some((candidate) =>
      candidate.playerIds.includes(move.addPlayerId ?? ""),
    );
    if (taken || team.playerIds.includes(move.addPlayerId)) continue;
    team.playerIds = [...team.playerIds, move.addPlayerId];
  }
  return next;
};

export const rosteredIds = (league: League): Set<string> =>
  new Set(league.teams.flatMap((team) => team.playerIds));
