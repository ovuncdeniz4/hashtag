"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyLeague } from "@/components/empty-league";
import { useLeague } from "@/components/league-provider";
import { rankPlayers } from "@/lib/engine/rankings";
import { scarcity } from "@/lib/engine/teams";
import { rosteredIds } from "@/lib/engine/transactions";
import { auctionDollars, dynastyFactor } from "@/lib/engine/values";
import { formatSigned, zTone } from "@/lib/format";
import { players } from "@/lib/players";
import { STAT_LABELS, auctionBudgetOf, rosterSizeOf, type RankType } from "@/lib/types";

const rankItems: Record<RankType, string> = {
  standard: "Standard",
  h2h: "H2H floor",
  minus1: "Minus 1",
};

/** Best available players, with dynasty value, auction dollars, and one-click drafting. */
export function DraftBoard() {
  const { active, saveLeague } = useLeague();
  const [clockId, setClockId] = useState(active?.teams.find((team) => team.isMine)?.id ?? active?.teams[0]?.id ?? "");
  const [rankType, setRankType] = useState<RankType>("standard");
  const [query, setQuery] = useState("");
  const [stack, setStack] = useState<{ teamId: string; playerId: string }[]>([]);

  const taken = useMemo(() => (active === null ? new Set<string>() : rosteredIds(active)), [active]);
  const available = players.filter((player) => !taken.has(player.id));
  const ranked = useMemo(() => {
    if (active === null) return [];
    return rankPlayers(available, active.weights, "perGame", rankType, active.mode);
  }, [active, available, rankType]);
  const wire = useMemo(() => {
    if (active === null || active.mode === "points") return [];
    return scarcity(available, active.weights, "perGame");
  }, [active, available]);
  const prices = useMemo(() => {
    if (active === null) return new Map<string, number>();
    const teamCount = Math.max(active.teams.length, 1);
    const pool = rankPlayers(players, active.weights, "perGame", rankType, active.mode);
    return auctionDollars(
      pool.map((row) => ({
        id: row.player.id,
        total: row.total * dynastyFactor(row.player.age),
      })),
      rosterSizeOf(active) * teamCount,
      auctionBudgetOf(active),
      teamCount,
    );
  }, [active, rankType]);

  if (active === null) return <EmptyLeague />;
  const clock = active.teams.find((team) => team.id === clockId) ?? active.teams[0];
  const spent = (clock?.playerIds ?? []).reduce((sum, id) => sum + (prices.get(id) ?? 0), 0);
  const teamItems = Object.fromEntries(active.teams.map((team) => [team.id, team.name]));
  const visible = ranked
    .filter((row) => row.player.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 60);

  const draft = (playerId: string) => {
    if (clock === undefined) return;
    saveLeague({
      ...active,
      teams: active.teams.map((team) =>
        team.id === clock.id ? { ...team, playerIds: [...team.playerIds, playerId] } : team,
      ),
    });
    setStack((current) => [...current, { teamId: clock.id, playerId }]);
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Draft</CardTitle>
          <CardDescription>
            Best available players for {active.name}. Dynasty is last-season value
            scaled toward age 26. Auction dollars split the league budget above replacement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1">
              <span className="text-sm text-muted-foreground">On the clock</span>
              <Select
                items={teamItems}
                value={clock?.id ?? ""}
                onValueChange={(value) => {
                  if (value) setClockId(value);
                }}
              >
                <SelectTrigger aria-label="On the clock">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {active.teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {active.mode === "categories" ? (
              <Select
                items={rankItems}
                value={rankType}
                onValueChange={(value) => {
                  if (value === "standard" || value === "h2h" || value === "minus1") setRankType(value);
                }}
              >
                <SelectTrigger aria-label="Rank type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="h2h">H2H floor</SelectItem>
                  <SelectItem value="minus1">Minus 1</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
            <div className="grid min-w-56 flex-1 gap-1">
              <span className="text-sm text-muted-foreground">Search</span>
              <Input value={query} aria-label="Search draft board" onChange={(event) => setQuery(event.target.value)} />
            </div>
            <Button
              variant="outline"
              disabled={stack.length === 0}
              onClick={() => {
                const last = stack[stack.length - 1];
                if (last === undefined) return;
                saveLeague({
                  ...active,
                  teams: active.teams.map((team) =>
                    team.id === last.teamId
                      ? { ...team, playerIds: team.playerIds.filter((id) => id !== last.playerId) }
                      : team,
                  ),
                });
                setStack((current) => current.slice(0, -1));
              }}
            >
              Undo pick
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {clock?.name ?? "Team"} has spent ${spent} of ${auctionBudgetOf(active)}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {wire.map((item) => (
              <span key={item.key} className={zTone(item.averageZ)}>
                {STAT_LABELS[item.key]} {formatSigned(item.averageZ)}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Dynasty</TableHead>
            <TableHead>$</TableHead>
            <TableHead>Pick</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((row) => (
            <TableRow key={row.player.id}>
              <TableCell>{row.player.name}</TableCell>
              <TableCell>{row.player.team}</TableCell>
              <TableCell>
                <div className="tabular-nums">{row.player.age ?? "—"}</div>
              </TableCell>
              <TableCell>
                <div className="text-right tabular-nums">{formatSigned(row.total)}</div>
              </TableCell>
              <TableCell>
                <div className="text-right tabular-nums">
                  {formatSigned(row.total * dynastyFactor(row.player.age))}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-right tabular-nums">{prices.get(row.player.id) ?? 0}</div>
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => draft(row.player.id)}>
                  Draft
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
