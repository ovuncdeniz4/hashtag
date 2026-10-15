"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { League } from "@/lib/types";

const STORAGE_KEY = "courtbook.leagues.v1";
const CHANGE_EVENT = "courtbook-leagues";

type LeagueStore = {
  activeId: string | null;
  leagues: League[];
};

type LeagueContextValue = {
  ready: boolean;
  leagues: League[];
  active: League | null;
  setActiveId: (id: string | null) => void;
  saveLeague: (league: League) => void;
  deleteLeague: (id: string) => void;
};

const emptyStore: LeagueStore = { activeId: null, leagues: [] };
let snapshot: LeagueStore = emptyStore;
let loaded = false;

const LeagueContext = createContext<LeagueContextValue | null>(null);

const readStore = (): LeagueStore => {
  if (typeof window === "undefined") return emptyStore;
  if (!loaded) {
    loaded = true;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw) as LeagueStore;
        if (Array.isArray(parsed.leagues)) snapshot = parsed;
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }
  return snapshot;
};

const subscribe = (onChange: () => void): (() => void) => {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
};

const commit = (next: LeagueStore): void => {
  snapshot = next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

export function LeagueProvider({ children }: { children: ReactNode }) {
  const store = useSyncExternalStore(subscribe, readStore, () => emptyStore);
  const active =
    store.leagues.find((league) => league.id === store.activeId) ?? null;

  const value = useMemo<LeagueContextValue>(
    () => ({
      ready: true,
      leagues: store.leagues,
      active,
      setActiveId: (id) => commit({ ...readStore(), activeId: id }),
      saveLeague: (league) => {
        const current = readStore();
        const exists = current.leagues.some((item) => item.id === league.id);
        const leagues = exists
          ? current.leagues.map((item) => (item.id === league.id ? league : item))
          : [...current.leagues, league];
        commit({ leagues, activeId: league.id });
      },
      deleteLeague: (id) => {
        const current = readStore();
        const leagues = current.leagues.filter((league) => league.id !== id);
        commit({
          leagues,
          activeId:
            current.activeId === id ? (leagues[0]?.id ?? null) : current.activeId,
        });
      },
    }),
    [active, store],
  );

  return <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>;
}

export const useLeague = (): LeagueContextValue => {
  const value = useContext(LeagueContext);
  if (value === null) {
    throw new Error("useLeague must be used inside LeagueProvider");
  }
  return value;
};
