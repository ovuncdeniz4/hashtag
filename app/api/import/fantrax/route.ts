import { NextResponse, type NextRequest } from "next/server";
import { players } from "@/lib/players";
import { leagueFromFantrax } from "@/lib/import/fantrax";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { leagueId?: string } | null;
  const leagueId = body?.leagueId?.trim() ?? "";
  if (leagueId === "") return NextResponse.json({ error: "Enter a Fantrax league id." }, { status: 400 });
  try {
    const [info, rosters] = await Promise.all([
      fetch(`https://www.fantrax.com/fxea/general/getLeagueInfo?leagueId=${encodeURIComponent(leagueId)}`, { cache: "no-store" }).then((response) => response.json()),
      fetch(`https://www.fantrax.com/fxea/general/getTeamRosters?leagueId=${encodeURIComponent(leagueId)}`, { cache: "no-store" }).then((response) => response.json()),
    ]);
    const imported = leagueFromFantrax(info, rosters, players, crypto.randomUUID());
    if (imported.league.teams.length === 0) {
      return NextResponse.json({ error: "Fantrax did not return teams for that league." }, { status: 404 });
    }
    return NextResponse.json(imported);
  } catch {
    return NextResponse.json({ error: "Fantrax import failed." }, { status: 502 });
  }
}
