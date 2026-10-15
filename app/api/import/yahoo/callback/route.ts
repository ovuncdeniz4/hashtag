import { NextResponse, type NextRequest } from "next/server";
import { exchangeYahooCode } from "@/lib/import/yahoo-auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expected = request.cookies.get("courtbook_yahoo_state")?.value;
  const clientId = process.env.YAHOO_CLIENT_ID;
  const clientSecret = process.env.YAHOO_CLIENT_SECRET;
  if (code === null || state === null || state !== expected || clientId === undefined || clientSecret === undefined) {
    return NextResponse.redirect(new URL("/league?yahoo=error", request.url));
  }
  try {
    const tokens = await exchangeYahooCode({
      code,
      redirectUri: process.env.YAHOO_REDIRECT_URI ?? new URL("/api/import/yahoo/callback", request.url).toString(),
      clientId,
      clientSecret,
    });
    const response = NextResponse.redirect(new URL("/league?yahoo=1", request.url));
    response.cookies.set("courtbook_yahoo_refresh", tokens.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.delete("courtbook_yahoo_state");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/league?yahoo=error", request.url));
  }
}
