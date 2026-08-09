import { createHash } from "crypto";

export type CrawlIssueLike = {
  url: string;
  type: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  message: string;
  details?: Record<string, unknown>;
};

export type ClassifiedCrawlIssue<T extends CrawlIssueLike = CrawlIssueLike> = T & {
  fingerprint: string;
  isNew: boolean;
  isActionable: boolean;
  isVerified: boolean;
  suppressedReason: string | null;
};

const ACTIONABLE_WARNING_TYPES = new Set([
  "DUPLICATE_TITLE",
  "LARGE_PAGE",
  "MISSING_ALT",
  "MISSING_DESCRIPTION",
  "MISSING_H1",
  "MISSING_ROBOTS",
  "MISSING_SITEMAP",
  "MIXED_CONTENT",
]);

export function countImagesMissingAlt(html: string) {
  const imageTags = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  const hasAltAttribute = (tag: string) =>
    /\salt\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i.test(tag);

  return {
    imageCount: imageTags.length,
    imagesMissingAlt: imageTags.filter((tag) => !hasAltAttribute(tag)).length,
  };
}

export function sitemapQueueUrls(urls: string[], maxPages: number) {
  return urls.slice(0, Math.max(0, maxPages));
}

function normalizedIssueUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return value.trim();
  }
}

export function crawlIssueFingerprint(issue: CrawlIssueLike) {
  const kind = typeof issue.details?.kind === "string" ? issue.details.kind : "";
  const statusCode =
    typeof issue.details?.statusCode === "number" ? String(issue.details.statusCode) : "";
  const identity = [issue.type, normalizedIssueUrl(issue.url), kind, statusCode].join("|");

  return createHash("sha256").update(identity).digest("hex");
}

export function isActionableCrawlIssue(issue: CrawlIssueLike) {
  if (issue.details?.kind === "crawl_summary" || issue.details?.kind === "content_score") {
    return false;
  }

  if (issue.details?.kind === "orphan") {
    return false;
  }

  if (issue.severity === "CRITICAL") {
    return true;
  }

  return issue.severity === "WARNING" && ACTIONABLE_WARNING_TYPES.has(issue.type);
}

export function classifyCrawlIssues<T extends CrawlIssueLike>(
  issues: T[],
  options: {
    hasVerifiedBaseline: boolean;
    baselineFingerprints: ReadonlySet<string>;
    previousFingerprints: ReadonlySet<string>;
  },
): ClassifiedCrawlIssue<T>[] {
  return issues.map((issue) => {
    const fingerprint = crawlIssueFingerprint(issue);
    const isActionable = isActionableCrawlIssue(issue);
    const isNew =
      options.hasVerifiedBaseline && !options.baselineFingerprints.has(fingerprint);
    const isVerified =
      isNew && isActionable && options.previousFingerprints.has(fingerprint);
    const suppressedReason = !options.hasVerifiedBaseline
      ? "baseline_not_verified"
      : !isNew
        ? "known_baseline"
        : !isActionable
          ? "informational_or_heuristic"
          : !isVerified
            ? "awaiting_second_crawl"
            : null;

    return {
      ...issue,
      fingerprint,
      isNew,
      isActionable,
      isVerified,
      suppressedReason,
    };
  });
}
