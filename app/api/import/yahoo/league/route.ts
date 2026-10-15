import { NextResponse, type NextRequest } from "next/server";
import { players } from "@/lib/players";
import { findYahooLeagueKey, refreshYahooToken, yahooGet } from "@/lib/import/yahoo-auth";
import { leagueFromYahoo } from "@/lib/import/yahoo";

export async function GET(request: NextRequest) {
  const clientId = process.env.YAHOO_CLIENT_ID;
  const clientSecret = process.env.YAHOO_CLIENT_SECRET;
  const refreshToken = request.cookies.get("courtbook_yahoo_refresh")?.value;
  const leagueId = request.cookies.get("courtbook_yahoo_league")?.value;
  if (clientId === undefined || clientSecret === undefined || refreshToken === undefined || leagueId === undefined) {
    return NextResponse.json({ error: "Yahoo is not connected." }, { status: 401 });
  }
  try {
    const tokens = await refreshYahooToken({ refreshToken, clientId, clientSecret });
    const directory = await yahooGet("/users;use_login=1/games;game_keys=nba/leagues", tokens.accessToken);
    const leagueKey = findYahooLeagueKey(directory, leagueId);
    if (leagueKey === null) {
      return NextResponse.json({ error: "That league is not on the Yahoo account you authorized." }, { status: 404 });
    }
    const today = new Date().toISOString().slice(0, 10);
    const [settings, rosters] = await Promise.all([
      yahooGet(`/league/${leagueKey};out=settings`, tokens.accessToken),
      yahooGet(`/league/${leagueKey}/teams/roster;date=${today}`, tokens.accessToken),
    ]);
    const imported = leagueFromYahoo({ settings, rosters }, players, crypto.randomUUID());
    const response = NextResponse.json(imported);
    response.cookies.set("courtbook_yahoo_refresh", tokens.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Yahoo import failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
