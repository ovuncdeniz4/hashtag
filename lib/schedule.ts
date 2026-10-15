import scheduleJson from "@/data/schedule.json";

export type ScheduledGame = {
  date: string;
  home: string;
  away: string;
};

export type ScheduleWeek = {
  id: number;
  label: string;
  start: string;
  end: string;
  dates: string[];
};

export type SeasonSchedule = {
  season: string;
  label: string;
  weeks: ScheduleWeek[];
  games: ScheduledGame[];
};

export const schedule = scheduleJson as SeasonSchedule;

export const weekById = (id: number): ScheduleWeek =>
  schedule.weeks.find((week) => week.id === id) ?? schedule.weeks[0];

export const weekdayLabel = (iso: string): string =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });

export type GameNight = {
  date: string;
  opponent: string;
  home: boolean;
};

/** Opponent for one NBA team on the dates in a fantasy week. */
export const nightsForTeam = (
  team: string,
  dates: readonly string[],
  games: readonly ScheduledGame[] = schedule.games,
): GameNight[] => {
  const wanted = new Set(dates);
  const nights: GameNight[] = [];
  for (const game of games) {
    if (!wanted.has(game.date)) continue;
    if (game.home === team) {
      nights.push({ date: game.date, opponent: game.away, home: true });
    } else if (game.away === team) {
      nights.push({ date: game.date, opponent: game.home, home: false });
    }
  }
  return nights.sort((left, right) => left.date.localeCompare(right.date));
};
