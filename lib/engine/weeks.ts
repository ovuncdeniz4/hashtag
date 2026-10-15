import type { CategoryKey, CountingStatKey, League, PlayerSeason, Weights } from "../types";
import type { ScheduledGame } from "../schedule";
import { nightsForTeam } from "../schedule";
import { COUNTING_STAT_KEYS } from "../types";
import { activeCategories, categoryValue, orient, pointsScore } from "./stats";

const emptyCounting = (): Record<CountingStatKey, number> => {
  const totals = {} as Record<CountingStatKey, number>;
  for (const key of COUNTING_STAT_KEYS) totals[key] = 0;
  return totals;
};

/** Per-game rates times the nights still checked on for that player. */
export const projectRoster = (
  playerIds: readonly string[],
  playersById: ReadonlyMap<string, PlayerSeason>,
  games: readonly ScheduledGame[],
  dates: readonly string[],
  isActive: (playerId: string, date: string) => boolean,
): Record<CountingStatKey, number> => {
  const totals = emptyCounting();
  for (const playerId of playerIds) {
    const player = playersById.get(playerId);
    if (player === undefined) continue;
    const nights = nightsForTeam(player.team, dates, games).filter((night) =>
      isActive(playerId, night.date),
    );
    for (const key of COUNTING_STAT_KEYS) {
      totals[key] += player.stats[key] * nights.length;
    }
  }
  return totals;
};

export type CategoryLine = {
  key: CategoryKey;
  left: number | null;
  right: number | null;
  leader: "left" | "right" | "tie";
};

export type SideResult = {
  lines: CategoryLine[];
  leftWins: number;
  rightWins: number;
  ties: number;
  leftPoints: number;
  rightPoints: number;
};

export const compareSides = (
  left: Record<CountingStatKey, number>,
  right: Record<CountingStatKey, number>,
  weights: Weights,
  mode: League["mode"],
): SideResult => {
  if (mode === "points") {
    const leftPoints = pointsScore(left, weights);
    const rightPoints = pointsScore(right, weights);
    const leader = leftPoints === rightPoints ? "tie" : leftPoints > rightPoints ? "left" : "right";
    return {
      lines: [],
      leftWins: leader === "left" ? 1 : 0,
      rightWins: leader === "right" ? 1 : 0,
      ties: leader === "tie" ? 1 : 0,
      leftPoints,
      rightPoints,
    };
  }

  const lines: CategoryLine[] = [];
  let leftWins = 0;
  let rightWins = 0;
  let ties = 0;
  for (const key of activeCategories(weights)) {
    const leftValue = categoryValue(left, key);
    const rightValue = categoryValue(right, key);
    let leader: CategoryLine["leader"] = "tie";
    if (leftValue !== null && rightValue !== null) {
      const leftScore = orient(leftValue, weights[key]);
      const rightScore = orient(rightValue, weights[key]);
      if (leftScore > rightScore) leader = "left";
      else if (rightScore > leftScore) leader = "right";
    }
    if (leader === "left") leftWins += 1;
    else if (leader === "right") rightWins += 1;
    else ties += 1;
    lines.push({ key, left: leftValue, right: rightValue, leader });
  }
  return {
    lines,
    leftWins,
    rightWins,
    ties,
    leftPoints: pointsScore(left, weights),
    rightPoints: pointsScore(right, weights),
  };
};

export const ahead = (result: SideResult): boolean => result.leftWins > result.rightWins;
