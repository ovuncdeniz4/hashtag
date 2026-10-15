import type { PlayerSeason } from "../types";

/** Compare "Jokić" with "Jokic" and "Doncic, Luka" with "Luka Doncic". */
export const normalizeName = (name: string): string => {
  const plain = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const comma = plain.match(/^(\w+)\s+(\w+(?:\s+\w+)*)$/);
  if (name.includes(",") && comma !== null) return `${comma[2]} ${comma[1]}`;
  return plain;
};

export const matchPlayerId = (
  name: string,
  team: string | null,
  players: readonly PlayerSeason[],
): string | null => {
  const key = normalizeName(name);
  const hits = players.filter((player) => normalizeName(player.name) === key);
  if (hits.length === 0) return null;
  if (team !== null) {
    const sameTeam = hits.find((player) => player.team === team);
    if (sameTeam !== undefined) return sameTeam.id;
  }
  return hits[0]?.id ?? null;
};
