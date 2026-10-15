"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ahead, compareSides, projectRoster } from "@/lib/engine/weeks";
import { playersById } from "@/lib/players";
import { schedule, weekById } from "@/lib/schedule";

/** Your roster against every other team for one fantasy week. */
export function BeastMode() {
  const { active } = useLeague();
  const [weekId, setWeekId] = useState(schedule.weeks[0].id);
  if (active === null || active.teams.length < 2) return <EmptyLeague />;
  const mine = active.teams.find((team) => team.isMine);
  if (mine === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mark your team</CardTitle>
          <CardDescription>Beast mode compares the team you mark as yours with every other roster.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  const week = weekById(weekId);
  const mineTotals = projectRoster(mine.playerIds, playersById, schedule.games, week.dates, () => true);
  const rows = active.teams
    .filter((team) => team.id !== mine.id)
    .map((team) => {
      const result = compareSides(
        mineTotals,
        projectRoster(team.playerIds, playersById, schedule.games, week.dates, () => true),
        active.weights,
        active.mode,
      );
      return { team, result, ahead: ahead(result) };
    });
  const beast = rows.length > 0 && rows.every((row) => row.ahead);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{beast ? "Beast week" : "Not a beast week"}</CardTitle>
          <CardDescription>
            {mine.name} in {week.label}. A beast week means the category count beats every other roster.
            Counts are last-season rates times scheduled games.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WeekSelect value={weekId} onChange={setWeekId} />
        </CardContent>
      </Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Opponent</TableHead>
            <TableHead>Won</TableHead>
            <TableHead>Lost</TableHead>
            <TableHead>Tied</TableHead>
            <TableHead>Result</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.team.id}>
              <TableCell>{row.team.name}</TableCell>
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
                <span className={row.ahead ? "text-positive" : "text-destructive"}>
                  {row.ahead ? "Ahead" : "Behind"}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
