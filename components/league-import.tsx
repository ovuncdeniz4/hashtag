"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLeague } from "@/components/league-provider";
import type { League } from "@/lib/types";

type ImportResponse = {
  league?: League;
  unmatched?: string[];
  error?: string;
};

/** Yahoo, Sleeper, and Fantrax roster import. ESPN cookie import is not offered. */
export function LeagueImport() {
  const params = useSearchParams();
  const yahoo = params.get("yahoo");
  const { saveLeague } = useLeague();
  const [sleeperId, setSleeperId] = useState("");
  const [username, setUsername] = useState("");
  const [fantraxId, setFantraxId] = useState("");
  const [yahooId, setYahooId] = useState("");
  const [message, setMessage] = useState("");

  const apply = (payload: ImportResponse) => {
    if (payload.league === undefined) {
      setMessage(payload.error ?? "Import failed.");
      return;
    }
    saveLeague(payload.league);
    const missed = payload.unmatched?.length ?? 0;
    setMessage(
      missed === 0
        ? `Imported ${payload.league.name}.`
        : `Imported ${payload.league.name}. ${missed} names were not in the 2025-26 snapshot.`,
    );
  };

  const post = async (path: string, body: object) => {
    setMessage("Importing…");
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    apply((await response.json()) as ImportResponse);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import a league</CardTitle>
        <CardDescription>
          Sleeper and Fantrax use their public league id. Yahoo uses a read-only
          OAuth app and never sends the consumer secret to the browser. ESPN
          import is omitted because it depends on copying session cookies.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {yahoo === "missing" ? (
            <p className="text-sm text-muted-foreground">
              Set YAHOO_CLIENT_ID and YAHOO_CLIENT_SECRET, and register the
              callback /api/import/yahoo/callback on the Yahoo app.
            </p>
          ) : null}
          {yahoo === "error" ? (
            <p className="text-sm text-destructive">Yahoo authorization did not finish.</p>
          ) : null}
          {yahoo === "1" ? (
            <Button
              variant="outline"
              onClick={async () => {
                setMessage("Loading the Yahoo league…");
                const response = await fetch("/api/import/yahoo/league");
                apply((await response.json()) as ImportResponse);
              }}
            >
              Finish Yahoo import
            </Button>
          ) : null}
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1">
              <span className="text-sm text-muted-foreground">Sleeper league id</span>
              <Input
                aria-label="Sleeper league id"
                value={sleeperId}
                onChange={(event) => setSleeperId(event.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <span className="text-sm text-muted-foreground">Sleeper username</span>
              <Input
                aria-label="Sleeper username"
                value={username}
                placeholder="Marks your team"
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => post("/api/import/sleeper", { leagueId: sleeperId, username })}>
              Import Sleeper
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1">
              <span className="text-sm text-muted-foreground">Fantrax league id</span>
              <Input
                aria-label="Fantrax league id"
                value={fantraxId}
                onChange={(event) => setFantraxId(event.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => post("/api/import/fantrax", { leagueId: fantraxId })}>
              Import Fantrax
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1">
              <span className="text-sm text-muted-foreground">Yahoo league id</span>
              <Input
                aria-label="Yahoo league id"
                value={yahooId}
                onChange={(event) => setYahooId(event.target.value)}
              />
            </div>
            <a
              className={buttonVariants({ variant: "outline" })}
              href={`/api/import/yahoo/start?leagueId=${encodeURIComponent(yahooId)}`}
            >
              Import Yahoo
            </a>
          </div>
          {message !== "" ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
