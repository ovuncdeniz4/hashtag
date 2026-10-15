"use client";

import { useState } from "react";
import {
  Card,
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
import { useLeague } from "@/components/league-provider";
import { ahead, compareSides, projectRoster } from "@/lib/engine/weeks";
import { playersById } from "@/lib/players";
import { schedule } from "@/lib/schedule";

/** Two rosters, matched on the schedule of every week. */
export function SmashMode() {
  const { active } = useLeague();
  const [leftId, setLeftId] = useState(active?.teams[0]?.id ?? "");
  const [rightId, setRightId] = useState(active?.teams[1]?.id ?? "");
  if (active === null || active.teams.length < 2) return <EmptyLeague />;
  const left = active.teams.find((team) => team.id === leftId) ?? active.teams[0];
  const right = active.teams.find((team) => team.id === rightId) ?? active.teams[1];
  if (left === undefined || right === undefined) return <EmptyLeague />;
  const items = Object.fromEntries(active.teams.map((team) => [team.id, team.name]));
  const rows = schedule.weeks.map((week) => {
    const result = compareSides(
      projectRoster(left.playerIds, playersById, schedule.games, week.dates, () => true),
      projectRoster(right.playerIds, playersById, schedule.games, week.dates, () => true),
      active.weights,
      active.mode,
    );
    return { week, result, ahead: ahead(result) };
  });
  const leftWeeks = rows.filter((row) => row.ahead).length;
  const rightWeeks = rows.filter((row) => row.result.rightWins > row.result.leftWins).length;

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Smash</CardTitle>
          <CardDescription>
            {left.name} leads {leftWeeks} weeks. {right.name} leads {rightWeeks}. Each week uses
            scheduled games and last-season rates, so the same rosters repeat the same edge unless
            the game counts change.
          </CardDescription>
        </CardHeader>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        <TeamSelect label="Left team" value={left.id} items={items} teams={active.teams} onChange={setLeftId} />
        <TeamSelect label="Right team" value={right.id} items={items} teams={active.teams} onChange={setRightId} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Week</TableHead>
            <TableHead>{left.name}</TableHead>
            <TableHead>{right.name}</TableHead>
            <TableHead>Ties</TableHead>
            <TableHead>Leader</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.week.id}>
              <TableCell>
                {row.week.label}
                <div className="text-muted-foreground">{row.week.start}</div>
              </TableCell>
              <TableCell>
                <div className="tabular-nums">{row.result.leftWins}</div>
              </TableCell>
              <TableCell>
                <div className="tabular-nums">{row.result.rightWins}</div>
              </TableCell>
              <TableCell>
                <div className="tabular-nums">{row.result.ties}</div>
              </TableCell>
              <TableCell>
                {row.result.leftWins === row.result.rightWins
                  ? "Tie"
                  : row.ahead
                    ? left.name
                    : right.name}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TeamSelect({
  label,
  value,
  items,
  teams,
  onChange,
}: {
  label: string;
  value: string;
  items: Record<string, string>;
  teams: { id: string; name: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next);
      }}
    >
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {teams.map((team) => (
          <SelectItem key={team.id} value={team.id}>
            {team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
