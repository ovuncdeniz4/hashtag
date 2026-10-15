"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import type { PlayerSeason } from "@/lib/types";

/** Searchable player list used when assigning rosters. */
export function PlayerSearch({
  players,
  onPick,
  placeholder,
}: {
  players: readonly PlayerSeason[];
  onPick: (playerId: string) => void;
  placeholder: string;
}) {
  return (
    <Command>
      <CommandInput placeholder={placeholder} />
      <CommandList>
        <CommandEmpty>No matching players.</CommandEmpty>
        <CommandGroup>
          {players.map((player) => (
            <CommandItem
              key={player.id}
              value={`${player.name} ${player.team} ${player.positions.join(" ")}`}
              onSelect={() => onPick(player.id)}
            >
              {player.name}
              <CommandShortcut>{player.team}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
