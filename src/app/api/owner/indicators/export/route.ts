import { ACCESS_JWT_HEADER, verifyAccessJwt } from "@/lib/owner/accessJwt";
import { getMembersDb } from "@/lib/members/db";
import { buyersCsv, listBuyers } from "@/lib/owner/indicatorBuyers";

export const dynamic = "force-dynamic";

/** Owner only: CSV of every indicator buyer (permanent backup). */
export async function GET(request: Request) {
  const v = await verifyAccessJwt(request.headers.get(ACCESS_JWT_HEADER));
  if (!v.ok) return new Response("Not found", { status: 404 });
  const csv = buyersCsv(await listBuyers(await getMembersDb()));
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="indicator-buyers-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
