import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { KeywordResearchClient } from "@/components/research/keyword-research-client";
import { getGoogleAdsKeywordPlannerCapability } from "@/lib/google/google-ads-keyword-planner";

interface Props {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{
    query?: string | string[];
    pageUrl?: string | string[];
  }>;
}

export default async function KeywordResearchPage({ params, searchParams }: Props) {
  const session = await auth();
  const { siteId } = await params;
  const resolvedSearchParams = await searchParams;

  const site = await db.site.findUnique({
    where: { id: siteId },
    select: { userId: true, domain: true },
  });
  if (!site || site.userId !== session?.user?.id) redirect("/sites");

  const queryParam = resolvedSearchParams.query;
  const initialQuery = (
    Array.isArray(queryParam) ? queryParam[0] : queryParam ?? ""
  ).trim().slice(0, 200);
  const pageUrlParam = resolvedSearchParams.pageUrl;
  const initialPageUrl = (
    Array.isArray(pageUrlParam) ? pageUrlParam[0] : pageUrlParam ?? ""
  ).trim().slice(0, 2048);

  return (
    <div>
      <PageHeader
        eyebrow={site.domain}
        title="Keyword Research"
        description="Check Google suggestions and, when configured, Google Keyword Planner estimates. Nothing is saved automatically."
      />
      <KeywordResearchClient
        siteId={siteId}
        initialQuery={initialQuery}
        initialPageUrl={initialPageUrl}
        keywordPlannerCapability={getGoogleAdsKeywordPlannerCapability()}
      />
    </div>
  );
}
