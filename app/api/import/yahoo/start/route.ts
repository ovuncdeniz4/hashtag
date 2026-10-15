import { NextResponse, type NextRequest } from "next/server";

const redirectUriFor = (request: NextRequest): string =>
  process.env.YAHOO_REDIRECT_URI ?? new URL("/api/import/yahoo/callback", request.url).toString();

export async function GET(request: NextRequest) {
  const leagueId = request.nextUrl.searchParams.get("leagueId")?.trim() ?? "";
  const clientId = process.env.YAHOO_CLIENT_ID;
  const clientSecret = process.env.YAHOO_CLIENT_SECRET;
  if (clientId === undefined || clientSecret === undefined || clientId === "" || clientSecret === "") {
    return NextResponse.redirect(new URL("/league?yahoo=missing", request.url));
  }
  if (leagueId === "") return NextResponse.redirect(new URL("/league?yahoo=error", request.url));

  const state = crypto.randomUUID();
  const authorize = new URL("https://api.login.yahoo.com/oauth2/request_auth");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirectUriFor(request));
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "fspt-r");
  authorize.searchParams.set("state", state);

  const response = NextResponse.redirect(authorize);
  const cookie = { httpOnly: true, sameSite: "lax" as const, path: "/", secure: process.env.NODE_ENV === "production", maxAge: 600 };
  response.cookies.set("courtbook_yahoo_state", state, cookie);
  response.cookies.set("courtbook_yahoo_league", leagueId, cookie);
  return response;
}
