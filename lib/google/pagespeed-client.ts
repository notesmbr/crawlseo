const PAGESPEED_API_BASE = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export function getPageSpeedCapability() {
  const apiKeyConfigured = Boolean(process.env.GOOGLE_PAGESPEED_KEY?.trim());
  return {
    available: true,
    mode: "pagespeed_insights_api" as const,
    apiKeyConfigured,
    limitation: apiKeyConfigured
      ? null
      : "No API key is configured; unauthenticated quota may be unavailable.",
  };
}

export interface CoreWebVitals {
  lcp?: number; // Largest Contentful Paint (seconds)
  fid?: number; // First Input Delay (milliseconds) - deprecated
  cls?: number; // Cumulative Layout Shift (score)
  inp?: number; // Interaction to Next Paint (milliseconds)
}

export interface PerformanceMetrics {
  perfScore: number; // 0-100
  speedIndex?: number; // seconds
  ttfb?: number; // Time to First Byte (seconds)
  fcp?: number; // First Contentful Paint (seconds)
}

export interface PageSpeedResult {
  url: string;
  strategy: "MOBILE" | "DESKTOP";
  lighthouseScore: number;
  fieldDataState: "URL_LEVEL" | "NO_URL_LEVEL_DATA";
  fieldDataCategory?: string;
  originFieldDataAvailable: boolean;
  vitals: CoreWebVitals;
  labVitals: CoreWebVitals;
  metrics: PerformanceMetrics;
  fetchTime: string;
}

export class PageSpeedClientError extends Error {
  readonly code:
    | "PAGESPEED_QUOTA_EXHAUSTED"
    | "PAGESPEED_AUTH_FAILED"
    | "PAGESPEED_REQUEST_FAILED"
    | "PAGESPEED_INVALID_RESPONSE";
  readonly status: number;

  constructor(
    code:
      | "PAGESPEED_QUOTA_EXHAUSTED"
      | "PAGESPEED_AUTH_FAILED"
      | "PAGESPEED_REQUEST_FAILED"
      | "PAGESPEED_INVALID_RESPONSE",
    message: string,
    status: number,
  ) {
    super(message);
    this.name = "PageSpeedClientError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Converts milliseconds to seconds
 */
function msToSeconds(ms?: number): number | undefined {
  return ms === undefined ? undefined : ms / 1000;
}

type FieldMetric = { percentile?: number };

export function parsePageSpeedFieldVitals(data: {
  loadingExperience?: {
    overall_category?: string;
    metrics?: Record<string, FieldMetric>;
  };
  originLoadingExperience?: { metrics?: Record<string, FieldMetric> };
}) {
  const metrics = data.loadingExperience?.metrics;
  const lcpMs = metrics?.LARGEST_CONTENTFUL_PAINT_MS?.percentile;
  const clsPercentile = metrics?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile;
  const inpMs = metrics?.INTERACTION_TO_NEXT_PAINT?.percentile;
  const available = [lcpMs, clsPercentile, inpMs].some(
    (value) => typeof value === "number" && Number.isFinite(value),
  );
  return {
    fieldDataState: available ? ("URL_LEVEL" as const) : ("NO_URL_LEVEL_DATA" as const),
    fieldDataCategory: data.loadingExperience?.overall_category,
    originFieldDataAvailable: Boolean(
      data.originLoadingExperience?.metrics &&
        Object.keys(data.originLoadingExperience.metrics).length,
    ),
    vitals: available
      ? {
          lcp: typeof lcpMs === "number" ? msToSeconds(lcpMs) : undefined,
          cls:
            typeof clsPercentile === "number" ? clsPercentile / 100 : undefined,
          inp: typeof inpMs === "number" ? inpMs : undefined,
        }
      : {},
  };
}

/**
 * Fetches PageSpeed Insights data for a URL
 */
export async function fetchPageSpeed(
  url: string,
  strategy: "MOBILE" | "DESKTOP" = "MOBILE",
  dependencies: {
    environment?: Record<string, string | undefined>;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<PageSpeedResult> {
  const params = new URLSearchParams({
    url,
    category: "PERFORMANCE",
    strategy,
  });
  const environment = dependencies.environment ?? process.env;
  if (environment.GOOGLE_PAGESPEED_KEY) {
    params.set("key", environment.GOOGLE_PAGESPEED_KEY);
  }

  const response = await (dependencies.fetchImpl ?? fetch)(`${PAGESPEED_API_BASE}?${params}`, {
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new PageSpeedClientError(
        "PAGESPEED_QUOTA_EXHAUSTED",
        "PageSpeed Insights quota is temporarily exhausted.",
        429,
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new PageSpeedClientError(
        "PAGESPEED_AUTH_FAILED",
        "PageSpeed Insights access was denied.",
        502,
      );
    }
    throw new PageSpeedClientError(
      "PAGESPEED_REQUEST_FAILED",
      "PageSpeed Insights could not complete this check.",
      502,
    );
  }

  const data = (await response.json()) as {
    lighthouseResult?: {
      categories?: {
        performance?: {
          score?: number;
        };
      };
      audits?: Record<
        string,
        {
          numericValue?: number;
        }
      >;
    };
    loadingExperience?: {
      overall_category?: string;
      metrics?: Record<string, FieldMetric>;
    };
    originLoadingExperience?: { metrics?: Record<string, FieldMetric> };
    analysisUTCTimestamp?: string;
  };

  const lighthouseResult = data.lighthouseResult;

  if (!lighthouseResult) {
    throw new PageSpeedClientError(
      "PAGESPEED_INVALID_RESPONSE",
      "PageSpeed Insights returned no Lighthouse result.",
      502,
    );
  }

  const audits = lighthouseResult.audits || {};

  const labVitals: CoreWebVitals = {
    lcp: msToSeconds(audits["largest-contentful-paint"]?.numericValue),
    cls: audits["cumulative-layout-shift"]?.numericValue,
    inp: audits["interaction-to-next-paint"]?.numericValue,
  };
  const fieldData = parsePageSpeedFieldVitals(data);

  // Extract performance metrics
  const metrics: PerformanceMetrics = {
    perfScore: Math.round(
      (lighthouseResult.categories?.performance?.score || 0) * 100
    ),
    speedIndex: msToSeconds(audits["speed-index"]?.numericValue),
    ttfb: msToSeconds(audits["server-response-time"]?.numericValue),
    fcp: msToSeconds(audits["first-contentful-paint"]?.numericValue),
  };

  return {
    url,
    strategy,
    lighthouseScore: metrics.perfScore,
    fieldDataState: fieldData.fieldDataState,
    fieldDataCategory: fieldData.fieldDataCategory,
    originFieldDataAvailable: fieldData.originFieldDataAvailable,
    vitals: fieldData.vitals,
    labVitals,
    metrics,
    fetchTime: data.analysisUTCTimestamp ?? new Date().toISOString(),
  };
}

/**
 * Fetches PageSpeed data for both mobile and desktop
 */
export async function fetchPageSpeedBoth(
  url: string
): Promise<{ mobile: PageSpeedResult; desktop: PageSpeedResult }> {
  const [mobile, desktop] = await Promise.all([
    fetchPageSpeed(url, "MOBILE"),
    fetchPageSpeed(url, "DESKTOP"),
  ]);

  return { mobile, desktop };
}

/**
 * Checks if Core Web Vitals are "good" (passing thresholds)
 */
export function isVitalsGood(vitals: CoreWebVitals): boolean {
  // Good thresholds according to Google
  // LCP: < 2.5s
  // CLS: < 0.1
  // INP: < 200ms

  const lcpGood = vitals.lcp ? vitals.lcp < 2.5 : true;
  const clsGood = vitals.cls ? vitals.cls < 0.1 : true;
  const inpGood = vitals.inp ? vitals.inp < 200 : true;

  return lcpGood && clsGood && inpGood;
}

/**
 * Gets a performance grade from score
 */
export function getPerformanceGrade(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 50) return "Needs Improvement";
  return "Poor";
}
