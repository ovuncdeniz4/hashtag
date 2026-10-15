/** Age curve and auction dollars on top of an existing player value. */

export const DYNASTY_PEAK_AGE = 26;

/** Last-season value scaled toward age 26. Missing ages stay unchanged. */
export const dynastyFactor = (age: number | null): number => {
  if (age === null || !Number.isFinite(age)) return 1;
  const raw = 1 + (DYNASTY_PEAK_AGE - age) * 0.035;
  const clamped = Math.min(1.35, Math.max(0.7, raw));
  return Math.round(clamped * 1000) / 1000;
};

export type AuctionInput = {
  id: string;
  total: number;
};

/**
 * Split `budget` per team across positive value above the first player
 * who does not fit in `rosterSpots` roster spots.
 */
export const auctionDollars = (
  rows: readonly AuctionInput[],
  rosterSpots: number,
  budget: number,
  teamCount: number,
): Map<string, number> => {
  const dollars = new Map<string, number>();
  const ordered = [...rows].sort((left, right) => right.total - left.total || left.id.localeCompare(right.id));
  for (const row of ordered) dollars.set(row.id, 0);
  const spots = Math.max(0, Math.floor(rosterSpots));
  const teams = Math.max(1, Math.floor(teamCount));
  const money = Math.max(0, Math.round(budget * teams));
  if (spots === 0 || money === 0 || ordered.length === 0) return dollars;

  const replacement = ordered[spots]?.total ?? ordered[ordered.length - 1].total;
  const vorp = ordered.map((row) => ({ id: row.id, vorp: Math.max(0, row.total - replacement) }));
  const pool = vorp.reduce((sum, row) => sum + row.vorp, 0);
  if (pool === 0) return dollars;

  const shares = vorp
    .filter((row) => row.vorp > 0)
    .map((row) => {
      const exact = (row.vorp / pool) * money;
      return { id: row.id, exact, dollars: Math.floor(exact) };
    });
  let used = shares.reduce((sum, row) => sum + row.dollars, 0);
  const byRemainder = [...shares].sort(
    (left, right) => right.exact - right.dollars - (left.exact - left.dollars) || left.id.localeCompare(right.id),
  );
  let index = 0;
  while (used < money && shares.length > 0) {
    byRemainder[index % byRemainder.length].dollars += 1;
    used += 1;
    index += 1;
    if (index > money + shares.length) break;
  }
  for (const row of shares) dollars.set(row.id, row.dollars);
  return dollars;
};
