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
import { scoreTeams, type TeamScore } from "@/lib/engine/teams";
import { applyMoves } from "@/lib/engine/transactions";
import { formatSigned } from "@/lib/format";
import { playerName, players, playersById } from "@/lib/players";

/** Trade preview. Applying it writes the swapped rosters back to the league. */
export function TradeMachine() {
  const { active, saveLeague } = useLeague();
  const [leftId, setLeftId] = useState(active?.teams[0]?.id ?? "");
  const [rightId, setRightId] = useState(active?.teams[1]?.id ?? "");
  const [leftPlayer, setLeftPlayer] = useState("");
  const [rightPlayer, setRightPlayer] = useState("");
  const [waiverId, setWaiverId] = useState("none");
  const [waiverSide, setWaiverSide] = useState<"left" | "right">("left");

  if (active && leftId === "" && active.teams[0]) setLeftId(active.teams[0].id);
  if (active && rightId === "" && active.teams[1]) setRightId(active.teams[1].id);

  const rostered = useMemo(
    () => new Set(active?.teams.flatMap((team) => team.playerIds) ?? []),
    [active],
  );
  const freeAgents = players.filter((player) => !rostered.has(player.id));

  const preview = useMemo(() => {
    if (active === null || leftId === "" || rightId === "" || leftId === rightId) return null;
    const before = scoreTeams(active, playersById, "perGame", "standard");
    const moves = [];
    if (leftPlayer !== "" || rightPlayer !== "") {
      moves.push({
        teamId: leftId,
        dropPlayerId: leftPlayer || undefined,
        addPlayerId: rightPlayer || undefined,
      });
      moves.push({
        teamId: rightId,
        dropPlayerId: rightPlayer || undefined,
        addPlayerId: leftPlayer || undefined,
      });
    }
    if (waiverId !== "none") {
      moves.push({
        teamId: waiverSide === "left" ? leftId : rightId,
        addPlayerId: waiverId,
      });
    }
    const next = applyMoves(active, moves);
    const after = scoreTeams(next, playersById, "perGame", "standard");
    return { before, after, next };
  }, [active, leftId, rightId, leftPlayer, rightPlayer, waiverId, waiverSide]);

  if (active === null || active.teams.length < 2) return <EmptyLeague />;

  const left = active.teams.find((team) => team.id === leftId);
  const right = active.teams.find((team) => team.id === rightId);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Trade</CardTitle>
          <CardDescription>
            Swap one player from each side. A waiver add can stand in for a 2-for-1.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <TeamSide
              label="Left team"
              teamId={leftId}
              teams={active.teams}
              playerId={leftPlayer}
              players={left?.playerIds ?? []}
              onTeam={setLeftId}
              onPlayer={setLeftPlayer}
            />
            <TeamSide
              label="Right team"
              teamId={rightId}
              teams={active.teams}
              playerId={rightPlayer}
              players={right?.playerIds ?? []}
              onTeam={setRightId}
              onPlayer={setRightPlayer}
            />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Select value={waiverId} onValueChange={(value) => setWaiverId(value ?? "none")}>
              <SelectTrigger aria-label="Waiver player">
                <SelectValue placeholder="No waiver player" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No waiver player</SelectItem>
                {freeAgents.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={waiverSide}
              onValueChange={(value) => {
                if (value === "left" || value === "right") setWaiverSide(value);
              }}
            >
              <SelectTrigger aria-label="Waiver side">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Add waiver player to the left</SelectItem>
                <SelectItem value="right">Add waiver player to the right</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4">
            <Button
              disabled={preview === null}
              onClick={() => {
                if (preview) saveLeague(preview.next);
              }}
            >
              Apply trade
            </Button>
          </div>
        </CardContent>
      </Card>
      {preview ? <StandingCompare before={preview.before} after={preview.after} /> : null}
    </div>
  );
}

function TeamSide({
  label,
  teamId,
  teams,
  playerId,
  players: roster,
  onTeam,
  onPlayer,
}: {
  label: string;
  teamId: string;
  teams: { id: string; name: string }[];
  playerId: string;
  players: string[];
  onTeam: (id: string) => void;
  onPlayer: (id: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Select value={teamId} onValueChange={(value) => value && onTeam(value)}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={playerId || "none"} onValueChange={(value) => onPlayer(value === "none" || value === null ? "" : value)}>
        <SelectTrigger aria-label={`${label} player`}>
          <SelectValue placeholder="No player" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No player</SelectItem>
          {roster.map((id) => (
            <SelectItem key={id} value={id}>
              {playerName(id)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function StandingCompare({
  before,
  after,
}: {
  before: TeamScore[];
  after: TeamScore[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Team</TableHead>
          <TableHead>Before</TableHead>
          <TableHead>After</TableHead>
          <TableHead>Value before</TableHead>
          <TableHead>Value after</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {before.map((row) => {
          const next = after.find((item) => item.team.id === row.team.id);
          return (
            <TableRow key={row.team.id}>
              <TableCell>{row.team.name}</TableCell>
              <TableCell>
                <div className="text-right tabular-nums">{row.powerPlace}</div>
              </TableCell>
              <TableCell>
                <div className="text-right tabular-nums">{next?.powerPlace ?? "—"}</div>
              </TableCell>
              <TableCell>
                <div className="text-right tabular-nums">{formatSigned(row.total)}</div>
              </TableCell>
              <TableCell>
                <div className="text-right tabular-nums">
                  {next ? formatSigned(next.total) : "—"}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
