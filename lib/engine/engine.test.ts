import { describe, expect, it } from "vitest";
import {
  defaultCategoryWeights,
  defaultPointsWeights,
  type PlayerSeason,
  type Weights,
} from "../types";
import { meanAndSd, zScore } from "./stats";
import { rankPlayers } from "./rankings";
import { scoreTeams } from "./teams";
import { applyMoves } from "./transactions";

const player = (
  id: string,
  stats: Partial<PlayerSeason["stats"]> & { games?: number },
): PlayerSeason => ({
  id,
  name: id,
  team: "TST",
  positions: ["PG"],
  age: 25,
  games: stats.games ?? 20,
  stats: {
    pts: 0,
    reb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    tpm: 0,
    to: 0,
    fgm: 0,
    fga: 0,
    ftm: 0,
    fta: 0,
    ...stats,
  },
});

const only = (weights: Weights, key: keyof Weights, value: number): Weights => {
  const next = { ...weights };
  for (const weightKey of Object.keys(next) as (keyof Weights)[]) {
    next[weightKey] = 0;
  }
  next[key] = value;
  return next;
};

describe("z-scores", () => {
  it("uses the population standard deviation", () => {
    const values = [30, 20, 10, 0];
    const distribution = meanAndSd(values);
    expect(distribution.mean).toBe(15);
    expect(distribution.sd).toBeCloseTo(Math.sqrt(125), 8);
    expect(zScore(30, distribution)).toBeCloseTo(15 / Math.sqrt(125), 8);
  });

  it("floors a category at -2 for H2H and drops the worst category for Minus 1", () => {
    const values = [10, 10, 10, 10, 10, 0];
    const distribution = meanAndSd(values);
    const lowZ = zScore(0, distribution);
    expect(lowZ).toBeLessThan(-2);

    const pool = values.map((pts, index) => player(String(index), { pts }));
    const weights = only(defaultCategoryWeights(), "pts", 1);
    const standard = rankPlayers(pool, weights, "perGame", "standard", "categories");
    const h2h = rankPlayers(pool, weights, "perGame", "h2h", "categories");
    const lowStandard = standard.find((row) => row.player.id === "5");
    const lowH2h = h2h.find((row) => row.player.id === "5");
    expect(lowStandard?.total).toBeCloseTo(lowZ, 8);
    expect(lowH2h?.total).toBe(-2);

    const opposed = [
      player("a", { pts: 0, reb: 30 }),
      player("b", { pts: 10, reb: 20 }),
      player("c", { pts: 20, reb: 10 }),
      player("d", { pts: 30, reb: 0 }),
    ];
    const both = defaultCategoryWeights();
    for (const key of Object.keys(both) as (keyof Weights)[]) both[key] = 0;
    both.pts = 1;
    both.reb = 1;
    const minus = rankPlayers(opposed, both, "perGame", "minus1", "categories");
    const kept = minus.find((row) => row.player.id === "a");
    const rebZ = zScore(30, meanAndSd([30, 20, 10, 0]));
    expect(kept?.total).toBeCloseTo(rebZ, 8);
    expect(kept?.cells.find((cell) => cell.key === "pts")?.contribution).toBeNull();
  });

  it("inverts turnovers and scores points as a weighted sum", () => {
    const pool = [
      player("low", { to: 1, pts: 10, reb: 4 }),
      player("high", { to: 5, pts: 10, reb: 4 }),
    ];
    const weights = only(defaultCategoryWeights(), "to", -1);
    const ranked = rankPlayers(pool, weights, "perGame", "standard", "categories");
    expect(ranked[0]?.player.id).toBe("low");

    const points = only(defaultPointsWeights(), "pts", 1);
    points.reb = 2;
    const scored = rankPlayers(pool, points, "totals", "standard", "points");
    expect(scored.find((row) => row.player.id === "low")?.total).toBe(10 * 20 + 4 * 20 * 2);
  });
});

describe("team scores and moves", () => {
  it("recomputes field-goal percentage from makes and attempts", () => {
    const players = [
      player("volume", { fgm: 9, fga: 10, pts: 20 }),
      player("thin", { fgm: 1, fga: 2, pts: 4 }),
    ];
    const byId = new Map(players.map((item) => [item.id, item]));
    const weights = only(defaultCategoryWeights(), "fgPct", 1);
    const teams = scoreTeams(
      {
        id: "league",
        name: "Test",
        mode: "categories",
        weights,
        teams: [
          { id: "a", name: "A", playerIds: ["volume", "thin"], isMine: true },
          { id: "b", name: "B", playerIds: [], isMine: false },
        ],
      },
      byId,
      "perGame",
      "standard",
    );
    expect(teams[0]?.categories[0]?.value).toBeCloseTo(10 / 12, 8);
  });

  it("awards power points by category place and previews a trade", () => {
    const players = [player("star", { pts: 30 }), player("role", { pts: 10 })];
    const byId = new Map(players.map((item) => [item.id, item]));
    const league = {
      id: "league",
      name: "Test",
      mode: "categories" as const,
      weights: only(defaultCategoryWeights(), "pts", 1),
      teams: [
        { id: "a", name: "A", playerIds: ["star"], isMine: true },
        { id: "b", name: "B", playerIds: ["role"], isMine: false },
      ],
    };
    const before = scoreTeams(league, byId, "perGame", "standard");
    expect(before.find((row) => row.team.id === "a")?.powerPlace).toBe(1);
    expect(before.find((row) => row.team.id === "a")?.power).toBe(2);
    expect(before.find((row) => row.team.id === "b")?.power).toBe(1);

    const traded = applyMoves(league, [
      { teamId: "a", dropPlayerId: "star", addPlayerId: "role" },
      { teamId: "b", dropPlayerId: "role", addPlayerId: "star" },
    ]);
    expect(traded.teams[0]?.playerIds).toEqual(["role"]);
    expect(traded.teams[1]?.playerIds).toEqual(["star"]);
    const after = scoreTeams(traded, byId, "perGame", "standard");
    expect(after.find((row) => row.team.id === "b")?.powerPlace).toBe(1);

    const waiver = applyMoves(league, [
      { teamId: "a", addPlayerId: "role" },
    ]);
    expect(waiver.teams[0]?.playerIds).toEqual(["star"]);
    const added = applyMoves(
      { ...league, teams: [{ ...league.teams[0]!, playerIds: ["star"] }, { ...league.teams[1]!, playerIds: [] }] },
      [{ teamId: "a", addPlayerId: "role" }],
    );
    expect(added.teams[0]?.playerIds).toEqual(["star", "role"]);
    const dropped = applyMoves(added, [{ teamId: "a", dropPlayerId: "star" }]);
    expect(dropped.teams[0]?.playerIds).toEqual(["role"]);
  });
});
