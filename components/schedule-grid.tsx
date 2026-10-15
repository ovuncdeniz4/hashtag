"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { WeekSelect } from "@/components/week-select";
import { useLeague } from "@/components/league-provider";
import { rankPlayers } from "@/lib/engine/rankings";
import { rosteredIds } from "@/lib/engine/transactions";
import { players } from "@/lib/players";
import { nightsForTeam, schedule, weekById, weekdayLabel, type GameNight } from "@/lib/schedule";

const nbaTeams = [...new Set(schedule.games.flatMap((game) => [game.home, game.away]))].sort();

/** Weekly games for a roster and the top available players, or every NBA team. */
export function ScheduleGrid() {
  const { active } = useLeague();
  const [weekId, setWeekId] = useState(schedule.weeks[0].id);
  const [teamId, setTeamId] = useState(active?.teams[0]?.id ?? "");
  const [hidden, setHidden] = useState<string[]>([]);
  const week = weekById(weekId);
  const dates = week.dates.filter((date) => !hidden.includes(date));

  const rows = useMemo(() => {
    if (active === null) {
      return nbaTeams.map((team) => ({
        id: team,
        name: team,
        team,
        nights: nightsForTeam(team, dates),
      }));
    }
    const roster = active.teams.find((team) => team.id === teamId) ?? active.teams[0];
    const taken = rosteredIds(active);
    const wire = rankPlayers(
      players.filter((player) => !taken.has(player.id)),
      active.weights,
      "perGame",
      "standard",
      active.mode,
    )
      .filter((row) => nightsForTeam(row.player.team, week.dates).length > 0)
      .slice(0, 15);
    const rosterRows = (roster?.playerIds ?? []).flatMap((id) => {
      const player = players.find((item) => item.id === id);
      if (player === undefined) return [];
      return [{ id: player.id, name: player.name, team: player.team, nights: nightsForTeam(player.team, dates) }];
    });
    const wireRows = wire.map((row) => ({
      id: row.player.id,
      name: row.player.name,
      team: row.player.team,
      nights: nightsForTeam(row.player.team, dates),
    }));
    return [...rosterRows, ...wireRows];
  }, [active, teamId, dates, week.dates]);

  const teamItems = Object.fromEntries((active?.teams ?? []).map((team) => [team.id, team.name]));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <span className="text-sm text-muted-foreground">Week</span>
          <WeekSelect value={weekId} onChange={setWeekId} />
        </div>
        {active !== null ? (
          <div className="grid gap-1">
            <span className="text-sm text-muted-foreground">Roster</span>
            <Select
              items={teamItems}
              value={active.teams.find((team) => team.id === teamId)?.id ?? active.teams[0]?.id ?? ""}
              onValueChange={(value) => {
                if (value) setTeamId(value);
              }}
            >
              <SelectTrigger aria-label="Roster">
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
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">{schedule.label}</p>
      <div className="flex flex-wrap gap-2">
        {week.dates.map((date) => (
          <Button
            key={date}
            size="sm"
            variant={hidden.includes(date) ? "outline" : "secondary"}
            onClick={() =>
              setHidden((current) =>
                current.includes(date) ? current.filter((item) => item !== date) : [...current, date],
              )
            }
          >
            {weekdayLabel(date)}
          </Button>
        ))}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{active === null ? "NBA team" : "Player"}</TableHead>
            <TableHead>Team</TableHead>
            {dates.map((date) => (
              <TableHead key={date}>{weekdayLabel(date)}</TableHead>
            ))}
            <TableHead>Games</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.team}</TableCell>
              {dates.map((date) => {
                const night = row.nights.find((item) => item.date === date);
                return (
                  <TableCell key={date}>{night === undefined ? "—" : cellLabel(night)}</TableCell>
                );
              })}
              <TableCell>
                <div className="text-right tabular-nums">{row.nights.length}</div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {active === null ? (
        <p className="text-sm text-muted-foreground">
          Build a league to list roster players and the best available names who play this week.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          The roster is listed first. The next rows are available players who have a game this week.
        </p>
      )}
    </div>
  );
}

const cellLabel = (night: GameNight): string => `${night.home ? "vs" : "@"} ${night.opponent}`;
