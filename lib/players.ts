import snapshotJson from "@/data/players.json";
import type { PlayerSeason, PlayerSnapshot } from "@/lib/types";

/** Committed 2025-26 per-game rates. The site does not fetch stats on each view. */
export const snapshot = snapshotJson as PlayerSnapshot;

export const players: PlayerSeason[] = snapshot.players;

export const playersById: ReadonlyMap<string, PlayerSeason> = new Map(
  players.map((player) => [player.id, player]),
);

export const playerName = (playerId: string): string =>
  playersById.get(playerId)?.name ?? playerId;
