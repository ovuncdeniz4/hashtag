import { Suspense } from "react";
import { LeagueEditor } from "@/components/league-editor";
import { LeagueImport } from "@/components/league-import";

export default function LeaguePage() {
  return (
    <div className="grid gap-4">
      <Suspense fallback={null}>
        <LeagueImport />
      </Suspense>
      <LeagueEditor />
    </div>
  );
}
