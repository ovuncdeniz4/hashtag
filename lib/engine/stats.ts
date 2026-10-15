/**
 * Ranking engine for the workbook screens.
 * Z-scores use the population standard deviation of the qualified pool.
 */
import {
  CATEGORY_KEYS,
  COUNTING_STAT_KEYS,
  MIN_QUALIFIED_GAMES,
  type Basis,
  type CategoryKey,
  type CountingStatKey,
  type PlayerSeason,
  type RankType,
  type WeightKey,
  type Weights,
} from "../types";

export type Distribution = {
  mean: number;
  sd: number;
};

export const meanAndSd = (values: readonly number[]): Distribution => {
  if (values.length === 0) return { mean: 0, sd: 0 };
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    values.length;
  return { mean, sd: Math.sqrt(variance) };
};

export const zScore = (
  value: number,
  distribution: Distribution,
): number => {
  if (distribution.sd === 0) return 0;
  return (value - distribution.mean) / distribution.sd;
};

export const countingValue = (
  player: PlayerSeason,
  key: CountingStatKey,
  basis: Basis,
): number => {
  const perGame = player.stats[key];
  return basis === "totals" ? perGame * player.games : perGame;
};

export const categoryValue = (
  source: Record<CountingStatKey, number>,
  key: CategoryKey,
): number | null => {
  if (key === "fgPct") {
    if (source.fga === 0) return null;
    return source.fgm / source.fga;
  }
  if (key === "ftPct") {
    if (source.fta === 0) return null;
    return source.ftm / source.fta;
  }
  return source[key];
};

export const playerCounting = (
  player: PlayerSeason,
  basis: Basis,
): Record<CountingStatKey, number> => {
  const totals = {} as Record<CountingStatKey, number>;
  for (const key of COUNTING_STAT_KEYS) {
    totals[key] = countingValue(player, key, basis);
  }
  return totals;
};

export const isQualified = (player: PlayerSeason): boolean =>
  player.games >= MIN_QUALIFIED_GAMES;

/** Negative weights mean lower raw production is better, as with turnovers. */
export const orient = (value: number, weight: number): number =>
  weight < 0 ? -value : value;

export const activeKeys = (
  weights: Weights,
  keys: readonly WeightKey[],
): WeightKey[] => keys.filter((key) => weights[key] !== 0);

export const activeCategories = (weights: Weights): CategoryKey[] =>
  CATEGORY_KEYS.filter((key) => weights[key] !== 0);

export type CategoryCell = {
  key: CategoryKey;
  value: number | null;
  z: number | null;
  contribution: number | null;
};

const contributionFor = (
  orientedZ: number,
  weight: number,
  rankType: RankType,
): number => {
  const floored = rankType === "h2h" ? Math.max(orientedZ, -2) : orientedZ;
  return floored * Math.abs(weight);
};

export const scoreCategories = (
  counting: Record<CountingStatKey, number>,
  weights: Weights,
  distributions: Partial<Record<CategoryKey, Distribution>>,
  rankType: RankType,
): { total: number; cells: CategoryCell[] } => {
  const keys = activeCategories(weights);
  const drafted = keys.map((key) => {
    const value = categoryValue(counting, key);
    const distribution = distributions[key];
    const z =
      value === null || distribution === undefined
        ? null
        : zScore(value, distribution);
    const orientedZ = z === null ? null : orient(z, weights[key]);
    return { key, value, z, orientedZ };
  });

  const scored = drafted.filter(
    (cell): cell is typeof cell & { orientedZ: number; z: number } =>
      cell.orientedZ !== null && cell.z !== null,
  );
  const worstKey =
    rankType === "minus1" && scored.length >= 2
      ? scored.reduce((worst, cell) =>
          cell.orientedZ < worst.orientedZ ? cell : worst,
        ).key
      : null;

  let total = 0;
  const cells = drafted.map((cell) => {
    if (cell.z === null || cell.orientedZ === null || cell.key === worstKey) {
      return {
        key: cell.key,
        value: cell.value,
        z: cell.z,
        contribution: cell.key === worstKey ? null : null,
      };
    }
    const contribution = contributionFor(
      cell.orientedZ,
      weights[cell.key],
      rankType,
    );
    total += contribution;
    return { key: cell.key, value: cell.value, z: cell.z, contribution };
  });

  return { total, cells };
};

export const pointsScore = (
  counting: Record<CountingStatKey, number>,
  weights: Weights,
): number =>
  COUNTING_STAT_KEYS.reduce(
    (sum, key) => sum + counting[key] * weights[key],
    0,
  );

export const categoryDistributions = (
  players: readonly PlayerSeason[],
  basis: Basis,
  keys: readonly CategoryKey[],
): Partial<Record<CategoryKey, Distribution>> => {
  const distributions: Partial<Record<CategoryKey, Distribution>> = {};
  const qualified = players.filter(isQualified);
  for (const key of keys) {
    const values: number[] = [];
    for (const player of qualified) {
      const value = categoryValue(playerCounting(player, basis), key);
      if (value !== null) values.push(value);
    }
    distributions[key] = meanAndSd(values);
  }
  return distributions;
};
