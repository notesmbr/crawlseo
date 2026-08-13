import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SaveKeywordForm, DeleteKeywordButton } from "@/components/sites/saved-keyword-actions";
import { PositionBadge, NumCell, CtrCell } from "@/components/ui/data-table";
import { getDateRange } from "@/lib/date-utils";
import { rollupKeywordMetrics } from "@/lib/keyword-storage";

interface Props {
  params: Promise<{ siteId: string }>;
}

export default async function SavedKeywordsPage({ params }: Props) {
  const session = await auth();
  const { siteId } = await params;

  const site = await db.site.findUnique({
    where: { id: siteId },
    select: { userId: true, domain: true },
  });
  if (!site || site.userId !== session?.user?.id) redirect("/sites");

  const saved = await db.savedKeyword.findMany({
    where: { siteId },
    orderBy: { createdAt: "desc" },
  });

  // Get latest keyword data for saved queries
  const { start, end } = getDateRange(28);
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T23:59:59.999Z`);

  const keywordData = saved.length > 0
    ? await db.keyword.findMany({
        where: {
          siteId,
          query: { in: saved.map((s) => s.query) },
          page: { in: saved.map((s) => s.ownerPage) },
          date: { gte: startDate, lte: endDate },
        },
        select: {
          query: true,
          page: true,
          clicks: true,
          impressions: true,
          position: true,
        },
      })
    : [];

  const dataMap = new Map(
    saved.map((owner) => {
      const rows = keywordData.filter(
        (row) => row.query === owner.query && row.page === owner.ownerPage,
      );
      return [
        `${owner.query}\u0000${owner.ownerPage}`,
        rows.length > 0 ? rollupKeywordMetrics(rows) : null,
      ] as const;
    }),
  );

  return (
    <div>
      <PageHeader
        eyebrow={site.domain}
        title="Saved Keywords"
        description="Track specific keywords over time"
        actions={<SaveKeywordForm siteId={siteId} />}
      />

      {saved.length === 0 ? (
        <EmptyState
          icon="⭐"
          title="No saved keywords"
          description="Save keywords you want to track closely. Use the form above to add your first keyword."
        />
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-muted/30">
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Keyword
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Owner and intent
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Position
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Clicks
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Impr.
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    CTR
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {saved.map((kw) => {
                  const data = dataMap.get(`${kw.query}\u0000${kw.ownerPage}`);
                  return (
                    <tr key={kw.id} className="transition-colors hover:bg-muted/25">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {kw.query}
                      </td>
                      <td className="max-w-md px-4 py-3 text-muted-foreground">
                        <a className="block truncate text-primary hover:underline" href={kw.ownerPage}>
                          {kw.ownerPage}
                        </a>
                        <span className="block truncate text-xs">{kw.intent || kw.notes || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {data ? <PositionBadge position={data.position} /> : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {data ? <NumCell value={data.clicks} /> : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {data ? <NumCell value={data.impressions} /> : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {data ? <CtrCell ctr={data.ctr} /> : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DeleteKeywordButton
                          siteId={siteId}
                          query={kw.query}
                          ownerPage={kw.ownerPage}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            {saved.length} saved keywords · last 28 days aggregated
          </div>
        </div>
      )}
    </div>
  );
}
