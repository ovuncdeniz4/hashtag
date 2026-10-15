"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerSearch } from "@/components/player-search";
import { WeightFields } from "@/components/weight-fields";
import { useLeague } from "@/components/league-provider";
import { rosteredIds } from "@/lib/engine/transactions";
import { playerName, players } from "@/lib/players";
import {
  CATEGORY_KEYS,
  COUNTING_STAT_KEYS,
  DEFAULT_AUCTION_BUDGET,
  DEFAULT_ROSTER_SIZE,
  weightsForMode,
  type League,
  type LeagueTeam,
  type ScoringMode,
} from "@/lib/types";

const createId = (): string => crypto.randomUUID();

const starterLeague = (): League => ({
  id: "draft",
  name: "My league",
  mode: "categories",
  weights: weightsForMode("categories"),
  teams: [
    { id: "draft-mine", name: "My team", playerIds: [], isMine: true },
    { id: "draft-opponent", name: "Opponent", playerIds: [], isMine: false },
  ],
});

/** Custom league editor. Yahoo import will later replace this same object. */
export function LeagueEditor() {
  const { active, saveLeague, deleteLeague } = useLeague();
  const [draft, setDraft] = useState<League>(active ?? starterLeague());
  const [syncedId, setSyncedId] = useState(active?.id ?? draft.id);
  const [teamId, setTeamId] = useState(draft.teams[0]?.id ?? "");

  if (active && active.id !== syncedId) {
    setSyncedId(active.id);
    setDraft(active);
    setTeamId(active.teams[0]?.id ?? "");
  }

  const update = (league: League) => {
    setDraft(league);
    saveLeague(league);
  };

  const taken = rosteredIds(draft);
  const available = players.filter((player) => !taken.has(player.id));
  const selected = draft.teams.find((team) => team.id === teamId) ?? draft.teams[0];

  const renameTeam = (id: string, name: string) =>
    update({
      ...draft,
      teams: draft.teams.map((team) => (team.id === id ? { ...team, name } : team)),
    });

  const markMine = (id: string) =>
    update({
      ...draft,
      teams: draft.teams.map((team) => ({ ...team, isMine: team.id === id })),
    });

  const addPlayer = (playerId: string) => {
    if (selected === undefined || taken.has(playerId)) return;
    update({
      ...draft,
      teams: draft.teams.map((team) =>
        team.id === selected.id
          ? { ...team, playerIds: [...team.playerIds, playerId] }
          : team,
      ),
    });
  };

  const removePlayer = (team: LeagueTeam, playerId: string) =>
    update({
      ...draft,
      teams: draft.teams.map((item) =>
        item.id === team.id
          ? { ...item, playerIds: item.playerIds.filter((id) => id !== playerId) }
          : item,
      ),
    });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="grid gap-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>{draft.name}</CardTitle>
            <CardDescription>
              Rosters and weights live in this browser. Yahoo, Sleeper, and Fantrax
              import replace this same league.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Input
                aria-label="League name"
                value={draft.name}
                onChange={(event) => update({ ...draft, name: event.target.value })}
              />
              <div className="flex flex-wrap gap-3">
                <div className="grid gap-1">
                  <span className="text-sm text-muted-foreground">Roster spots</span>
                  <div className="w-24">
                    <Input
                      aria-label="Roster spots"
                      type="number"
                      value={draft.rosterSize ?? DEFAULT_ROSTER_SIZE}
                      onChange={(event) =>
                        update({
                          ...draft,
                          rosterSize: Number(event.target.value) || DEFAULT_ROSTER_SIZE,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-1">
                  <span className="text-sm text-muted-foreground">Auction budget</span>
                  <div className="w-24">
                    <Input
                      aria-label="Auction budget"
                      type="number"
                      value={draft.auctionBudget ?? DEFAULT_AUCTION_BUDGET}
                      onChange={(event) =>
                        update({
                          ...draft,
                          auctionBudget: Number(event.target.value) || DEFAULT_AUCTION_BUDGET,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
              <Tabs
                value={draft.mode}
                onValueChange={(value) => {
                  const mode = value as ScoringMode;
                  update({ ...draft, mode });
                }}
              >
                <TabsList>
                  <TabsTrigger value="categories">Categories</TabsTrigger>
                  <TabsTrigger value="points">Points</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    update({ ...draft, weights: weightsForMode(draft.mode) })
                  }
                >
                  Reset weights
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const created = {
                      ...starterLeague(),
                      id: createId(),
                      teams: starterLeague().teams.map((team) => ({
                        ...team,
                        id: createId(),
                      })),
                    };
                    setSyncedId(created.id);
                    setTeamId(created.teams[0]?.id ?? "");
                    update(created);
                  }}
                >
                  New league
                </Button>
                <Button variant="destructive" onClick={() => deleteLeague(draft.id)}>
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-3">
          {draft.teams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <CardTitle>{team.name}</CardTitle>
                <CardDescription>
                  {team.playerIds.length} players
                  {team.isMine ? " · your team" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <Input
                    aria-label={`${team.name} name`}
                    value={team.name}
                    onChange={(event) => renameTeam(team.id, event.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={team.id === selected?.id ? "secondary" : "outline"}
                      onClick={() => setTeamId(team.id)}
                    >
                      Assign here
                    </Button>
                    <Button variant="outline" onClick={() => markMine(team.id)}>
                      This is my team
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const teams = draft.teams.filter((item) => item.id !== team.id);
                        update({ ...draft, teams });
                        if (teamId === team.id) setTeamId(teams[0]?.id ?? "");
                      }}
                    >
                      Remove team
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {team.playerIds.map((playerId) => (
                      <Button
                        key={playerId}
                        variant="outline"
                        size="sm"
                        onClick={() => removePlayer(team, playerId)}
                      >
                        {playerName(playerId)}
                        {team.isMine ? <Badge variant="secondary">Mine</Badge> : null}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button
            variant="outline"
            onClick={() => {
              const team = {
                id: createId(),
                name: `Team ${draft.teams.length + 1}`,
                playerIds: [],
                isMine: false,
              };
              update({ ...draft, teams: [...draft.teams, team] });
              setTeamId(team.id);
            }}
          >
            Add team
          </Button>
        </div>
      </div>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Add to {selected?.name ?? "a team"}</CardTitle>
            <CardDescription>{available.length} players are still available.</CardDescription>
          </CardHeader>
          <CardContent>
            <PlayerSearch
              players={available}
              placeholder="Search available players"
              onPick={addPlayer}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Weights</CardTitle>
          </CardHeader>
          <CardContent>
            <WeightFields
              weights={draft.weights}
              keys={draft.mode === "points" ? COUNTING_STAT_KEYS : CATEGORY_KEYS}
              onChange={(key, value) =>
                update({ ...draft, weights: { ...draft.weights, [key]: value } })
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
