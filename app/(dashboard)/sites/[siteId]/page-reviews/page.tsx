import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PageReviewsWorkboard } from "@/components/sites/page-reviews-workboard";

interface Props {
  params: Promise<{ siteId: string }>;
}

export default async function PageReviewsPage({ params }: Props) {
  const session = await auth();
  const { siteId } = await params;
  const site = await db.site.findUnique({
    where: { id: siteId },
    select: { userId: true, domain: true },
  });

  if (!site || site.userId !== session?.user?.id) redirect("/sites");

  return <PageReviewsWorkboard siteId={siteId} domain={site.domain} />;
}
