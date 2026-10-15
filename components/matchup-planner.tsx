"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { WeekSelect } from "@/components/week-select";
import { useLeague } from "@/components/league-provider";
import { rankPlayers } from "@/lib/engine/rankings";
import { rosteredIds, applyMoves } from "@/lib/engine/transactions";
import { compareSides, projectRoster } from "@/lib/engine/weeks";
import { formatStat } from "@/lib/format";
import { playerName, players, playersById } from "@/lib/players";
import { nightsForTeam, schedule, weekById, weekdayLabel } from "@/lib/schedule";
import { STAT_LABELS } from "@/lib/types";

/** Weekly category scoreboard. Uncheck a night, or add a waiver player, to see the swing. */
export function MatchupPlanner() {
  const { active } = useLeague();
  const [weekId, setWeekId] = useState(schedule.weeks[0].id);
  const [opponentId, setOpponentId] = useState("");
  const [off, setOff] = useState<Record<string, string[]>>({});
  const [closed, setClosed] = useState<string[]>([]);
  const [addId, setAddId] = useState("none");
  const week = weekById(weekId);

  if (active === null || active.teams.length < 2) return <EmptyLeague />;
  const mine = active.teams.find((team) => team.isMine) ?? active.teams[0];
  const opponent = active.teams.find((team) => team.id === opponentId) ?? active.teams.find((team) => team.id !== mine.id);
  if (mine === undefined || opponent === undefined) return <EmptyLeague />;

  const isActive = (playerId: string, date: string) =>
    !closed.includes(date) && !(off[playerId] ?? []).includes(date);
  const beforeLeft = projectRoster(mine.playerIds, playersById, schedule.games, week.dates, isActive);
  const beforeRight = projectRoster(opponent.playerIds, playersById, schedule.games, week.dates, isActive);
  const before = compareSides(beforeLeft, beforeRight, active.weights, active.mode);
  const afterLeague =
    addId === "none"
      ? active
      : applyMoves(active, [{ teamId: mine.id, addPlayerId: addId }]);
  const afterMine = afterLeague.teams.find((team) => team.id === mine.id) ?? mine;
  const after = compareSides(
    projectRoster(afterMine.playerIds, playersById, schedule.games, week.dates, isActive),
    beforeRight,
    active.weights,
    active.mode,
  );
  const available = rankPlayers(
    players.filter((player) => !rosteredIds(active).has(player.id)),
    active.weights,
    "perGame",
    "standard",
    active.mode,
  ).slice(0, 40);
  const addItems = {
    none: "No waiver add",
    ...Object.fromEntries(available.map((row) => [row.player.id, row.player.name])),
  };
  const opponentItems = Object.fromEntries(
    active.teams.filter((team) => team.id !== mine.id).map((team) => [team.id, team.name]),
  );

  const toggle = (playerId: string, date: string) => {
    setOff((current) => {
      const dates = new Set(current[playerId] ?? []);
      if (dates.has(date)) dates.delete(date);
      else dates.add(date);
      return { ...current, [playerId]: [...dates] };
    });
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Matchup</CardTitle>
          <CardDescription>
            {mine.name} against {opponent.name} in {week.label}. Counts are last-season
            per-game rates times the nights you leave checked.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <WeekSelect value={weekId} onChange={setWeekId} />
            <Select
              items={opponentItems}
              value={opponent.id}
              onValueChange={(value) => {
                if (value) setOpponentId(value);
              }}
            >
              <SelectTrigger aria-label="Opponent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {active.teams
                  .filter((team) => team.id !== mine.id)
                  .map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select items={addItems} value={addId} onValueChange={(value) => setAddId(value ?? "none")}>
              <SelectTrigger aria-label="Waiver add">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No waiver add</SelectItem>
                {available.map((row) => (
                  <SelectItem key={row.player.id} value={row.player.id}>
                    {row.player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {week.dates.map((date) => (
              <Button
                key={date}
                size="sm"
                variant={closed.includes(date) ? "outline" : "secondary"}
                onClick={() =>
                  setClosed((current) =>
                    current.includes(date) ? current.filter((item) => item !== date) : [...current, date],
                  )
                }
              >
                {closed.includes(date) ? `${weekdayLabel(date)} done` : weekdayLabel(date)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>{mine.name}</TableHead>
            <TableHead>{opponent.name}</TableHead>
            <TableHead>After add</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {before.lines.length === 0 ? (
            <TableRow>
              <TableCell>Points</TableCell>
              <TableCell>{before.leftPoints.toFixed(1)}</TableCell>
              <TableCell>{before.rightPoints.toFixed(1)}</TableCell>
              <TableCell>{after.leftPoints.toFixed(1)}</TableCell>
            </TableRow>
          ) : null}
          {before.lines.map((line) => {
            const next = after.lines.find((item) => item.key === line.key);
            return (
              <TableRow key={line.key}>
                <TableCell>{STAT_LABELS[line.key]}</TableCell>
                <TableCell>
                  <div className={line.leader === "left" ? "text-positive" : "text-muted-foreground"}>
                    {formatStat(line.left, line.key.endsWith("Pct") ? 3 : 1)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className={line.leader === "right" ? "text-positive" : "text-muted-foreground"}>
                    {formatStat(line.right, line.key.endsWith("Pct") ? 3 : 1)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="tabular-nums">{formatStat(next?.left ?? null, line.key.endsWith("Pct") ? 3 : 1)}</div>
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow>
            <TableCell>Categories won</TableCell>
            <TableCell>{before.leftWins}</TableCell>
            <TableCell>{before.rightWins}</TableCell>
            <TableCell>{after.leftWins}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div className="grid gap-3 md:grid-cols-2">
        <RosterNights title={mine.name} playerIds={mine.playerIds} dates={week.dates} off={off} onToggle={toggle} />
        <RosterNights title={opponent.name} playerIds={opponent.playerIds} dates={week.dates} off={off} onToggle={toggle} />
      </div>
    </div>
  );
}

function RosterNights({
  title,
  playerIds,
  dates,
  off,
  onToggle,
}: {
  title: string;
  playerIds: string[];
  dates: string[];
  off: Record<string, string[]>;
  onToggle: (playerId: string, date: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {playerIds.map((playerId) => {
            const player = playersById.get(playerId);
            const nights = player === undefined ? [] : nightsForTeam(player.team, dates);
            return (
              <div key={playerId} className="grid gap-1">
                <span className="text-sm">{playerName(playerId)}</span>
                <div className="flex flex-wrap gap-1">
                  {nights.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No game</span>
                  ) : (
                    nights.map((night) => {
                      const disabled = (off[playerId] ?? []).includes(night.date);
                      return (
                        <Button
                          key={night.date}
                          size="sm"
                          variant={disabled ? "outline" : "secondary"}
                          onClick={() => onToggle(playerId, night.date)}
                        >
                          {weekdayLabel(night.date)} {night.home ? "vs" : "@"} {night.opponent}
                        </Button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
