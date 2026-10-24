import { MembersDashboard } from "./MembersDashboard";
import { MEMBERS_DECIDE_COLLAPSE, MEMBERS_MY_STOCKS, MEMBERS_TICKER_CHART_V2 } from "@/lib/featureFlags";

export const dynamic = "force-dynamic";

/** Live members dashboard. Design options follow their flags (all default OFF until approved). */
export default async function MembersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <MembersDashboard
      searchParams={searchParams}
      design={{
        decideCollapse: MEMBERS_DECIDE_COLLAPSE,
        chartV2: MEMBERS_TICKER_CHART_V2,
        myStocks: MEMBERS_MY_STOCKS,
      }}
    />
  );
}
