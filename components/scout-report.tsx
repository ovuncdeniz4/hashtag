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
import { scoreTeams } from "@/lib/engine/teams";
import { formatSigned, zTone } from "@/lib/format";
import { playersById } from "@/lib/players";
import { STAT_LABELS } from "@/lib/types";

/** Two rosters and every team's category place in the league. */
export function ScoutReport() {
  const { active } = useLeague();
  const [leftId, setLeftId] = useState(active?.teams[0]?.id ?? "");
  const [rightId, setRightId] = useState(active?.teams[1]?.id ?? "");

  if (active && leftId === "" && active.teams[0]) setLeftId(active.teams[0].id);
  if (active && rightId === "" && active.teams[1]) setRightId(active.teams[1].id);

  if (active === null || active.teams.length < 2) return <EmptyLeague />;

  const scores = scoreTeams(active, playersById, "perGame", "standard");
  const left = active.teams.find((team) => team.id === leftId);
  const right = active.teams.find((team) => team.id === rightId);
  const categories = scores[0]?.categories ?? [];

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <TeamPick label="First team" value={leftId} teams={active.teams} onChange={setLeftId} />
        <TeamPick label="Second team" value={rightId} teams={active.teams} onChange={setRightId} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <RosterCard teamName={left?.name ?? "Team"} playerIds={left?.playerIds ?? []} />
        <RosterCard teamName={right?.name ?? "Team"} playerIds={right?.playerIds ?? []} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Team</TableHead>
            <TableHead>Power</TableHead>
            {categories.map((category) => (
              <TableHead key={category.key}>{STAT_LABELS[category.key]}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {scores.map((row) => (
            <TableRow key={row.team.id}>
              <TableCell>{row.team.name}</TableCell>
              <TableCell>
                <div className="text-right tabular-nums">{row.powerPlace}</div>
              </TableCell>
              {row.categories.map((category) => (
                <TableCell key={category.key}>
                  <div className="text-right tabular-nums">
                    <div className={zTone(category.z)}>
                      {category.place === null ? "—" : category.place}
                    </div>
                    <div className="text-muted-foreground">
                      {category.z === null ? "—" : formatSigned(category.z)}
                    </div>
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TeamPick({
  label,
  value,
  teams,
  onChange,
}: {
  label: string;
  value: string;
  teams: { id: string; name: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => next && onChange(next)}>
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

function RosterCard({
  teamName,
  playerIds,
}: {
  teamName: string;
  playerIds: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{teamName}</CardTitle>
        <CardDescription>{playerIds.length} players</CardDescription>
      </CardHeader>
      <ul className="grid gap-1 px-4 pb-4 text-sm">
        {playerIds.map((id) => {
          const player = playersById.get(id);
          return (
            <li key={id} className="flex justify-between gap-3">
              <span>{player?.name ?? id}</span>
              <span className="text-muted-foreground tabular-nums">
                {player ? `${player.stats.pts.toFixed(1)} PTS` : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
