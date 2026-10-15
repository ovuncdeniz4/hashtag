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
import { StandingCompare } from "@/components/trade-machine";
import { useLeague } from "@/components/league-provider";
import { rankPlayers } from "@/lib/engine/rankings";
import { scarcity, scoreTeams } from "@/lib/engine/teams";
import { applyMoves, rosteredIds } from "@/lib/engine/transactions";
import { formatSigned, zTone } from "@/lib/format";
import { players, playersById } from "@/lib/players";
import { STAT_LABELS } from "@/lib/types";

/** Waiver add, with an optional drop, and the categories still available. */
export function WaiverBoard() {
  const { active, saveLeague } = useLeague();
  const mine = active?.teams.find((team) => team.isMine);
  const [addId, setAddId] = useState("");
  const [dropId, setDropId] = useState("none");

  const available = useMemo(() => {
    if (active === null) return [];
    const taken = rosteredIds(active);
    return players.filter((player) => !taken.has(player.id));
  }, [active]);

  const ranked = useMemo(() => {
    if (active === null) return [];
    return rankPlayers(
      available,
      active.weights,
      "perGame",
      "standard",
      active.mode,
    ).slice(0, 50);
  }, [active, available]);

  const wire = useMemo(() => {
    if (active === null || active.mode === "points") return [];
    return scarcity(available, active.weights, "perGame");
  }, [active, available]);

  const preview = useMemo(() => {
    if (active === null || mine === undefined || addId === "") return null;
    const before = scoreTeams(active, playersById, "perGame", "standard");
    const next = applyMoves(active, [
      {
        teamId: mine.id,
        addPlayerId: addId,
        dropPlayerId: dropId === "none" ? undefined : dropId,
      },
    ]);
    return { before, after: scoreTeams(next, playersById, "perGame", "standard"), next };
  }, [active, mine, addId, dropId]);

  if (active === null) return <EmptyLeague />;
  if (mine === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mark your team</CardTitle>
          <CardDescription>
            Waiver moves apply to the team you mark as yours on the league screen.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Waiver wire</CardTitle>
          <CardDescription>
            Available players for {mine.name}. Scarcity is the average category z-score still on the wire.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            {wire.map((item) => (
              <span key={item.key} className={zTone(item.averageZ)}>
                {STAT_LABELS[item.key]} {formatSigned(item.averageZ)}
              </span>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              items={{
                none: "Choose a player",
                ...Object.fromEntries(ranked.map((row) => [row.player.id, row.player.name])),
              }}
              value={addId || "none"}
              onValueChange={(value) => setAddId(value === "none" || value === null ? "" : value)}
            >
              <SelectTrigger aria-label="Add player">
                <SelectValue placeholder="Add a player" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Choose a player</SelectItem>
                {ranked.map((row) => (
                  <SelectItem key={row.player.id} value={row.player.id}>
                    {row.player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              items={{
                none: "No player dropped",
                ...Object.fromEntries(
                  mine.playerIds.map((id) => [id, playersById.get(id)?.name ?? id]),
                ),
              }}
              value={dropId}
              onValueChange={(value) => setDropId(value ?? "none")}
            >
              <SelectTrigger aria-label="Drop player">
                <SelectValue placeholder="No player dropped" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No player dropped</SelectItem>
                {mine.playerIds.map((id) => (
                  <SelectItem key={id} value={id}>
                    {playersById.get(id)?.name ?? id}
                  </SelectItem>
                ))}
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
              Apply waiver move
            </Button>
          </div>
        </CardContent>
      </Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ranked.map((row) => (
            <TableRow key={row.player.id}>
              <TableCell>{row.player.name}</TableCell>
              <TableCell>{row.player.team}</TableCell>
              <TableCell>
                <div className="text-right tabular-nums">{formatSigned(row.total)}</div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {preview ? <StandingCompare before={preview.before} after={preview.after} /> : null}
    </div>
  );
}
