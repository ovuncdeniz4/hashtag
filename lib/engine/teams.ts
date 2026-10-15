import {
  CATEGORY_KEYS,
  COUNTING_STAT_KEYS,
  type Basis,
  type CategoryKey,
  type CountingStatKey,
  type League,
  type LeagueTeam,
  type PlayerSeason,
  type RankType,
  type Weights,
} from "../types";
import {
  activeCategories,
  categoryDistributions,
  categoryValue,
  meanAndSd,
  orient,
  playerCounting,
  pointsScore,
  scoreCategories,
  zScore,
} from "./stats";

export type CategoryPlace = {
  key: CategoryKey;
  value: number | null;
  z: number | null;
  place: number | null;
  points: number;
};

export type TeamScore = {
  team: LeagueTeam;
  total: number;
  power: number;
  powerPlace: number;
  categories: CategoryPlace[];
};

const emptyCounting = (): Record<CountingStatKey, number> => {
  const totals = {} as Record<CountingStatKey, number>;
  for (const key of COUNTING_STAT_KEYS) totals[key] = 0;
  return totals;
};

export const sumRoster = (
  playerIds: readonly string[],
  playersById: ReadonlyMap<string, PlayerSeason>,
  basis: Basis,
): Record<CountingStatKey, number> => {
  const totals = emptyCounting();
  for (const playerId of playerIds) {
    const player = playersById.get(playerId);
    if (player === undefined) continue;
    const counting = playerCounting(player, basis);
    for (const key of COUNTING_STAT_KEYS) totals[key] += counting[key];
  }
  return totals;
};

const placeOf = (
  teamIndex: number,
  oriented: (number | null)[],
): { place: number | null; points: number } => {
  const value = oriented[teamIndex];
  if (value === null) return { place: null, points: 0 };
  let better = 0;
  for (const other of oriented) {
    if (other !== null && other > value) better += 1;
  }
  const place = better + 1;
  const ranked = oriented.filter((item) => item !== null).length;
  return { place, points: ranked - place + 1 };
};

export const scoreTeams = (
  league: League,
  playersById: ReadonlyMap<string, PlayerSeason>,
  basis: Basis,
  rankType: RankType,
): TeamScore[] => {
  const counting = league.teams.map((team) =>
    sumRoster(team.playerIds, playersById, basis),
  );

  if (league.mode === "points") {
    const totals = counting.map((row) => pointsScore(row, league.weights));
    const ranked = totals.map((total, index) => ({ total, index }));
    ranked.sort((left, right) => right.total - left.total);
    const places = new Array<number>(totals.length);
    ranked.forEach((entry, order) => {
      const previous = ranked[order - 1];
      places[entry.index] =
        previous !== undefined && previous.total === entry.total
          ? places[previous.index]
          : order + 1;
    });
    return league.teams.map((team, index) => ({
      team,
      total: totals[index] ?? 0,
      power: totals[index] ?? 0,
      powerPlace: places[index] ?? index + 1,
      categories: [],
    }));
  }

  const keys = activeCategories(league.weights);
  const fakePlayers = counting.map((row, index) => ({
    id: String(index),
    name: String(index),
    team: "",
    positions: [],
    age: null,
    games: 82,
    stats: row,
  }));
  const distributions = categoryDistributions(fakePlayers, "perGame", keys);
  const orientedByKey = new Map<CategoryKey, (number | null)[]>();
  for (const key of keys) {
    orientedByKey.set(
      key,
      counting.map((row) => {
        const value = categoryValue(row, key);
        return value === null ? null : orient(value, league.weights[key]);
      }),
    );
  }

  const drafted = league.teams.map((team, index) => {
    const scored = scoreCategories(
      counting[index] ?? emptyCounting(),
      league.weights,
      distributions,
      rankType,
    );
    const categories = CATEGORY_KEYS.filter((key) =>
      keys.includes(key),
    ).map((key) => {
      const cell = scored.cells.find((item) => item.key === key);
      const oriented = orientedByKey.get(key) ?? [];
      const standing = placeOf(index, oriented);
      return {
        key,
        value: cell?.value ?? null,
        z: cell?.z ?? null,
        place: standing.place,
        points: standing.points,
      };
    });
    return {
      team,
      total: scored.total,
      power: categories.reduce((sum, category) => sum + category.points, 0),
      categories,
    };
  });

  const powerOrder = drafted
    .map((row, index) => ({ power: row.power, index }))
    .sort((left, right) => right.power - left.power);
  const places = new Array<number>(drafted.length);
  powerOrder.forEach((entry, order) => {
    const previous = powerOrder[order - 1];
    places[entry.index] =
      previous !== undefined && previous.power === entry.power
        ? places[previous.index]
        : order + 1;
  });

  return drafted.map((row, index) => ({
    ...row,
    powerPlace: places[index] ?? index + 1,
  }));
};

export const scarcity = (
  players: readonly PlayerSeason[],
  weights: Weights,
  basis: Basis,
): { key: CategoryKey; averageZ: number }[] => {
  const keys = activeCategories(weights);
  const distributions = categoryDistributions(players, basis, keys);
  return keys.map((key) => {
    const samples: number[] = [];
    for (const player of players) {
      const value = categoryValue(playerCounting(player, basis), key);
      const distribution = distributions[key];
      if (value === null || distribution === undefined) continue;
      samples.push(orient(zScore(value, distribution), weights[key]));
    }
    return { key, averageZ: meanAndSd(samples).mean };
  });
};
