"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { WeightFields } from "@/components/weight-fields";
import { useLeague } from "@/components/league-provider";
import { rankPlayers } from "@/lib/engine/rankings";
import { auctionDollars, dynastyFactor } from "@/lib/engine/values";
import { formatSigned, formatStat, zTone } from "@/lib/format";
import { snapshot, players } from "@/lib/players";
import {
  CATEGORY_KEYS,
  COUNTING_STAT_KEYS,
  STAT_LABELS,
  auctionBudgetOf,
  defaultCategoryWeights,
  rosterSizeOf,
  type Basis,
  type RankType,
  type ScoringMode,
  type Weights,
} from "@/lib/types";

const positions = ["ALL", "PG", "SG", "SF", "PF", "C"] as const;

const positionItems: Record<(typeof positions)[number], string> = {
  ALL: "All positions",
  PG: "PG",
  SG: "SG",
  SF: "SF",
  PF: "PF",
  C: "C",
};

const rankTypeItems: Record<RankType, string> = {
  standard: "Standard",
  h2h: "H2H floor",
  minus1: "Minus 1",
};

/** Rankings for the full player pool, using the active league weights when one is open. */
export function RankingsBoard() {
  const { active, saveLeague } = useLeague();
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<(typeof positions)[number]>("ALL");
  const [basis, setBasis] = useState<Basis>("perGame");
  const [rankType, setRankType] = useState<RankType>("standard");
  const [showZ, setShowZ] = useState(true);
  const [dynasty, setDynasty] = useState(false);
  const [auction, setAuction] = useState(false);
  const [mode, setMode] = useState<ScoringMode>(active?.mode ?? "categories");
  const [weights, setWeights] = useState<Weights>(
    active?.weights ?? defaultCategoryWeights(),
  );
  const [syncedId, setSyncedId] = useState(active?.id ?? null);

  if ((active?.id ?? null) !== syncedId) {
    setSyncedId(active?.id ?? null);
    if (active) {
      setMode(active.mode);
      setWeights(active.weights);
    }
  }

  const persist = (nextMode: ScoringMode, nextWeights: Weights) => {
    setMode(nextMode);
    setWeights(nextWeights);
    if (active) saveLeague({ ...active, mode: nextMode, weights: nextWeights });
  };

  const ranked = useMemo(() => {
    const priced = rankPlayers(players, weights, basis, rankType, mode).map((row) => ({
      ...row,
      dynasty: row.total * dynastyFactor(row.player.age),
    }));
    const ordered = dynasty
      ? [...priced].sort(
          (left, right) =>
            right.dynasty - left.dynasty || left.player.name.localeCompare(right.player.name),
        )
      : priced;
    const teamCount = Math.max(active?.teams.length ?? 12, 1);
    const dollars = auctionDollars(
      ordered.map((row) => ({
        id: row.player.id,
        total: dynasty ? row.dynasty : row.total,
      })),
      rosterSizeOf(active) * teamCount,
      auctionBudgetOf(active),
      teamCount,
    );
    return ordered.map((row, index) => ({
      ...row,
      rank: index + 1,
      dollars: dollars.get(row.player.id) ?? 0,
    }));
  }, [weights, basis, rankType, mode, dynasty, active]);

  const visible = ranked.filter((row) => {
    const matchesName = row.player.name.toLowerCase().includes(query.trim().toLowerCase());
    const matchesPosition =
      position === "ALL" || row.player.positions.includes(position);
    return matchesName && matchesPosition;
  });

  const columns = mode === "categories" ? CATEGORY_KEYS.filter((key) => weights[key] !== 0) : [];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-56 flex-1 gap-1">
          <span className="text-sm text-muted-foreground">Player</span>
          <Input
            value={query}
            placeholder="Search"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <span className="text-sm text-muted-foreground">Position</span>
          <Select
            items={positionItems}
            value={position}
            onValueChange={(value) => {
              if (value !== null) setPosition(value as (typeof positions)[number]);
            }}
          >
            <SelectTrigger aria-label="Position">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {positions.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "ALL" ? "All positions" : item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Tabs
          value={basis}
          onValueChange={(value) => setBasis(value as Basis)}
        >
          <TabsList>
            <TabsTrigger value="perGame">Per game</TabsTrigger>
            <TabsTrigger value="totals">Totals</TabsTrigger>
          </TabsList>
        </Tabs>
        {mode === "categories" ? (
          <Select
            items={rankTypeItems}
            value={rankType}
            onValueChange={(value) => {
              if (value !== null) setRankType(value as RankType);
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
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>Weights</SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Weights</SheetTitle>
              <SheetDescription>
                Zero turns a category off. A negative weight treats a lower number
                as better. {active ? "Changes save to the open league." : "Open a league to keep these."}
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-4 pb-4">
              <Tabs
                value={mode}
                onValueChange={(value) =>
                  persist(value as ScoringMode, weights)
                }
              >
                <TabsList>
                  <TabsTrigger value="categories">Categories</TabsTrigger>
                  <TabsTrigger value="points">Points</TabsTrigger>
                </TabsList>
              </Tabs>
              <WeightFields
                weights={weights}
                keys={mode === "points" ? COUNTING_STAT_KEYS : CATEGORY_KEYS}
                onChange={(key, value) =>
                  persist(mode, { ...weights, [key]: value })
                }
              />
            </div>
          </SheetContent>
        </Sheet>
        {mode === "categories" ? (
          <Button
            variant={showZ ? "secondary" : "outline"}
            onClick={() => setShowZ((current) => !current)}
          >
            Z-scores
          </Button>
        ) : null}
        <Button
          variant={dynasty ? "secondary" : "outline"}
          onClick={() => setDynasty((current) => !current)}
        >
          Dynasty
        </Button>
        <Button
          variant={auction ? "secondary" : "outline"}
          onClick={() => setAuction((current) => !current)}
        >
          Auction
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{snapshot.label}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Pos</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>GP</TableHead>
            {columns.map((key) => (
              <TableHead key={key}>{STAT_LABELS[key]}</TableHead>
            ))}
            <TableHead>Total</TableHead>
            {dynasty ? <TableHead>Dynasty</TableHead> : null}
            {auction ? <TableHead>$</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((row) => (
            <TableRow key={row.player.id}>
              <TableCell>
                <div className="tabular-nums">{row.rank}</div>
              </TableCell>
              <TableCell>{row.player.name}</TableCell>
              <TableCell>{row.player.positions.join("-")}</TableCell>
              <TableCell>
                <Badge variant="outline">{row.player.team}</Badge>
              </TableCell>
              <TableCell>
                <div className="text-right tabular-nums">{row.player.games}</div>
              </TableCell>
              {columns.map((key) => {
                const cell = row.cells.find((item) => item.key === key);
                const digits = key === "fgPct" || key === "ftPct" ? 3 : 1;
                return (
                  <TableCell key={key}>
                    <div className="text-right tabular-nums">
                      <div>{formatStat(cell?.value ?? null, digits)}</div>
                      {showZ ? (
                        <div className={zTone(cell?.z ?? null)}>
                          {cell?.z === null || cell?.z === undefined
                            ? "—"
                            : formatSigned(cell.z)}
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                );
              })}
              <TableCell>
                <div className="text-right font-medium tabular-nums">
                  {formatSigned(row.total)}
                </div>
              </TableCell>
              {dynasty ? (
                <TableCell>
                  <div className="text-right tabular-nums">{formatSigned(row.dynasty)}</div>
                </TableCell>
              ) : null}
              {auction ? (
                <TableCell>
                  <div className="text-right tabular-nums">{row.dollars}</div>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
