import { describe, expect, it } from "vitest";
import { schedule, nightsForTeam } from "../schedule";
import { auctionDollars, dynastyFactor } from "./values";
import { ahead, compareSides, projectRoster } from "./weeks";
import { defaultCategoryWeights, type PlayerSeason } from "../types";
import { leagueFromYahoo } from "../import/yahoo";
import { leagueFromSleeper } from "../import/sleeper";
import { leagueFromFantrax } from "../import/fantrax";
import { findYahooLeagueKey } from "../import/yahoo-auth";

const player = (id: string, name: string, team: string, age: number, stats: Partial<PlayerSeason["stats"]> = {}): PlayerSeason => ({
  id,
  name,
  team,
  positions: ["PG"],
  age,
  games: 70,
  stats: {
    pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tpm: 0, to: 0, fgm: 0, fga: 0, ftm: 0, fta: 0,
    ...stats,
  },
});

describe("schedule and weekly projection", () => {
  it("keeps opening week and maps Brooklyn and Phoenix codes", () => {
    const week = schedule.weeks[0];
    expect(week.start).toBe("2025-10-20");
    expect(nightsForTeam("LAL", week.dates).some((night) => night.date === "2025-10-21")).toBe(true);
    expect(schedule.games.some((game) => game.home === "BRK" || game.away === "BRK")).toBe(true);
    expect(schedule.games.some((game) => game.home === "PHO" || game.away === "PHO")).toBe(true);
  });

  it("projects makes from per-game rates times checked nights", () => {
    const luka = player("luka", "Luka", "LAL", 26, { pts: 30, fgm: 10, fga: 20, to: 4 });
    const games = [
      { date: "2025-10-21", home: "LAL", away: "GSW" },
      { date: "2025-10-23", home: "BOS", away: "LAL" },
    ];
    const dates = ["2025-10-21", "2025-10-22", "2025-10-23"];
    const full = projectRoster([luka.id], new Map([[luka.id, luka]]), games, dates, () => true);
    expect(full.pts).toBe(60);
    expect(full.fgm).toBe(20);
    const oneNight = projectRoster(
      [luka.id],
      new Map([[luka.id, luka]]),
      games,
      dates,
      (_id, date) => date === "2025-10-21",
    );
    expect(oneNight.pts).toBe(30);
  });

  it("gives the turnover edge to the team that commits fewer", () => {
    const weights = defaultCategoryWeights();
    const result = compareSides(
      { pts: 10, reb: 0, ast: 0, stl: 0, blk: 0, tpm: 0, to: 1, fgm: 5, fga: 10, ftm: 0, fta: 0 },
      { pts: 10, reb: 0, ast: 0, stl: 0, blk: 0, tpm: 0, to: 4, fgm: 4, fga: 10, ftm: 0, fta: 0 },
      weights,
      "categories",
    );
    const turnovers = result.lines.find((line) => line.key === "to");
    expect(turnovers?.leader).toBe("left");
    expect(ahead(result)).toBe(true);
  });
});

describe("dynasty and auction", () => {
  it("values a younger player above the same production at age 33", () => {
    expect(dynastyFactor(22)).toBeGreaterThan(dynastyFactor(33));
    expect(dynastyFactor(null)).toBe(1);
  });

  it("spends the league budget on value above replacement", () => {
    const dollars = auctionDollars(
      [
        { id: "a", total: 10 },
        { id: "b", total: 8 },
        { id: "c", total: 3 },
        { id: "d", total: 1 },
      ],
      2,
      10,
      1,
    );
    expect(dollars.get("c")).toBe(0);
    expect(dollars.get("d")).toBe(0);
    expect((dollars.get("a") ?? 0) + (dollars.get("b") ?? 0)).toBe(10);
    expect(dollars.get("a")).toBeGreaterThan(dollars.get("b") ?? 0);
  });
});

describe("league import mappers", () => {
  const pool = [
    player("doncilu01", "Luka Dončić", "LAL", 26),
    player("jokicni01", "Nikola Jokić", "DEN", 30),
  ];

  it("maps a Yahoo roster onto snapshot ids and marks the signed-in team", () => {
    const payload = {
      fantasy_content: {
        league: [
          { league_key: "454.l.99", name: "Court", scoring_type: "head" },
          {
            teams: {
              "0": {
                team: [
                  [{ team_key: "454.l.99.t.1", name: "Mine" }, { is_owned_by_current_login: 1 }],
                  { roster: { players: [{ player: [[{ player_key: "nba.p.1", name: { full: "Luka Doncic" } }]] }] } },
                ],
              },
              "1": {
                team: [
                  [{ team_key: "454.l.99.t.2", name: "Other" }],
                  { roster: { players: [{ player: [[{ player_key: "nba.p.2", name: { full: "Nikola Jokic" } }]] }] } },
                ],
              },
            },
          },
        ],
      },
    };
    const imported = leagueFromYahoo(payload, pool, "yahoo-1");
    expect(imported.league.name).toBe("Court");
    expect(imported.league.mode).toBe("categories");
    expect(imported.league.teams[0]).toMatchObject({ name: "Mine", isMine: true, playerIds: ["doncilu01"] });
    expect(imported.league.teams[1].playerIds).toEqual(["jokicni01"]);
    expect(imported.unmatched).toEqual([]);
    expect(findYahooLeagueKey(payload, "99")).toBe("454.l.99");
    expect(findYahooLeagueKey(payload, "199")).toBeNull();
  });

  it("maps Sleeper and Fantrax rosters by player name", () => {
    const sleeper = leagueFromSleeper(
      {
        league: { name: "Points", roster_positions: ["PG", "BN"] },
        rosters: [{ roster_id: 1, owner_id: "u1", players: ["1"] }],
        users: [{ user_id: "u1", display_name: "ovunc", metadata: { team_name: "Mine" } }],
        players: { "1": { full_name: "Luka Doncic", team: "LAL" } },
        username: "ovunc",
      },
      pool,
      "sleeper-1",
    );
    expect(sleeper.league.mode).toBe("points");
    expect(sleeper.league.teams[0]).toMatchObject({ name: "Mine", isMine: true, playerIds: ["doncilu01"] });

    const fantrax = leagueFromFantrax(
      {
        leagueName: "Cats",
        scoringSystem: { type: "HEAD_TO_HEAD_ROTI_MULTI_WIN" },
        teams: [{ id: "t1", name: "Other" }],
      },
      { rosters: { t1: { teamName: "Other", rosterItems: [{ name: "Nikola Jokic" }, { name: "Nobody" }] } } },
      pool,
      "fantrax-1",
    );
    expect(fantrax.league.mode).toBe("categories");
    expect(fantrax.league.teams[0].playerIds).toEqual(["jokicni01"]);
    expect(fantrax.unmatched).toEqual(["Nobody"]);
  });
});
