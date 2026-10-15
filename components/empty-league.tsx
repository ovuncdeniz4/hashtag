import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Shown on league tools before a custom league exists. */
export function EmptyLeague() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a league first</CardTitle>
        <CardDescription>
          Trade, waiver, and scouting tools read the league you build. Rankings
          still work on the full player pool.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/league" className={buttonVariants()}>
          Build a league
        </Link>
      </CardContent>
    </Card>
  );
}
