const TOKEN_URL = "https://api.login.yahoo.com/oauth2/get_token";

export type YahooTokens = {
  accessToken: string;
  refreshToken: string;
};

const basic = (clientId: string, clientSecret: string): string =>
  Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

const readTokens = async (response: Response): Promise<YahooTokens> => {
  if (!response.ok) {
    throw new Error(`Yahoo token request failed (${response.status})`);
  }
  const payload = (await response.json()) as { access_token?: string; refresh_token?: string };
  if (payload.access_token === undefined || payload.refresh_token === undefined) {
    throw new Error("Yahoo token response was missing credentials");
  }
  return { accessToken: payload.access_token, refreshToken: payload.refresh_token };
};

export const exchangeYahooCode = async (input: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<YahooTokens> => {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
  });
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic(input.clientId, input.clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  return readTokens(response);
};

export const refreshYahooToken = async (input: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<YahooTokens> => {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
  });
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic(input.clientId, input.clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  return readTokens(response);
};

export const yahooGet = async (path: string, accessToken: string): Promise<unknown> => {
  const url = new URL(`https://fantasysports.yahooapis.com/fantasy/v2${path}`);
  url.searchParams.set("format", "json");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Yahoo league request failed (${response.status})`);
  return response.json();
};

const leagueKeyMatches = (key: string, leagueId: string): boolean => {
  if (leagueId.includes(".l.")) return key === leagueId;
  const parts = key.split(".l.");
  return parts[parts.length - 1] === leagueId;
};

export const findYahooLeagueKey = (payload: unknown, leagueId: string): string | null => {
  let found: string | null = null;
  const visit = (node: unknown): void => {
    if (found !== null) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (node === null || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (typeof record.league_key === "string" && leagueKeyMatches(record.league_key, leagueId)) {
      found = record.league_key;
      return;
    }
    for (const value of Object.values(record)) visit(value);
  };
  visit(payload);
  return found;
};
