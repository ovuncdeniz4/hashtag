"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLeague } from "@/components/league-provider";
import { weightSummary } from "@/lib/engine/rankings";
import { defaultCategoryWeights } from "@/lib/types";

const links = [
  { href: "/", label: "Rankings" },
  { href: "/league", label: "League" },
  { href: "/trade", label: "Trade" },
  { href: "/waivers", label: "Waivers" },
  { href: "/scout", label: "Scout" },
];

/** App shell for the workbook. League choice and the active weights stay visible. */
export function SiteHeader() {
  const pathname = usePathname();
  const { leagues, active, setActiveId } = useLeague();
  const summary = active
    ? weightSummary(active.weights, active.mode)
    : weightSummary(defaultCategoryWeights(), "categories");
  const leagueItems: Record<string, string> = {
    none: "No league",
    ...Object.fromEntries(leagues.map((league) => [league.id, league.name])),
  };

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="font-medium">
          Courtbook
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={buttonVariants({
                variant: pathname === link.href ? "secondary" : "ghost",
                size: "sm",
              })}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex min-w-48 flex-1 items-center justify-end gap-3 sm:flex-none">
          <Select
            items={leagueItems}
            value={active?.id ?? "none"}
            onValueChange={(value) =>
              setActiveId(value === null || value === "none" ? null : value)
            }
          >
            <SelectTrigger aria-label="Active league">
              <SelectValue placeholder="No league" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No league</SelectItem>
              {leagues.map((league) => (
                <SelectItem key={league.id} value={league.id}>
                  {league.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="w-full text-sm text-muted-foreground">
          {active ? active.name : "Player pool"} · {summary}
        </p>
      </div>
    </header>
  );
}
