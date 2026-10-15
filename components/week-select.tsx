"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { schedule } from "@/lib/schedule";

/** Monday-Sunday fantasy weeks from the committed schedule. */
export function WeekSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (weekId: number) => void;
}) {
  const items = Object.fromEntries(
    schedule.weeks.map((week) => [String(week.id), `${week.label} · ${week.start}`]),
  );
  return (
    <Select
      items={items}
      value={String(value)}
      onValueChange={(next) => {
        if (next !== null) onChange(Number(next));
      }}
    >
      <SelectTrigger aria-label="Week">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {schedule.weeks.map((week) => (
          <SelectItem key={week.id} value={String(week.id)}>
            {week.label} · {week.start}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
