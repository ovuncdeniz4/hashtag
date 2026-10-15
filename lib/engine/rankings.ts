import { STAT_LABELS, type Basis, type PlayerSeason, type RankType, type Weights } from "../types";
import {
  activeCategories,
  categoryDistributions,
  playerCounting,
  pointsScore,
  scoreCategories,
  type CategoryCell,
} from "./stats";

export type PlayerRank = {
  player: PlayerSeason;
  total: number;
  cells: CategoryCell[];
};

export const rankPlayers = (
  players: readonly PlayerSeason[],
  weights: Weights,
  basis: Basis,
  rankType: RankType,
  mode: "categories" | "points",
): PlayerRank[] => {
  if (mode === "points") {
    return players
      .map((player) => ({
        player,
        total: pointsScore(playerCounting(player, basis), weights),
        cells: [],
      }))
      .sort(compareRanks);
  }

  const keys = activeCategories(weights);
  const distributions = categoryDistributions(players, basis, keys);
  return players
    .map((player) => {
      const scored = scoreCategories(
        playerCounting(player, basis),
        weights,
        distributions,
        rankType,
      );
      return { player, total: scored.total, cells: scored.cells };
    })
    .sort(compareRanks);
};

const compareRanks = (left: PlayerRank, right: PlayerRank): number => {
  if (right.total !== left.total) return right.total - left.total;
  return left.player.name.localeCompare(right.player.name);
};

export const weightSummary = (
  weights: Weights,
  mode: "categories" | "points",
): string => {
  const keys =
    mode === "points"
      ? (["pts", "reb", "ast", "stl", "blk", "tpm", "to", "fgm", "fga", "ftm", "fta"] as const)
      : activeCategories(weights);
  const parts = keys
    .filter((key) => weights[key] !== 0)
    .map((key) => `${STAT_LABELS[key]} ${formatWeight(weights[key])}`);
  const title = mode === "points" ? "Points" : "Categories";
  return parts.length === 0 ? `${title} · no weights` : `${title} · ${parts.join(" ")}`;
};

const formatWeight = (weight: number): string => {
  const text = Number.isInteger(weight) ? String(weight) : weight.toFixed(1);
  return text;
};
