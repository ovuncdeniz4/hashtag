import type { League, LeagueTeam, ScoringMode, Weights } from "../types";
import { weightsForMode } from "../types";

export type ImportTeam = {
  name: string;
  playerIds: string[];
  isMine: boolean;
};

export const buildLeague = (input: {
  id: string;
  name: string;
  mode: ScoringMode;
  weights?: Weights;
  teams: ImportTeam[];
  rosterSize?: number;
  auctionBudget?: number;
}): League => ({
  id: input.id,
  name: input.name,
  mode: input.mode,
  weights: input.weights ?? weightsForMode(input.mode),
  rosterSize: input.rosterSize,
  auctionBudget: input.auctionBudget,
  teams: input.teams.map(
    (team, index): LeagueTeam => ({
      id: `${input.id}-t${index + 1}`,
      name: team.name,
      playerIds: [...new Set(team.playerIds)],
      isMine: team.isMine,
    }),
  ),
});
