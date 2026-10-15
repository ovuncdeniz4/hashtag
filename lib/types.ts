/** Shared league shape. A later Yahoo import maps API payloads onto this object. */

export const COUNTING_STAT_KEYS = [
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
] as const;

export const CATEGORY_KEYS = [
  "pts",
  "reb",
  "ast",
  "stl",
  "blk",
  "tpm",
  "fgPct",
  "ftPct",
  "to",
] as const;

export type CountingStatKey = (typeof COUNTING_STAT_KEYS)[number];
export type CategoryKey = (typeof CATEGORY_KEYS)[number];
export type WeightKey = CountingStatKey | CategoryKey;

export type Weights = Record<WeightKey, number>;

export type RankType = "standard" | "h2h" | "minus1";
export type Basis = "perGame" | "totals";
export type ScoringMode = "categories" | "points";

export type PlayerSeason = {
  id: string;
  name: string;
  team: string;
  positions: string[];
  age: number | null;
  games: number;
  /** Per-game counting rates. Totals are this times games played. */
  stats: Record<CountingStatKey, number>;
};

export type PlayerSnapshot = {
  season: string;
  label: string;
  players: PlayerSeason[];
};

export type LeagueTeam = {
  id: string;
  name: string;
  playerIds: string[];
  isMine: boolean;
};

export type League = {
  id: string;
  name: string;
  mode: ScoringMode;
  weights: Weights;
  teams: LeagueTeam[];
  /** Roster spots used for auction replacement. Omitted leagues use 13. */
  rosterSize?: number;
  /** Auction dollars per team. Omitted leagues use 200. */
  auctionBudget?: number;
};

export const DEFAULT_ROSTER_SIZE = 13;
export const DEFAULT_AUCTION_BUDGET = 200;

export const rosterSizeOf = (league: League | null): number =>
  league?.rosterSize ?? DEFAULT_ROSTER_SIZE;

export const auctionBudgetOf = (league: League | null): number =>
  league?.auctionBudget ?? DEFAULT_AUCTION_BUDGET;

export const STAT_LABELS: Record<WeightKey, string> = {
  pts: "PTS",
  reb: "REB",
  ast: "AST",
  stl: "STL",
  blk: "BLK",
  tpm: "3PM",
  to: "TO",
  fgm: "FGM",
  fga: "FGA",
  ftm: "FTM",
  fta: "FTA",
  fgPct: "FG%",
  ftPct: "FT%",
};

export const MIN_QUALIFIED_GAMES = 10;

export const defaultCategoryWeights = (): Weights => ({
  pts: 1,
  reb: 1,
  ast: 1,
  stl: 1,
  blk: 1,
  tpm: 1,
  fgPct: 1,
  ftPct: 1,
  to: -1,
  fgm: 0,
  fga: 0,
  ftm: 0,
  fta: 0,
});

/** Starting points template. It is not an official Yahoo scoring preset. */
export const defaultPointsWeights = (): Weights => ({
  pts: 1,
  reb: 1.2,
  ast: 1.5,
  stl: 3,
  blk: 3,
  tpm: 0.5,
  to: -1,
  fgm: 0,
  fga: 0,
  ftm: 0,
  fta: 0,
  fgPct: 0,
  ftPct: 0,
});

export const weightsForMode = (mode: ScoringMode): Weights =>
  mode === "points" ? defaultPointsWeights() : defaultCategoryWeights();
