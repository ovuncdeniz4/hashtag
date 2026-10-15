import { NextResponse, type NextRequest } from "next/server";
import { players } from "@/lib/players";
import { leagueFromSleeper } from "@/lib/import/sleeper";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { leagueId?: string; username?: string } | null;
  const leagueId = body?.leagueId?.trim() ?? "";
  if (leagueId === "") return NextResponse.json({ error: "Enter a Sleeper league id." }, { status: 400 });
  try {
    const [league, rosters, users, playerPool] = await Promise.all([
      fetch(`https://api.sleeper.app/v1/league/${leagueId}`, { cache: "no-store" }).then((response) => response.json()),
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`, { cache: "no-store" }).then((response) => response.json()),
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`, { cache: "no-store" }).then((response) => response.json()),
      fetch("https://api.sleeper.app/v1/players/nba", { cache: "no-store" }).then((response) => response.json()),
    ]);
    if (league === null || league.league_id === undefined) {
      return NextResponse.json({ error: "Sleeper did not return that league." }, { status: 404 });
    }
    const imported = leagueFromSleeper(
      { league, rosters, users, players: playerPool, username: body?.username },
      players,
      crypto.randomUUID(),
    );
    return NextResponse.json(imported);
  } catch {
    return NextResponse.json({ error: "Sleeper import failed." }, { status: 502 });
  }
}
