import type { PlayerSeason } from "../types";
import { buildLeague } from "./build";
import { matchPlayerId } from "./names";

type SleeperPlayer = { full_name?: string; team?: string | null };
type SleeperRoster = { roster_id?: number; owner_id?: string; players?: string[] };
type SleeperUser = { user_id?: string; display_name?: string; metadata?: { team_name?: string } };

export const leagueFromSleeper = (
  input: {
    league: { name?: string; league_id?: string; roster_positions?: string[] };
    rosters: SleeperRoster[];
    users: SleeperUser[];
    players: Record<string, SleeperPlayer>;
    username?: string;
  },
  pool: readonly PlayerSeason[],
  id: string,
) => {
  const owners = new Map(input.users.map((user) => [user.user_id, user]));
  const mine = input.username?.trim().toLowerCase() ?? "";
  const unmatched: string[] = [];
  const teams = input.rosters.map((roster) => {
    const user = owners.get(roster.owner_id);
    const name = user?.metadata?.team_name || user?.display_name || `Roster ${roster.roster_id ?? ""}`;
    const playerIds = (roster.players ?? []).flatMap((playerId) => {
      const sleeper = input.players[playerId];
      const full = sleeper?.full_name;
      if (full === undefined) return [];
      const matched = matchPlayerId(full, null, pool);
      if (matched === null) {
        unmatched.push(full);
        return [];
      }
      return [matched];
    });
    return {
      name,
      playerIds,
      isMine: mine !== "" && user?.display_name?.toLowerCase() === mine,
    };
  });
  const rosterSize = input.league.roster_positions?.filter((slot) => slot !== "BN" && slot !== "IR").length;
  const league = buildLeague({
    id,
    name: input.league.name || "Sleeper league",
    mode: "points",
    teams,
    rosterSize,
  });
  if (!league.teams.some((team) => team.isMine) && league.teams[0] !== undefined) {
    league.teams[0].isMine = true;
  }
  return { league, unmatched };
};
