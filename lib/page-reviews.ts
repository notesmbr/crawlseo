import { z } from "zod";
import type { PageReview, PageReviewRevision } from "@prisma/client";
import {
  normalizeOwnerPage,
  normalizeSavedQuery,
} from "./saved-keyword-ownership.ts";

export const pageFamilyValues = [
  "home",
  "report_directory",
  "state_report_hub",
  "river_report",
  "article_directory",
  "article",
  "fly_directory",
  "fly_family_guide",
  "fly_pattern_guide",
  "weekly_conditions_hub",
  "widget_landing_page",
  "trust_company",
  "trust_methodology",
  "legal",
  "support",
  "utility",
  "other",
] as const;

export const indexPolicyValues = [
  "index",
  "noindex",
  "redirect",
  "remove",
  "undecided",
] as const;

export const pageReviewStatusValues = [
  "unreviewed",
  "queued",
  "researching",
  "ready_no_change",
  "ready_to_change",
  "monitoring",
  "complete",
  "blocked",
] as const;

export const reviewPriorityValues = ["none", "p0", "p1", "p2", "p3", "p4"] as const;

export const performanceStateValues = [
  "unassessed",
  "critical_defect",
  "no_or_near_zero_visibility",
  "impressions_without_result",
  "early_opportunity",
  "demonstrated_winner",
  "insufficient_observation",
] as const;

export const changeScopeValues = [
  "undecided",
  "focused",
  "comprehensive",
  "not_applicable",
] as const;

export const changeBlastRadiusValues = [
  "undecided",
  "page_local",
  "shared_template",
  "mixed",
  "global_navigation",
  "source_sensitive",
  "not_applicable",
] as const;

export const experimentStateValues = [
  "unchecked",
  "none",
  "frozen",
  "approved_contamination",
] as const;

export const keywordOwnershipValues = [
  "this_page",
  "another_canonical",
  "undecided",
  "not_applicable",
] as const;

export const searchIntentValues = [
  "unknown",
  "informational",
  "local_trip_planning",
  "commercial_investigation",
  "transactional",
  "navigational",
  "safety_or_rules",
  "mixed",
  "not_applicable",
] as const;

export const serpDeviceValues = ["desktop", "mobile"] as const;
export const serpMethodValues = ["manual_google", "manual_other"] as const;
export const serpCompetitionValues = [
  "low",
  "medium",
  "high",
  "unclear",
] as const;

export const evidenceStateValues = [
  "verified",
  "partial",
  "missing",
  "not_applicable",
] as const;

export const keywordPlannerMethodValues = [
  "google_ads_api",
  "manual_google_ads_ui",
] as const;
export const keywordPlannerNetworkValues = [
  "google_search",
  "google_search_and_partners",
] as const;
export const paidAdvertiserCompetitionValues = [
  "low",
  "medium",
  "high",
  "unknown",
] as const;
export const googleTrendsMethodValues = [
  "manual_google_trends",
  "google_trends_api_alpha",
] as const;
export const googleTrendsDirectionValues = [
  "rising",
  "stable",
  "falling",
  "seasonal",
  "insufficient_data",
] as const;

export const gscBaselineMethodValues = [
  "crawlseo_gsc_import",
  "manual_search_console",
] as const;
export const ga4BaselineMethodValues = [
  "ga4_data_api",
  "manual_ga4_report",
] as const;
export const measurementKpiSourceValues = ["gsc", "ga4"] as const;
export const measurementKpiMetricValues = [
  "clicks",
  "impressions",
  "ctr",
  "position",
  "screenPageViews",
  "sessions",
  "engagedSessions",
  "activeUsers",
  "keyEvents",
] as const;
export const measurementKpiDirectionValues = [
  "increase",
  "decrease",
  "maintain",
] as const;

export const decisionStateValues = [
  "pending",
  "no_change",
  "change_recommended",
  "inconclusive",
  "keep",
  "expand",
  "revise",
  "iterate",
  "merge",
  "redirect",
  "noindex",
  "retire",
  "rollback",
  "blocked",
] as const;

export const changeStateValues = [
  "not_planned",
  "planned",
  "in_progress",
  "shipped",
  "verified",
  "reverted",
] as const;

export const gateStateValues = [
  "not_due",
  "due",
  "recorded",
  "missed",
  "not_applicable",
] as const;

export const manualChatStateValues = [
  "awaiting_user_selection",
  "researching",
  "awaiting_user_decision",
  "approved_to_record",
  "approved_to_implement",
  "monitoring",
  "complete",
] as const;

export const activeManualChatStateValues = [
  "researching",
  "awaiting_user_decision",
  "approved_to_record",
  "approved_to_implement",
] as const;

export function pageReviewPrismaConflictCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  if (code === "P2034") return "PAGE_REVIEW_VERSION_CONFLICT" as const;
  if (code === "P2002") return "PAGE_REVIEW_UNIQUE_CONFLICT" as const;
  return null;
}

const shortText = (max: number) => z.string().trim().min(1).max(max);
const nullableText = (max: number) =>
  z
    .union([z.string().max(max), z.null()])
    .transform((value) => (value === null ? null : value.trim() || null));
const dateTime = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Must be a valid date-time");
const nullableDateTime = z.union([dateTime, z.null()]);
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a date in YYYY-MM-DD format")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Must be a valid date");
const nullableDateOnly = z.union([dateOnly, z.null()]);
const textArray = (maxItems = 50, maxLength = 500) =>
  z.array(z.string().trim().min(1).max(maxLength)).max(maxItems);

const keywordSchema = z
  .object({
    status: z.enum(keywordOwnershipValues).default("undecided"),
    primaryQuery: nullableText(200).default(null),
    ownerCanonical: nullableText(2048).default(null),
    notApplicableReason: nullableText(2000).default(null),
    secondaryQueries: textArray(50, 200).default([]),
  })
  .strict();

const topicSchema = z
  .object({
    cluster: nullableText(300).default(null),
    parentPage: nullableText(2048).default(null),
    clusterGaps: textArray(100, 1000).default([]),
    maintenanceOwner: nullableText(300).default(null),
    editorialOwner: nullableText(300).default(null),
  })
  .strict();

const intentSchema = z
  .object({
    searchIntent: z.enum(searchIntentValues).default("unknown"),
    jobToBeDone: nullableText(4000).default(null),
  })
  .strict();

const nonNegativeSafeInteger = z.number().int().nonnegative().safe();

const monthlySearchVolumeSchema = z
  .object({
    year: z.number().int().min(2000).max(2200),
    month: z.number().int().min(1).max(12),
    searches: nonNegativeSafeInteger,
  })
  .strict();

const keywordPlannerEvidenceDetailsSchema = z
  .object({
    query: nullableText(200).default(null),
    checkedAt: nullableDateTime.default(null),
    method: z.enum(keywordPlannerMethodValues).nullable().default(null),
    sourceUrl: nullableText(2048).default(null),
    geoTarget: nullableText(300).default(null),
    language: nullableText(100).default(null),
    network: z.enum(keywordPlannerNetworkValues).nullable().default(null),
    averageMonthlySearches: nonNegativeSafeInteger.nullable().default(null),
    monthlySearches: z.array(monthlySearchVolumeSchema).max(60).default([]),
    paidAdvertiserCompetition: z
      .enum(paidAdvertiserCompetitionValues)
      .nullable()
      .default(null),
    paidAdvertiserCompetitionIndex: z
      .number()
      .int()
      .min(0)
      .max(100)
      .nullable()
      .default(null),
    lowTopOfPageBidMicros: nonNegativeSafeInteger.nullable().default(null),
    highTopOfPageBidMicros: nonNegativeSafeInteger.nullable().default(null),
    limitation: nullableText(4000).default(null),
    notApplicableReason: nullableText(4000).default(null),
  })
  .strict();

const emptyKeywordPlannerEvidenceDetails = {
  query: null,
  checkedAt: null,
  method: null,
  sourceUrl: null,
  geoTarget: null,
  language: null,
  network: null,
  averageMonthlySearches: null,
  monthlySearches: [],
  paidAdvertiserCompetition: null,
  paidAdvertiserCompetitionIndex: null,
  lowTopOfPageBidMicros: null,
  highTopOfPageBidMicros: null,
  limitation: null,
  notApplicableReason: null,
};

function isOfficialKeywordPlannerUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      [
        "ads.google.com",
        "developers.google.com",
        "googleads.googleapis.com",
      ].includes(url.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

const keywordPlannerSchema = keywordPlannerEvidenceDetailsSchema
  .extend({
    evidenceState: z.enum(evidenceStateValues).default("missing"),
  })
  .strict()
  .superRefine((value, context) => {
    const monthKeys = new Set<string>();
    value.monthlySearches.forEach((entry, index) => {
      const key = `${entry.year}-${entry.month}`;
      if (monthKeys.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["monthlySearches", index],
          message: "monthlySearches cannot repeat the same year and month",
        });
      }
      monthKeys.add(key);
    });
    if (
      value.lowTopOfPageBidMicros !== null &&
      value.highTopOfPageBidMicros !== null &&
      value.lowTopOfPageBidMicros > value.highTopOfPageBidMicros
    ) {
      context.addIssue({
        code: "custom",
        path: ["highTopOfPageBidMicros"],
        message:
          "highTopOfPageBidMicros must be greater than or equal to lowTopOfPageBidMicros",
      });
    }
    if (value.sourceUrl && !isOfficialKeywordPlannerUrl(value.sourceUrl)) {
      context.addIssue({
        code: "custom",
        path: ["sourceUrl"],
        message: "sourceUrl must be an official Google Ads or Google Ads API URL",
      });
    }

    if (value.evidenceState === "not_applicable") {
      if (!value.notApplicableReason) {
        context.addIssue({
          code: "custom",
          path: ["notApplicableReason"],
          message:
            "notApplicableReason is required when Keyword Planner evidence is not applicable",
        });
      }
      return;
    }
    if (value.notApplicableReason) {
      context.addIssue({
        code: "custom",
        path: ["notApplicableReason"],
        message:
          "notApplicableReason is only valid when Keyword Planner evidence is not applicable",
      });
    }
    if (!["verified", "partial"].includes(value.evidenceState)) return;

    for (const [field, present] of [
      ["query", Boolean(value.query)],
      ["checkedAt", Boolean(value.checkedAt)],
      ["method", Boolean(value.method)],
      ["sourceUrl", Boolean(value.sourceUrl)],
      ["geoTarget", Boolean(value.geoTarget)],
      ["language", Boolean(value.language)],
      ["network", Boolean(value.network)],
    ] as const) {
      if (!present) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: `${field} is required when Keyword Planner evidence is verified or partial`,
        });
      }
    }
    if (value.evidenceState === "verified") {
      for (const [field, present] of [
        ["averageMonthlySearches", value.averageMonthlySearches !== null],
        [
          "paidAdvertiserCompetition",
          Boolean(value.paidAdvertiserCompetition),
        ],
      ] as const) {
        if (!present) {
          context.addIssue({
            code: "custom",
            path: [field],
            message: `${field} is required when Keyword Planner evidence is verified`,
          });
        }
      }
    }
    if (
      value.evidenceState === "partial" &&
      (!value.limitation || value.limitation.length < 10)
    ) {
      context.addIssue({
        code: "custom",
        path: ["limitation"],
        message:
          "a clear limitation is required when Keyword Planner evidence is partial",
      });
    }
  });

const googleTrendsEvidenceDetailsSchema = z
  .object({
    query: nullableText(200).default(null),
    checkedAt: nullableDateTime.default(null),
    method: z.enum(googleTrendsMethodValues).nullable().default(null),
    sourceUrl: nullableText(2048).default(null),
    geo: nullableText(300).default(null),
    timeframe: nullableText(300).default(null),
    comparisonQueries: textArray(20, 200).default([]),
    direction: z.enum(googleTrendsDirectionValues).nullable().default(null),
    finding: nullableText(8000).default(null),
    limitation: nullableText(4000).default(null),
    notApplicableReason: nullableText(4000).default(null),
  })
  .strict();

const emptyGoogleTrendsEvidenceDetails = {
  query: null,
  checkedAt: null,
  method: null,
  sourceUrl: null,
  geo: null,
  timeframe: null,
  comparisonQueries: [],
  direction: null,
  finding: null,
  limitation: null,
  notApplicableReason: null,
};

function isOfficialGoogleTrendsUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      ["trends.google.com", "developers.google.com"].includes(
        url.hostname.toLowerCase(),
      )
    );
  } catch {
    return false;
  }
}

const googleTrendsSchema = googleTrendsEvidenceDetailsSchema
  .extend({
    evidenceState: z.enum(evidenceStateValues).default("missing"),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.sourceUrl && !isOfficialGoogleTrendsUrl(value.sourceUrl)) {
      context.addIssue({
        code: "custom",
        path: ["sourceUrl"],
        message: "sourceUrl must be an official Google Trends URL",
      });
    }
    if (value.evidenceState === "not_applicable") {
      if (!value.notApplicableReason) {
        context.addIssue({
          code: "custom",
          path: ["notApplicableReason"],
          message:
            "notApplicableReason is required when Google Trends evidence is not applicable",
        });
      }
      return;
    }
    if (value.notApplicableReason) {
      context.addIssue({
        code: "custom",
        path: ["notApplicableReason"],
        message:
          "notApplicableReason is only valid when Google Trends evidence is not applicable",
      });
    }
    if (!["verified", "partial"].includes(value.evidenceState)) return;

    for (const [field, present] of [
      ["query", Boolean(value.query)],
      ["checkedAt", Boolean(value.checkedAt)],
      ["method", Boolean(value.method)],
      ["sourceUrl", Boolean(value.sourceUrl)],
      ["geo", Boolean(value.geo)],
      ["timeframe", Boolean(value.timeframe)],
      ["direction", Boolean(value.direction)],
      ["finding", Boolean(value.finding)],
    ] as const) {
      if (!present) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: `${field} is required when Google Trends evidence is verified or partial`,
        });
      }
    }
    if (
      value.evidenceState === "partial" &&
      (!value.limitation || value.limitation.length < 10)
    ) {
      context.addIssue({
        code: "custom",
        path: ["limitation"],
        message:
          "a clear limitation is required when Google Trends evidence is partial",
      });
    }
  });

const gscBaselineDetailsSchema = z
  .object({
    evidenceState: z.enum(evidenceStateValues).default("missing"),
    checkedAt: nullableDateTime.default(null),
    method: z.enum(gscBaselineMethodValues).nullable().default(null),
    sourceUrl: nullableText(2048).default(null),
    clicks: nonNegativeSafeInteger.nullable().default(null),
    impressions: nonNegativeSafeInteger.nullable().default(null),
    ctr: z.number().min(0).max(1).nullable().default(null),
    position: z.number().nonnegative().finite().nullable().default(null),
    limitation: nullableText(4000).default(null),
    notApplicableReason: nullableText(4000).default(null),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.sourceUrl) {
      try {
        const url = new URL(value.sourceUrl);
        if (
          url.protocol !== "https:" ||
          url.hostname.toLowerCase() !== "search.google.com"
        ) {
          throw new Error("not an official Search Console URL");
        }
      } catch {
        context.addIssue({
          code: "custom",
          path: ["sourceUrl"],
          message: "sourceUrl must be an official Google Search Console URL",
        });
      }
    }
    if (value.evidenceState === "not_applicable") {
      if (!value.notApplicableReason) {
        context.addIssue({
          code: "custom",
          path: ["notApplicableReason"],
          message: "notApplicableReason is required when GSC baseline evidence is not applicable",
        });
      }
      return;
    }
    if (value.notApplicableReason) {
      context.addIssue({
        code: "custom",
        path: ["notApplicableReason"],
        message: "notApplicableReason is only valid when GSC evidence is not applicable",
      });
    }
    if (!["verified", "partial"].includes(value.evidenceState)) return;
    for (const [field, present] of [
      ["checkedAt", Boolean(value.checkedAt)],
      ["method", Boolean(value.method)],
      ["sourceUrl", Boolean(value.sourceUrl)],
    ] as const) {
      if (!present) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: `${field} is required when GSC baseline evidence is verified or partial`,
        });
      }
    }
    if (value.evidenceState === "verified") {
      for (const field of ["clicks", "impressions", "ctr", "position"] as const) {
        if (value[field] === null) {
          context.addIssue({
            code: "custom",
            path: [field],
            message: `${field} is required when GSC baseline evidence is verified`,
          });
        }
      }
    }
    if (
      value.evidenceState === "partial" &&
      (!value.limitation || value.limitation.length < 10)
    ) {
      context.addIssue({
        code: "custom",
        path: ["limitation"],
        message: "a clear limitation is required when GSC baseline evidence is partial",
      });
    }
  });

const ga4BaselineDetailsSchema = z
  .object({
    evidenceState: z.enum(evidenceStateValues).default("missing"),
    checkedAt: nullableDateTime.default(null),
    method: z.enum(ga4BaselineMethodValues).nullable().default(null),
    sourceUrl: nullableText(2048).default(null),
    screenPageViews: nonNegativeSafeInteger.nullable().default(null),
    sessions: nonNegativeSafeInteger.nullable().default(null),
    engagedSessions: nonNegativeSafeInteger.nullable().default(null),
    activeUsers: nonNegativeSafeInteger.nullable().default(null),
    keyEvents: z.number().nonnegative().finite().nullable().default(null),
    limitation: nullableText(4000).default(null),
    notApplicableReason: nullableText(4000).default(null),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.sourceUrl) {
      try {
        const url = new URL(value.sourceUrl);
        if (
          url.protocol !== "https:" ||
          url.hostname.toLowerCase() !== "analytics.google.com"
        ) {
          throw new Error("not an official GA4 URL");
        }
      } catch {
        context.addIssue({
          code: "custom",
          path: ["sourceUrl"],
          message: "sourceUrl must be an official Google Analytics URL",
        });
      }
    }
    if (value.evidenceState === "not_applicable") {
      if (!value.notApplicableReason) {
        context.addIssue({
          code: "custom",
          path: ["notApplicableReason"],
          message: "notApplicableReason is required when GA4 baseline evidence is not applicable",
        });
      }
      return;
    }
    if (value.notApplicableReason) {
      context.addIssue({
        code: "custom",
        path: ["notApplicableReason"],
        message: "notApplicableReason is only valid when GA4 evidence is not applicable",
      });
    }
    if (!["verified", "partial"].includes(value.evidenceState)) return;
    for (const [field, present] of [
      ["checkedAt", Boolean(value.checkedAt)],
      ["method", Boolean(value.method)],
      ["sourceUrl", Boolean(value.sourceUrl)],
    ] as const) {
      if (!present) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: `${field} is required when GA4 baseline evidence is verified or partial`,
        });
      }
    }
    if (value.evidenceState === "verified") {
      for (const field of [
        "screenPageViews",
        "sessions",
        "engagedSessions",
        "activeUsers",
        "keyEvents",
      ] as const) {
        if (value[field] === null) {
          context.addIssue({
            code: "custom",
            path: [field],
            message: `${field} is required when GA4 baseline evidence is verified`,
          });
        }
      }
    }
    if (
      value.evidenceState === "partial" &&
      (!value.limitation || value.limitation.length < 10)
    ) {
      context.addIssue({
        code: "custom",
        path: ["limitation"],
        message: "a clear limitation is required when GA4 baseline evidence is partial",
      });
    }
  });

const emptyGscBaselineDetails = {
  evidenceState: "missing" as const,
  checkedAt: null,
  method: null,
  sourceUrl: null,
  clicks: null,
  impressions: null,
  ctr: null,
  position: null,
  limitation: null,
  notApplicableReason: null,
};

const emptyGa4BaselineDetails = {
  evidenceState: "missing" as const,
  checkedAt: null,
  method: null,
  sourceUrl: null,
  screenPageViews: null,
  sessions: null,
  engagedSessions: null,
  activeUsers: null,
  keyEvents: null,
  limitation: null,
  notApplicableReason: null,
};

const primaryKpiSchema = z
  .object({
    source: z.enum(measurementKpiSourceValues).nullable().default(null),
    metric: z.enum(measurementKpiMetricValues).nullable().default(null),
    direction: z.enum(measurementKpiDirectionValues).nullable().default(null),
    evaluationWindowDays: z.number().int().min(7).max(365).nullable().default(null),
    successCriteria: nullableText(4000).default(null),
  })
  .strict();

const conversionGoalSchema = z
  .object({
    eventName: nullableText(100).default(null),
    description: nullableText(4000).default(null),
    notApplicableReason: nullableText(4000).default(null),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.notApplicableReason && (value.eventName || value.description)) {
      context.addIssue({
        code: "custom",
        path: ["notApplicableReason"],
        message: "a conversion goal cannot also be marked not applicable",
      });
    }
    if (value.eventName && !/^[A-Za-z][A-Za-z0-9_]{0,99}$/.test(value.eventName)) {
      context.addIssue({
        code: "custom",
        path: ["eventName"],
        message: "eventName must be a GA4-style event name using letters, numbers, and underscores",
      });
    }
  });

const comparisonWindowMetricsSchema = z
  .object({
    clicks: nonNegativeSafeInteger.nullable().default(null),
    impressions: nonNegativeSafeInteger.nullable().default(null),
    ctr: z.number().min(0).max(1).nullable().default(null),
    position: z.number().nonnegative().finite().nullable().default(null),
    screenPageViews: nonNegativeSafeInteger.nullable().default(null),
    sessions: nonNegativeSafeInteger.nullable().default(null),
    engagedSessions: nonNegativeSafeInteger.nullable().default(null),
    activeUsers: nonNegativeSafeInteger.nullable().default(null),
    keyEvents: z.number().nonnegative().finite().nullable().default(null),
  })
  .strict();

const emptyComparisonWindowMetrics = {
  clicks: null,
  impressions: null,
  ctr: null,
  position: null,
  screenPageViews: null,
  sessions: null,
  engagedSessions: null,
  activeUsers: null,
  keyEvents: null,
};

const measurementComparisonWindowSchema = z
  .object({
    label: shortText(100),
    windowStart: dateOnly,
    windowEnd: dateOnly,
    metrics: comparisonWindowMetricsSchema.default(emptyComparisonWindowMetrics),
    limitation: nullableText(2000).default(null),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.windowStart > value.windowEnd) {
      context.addIssue({
        code: "custom",
        path: ["windowEnd"],
        message: "comparison window end must be on or after its start",
      });
    }
    if (!Object.values(value.metrics).some((metric) => metric !== null)) {
      context.addIssue({
        code: "custom",
        path: ["metrics"],
        message: "a comparison window needs at least one known metric",
      });
    }
  });

const emptyPrimaryKpi = {
  source: null,
  metric: null,
  direction: null,
  evaluationWindowDays: null,
  successCriteria: null,
};

const emptyConversionGoal = {
  eventName: null,
  description: null,
  notApplicableReason: null,
};

const gscKpiMetrics = new Set(["clicks", "impressions", "ctr", "position"]);
const ga4KpiMetrics = new Set([
  "screenPageViews",
  "sessions",
  "engagedSessions",
  "activeUsers",
  "keyEvents",
]);

const measurementPlanDetailsSchema = z
  .object({
    baselineCanonical: nullableText(2048).default(null),
    baselineAsOf: nullableDateOnly.default(null),
    windowStart: nullableDateOnly.default(null),
    windowEnd: nullableDateOnly.default(null),
    gsc: gscBaselineDetailsSchema.default(emptyGscBaselineDetails),
    ga4: ga4BaselineDetailsSchema.default(emptyGa4BaselineDetails),
    hypothesis: nullableText(8000).default(null),
    primaryKpi: primaryKpiSchema.default(emptyPrimaryKpi),
    conversionGoal: conversionGoalSchema.default(emptyConversionGoal),
    comparisonWindows: z.array(measurementComparisonWindowSchema).max(10).default([]),
    guardrails: textArray(30, 1000).default([]),
    limitation: nullableText(4000).default(null),
    notApplicableReason: nullableText(4000).default(null),
  })
  .strict();

const emptyMeasurementPlanDetails = {
  baselineCanonical: null,
  baselineAsOf: null,
  windowStart: null,
  windowEnd: null,
  gsc: emptyGscBaselineDetails,
  ga4: emptyGa4BaselineDetails,
  hypothesis: null,
  primaryKpi: emptyPrimaryKpi,
  conversionGoal: emptyConversionGoal,
  comparisonWindows: [],
  guardrails: [],
  limitation: null,
  notApplicableReason: null,
};

function measurementMetricValue(
  value: z.output<typeof measurementPlanDetailsSchema>,
) {
  const { source, metric } = value.primaryKpi;
  if (!source || !metric) return null;
  if (source === "gsc" && gscKpiMetrics.has(metric)) {
    return value.gsc[metric as keyof Pick<typeof value.gsc, "clicks" | "impressions" | "ctr" | "position">];
  }
  if (source === "ga4" && ga4KpiMetrics.has(metric)) {
    return value.ga4[metric as keyof Pick<typeof value.ga4, "screenPageViews" | "sessions" | "engagedSessions" | "activeUsers" | "keyEvents">];
  }
  return null;
}

const measurementPlanSchema = measurementPlanDetailsSchema
  .extend({
    evidenceState: z.enum(evidenceStateValues).default("missing"),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.baselineCanonical) {
      try {
        const url = new URL(value.baselineCanonical);
        if (url.protocol !== "https:") throw new Error("not HTTPS");
      } catch {
        context.addIssue({
          code: "custom",
          path: ["baselineCanonical"],
          message: "baselineCanonical must be a valid HTTPS URL",
        });
      }
    }
    if (value.windowStart && value.windowEnd && value.windowStart > value.windowEnd) {
      context.addIssue({
        code: "custom",
        path: ["windowEnd"],
        message: "windowEnd must be on or after windowStart",
      });
    }
    if (value.baselineAsOf && value.windowEnd && value.baselineAsOf < value.windowEnd) {
      context.addIssue({
        code: "custom",
        path: ["baselineAsOf"],
        message: "baselineAsOf must be on or after windowEnd",
      });
    }
    if (value.evidenceState === "not_applicable") {
      if (!value.notApplicableReason) {
        context.addIssue({
          code: "custom",
          path: ["notApplicableReason"],
          message: "notApplicableReason is required when the measurement plan is not applicable",
        });
      }
      return;
    }
    if (value.notApplicableReason) {
      context.addIssue({
        code: "custom",
        path: ["notApplicableReason"],
        message: "notApplicableReason is only valid when the measurement plan is not applicable",
      });
    }
    if (!["verified", "partial"].includes(value.evidenceState)) return;

    for (const [field, present] of [
      ["baselineCanonical", Boolean(value.baselineCanonical)],
      ["baselineAsOf", Boolean(value.baselineAsOf)],
      ["windowStart", Boolean(value.windowStart)],
      ["windowEnd", Boolean(value.windowEnd)],
      ["hypothesis", Boolean(value.hypothesis)],
    ] as const) {
      if (!present) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: `${field} is required when the measurement plan is verified or partial`,
        });
      }
    }
    for (const field of [
      "source",
      "metric",
      "direction",
      "evaluationWindowDays",
      "successCriteria",
    ] as const) {
      if (value.primaryKpi[field] === null) {
        context.addIssue({
          code: "custom",
          path: ["primaryKpi", field],
          message: `primaryKpi.${field} is required for a credible measurement plan`,
        });
      }
    }
    if (
      value.primaryKpi.source === "gsc" &&
      value.primaryKpi.metric &&
      !gscKpiMetrics.has(value.primaryKpi.metric)
    ) {
      context.addIssue({
        code: "custom",
        path: ["primaryKpi", "metric"],
        message: "the primary KPI metric must belong to its GSC source",
      });
    }
    if (
      value.primaryKpi.source === "ga4" &&
      value.primaryKpi.metric &&
      !ga4KpiMetrics.has(value.primaryKpi.metric)
    ) {
      context.addIssue({
        code: "custom",
        path: ["primaryKpi", "metric"],
        message: "the primary KPI metric must belong to its GA4 source",
      });
    }
    if (
      value.primaryKpi.source &&
      !["verified", "partial"].includes(value[value.primaryKpi.source].evidenceState)
    ) {
      context.addIssue({
        code: "custom",
        path: [value.primaryKpi.source, "evidenceState"],
        message: "the primary KPI source needs verified or partial baseline evidence",
      });
    }
    if (measurementMetricValue(value) === null) {
      context.addIssue({
        code: "custom",
        path: ["primaryKpi", "metric"],
        message: "the primary KPI needs a known canonical baseline value; blank is unknown, not zero",
      });
    }
    if (
      !value.conversionGoal.notApplicableReason &&
      !(value.conversionGoal.eventName && value.conversionGoal.description)
    ) {
      context.addIssue({
        code: "custom",
        path: ["conversionGoal"],
        message: "record a conversion goal and GA4 event, or explain why no conversion applies",
      });
    }
    if (value.guardrails.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["guardrails"],
        message: "at least one guardrail is required for a credible measurement plan",
      });
    }
    if (
      value.evidenceState === "partial" &&
      (!value.limitation || value.limitation.length < 10)
    ) {
      context.addIssue({
        code: "custom",
        path: ["limitation"],
        message: "a clear limitation is required when the measurement plan is partial",
      });
    }
    if (
      value.evidenceState === "verified" &&
      [value.gsc.evidenceState, value.ga4.evidenceState].some(
        (state) => !["verified", "not_applicable"].includes(state),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["evidenceState"],
        message: "a verified measurement plan requires each source to be verified or honestly not applicable",
      });
    }
  });

const serpResultSchema = z
  .object({
    position: z.number().int().min(1).max(5),
    url: z.string().url().max(2048),
    title: nullableText(500).default(null),
    offer: nullableText(4000).default(null),
    evidence: nullableText(4000).default(null),
    gap: nullableText(4000).default(null),
  })
  .strict();

const serpSchema = z
  .object({
    snapshotAt: nullableDateTime.default(null),
    query: nullableText(200).default(null),
    locale: nullableText(100).default(null),
    device: z.enum(serpDeviceValues).nullable().default(null),
    method: z.enum(serpMethodValues).nullable().default(null),
    competition: z.enum(serpCompetitionValues).default("unclear"),
    evidenceState: z.enum(evidenceStateValues).default("missing"),
    evidenceSummary: nullableText(8000).default(null),
    features: textArray(50, 300).default([]),
    competitionSummary: nullableText(8000).default(null),
    results: z.array(serpResultSchema).max(5).default([]),
  })
  .strict()
  .superRefine((value, context) => {
    const positions = new Set<number>();
    value.results.forEach((result, index) => {
      if (positions.has(result.position)) {
        context.addIssue({
          code: "custom",
          path: ["results", index, "position"],
          message: "SERP result positions must be unique",
        });
      }
      positions.add(result.position);
    });

    const hasSnapshotContent = Boolean(
      value.snapshotAt ||
        value.query ||
        value.locale ||
        value.device ||
        value.method ||
        value.competition !== "unclear" ||
        ["verified", "partial"].includes(value.evidenceState) ||
        value.evidenceSummary ||
        value.features.length ||
        value.competitionSummary ||
        value.results.length,
    );
    if (!hasSnapshotContent) return;

    for (const [field, fieldValue] of [
      ["snapshotAt", value.snapshotAt],
      ["query", value.query],
      ["method", value.method],
      ["evidenceSummary", value.evidenceSummary],
    ] as const) {
      if (!fieldValue) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: `${field} is required when a SERP snapshot is recorded`,
        });
      }
    }
  });

const offerSchema = z
  .object({
    competitorOffer: nullableText(8000).default(null),
    currentOffer: nullableText(8000).default(null),
    differentiation: nullableText(8000).default(null),
    differentiationEvidenceState: z.enum(evidenceStateValues).default("missing"),
  })
  .strict()
  .superRefine((value, context) => {
    if (!["verified", "partial"].includes(value.differentiationEvidenceState)) {
      return;
    }
    for (const field of [
      "competitorOffer",
      "currentOffer",
      "differentiation",
    ] as const) {
      if (!value[field]) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: `${field} is required when differentiation evidence is verified or partial`,
        });
      }
    }
  });

const eeatEvidenceDetailSchema = z
  .object({
    evidence: shortText(4000),
    source: shortText(2048),
    checkedAt: dateTime,
    reviewer: shortText(300),
    limitation: shortText(4000),
  })
  .strict();

const eeatSchema = z
  .object({
    evidence: textArray(100, 2000).default([]),
    gaps: textArray(100, 2000).default([]),
    details: z.array(eeatEvidenceDetailSchema).max(100).default([]),
    evidenceState: z.enum(evidenceStateValues).default("missing"),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      ["verified", "partial"].includes(value.evidenceState) &&
      value.details.length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["details"],
        message:
          "at least one structured E-E-A-T detail is required when evidence is verified or partial",
      });
    }
  });

const decisionSchema = z
  .object({
    state: z.enum(decisionStateValues).default("pending"),
    rationale: nullableText(8000).default(null),
    proposedChange: nullableText(8000).default(null),
    performanceState: z.enum(performanceStateValues).default("unassessed"),
    scopeClass: z.enum(changeScopeValues).default("undecided"),
    scopeRationale: nullableText(8000).default(null),
    demonstratedWins: textArray(100, 2000).default([]),
    preservedElements: textArray(100, 2000).default([]),
    intentionallyChangedElements: textArray(100, 2000).default([]),
    blastRadius: z.enum(changeBlastRadiusValues).default("undecided"),
    affectedPageFamily: z.enum(pageFamilyValues).nullable().default(null),
    affectedCanonicalCount: z.number().int().positive().nullable().default(null),
    blastRadiusNote: nullableText(8000).default(null),
    experimentState: z.enum(experimentStateValues).default("unchecked"),
    experimentId: nullableText(300).default(null),
    experimentFrozenUntil: nullableDateTime.default(null),
    experimentExceptionReason: nullableText(8000).default(null),
    rollbackTrigger: nullableText(8000).default(null),
    changeState: z.enum(changeStateValues).default("not_planned"),
    changeId: nullableText(300).default(null),
    changedAt: nullableDateTime.default(null),
  })
  .strict();

const gateSchema = z
  .object({
    status: z.enum(gateStateValues).default("not_due"),
    dueAt: nullableDateTime.default(null),
    reviewedAt: nullableDateTime.default(null),
    evidence: nullableText(8000).default(null),
    decision: nullableText(4000).default(null),
    rationale: nullableText(8000).default(null),
    nextAction: nullableText(4000).default(null),
  })
  .strict();

const emptyGate = {
  status: "not_due" as const,
  dueAt: null,
  reviewedAt: null,
  evidence: null,
  decision: null,
  rationale: null,
  nextAction: null,
};

const gatesSchema = z
  .object({
    day7: gateSchema.default(emptyGate),
    day28: gateSchema.default(emptyGate),
    day56: gateSchema.default(emptyGate),
  })
  .strict();

const manualReviewSchema = z
  .object({
    firstReviewedAt: nullableDateTime.default(null),
    lastReviewedAt: nullableDateTime.default(null),
    nextReviewAt: nullableDateTime.default(null),
    notes: nullableText(16000).default(null),
  })
  .strict();

const contentFields = {
  pageId: shortText(200).regex(
    /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/,
    "pageId contains unsupported characters",
  ),
  canonicalUrl: z.string().url().max(2048),
  pageFamily: z.enum(pageFamilyValues),
  indexPolicy: z.enum(indexPolicyValues),
  reviewStatus: z.enum(pageReviewStatusValues).default("unreviewed"),
  priority: z.enum(reviewPriorityValues).default("none"),
  keyword: keywordSchema.default({
    status: "undecided",
    primaryQuery: null,
    ownerCanonical: null,
    notApplicableReason: null,
    secondaryQueries: [],
  }),
  topic: topicSchema.default({
    cluster: null,
    parentPage: null,
    clusterGaps: [],
    maintenanceOwner: null,
    editorialOwner: null,
  }),
  intent: intentSchema.default({ searchIntent: "unknown", jobToBeDone: null }),
  keywordPlanner: keywordPlannerSchema.default({
    ...emptyKeywordPlannerEvidenceDetails,
    evidenceState: "missing",
  }),
  googleTrends: googleTrendsSchema.default({
    ...emptyGoogleTrendsEvidenceDetails,
    evidenceState: "missing",
  }),
  measurementPlan: measurementPlanSchema.default({
    ...emptyMeasurementPlanDetails,
    evidenceState: "missing",
  }),
  serp: serpSchema.default({
    snapshotAt: null,
    query: null,
    locale: null,
    device: null,
    method: null,
    competition: "unclear",
    evidenceState: "missing",
    evidenceSummary: null,
    features: [],
    competitionSummary: null,
    results: [],
  }),
  offer: offerSchema.default({
    competitorOffer: null,
    currentOffer: null,
    differentiation: null,
    differentiationEvidenceState: "missing",
  }),
  eeat: eeatSchema.default({
    evidence: [],
    gaps: [],
    details: [],
    evidenceState: "missing",
  }),
  decision: decisionSchema.default({
    state: "pending",
    rationale: null,
    proposedChange: null,
    performanceState: "unassessed",
    scopeClass: "undecided",
    scopeRationale: null,
    demonstratedWins: [],
    preservedElements: [],
    intentionallyChangedElements: [],
    blastRadius: "undecided",
    affectedPageFamily: null,
    affectedCanonicalCount: null,
    blastRadiusNote: null,
    experimentState: "unchecked",
    experimentId: null,
    experimentFrozenUntil: null,
    experimentExceptionReason: null,
    rollbackTrigger: null,
    changeState: "not_planned",
    changeId: null,
    changedAt: null,
  }),
  gates: gatesSchema.default({
    day7: emptyGate,
    day28: emptyGate,
    day56: emptyGate,
  }),
  manualReview: manualReviewSchema.default({
    firstReviewedAt: null,
    lastReviewedAt: null,
    nextReviewAt: null,
    notes: null,
  }),
  manualChatState: z.enum(manualChatStateValues).default("awaiting_user_selection"),
  userDecisionReference: nullableText(2000).default(null),
};

function validateKeywordOwnership(
  value: {
    canonicalUrl?: string;
    pageFamily?: (typeof pageFamilyValues)[number];
    keyword?: z.output<typeof keywordSchema>;
  },
  context: z.RefinementCtx,
) {
  const keyword = value.keyword;
  if (!keyword) return;

  if (keyword.status === "this_page" && !keyword.primaryQuery) {
    context.addIssue({
      code: "custom",
      path: ["keyword", "primaryQuery"],
      message: "primaryQuery is required when this page owns the keyword",
    });
  }
  if (
    keyword.status !== "another_canonical" &&
    keyword.ownerCanonical
  ) {
    context.addIssue({
      code: "custom",
      path: ["keyword", "ownerCanonical"],
      message: "ownerCanonical is only valid when another canonical owns the keyword",
    });
  }
  if (
    keyword.status !== "not_applicable" &&
    keyword.notApplicableReason
  ) {
    context.addIssue({
      code: "custom",
      path: ["keyword", "notApplicableReason"],
      message: "notApplicableReason is only valid for not_applicable pages",
    });
  }
  if (keyword.status === "another_canonical") {
    if (!keyword.primaryQuery) {
      context.addIssue({
        code: "custom",
        path: ["keyword", "primaryQuery"],
        message: "primaryQuery is required when another canonical owns the keyword",
      });
    }
    if (!keyword.ownerCanonical) {
      context.addIssue({
        code: "custom",
        path: ["keyword", "ownerCanonical"],
        message: "ownerCanonical is required when another canonical owns the keyword",
      });
    }
  }
  if (keyword.status === "not_applicable") {
    if (!keyword.notApplicableReason) {
      context.addIssue({
        code: "custom",
        path: ["keyword", "notApplicableReason"],
        message: "notApplicableReason is required for not_applicable pages",
      });
    }
    if (keyword.primaryQuery || keyword.ownerCanonical) {
      context.addIssue({
        code: "custom",
        path: ["keyword"],
        message: "not_applicable pages cannot claim a query or owner canonical",
      });
    }
  }
}

const manualStatesRequiringDecisionReference = new Set([
  "approved_to_record",
  "approved_to_implement",
  "monitoring",
  "complete",
]);
const unfinishedChangeStates = new Set(["planned", "in_progress"]);
const completedChangeStates = new Set(["shipped", "verified", "reverted"]);
const terminalGateStates = new Set(["recorded", "missed", "not_applicable"]);
const terminalDecisionStates = new Set([
  "no_change",
  "inconclusive",
  "keep",
  "expand",
  "revise",
  "iterate",
  "merge",
  "redirect",
  "noindex",
  "retire",
  "rollback",
]);
const implementationDecisionStates = new Set([
  "change_recommended",
  "expand",
  "revise",
  "iterate",
  "merge",
  "redirect",
  "noindex",
  "retire",
  "rollback",
]);
const monitoringNoChangeDecisionStates = new Set([
  "no_change",
  "keep",
  "inconclusive",
]);

function comparableCanonicalUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return value.trim();
  }
}

function validateWorkflowControls(
  value: {
    canonicalUrl?: string;
    pageFamily?: (typeof pageFamilyValues)[number];
    indexPolicy?: (typeof indexPolicyValues)[number];
    reviewStatus?: (typeof pageReviewStatusValues)[number];
    manualChatState?: (typeof manualChatStateValues)[number];
    userDecisionReference?: string | null;
    keyword?: z.output<typeof keywordSchema>;
    topic?: z.output<typeof topicSchema>;
    intent?: z.output<typeof intentSchema>;
    keywordPlanner?: z.output<typeof keywordPlannerSchema>;
    googleTrends?: z.output<typeof googleTrendsSchema>;
    measurementPlan?: z.output<typeof measurementPlanSchema>;
    serp?: z.output<typeof serpSchema>;
    offer?: z.output<typeof offerSchema>;
    eeat?: z.output<typeof eeatSchema>;
    decision?: z.output<typeof decisionSchema>;
    gates?: z.output<typeof gatesSchema>;
    manualReview?: z.output<typeof manualReviewSchema>;
  },
  context: z.RefinementCtx,
) {
  const manualChatState = value.manualChatState;
  const decision = value.decision;
  if (!manualChatState || !decision) return;

  if (
    (value.reviewStatus === "complete") !==
    (manualChatState === "complete")
  ) {
    context.addIssue({
      code: "custom",
      path: ["reviewStatus"],
      message:
        "reviewStatus and manualChatState must both be complete or both remain non-complete",
    });
  }

  if (
    (value.reviewStatus === "monitoring") !==
    (manualChatState === "monitoring")
  ) {
    context.addIssue({
      code: "custom",
      path: ["reviewStatus"],
      message:
        "reviewStatus and manualChatState must both be monitoring or both remain non-monitoring",
    });
  }

  if (
    manualStatesRequiringDecisionReference.has(manualChatState) &&
    !value.userDecisionReference
  ) {
    context.addIssue({
      code: "custom",
      path: ["userDecisionReference"],
      message:
        "userDecisionReference is required for approved, monitoring, or complete manual states",
    });
  }

  if (
    unfinishedChangeStates.has(decision.changeState) &&
    manualChatState !== "approved_to_implement"
  ) {
    context.addIssue({
      code: "custom",
      path: ["decision", "changeState"],
      message: `${decision.changeState} requires manualChatState approved_to_implement`,
    });
  }

  if (
    completedChangeStates.has(decision.changeState) &&
    !["approved_to_implement", "monitoring", "complete"].includes(
      manualChatState,
    )
  ) {
    context.addIssue({
      code: "custom",
      path: ["decision", "changeState"],
      message: `${decision.changeState} requires manualChatState approved_to_implement, monitoring, or complete`,
    });
  }

  if (completedChangeStates.has(decision.changeState)) {
    if (!decision.changeId) {
      context.addIssue({
        code: "custom",
        path: ["decision", "changeId"],
        message:
          "changeId is required when changeState is shipped, verified, or reverted",
      });
    }
    if (!decision.changedAt) {
      context.addIssue({
        code: "custom",
        path: ["decision", "changedAt"],
        message:
          "changedAt is required when changeState is shipped, verified, or reverted",
      });
    }
  }

  const isApprovedReviewState = [
    "approved_to_record",
    "approved_to_implement",
    "monitoring",
    "complete",
  ].includes(manualChatState);
  if (!isApprovedReviewState) return;
  if (decision.performanceState === "unassessed") {
    context.addIssue({
      code: "custom",
      path: ["decision", "performanceState"],
      message: "decision.performanceState must be assessed before approval",
    });
  }
  if (decision.scopeClass === "undecided") {
    context.addIssue({
      code: "custom",
      path: ["decision", "scopeClass"],
      message: "decision.scopeClass must be decided before approval",
    });
  }
  if (decision.experimentState === "unchecked") {
    context.addIssue({
      code: "custom",
      path: ["decision", "experimentState"],
      message: "decision.experimentState must be checked before approval",
    });
  }

  const hasProposedImplementation = Boolean(
    decision.proposedChange ||
      decision.changeState !== "not_planned" ||
      manualChatState === "approved_to_implement",
  );
  const isNoChangeDecision = monitoringNoChangeDecisionStates.has(
    decision.state,
  );

  if (isNoChangeDecision && decision.changeState === "not_planned") {
    if (decision.scopeClass !== "not_applicable") {
      context.addIssue({
        code: "custom",
        path: ["decision", "scopeClass"],
        message:
          "a recorded no-change decision must use decision.scopeClass not_applicable",
      });
    }
    if (decision.blastRadius !== "not_applicable") {
      context.addIssue({
        code: "custom",
        path: ["decision", "blastRadius"],
        message:
          "a recorded no-change decision must use decision.blastRadius not_applicable",
      });
    }
  }

  if (hasProposedImplementation) {
    if (!["focused", "comprehensive"].includes(decision.scopeClass)) {
      context.addIssue({
        code: "custom",
        path: ["decision", "scopeClass"],
        message:
          "a proposed implementation requires a focused or comprehensive scope",
      });
    }
    if (!decision.scopeRationale) {
      context.addIssue({
        code: "custom",
        path: ["decision", "scopeRationale"],
        message: "decision.scopeRationale is required for a proposed change",
      });
    }
    if (!decision.proposedChange) {
      context.addIssue({
        code: "custom",
        path: ["decision", "proposedChange"],
        message: "decision.proposedChange is required for a proposed change",
      });
    }
    if (!decision.rollbackTrigger) {
      context.addIssue({
        code: "custom",
        path: ["decision", "rollbackTrigger"],
        message: "decision.rollbackTrigger is required for a proposed change",
      });
    }
    if (["undecided", "not_applicable"].includes(decision.blastRadius)) {
      context.addIssue({
        code: "custom",
        path: ["decision", "blastRadius"],
        message: "a proposed change requires its blast radius",
      });
    }
    if (!decision.affectedCanonicalCount) {
      context.addIssue({
        code: "custom",
        path: ["decision", "affectedCanonicalCount"],
        message:
          "decision.affectedCanonicalCount is required for a proposed change",
      });
    }
    if (
      decision.blastRadius === "page_local" &&
      decision.affectedCanonicalCount !== 1
    ) {
      context.addIssue({
        code: "custom",
        path: ["decision", "affectedCanonicalCount"],
        message: "a page-local change must affect exactly one canonical",
      });
    }
    if (["shared_template", "mixed"].includes(decision.blastRadius)) {
      if (!decision.blastRadiusNote) {
        context.addIssue({
          code: "custom",
          path: ["decision", "blastRadiusNote"],
          message:
            "a shared-template or mixed change must name the shared and page-local behavior",
        });
      }
      if (!decision.affectedPageFamily) {
        context.addIssue({
          code: "custom",
          path: ["decision", "affectedPageFamily"],
          message:
            "a shared-template or mixed change requires its affected page family",
        });
      }
      if (
        decision.affectedCanonicalCount !== null &&
        decision.affectedCanonicalCount < 2
      ) {
        context.addIssue({
          code: "custom",
          path: ["decision", "affectedCanonicalCount"],
          message:
            "a shared-template or mixed change must affect more than one canonical",
        });
      }
      if (
        value.pageFamily === "river_report" &&
        decision.affectedPageFamily !== "river_report"
      ) {
        context.addIssue({
          code: "custom",
          path: ["decision", "affectedPageFamily"],
          message:
            "a river-report shared-template or mixed change must target the river_report family",
        });
      }
    }
  }

  if (decision.performanceState === "demonstrated_winner") {
    if (decision.demonstratedWins.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["decision", "demonstratedWins"],
        message:
          "a demonstrated winner requires at least one dated query, behavior, conversion, or link signal",
      });
    }
    if (
      hasProposedImplementation &&
      decision.preservedElements.length === 0 &&
      decision.intentionallyChangedElements.length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["decision", "preservedElements"],
        message:
          "a change to a demonstrated winner must record what is preserved or intentionally changed",
      });
    }
  }

  if (decision.experimentState === "approved_contamination") {
    if (!decision.experimentId) {
      context.addIssue({
        code: "custom",
        path: ["decision", "experimentId"],
        message: "approved experiment contamination requires an experiment ID",
      });
    }
    if (!decision.experimentFrozenUntil) {
      context.addIssue({
        code: "custom",
        path: ["decision", "experimentFrozenUntil"],
        message: "approved experiment contamination requires the freeze date",
      });
    }
    if (!decision.experimentExceptionReason) {
      context.addIssue({
        code: "custom",
        path: ["decision", "experimentExceptionReason"],
        message:
          "approved experiment contamination requires the user-approved exception reason",
      });
    }
  }
  if (
    decision.experimentState === "frozen" &&
    (manualChatState === "approved_to_implement" ||
      manualChatState === "monitoring" ||
      manualChatState === "complete" ||
      decision.changeState !== "not_planned")
  ) {
    context.addIssue({
      code: "custom",
      path: ["decision", "experimentState"],
      message:
        "a frozen experiment cannot enter implementation; record approved_contamination after explicit user approval",
    });
  }
  if (value.indexPolicy === "undecided") {
    context.addIssue({
      code: "custom",
      path: ["indexPolicy"],
      message: "indexPolicy must be decided before a review can be complete",
    });
  }
  if (!value.keyword || value.keyword.status === "undecided") {
    context.addIssue({
      code: "custom",
      path: ["keyword", "status"],
      message: "keyword ownership must be decided before a review can be complete",
    });
  }
  if (
    value.indexPolicy !== "index" &&
    value.keyword?.status === "this_page"
  ) {
    context.addIssue({
      code: "custom",
      path: ["keyword", "status"],
      message:
        "a noindex, redirect, or removed page cannot remain the primary keyword owner",
    });
  }
  if (!value.topic?.cluster) {
    context.addIssue({
      code: "custom",
      path: ["topic", "cluster"],
      message: "topic.cluster is required before a review can be complete",
    });
  }
  if (!value.topic?.maintenanceOwner) {
    context.addIssue({
      code: "custom",
      path: ["topic", "maintenanceOwner"],
      message: "topic.maintenanceOwner is required before a review can be complete",
    });
  }
  if (!value.topic?.editorialOwner) {
    context.addIssue({
      code: "custom",
      path: ["topic", "editorialOwner"],
      message: "topic.editorialOwner is required before a review can be complete",
    });
  }
  if (!value.topic || value.topic.clusterGaps.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["topic", "clusterGaps"],
      message:
        "topic.clusterGaps must include at least one finding before a review can be complete",
    });
  }
  if (!value.intent || value.intent.searchIntent === "unknown") {
    context.addIssue({
      code: "custom",
      path: ["intent", "searchIntent"],
      message: "search intent must be decided before a review can be complete",
    });
  }
  if (!value.intent?.jobToBeDone) {
    context.addIssue({
      code: "custom",
      path: ["intent", "jobToBeDone"],
      message: "intent.jobToBeDone is required before a review can be complete",
    });
  }
  if (!value.manualReview?.firstReviewedAt) {
    context.addIssue({
      code: "custom",
      path: ["manualReview", "firstReviewedAt"],
      message: "manualReview.firstReviewedAt is required before completion",
    });
  }
  if (!value.manualReview?.lastReviewedAt) {
    context.addIssue({
      code: "custom",
      path: ["manualReview", "lastReviewedAt"],
      message: "manualReview.lastReviewedAt is required before completion",
    });
  }
  if (!value.manualReview?.nextReviewAt) {
    context.addIssue({
      code: "custom",
      path: ["manualReview", "nextReviewAt"],
      message: "manualReview.nextReviewAt is required for an approved review",
    });
  }
  if (!value.serp || value.serp.evidenceState === "missing") {
    context.addIssue({
      code: "custom",
      path: ["serp", "evidenceState"],
      message: "serp.evidenceState must not be missing at completion",
    });
  }
  if (!value.offer || value.offer.differentiationEvidenceState === "missing") {
    context.addIssue({
      code: "custom",
      path: ["offer", "differentiationEvidenceState"],
      message: "offer.differentiationEvidenceState must not be missing at completion",
    });
  }
  if (!value.eeat || value.eeat.evidenceState === "missing") {
    context.addIssue({
      code: "custom",
      path: ["eeat", "evidenceState"],
      message: "eeat.evidenceState must not be missing at completion",
    });
  }
  if (
    !value.keywordPlanner ||
    value.keywordPlanner.evidenceState === "missing"
  ) {
    context.addIssue({
      code: "custom",
      path: ["keywordPlanner", "evidenceState"],
      message:
        "keywordPlanner.evidenceState must not be missing for an approved review",
    });
  }
  if (!value.googleTrends || value.googleTrends.evidenceState === "missing") {
    context.addIssue({
      code: "custom",
      path: ["googleTrends", "evidenceState"],
      message:
        "googleTrends.evidenceState must not be missing for an approved review",
    });
  }
  if (!decision.rationale) {
    context.addIssue({
      code: "custom",
      path: ["decision", "rationale"],
      message: "decision.rationale is required for an approved review",
    });
  }
  if (
    value.serp &&
    ["verified", "partial"].includes(value.serp.evidenceState) &&
    !value.serp.competitionSummary
  ) {
    context.addIssue({
      code: "custom",
      path: ["serp", "competitionSummary"],
      message:
        "serp.competitionSummary is required when SERP evidence is verified or partial",
    });
  }
  if (
    value.eeat &&
    ["verified", "partial"].includes(value.eeat.evidenceState) &&
    value.eeat.gaps.length === 0
  ) {
    context.addIssue({
      code: "custom",
      path: ["eeat", "gaps"],
      message:
        "eeat.gaps must include a gap or an honest no-gap finding for an approved review",
    });
  }

  const completeSerpResult = (result: z.output<typeof serpResultSchema>) =>
    Boolean(
      result.url &&
        result.title &&
        result.offer &&
        result.evidence &&
        result.gap,
    );
  if (value.serp?.evidenceState === "verified") {
    if (
      value.serp.results.length !== 5 ||
      !value.serp.results.every(completeSerpResult)
    ) {
      context.addIssue({
        code: "custom",
        path: ["serp", "results"],
        message: "verified SERP evidence requires exactly five complete results",
      });
    }
  }
  if (
    value.serp?.evidenceState === "partial" &&
    !value.serp.results.some(completeSerpResult)
  ) {
    context.addIssue({
      code: "custom",
      path: ["serp", "results"],
      message: "partial SERP evidence requires at least one complete result",
    });
  }

  const isIndexableKeywordTarget =
    value.indexPolicy === "index" &&
    Boolean(
      value.keyword &&
        ["this_page", "another_canonical"].includes(value.keyword.status),
    );
  if (isIndexableKeywordTarget) {
    const requiresMeasurementPlan = [
      "approved_to_implement",
      "monitoring",
      "complete",
    ].includes(manualChatState);
    if (requiresMeasurementPlan) {
      if (
        !value.measurementPlan ||
        !["verified", "partial"].includes(
          value.measurementPlan.evidenceState,
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["measurementPlan", "evidenceState"],
          message:
            "approved implementation, monitoring, or completion needs a verified or partial measurement plan",
        });
      }
      for (const sourceName of ["gsc", "ga4"] as const) {
        if (
          !value.measurementPlan ||
          !["verified", "partial"].includes(
            value.measurementPlan[sourceName].evidenceState,
          )
        ) {
          context.addIssue({
            code: "custom",
            path: ["measurementPlan", sourceName, "evidenceState"],
            message: `${sourceName} baseline evidence must be verified or partial before implementation, monitoring, or completion`,
          });
        }
      }
      if (
        value.canonicalUrl &&
        value.measurementPlan?.baselineCanonical &&
        comparableCanonicalUrl(value.canonicalUrl) !==
          comparableCanonicalUrl(value.measurementPlan.baselineCanonical)
      ) {
        context.addIssue({
          code: "custom",
          path: ["measurementPlan", "baselineCanonical"],
          message:
            "measurementPlan.baselineCanonical must match this page's exact canonical URL",
        });
      }
    }
    if (value.serp?.evidenceState === "not_applicable") {
      context.addIssue({
        code: "custom",
        path: ["serp", "evidenceState"],
        message:
          "serp.evidenceState cannot be not_applicable for an indexable keyword-targeted page",
      });
    }
    if (!value.serp?.locale) {
      context.addIssue({
        code: "custom",
        path: ["serp", "locale"],
        message:
          "serp.locale is required for a complete indexable keyword-targeted page",
      });
    }
    if (!value.serp?.device) {
      context.addIssue({
        code: "custom",
        path: ["serp", "device"],
        message:
          "serp.device is required for a complete indexable keyword-targeted page",
      });
    }
    if (
      value.keyword?.primaryQuery &&
      value.serp?.query &&
      normalizeSavedQuery(value.keyword.primaryQuery) !==
        normalizeSavedQuery(value.serp.query)
    ) {
      context.addIssue({
        code: "custom",
        path: ["serp", "query"],
        message:
          "serp.query must match the approved primary keyword for an indexable keyword-targeted page",
      });
    }
    if (value.offer?.differentiationEvidenceState === "not_applicable") {
      context.addIssue({
        code: "custom",
        path: ["offer", "differentiationEvidenceState"],
        message:
          "offer.differentiationEvidenceState cannot be not_applicable for an indexable keyword-targeted page",
      });
    }
    if (value.eeat?.evidenceState === "not_applicable") {
      context.addIssue({
        code: "custom",
        path: ["eeat", "evidenceState"],
        message:
          "eeat.evidenceState cannot be not_applicable for an indexable keyword-targeted page",
      });
    }

    for (const [evidenceName, evidence] of [
      ["keywordPlanner", value.keywordPlanner],
      ["googleTrends", value.googleTrends],
    ] as const) {
      if (
        !evidence ||
        !["verified", "partial"].includes(evidence.evidenceState)
      ) {
        context.addIssue({
          code: "custom",
          path: [evidenceName, "evidenceState"],
          message: `${evidenceName}.evidenceState must be verified or partial for an approved indexable keyword-targeted page`,
        });
      }
      if (
        value.keyword?.primaryQuery &&
        (!evidence?.query ||
          normalizeSavedQuery(value.keyword.primaryQuery) !==
            normalizeSavedQuery(evidence.query))
      ) {
        context.addIssue({
          code: "custom",
          path: [evidenceName, "query"],
          message: `${evidenceName}.query must match the approved primary keyword for an indexable keyword-targeted page`,
        });
      }
    }
  }

  if (manualChatState === "approved_to_record") {
    if (decision.state === "pending" || decision.state === "blocked") {
      context.addIssue({
        code: "custom",
        path: ["decision", "state"],
        message:
          "approved_to_record requires a reviewed decision, not pending or blocked",
      });
    }
    return;
  }

  if (manualChatState === "approved_to_implement") {
    if (!implementationDecisionStates.has(decision.state)) {
      context.addIssue({
        code: "custom",
        path: ["decision", "state"],
        message:
          "approved_to_implement requires a decision that calls for a bounded change",
      });
    }
    if (!decision.proposedChange) {
      context.addIssue({
        code: "custom",
        path: ["decision", "proposedChange"],
        message:
          "decision.proposedChange is required before implementation approval",
      });
    }
    if (decision.changeState === "not_planned") {
      context.addIssue({
        code: "custom",
        path: ["decision", "changeState"],
        message:
          "approved_to_implement requires a planned, in-progress, or delivered change state",
      });
    }
    return;
  }

  const requireGateField = (
    gateName: "day7" | "day28" | "day56",
    field: "dueAt" | "reviewedAt" | "evidence" | "decision" | "rationale" | "nextAction",
    present: boolean,
  ) => {
    if (present) return;
    context.addIssue({
      code: "custom",
      path: ["gates", gateName, field],
      message: `${gateName}.${field} is required for its recorded gate state`,
    });
  };

  const validateTerminalGateEvidence = (
    gateName: "day7" | "day28" | "day56",
    gate: z.output<typeof gateSchema>,
  ) => {
    if (!terminalGateStates.has(gate.status)) return;
    const needsDueAndEvidence = gate.status === "recorded" || gate.status === "missed";
    if (needsDueAndEvidence) {
      requireGateField(gateName, "dueAt", Boolean(gate.dueAt));
      requireGateField(gateName, "evidence", Boolean(gate.evidence));
    }
    requireGateField(gateName, "reviewedAt", Boolean(gate.reviewedAt));
    requireGateField(gateName, "decision", Boolean(gate.decision));
    requireGateField(gateName, "rationale", Boolean(gate.rationale));
    requireGateField(gateName, "nextAction", Boolean(gate.nextAction));
  };

  if (manualChatState === "monitoring") {
    const hasDeliveredChange =
      completedChangeStates.has(decision.changeState) &&
      implementationDecisionStates.has(decision.state);
    const hasRecordedNoChange =
      decision.changeState === "not_planned" &&
      monitoringNoChangeDecisionStates.has(decision.state);
    if (!hasDeliveredChange && !hasRecordedNoChange) {
      context.addIssue({
        code: "custom",
        path: ["manualChatState"],
        message:
          "monitoring requires a delivered change or a terminal recorded no-change decision",
      });
    }

    if (value.gates) {
      let hasOpenGate = false;
      for (const gateName of ["day7", "day28", "day56"] as const) {
        const gate = value.gates[gateName];
        if (terminalGateStates.has(gate.status)) {
          validateTerminalGateEvidence(gateName, gate);
        } else {
          hasOpenGate = true;
          requireGateField(gateName, "dueAt", Boolean(gate.dueAt));
        }
      }
      if (!hasOpenGate) {
        context.addIssue({
          code: "custom",
          path: ["manualChatState"],
          message:
            "monitoring requires at least one open outcome gate; use complete after every gate is terminal",
        });
      }
    }
    return;
  }

  if (!terminalDecisionStates.has(decision.state)) {
    context.addIssue({
      code: "custom",
      path: ["decision", "state"],
      message:
        "decision.state must be a terminal outcome when manualChatState is complete",
    });
  }
  if (["planned", "in_progress"].includes(decision.changeState)) {
    context.addIssue({
      code: "custom",
      path: ["decision", "changeState"],
      message:
        "changeState must not be planned or in_progress when manualChatState is complete",
    });
  }

  if (!value.gates) return;
  for (const gateName of ["day7", "day28", "day56"] as const) {
    const gate = value.gates[gateName];
    if (!terminalGateStates.has(gate.status)) {
      context.addIssue({
        code: "custom",
        path: ["gates", gateName, "status"],
        message: `${gateName}.status must be recorded, missed, or not_applicable before manualChatState can be complete`,
      });
    }
    validateTerminalGateEvidence(gateName, gate);
  }
}

export const createPageReviewSchema = z
  .object(contentFields)
  .strict()
  .superRefine(validateKeywordOwnership)
  .superRefine(validateWorkflowControls);

export const patchPageReviewSchema = z
  .object({
    pageId: contentFields.pageId.optional(),
    canonicalUrl: contentFields.canonicalUrl.optional(),
    pageFamily: contentFields.pageFamily.optional(),
    indexPolicy: contentFields.indexPolicy.optional(),
    reviewStatus: z.enum(pageReviewStatusValues).optional(),
    priority: z.enum(reviewPriorityValues).optional(),
    keyword: keywordSchema.optional(),
    topic: topicSchema.optional(),
    intent: intentSchema.optional(),
    keywordPlanner: keywordPlannerSchema.optional(),
    googleTrends: googleTrendsSchema.optional(),
    measurementPlan: measurementPlanSchema.optional(),
    serp: serpSchema.optional(),
    offer: offerSchema.optional(),
    eeat: eeatSchema.optional(),
    decision: decisionSchema.optional(),
    gates: gatesSchema.optional(),
    manualReview: manualReviewSchema.optional(),
    manualChatState: z.enum(manualChatStateValues).optional(),
    userDecisionReference: nullableText(2000).optional(),
    expectedVersion: z.number().int().positive(),
    changeNote: nullableText(2000).optional(),
  })
  .strict()
  .superRefine(validateKeywordOwnership)
  .refine(
    (value) =>
      Object.keys(value).some(
        (key) => !["expectedVersion", "changeNote"].includes(key),
      ),
    { message: "PATCH must include at least one review field" },
  );

export const deletePageReviewSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    changeNote: nullableText(2000).optional(),
  })
  .strict();

export type CreatePageReviewInput = z.output<typeof createPageReviewSchema>;
export type PatchPageReviewInput = z.output<typeof patchPageReviewSchema>;

export function apiEnumToDb(value: string) {
  return value.toUpperCase();
}

export function dbEnumToApi(value: string) {
  return value.toLowerCase();
}

export function isActiveManualChatState(value: string) {
  return (activeManualChatStateValues as readonly string[]).includes(
    dbEnumToApi(value),
  );
}

function dateOrNull(value: string | null) {
  return value ? new Date(value) : null;
}

function normalizeList(values: string[], normalizer?: (value: string) => string) {
  return [
    ...new Set(
      values.map((value) => (normalizer ? normalizer(value) : value.trim())).filter(Boolean),
    ),
  ];
}

function normalizeEvidenceUrl(value: string | null) {
  return value ? new URL(value).toString() : null;
}

function hasEvidenceDetailValues(details: Record<string, unknown>) {
  return Object.values(details).some((value) =>
    Array.isArray(value) ? value.length > 0 : value !== null,
  );
}

function normalizeKeywordPlannerEvidence(
  input: z.output<typeof keywordPlannerSchema>,
) {
  const details = {
    query: input.query ? normalizeSavedQuery(input.query) : null,
    checkedAt: input.checkedAt,
    method: input.method,
    sourceUrl: normalizeEvidenceUrl(input.sourceUrl),
    geoTarget: input.geoTarget,
    language: input.language,
    network: input.network,
    averageMonthlySearches: input.averageMonthlySearches,
    monthlySearches: [...input.monthlySearches].sort(
      (left, right) => right.year - left.year || right.month - left.month,
    ),
    paidAdvertiserCompetition: input.paidAdvertiserCompetition,
    paidAdvertiserCompetitionIndex: input.paidAdvertiserCompetitionIndex,
    lowTopOfPageBidMicros: input.lowTopOfPageBidMicros,
    highTopOfPageBidMicros: input.highTopOfPageBidMicros,
    limitation: input.limitation,
    notApplicableReason: input.notApplicableReason,
  };
  return {
    state: apiEnumToDb(input.evidenceState),
    details: hasEvidenceDetailValues(details) ? details : null,
  };
}

function normalizeGoogleTrendsEvidence(
  input: z.output<typeof googleTrendsSchema>,
) {
  const query = input.query ? normalizeSavedQuery(input.query) : null;
  const details = {
    query,
    checkedAt: input.checkedAt,
    method: input.method,
    sourceUrl: normalizeEvidenceUrl(input.sourceUrl),
    geo: input.geo,
    timeframe: input.timeframe,
    comparisonQueries: normalizeList(
      input.comparisonQueries,
      normalizeSavedQuery,
    ).filter((comparison) => comparison !== query),
    direction: input.direction,
    finding: input.finding,
    limitation: input.limitation,
    notApplicableReason: input.notApplicableReason,
  };
  return {
    state: apiEnumToDb(input.evidenceState),
    details: hasEvidenceDetailValues(details) ? details : null,
  };
}

function normalizeMeasurementPlanEvidence(
  input: z.output<typeof measurementPlanSchema>,
  expectedDomain: string,
) {
  const details = {
    baselineCanonical: input.baselineCanonical
      ? normalizeOwnerPage(input.baselineCanonical, expectedDomain)
      : null,
    baselineAsOf: input.baselineAsOf,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    gsc: {
      ...input.gsc,
      sourceUrl: normalizeEvidenceUrl(input.gsc.sourceUrl),
    },
    ga4: {
      ...input.ga4,
      sourceUrl: normalizeEvidenceUrl(input.ga4.sourceUrl),
    },
    hypothesis: input.hypothesis,
    primaryKpi: input.primaryKpi,
    conversionGoal: input.conversionGoal,
    comparisonWindows: input.comparisonWindows,
    guardrails: normalizeList(input.guardrails),
    limitation: input.limitation,
    notApplicableReason: input.notApplicableReason,
  };
  return {
    state: apiEnumToDb(input.evidenceState),
    details:
      JSON.stringify(details) === JSON.stringify(emptyMeasurementPlanDetails)
        ? null
        : details,
  };
}

export function normalizePageReviewInput(
  input: CreatePageReviewInput,
  expectedDomain: string,
) {
  const canonicalUrl = normalizeOwnerPage(input.canonicalUrl, expectedDomain);
  const ownerCanonical = input.keyword.ownerCanonical
    ? normalizeOwnerPage(input.keyword.ownerCanonical, expectedDomain)
    : null;
  const parentPage = input.topic.parentPage
    ? normalizeOwnerPage(input.topic.parentPage, expectedDomain)
    : null;
  const primaryKeyword = input.keyword.primaryQuery
    ? normalizeSavedQuery(input.keyword.primaryQuery)
    : null;
  const keywordPlannerEvidence = normalizeKeywordPlannerEvidence(
    input.keywordPlanner,
  );
  const googleTrendsEvidence = normalizeGoogleTrendsEvidence(
    input.googleTrends,
  );
  const measurementPlanEvidence = normalizeMeasurementPlanEvidence(
    input.measurementPlan,
    expectedDomain,
  );

  if (
    input.keyword.status === "another_canonical" &&
    ownerCanonical === canonicalUrl
  ) {
    throw new Error("ownerCanonical must differ from this page's canonical URL");
  }

  return {
    pageId: input.pageId.trim(),
    canonicalUrl,
    pageFamily: apiEnumToDb(input.pageFamily),
    indexPolicy: apiEnumToDb(input.indexPolicy),
    reviewStatus: apiEnumToDb(input.reviewStatus),
    priority: apiEnumToDb(input.priority),
    keywordOwnership: apiEnumToDb(input.keyword.status),
    primaryKeyword,
    primaryKeywordNormalized: primaryKeyword,
    keywordOwnerCanonical: ownerCanonical,
    keywordNotApplicableReason: input.keyword.notApplicableReason,
    secondaryKeywords: normalizeList(
      input.keyword.secondaryQueries,
      normalizeSavedQuery,
    ).filter((query) => query !== primaryKeyword),
    topicCluster: input.topic.cluster,
    parentPage,
    clusterGaps: normalizeList(input.topic.clusterGaps),
    maintenanceOwner: input.topic.maintenanceOwner,
    editorialOwner: input.topic.editorialOwner,
    searchIntent: apiEnumToDb(input.intent.searchIntent),
    jobToBeDone: input.intent.jobToBeDone,
    keywordPlannerEvidenceState: keywordPlannerEvidence.state,
    keywordPlannerEvidenceDetails: keywordPlannerEvidence.details,
    googleTrendsEvidenceState: googleTrendsEvidence.state,
    googleTrendsEvidenceDetails: googleTrendsEvidence.details,
    measurementPlanEvidenceState: measurementPlanEvidence.state,
    measurementPlanDetails: measurementPlanEvidence.details,
    serpSnapshotAt: dateOrNull(input.serp.snapshotAt),
    serpQuery: input.serp.query ? normalizeSavedQuery(input.serp.query) : null,
    serpLocale: input.serp.locale,
    serpDevice: input.serp.device ? apiEnumToDb(input.serp.device) : null,
    serpMethod: input.serp.method ? apiEnumToDb(input.serp.method) : null,
    serpCompetition: apiEnumToDb(input.serp.competition),
    serpEvidenceState: apiEnumToDb(input.serp.evidenceState),
    serpEvidenceSummary: input.serp.evidenceSummary,
    serpFeatures: normalizeList(input.serp.features),
    serpCompetitionSummary: input.serp.competitionSummary,
    serpResults: input.serp.results,
    competitorOffer: input.offer.competitorOffer,
    currentOffer: input.offer.currentOffer,
    differentiation: input.offer.differentiation,
    differentiationEvidenceState: apiEnumToDb(
      input.offer.differentiationEvidenceState,
    ),
    eeatEvidence: normalizeList(input.eeat.evidence),
    eeatGaps: normalizeList(input.eeat.gaps),
    eeatEvidenceDetails: input.eeat.details,
    eeatEvidenceState: apiEnumToDb(input.eeat.evidenceState),
    decisionState: apiEnumToDb(input.decision.state),
    decisionRationale: input.decision.rationale,
    proposedChange: input.decision.proposedChange,
    performanceState: apiEnumToDb(input.decision.performanceState),
    changeScope: apiEnumToDb(input.decision.scopeClass),
    scopeRationale: input.decision.scopeRationale,
    demonstratedWins: normalizeList(input.decision.demonstratedWins),
    preservedElements: normalizeList(input.decision.preservedElements),
    intentionallyChangedElements: normalizeList(
      input.decision.intentionallyChangedElements,
    ),
    changeBlastRadius: apiEnumToDb(input.decision.blastRadius),
    affectedPageFamily: input.decision.affectedPageFamily
      ? apiEnumToDb(input.decision.affectedPageFamily)
      : null,
    affectedCanonicalCount: input.decision.affectedCanonicalCount,
    blastRadiusNote: input.decision.blastRadiusNote,
    experimentState: apiEnumToDb(input.decision.experimentState),
    experimentId: input.decision.experimentId,
    experimentFrozenUntil: dateOrNull(input.decision.experimentFrozenUntil),
    experimentExceptionReason: input.decision.experimentExceptionReason,
    rollbackTrigger: input.decision.rollbackTrigger,
    changeState: apiEnumToDb(input.decision.changeState),
    changeId: input.decision.changeId,
    changedAt: dateOrNull(input.decision.changedAt),
    ...normalizeGate("day7", input.gates.day7),
    ...normalizeGate("day28", input.gates.day28),
    ...normalizeGate("day56", input.gates.day56),
    firstReviewedAt: dateOrNull(input.manualReview.firstReviewedAt),
    lastReviewedAt: dateOrNull(input.manualReview.lastReviewedAt),
    nextReviewAt: dateOrNull(input.manualReview.nextReviewAt),
    manualNotes: input.manualReview.notes,
    manualChatState: apiEnumToDb(input.manualChatState),
    userDecisionReference: input.userDecisionReference,
  };
}

function normalizeGate(prefix: "day7" | "day28" | "day56", gate: z.output<typeof gateSchema>) {
  return {
    [`${prefix}State`]: apiEnumToDb(gate.status),
    [`${prefix}DueAt`]: dateOrNull(gate.dueAt),
    [`${prefix}ReviewedAt`]: dateOrNull(gate.reviewedAt),
    [`${prefix}Evidence`]: gate.evidence,
    [`${prefix}Decision`]: gate.decision,
    [`${prefix}Rationale`]: gate.rationale,
    [`${prefix}NextAction`]: gate.nextAction,
  };
}

export function normalizePageReviewPatch(
  input: PatchPageReviewInput,
  current: PageReview,
  expectedDomain: string,
) {
  const currentApi = pageReviewToApi(current);
  const mergedResult = createPageReviewSchema.safeParse({
    pageId: input.pageId ?? currentApi.pageId,
    canonicalUrl: input.canonicalUrl ?? currentApi.canonicalUrl,
    pageFamily: input.pageFamily ?? currentApi.pageFamily,
    indexPolicy: input.indexPolicy ?? currentApi.indexPolicy,
    reviewStatus: input.reviewStatus ?? currentApi.reviewStatus,
    priority: input.priority ?? currentApi.priority,
    keyword: input.keyword ?? currentApi.keyword,
    topic: input.topic ?? currentApi.topic,
    intent: input.intent ?? currentApi.intent,
    keywordPlanner: input.keywordPlanner ?? currentApi.keywordPlanner,
    googleTrends: input.googleTrends ?? currentApi.googleTrends,
    measurementPlan: input.measurementPlan ?? currentApi.measurementPlan,
    serp: input.serp ?? currentApi.serp,
    offer: input.offer ?? currentApi.offer,
    eeat: input.eeat ?? currentApi.eeat,
    decision: input.decision ?? currentApi.decision,
    gates: input.gates ?? currentApi.gates,
    manualReview: input.manualReview ?? currentApi.manualReview,
    manualChatState: input.manualChatState ?? currentApi.manualChatState,
    userDecisionReference:
      input.userDecisionReference === undefined
        ? currentApi.userDecisionReference
        : input.userDecisionReference,
  });
  if (!mergedResult.success) {
    throw new Error(
      mergedResult.error.issues
        .map((issue) => `${issue.path.join(".") || "review"}: ${issue.message}`)
        .join("; "),
    );
  }
  return normalizePageReviewInput(mergedResult.data, expectedDomain);
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asSerpResults(value: unknown) {
  const parsed = z.array(serpResultSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

function asEeatEvidenceDetails(value: unknown) {
  const parsed = z.array(eeatEvidenceDetailSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

function asKeywordPlannerEvidenceDetails(value: unknown) {
  const parsed = keywordPlannerEvidenceDetailsSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : { ...emptyKeywordPlannerEvidenceDetails };
}

function asGoogleTrendsEvidenceDetails(value: unknown) {
  const parsed = googleTrendsEvidenceDetailsSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : { ...emptyGoogleTrendsEvidenceDetails };
}

function asMeasurementPlanDetails(value: unknown) {
  const parsed = measurementPlanDetailsSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : { ...emptyMeasurementPlanDetails };
}

function iso(value: Date | null) {
  return value?.toISOString() ?? null;
}

function gateFromReview(review: PageReview, prefix: "day7" | "day28" | "day56") {
  const record = review as unknown as Record<string, unknown>;
  return {
    status: dbEnumToApi(String(record[`${prefix}State`])),
    dueAt: iso((record[`${prefix}DueAt`] as Date | null) ?? null),
    reviewedAt: iso((record[`${prefix}ReviewedAt`] as Date | null) ?? null),
    evidence: (record[`${prefix}Evidence`] as string | null) ?? null,
    decision: (record[`${prefix}Decision`] as string | null) ?? null,
    rationale: (record[`${prefix}Rationale`] as string | null) ?? null,
    nextAction: (record[`${prefix}NextAction`] as string | null) ?? null,
  };
}

type PageReviewSummaryRecord = Pick<
  PageReview,
  | "id"
  | "siteId"
  | "pageId"
  | "canonicalUrl"
  | "pageFamily"
  | "indexPolicy"
  | "reviewStatus"
  | "priority"
  | "topicCluster"
  | "maintenanceOwner"
  | "editorialOwner"
  | "manualChatState"
  | "keywordOwnership"
  | "primaryKeyword"
  | "keywordOwnerCanonical"
  | "firstReviewedAt"
  | "lastReviewedAt"
  | "nextReviewAt"
  | "version"
  | "updatedAt"
>;

export function pageReviewToSummary(review: PageReviewSummaryRecord) {
  return {
    id: review.id,
    siteId: review.siteId,
    pageId: review.pageId,
    canonicalUrl: review.canonicalUrl,
    pageFamily: dbEnumToApi(review.pageFamily),
    indexPolicy: dbEnumToApi(review.indexPolicy),
    reviewStatus: dbEnumToApi(review.reviewStatus),
    priority: dbEnumToApi(review.priority),
    topicCluster: review.topicCluster,
    maintenanceOwner: review.maintenanceOwner,
    editorialOwner: review.editorialOwner,
    manualChatState: dbEnumToApi(review.manualChatState),
    keywordStatus: dbEnumToApi(review.keywordOwnership),
    primaryQuery: review.primaryKeyword,
    keywordOwnerCanonical: review.keywordOwnerCanonical,
    firstReviewedAt: iso(review.firstReviewedAt),
    lastReviewedAt: iso(review.lastReviewedAt),
    nextReviewAt: iso(review.nextReviewAt),
    version: review.version,
    updatedAt: review.updatedAt.toISOString(),
  };
}

export function pageReviewToApi(review: PageReview) {
  return {
    id: review.id,
    siteId: review.siteId,
    pageId: review.pageId,
    canonicalUrl: review.canonicalUrl,
    pageFamily: dbEnumToApi(review.pageFamily),
    indexPolicy: dbEnumToApi(review.indexPolicy),
    reviewStatus: dbEnumToApi(review.reviewStatus),
    priority: dbEnumToApi(review.priority),
    keyword: {
      status: dbEnumToApi(review.keywordOwnership),
      primaryQuery: review.primaryKeyword,
      ownerCanonical: review.keywordOwnerCanonical,
      notApplicableReason: review.keywordNotApplicableReason,
      secondaryQueries: asStringArray(review.secondaryKeywords),
    },
    topic: {
      cluster: review.topicCluster,
      parentPage: review.parentPage,
      clusterGaps: asStringArray(review.clusterGaps),
      maintenanceOwner: review.maintenanceOwner,
      editorialOwner: review.editorialOwner,
    },
    intent: {
      searchIntent: dbEnumToApi(review.searchIntent),
      jobToBeDone: review.jobToBeDone,
    },
    keywordPlanner: {
      evidenceState: dbEnumToApi(review.keywordPlannerEvidenceState),
      ...asKeywordPlannerEvidenceDetails(
        review.keywordPlannerEvidenceDetails,
      ),
    },
    googleTrends: {
      evidenceState: dbEnumToApi(review.googleTrendsEvidenceState),
      ...asGoogleTrendsEvidenceDetails(review.googleTrendsEvidenceDetails),
    },
    measurementPlan: {
      evidenceState: dbEnumToApi(review.measurementPlanEvidenceState),
      ...asMeasurementPlanDetails(review.measurementPlanDetails),
    },
    serp: {
      snapshotAt: iso(review.serpSnapshotAt),
      query: review.serpQuery,
      locale: review.serpLocale,
      device: review.serpDevice ? dbEnumToApi(review.serpDevice) : null,
      method: review.serpMethod ? dbEnumToApi(review.serpMethod) : null,
      competition: dbEnumToApi(review.serpCompetition),
      evidenceState: dbEnumToApi(review.serpEvidenceState),
      evidenceSummary: review.serpEvidenceSummary,
      features: asStringArray(review.serpFeatures),
      competitionSummary: review.serpCompetitionSummary,
      results: asSerpResults(review.serpResults),
    },
    offer: {
      competitorOffer: review.competitorOffer,
      currentOffer: review.currentOffer,
      differentiation: review.differentiation,
      differentiationEvidenceState: dbEnumToApi(
        review.differentiationEvidenceState,
      ),
    },
    eeat: {
      evidence: asStringArray(review.eeatEvidence),
      gaps: asStringArray(review.eeatGaps),
      details: asEeatEvidenceDetails(review.eeatEvidenceDetails),
      evidenceState: dbEnumToApi(review.eeatEvidenceState),
    },
    decision: {
      state: dbEnumToApi(review.decisionState),
      rationale: review.decisionRationale,
      proposedChange: review.proposedChange,
      performanceState: dbEnumToApi(review.performanceState),
      scopeClass: dbEnumToApi(review.changeScope),
      scopeRationale: review.scopeRationale,
      demonstratedWins: asStringArray(review.demonstratedWins),
      preservedElements: asStringArray(review.preservedElements),
      intentionallyChangedElements: asStringArray(
        review.intentionallyChangedElements,
      ),
      blastRadius: dbEnumToApi(review.changeBlastRadius),
      affectedPageFamily: review.affectedPageFamily
        ? dbEnumToApi(review.affectedPageFamily)
        : null,
      affectedCanonicalCount: review.affectedCanonicalCount,
      blastRadiusNote: review.blastRadiusNote,
      experimentState: dbEnumToApi(review.experimentState),
      experimentId: review.experimentId,
      experimentFrozenUntil: iso(review.experimentFrozenUntil),
      experimentExceptionReason: review.experimentExceptionReason,
      rollbackTrigger: review.rollbackTrigger,
      changeState: dbEnumToApi(review.changeState),
      changeId: review.changeId,
      changedAt: iso(review.changedAt),
    },
    gates: {
      day7: gateFromReview(review, "day7"),
      day28: gateFromReview(review, "day28"),
      day56: gateFromReview(review, "day56"),
    },
    manualReview: {
      firstReviewedAt: iso(review.firstReviewedAt),
      lastReviewedAt: iso(review.lastReviewedAt),
      nextReviewAt: iso(review.nextReviewAt),
      notes: review.manualNotes,
    },
    manualChatState: dbEnumToApi(review.manualChatState),
    userDecisionReference: review.userDecisionReference,
    version: review.version,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    deletedAt: iso(review.deletedAt),
  };
}

export function pageReviewRevisionToApi(revision: PageReviewRevision) {
  return {
    id: revision.id,
    reviewId: revision.reviewId,
    version: revision.version,
    changeType: dbEnumToApi(revision.changeType),
    changedFields: asStringArray(revision.changedFields),
    snapshot: revision.snapshot,
    changeNote: revision.changeNote,
    changedByUserId: revision.changedByUserId,
    createdAt: revision.createdAt.toISOString(),
  };
}

const nullableArrayFields = new Set([
  "secondaryKeywords",
  "clusterGaps",
  "serpFeatures",
  "serpResults",
  "eeatEvidence",
  "eeatGaps",
  "eeatEvidenceDetails",
  "demonstratedWins",
  "preservedElements",
  "intentionallyChangedElements",
]);

function comparableValue(value: unknown, nullAsEmptyArray: boolean) {
  if (value instanceof Date) return value.toISOString();
  if (nullAsEmptyArray && value === null) return "[]";
  if (Array.isArray(value) || (value && typeof value === "object")) {
    return JSON.stringify(value);
  }
  return String(value ?? "__NULL__");
}

const pageReviewChangeGroups = {
  pageId: ["pageId"],
  canonicalUrl: ["canonicalUrl"],
  pageFamily: ["pageFamily"],
  indexPolicy: ["indexPolicy"],
  reviewStatus: ["reviewStatus"],
  priority: ["priority"],
  keyword: [
    "keywordOwnership",
    "primaryKeyword",
    "primaryKeywordNormalized",
    "keywordOwnerCanonical",
    "keywordNotApplicableReason",
    "secondaryKeywords",
  ],
  topic: [
    "topicCluster",
    "parentPage",
    "clusterGaps",
    "maintenanceOwner",
    "editorialOwner",
  ],
  intent: ["searchIntent", "jobToBeDone"],
  keywordPlanner: [
    "keywordPlannerEvidenceState",
    "keywordPlannerEvidenceDetails",
  ],
  googleTrends: [
    "googleTrendsEvidenceState",
    "googleTrendsEvidenceDetails",
  ],
  measurementPlan: [
    "measurementPlanEvidenceState",
    "measurementPlanDetails",
  ],
  serp: [
    "serpSnapshotAt",
    "serpQuery",
    "serpLocale",
    "serpDevice",
    "serpMethod",
    "serpCompetition",
    "serpEvidenceState",
    "serpEvidenceSummary",
    "serpFeatures",
    "serpCompetitionSummary",
    "serpResults",
  ],
  offer: [
    "competitorOffer",
    "currentOffer",
    "differentiation",
    "differentiationEvidenceState",
  ],
  eeat: [
    "eeatEvidence",
    "eeatGaps",
    "eeatEvidenceDetails",
    "eeatEvidenceState",
  ],
  decision: [
    "decisionState",
    "decisionRationale",
    "proposedChange",
    "performanceState",
    "changeScope",
    "scopeRationale",
    "demonstratedWins",
    "preservedElements",
    "intentionallyChangedElements",
    "changeBlastRadius",
    "affectedPageFamily",
    "affectedCanonicalCount",
    "blastRadiusNote",
    "experimentState",
    "experimentId",
    "experimentFrozenUntil",
    "experimentExceptionReason",
    "rollbackTrigger",
    "changeState",
    "changeId",
    "changedAt",
  ],
  gates: [
    "day7State",
    "day7DueAt",
    "day7ReviewedAt",
    "day7Evidence",
    "day7Decision",
    "day7Rationale",
    "day7NextAction",
    "day28State",
    "day28DueAt",
    "day28ReviewedAt",
    "day28Evidence",
    "day28Decision",
    "day28Rationale",
    "day28NextAction",
    "day56State",
    "day56DueAt",
    "day56ReviewedAt",
    "day56Evidence",
    "day56Decision",
    "day56Rationale",
    "day56NextAction",
  ],
  manualReview: [
    "firstReviewedAt",
    "lastReviewedAt",
    "nextReviewAt",
    "manualNotes",
  ],
  manualChatState: ["manualChatState"],
  userDecisionReference: ["userDecisionReference"],
} as const;

export function semanticChangedReviewFields(
  normalized: ReturnType<typeof normalizePageReviewInput>,
  current: PageReview,
) {
  const currentRecord = current as unknown as Record<string, unknown>;
  const normalizedRecord = normalized as unknown as Record<string, unknown>;
  return Object.entries(pageReviewChangeGroups)
    .filter(([, fields]) =>
      fields.some((field) => {
        const nullAsEmptyArray = nullableArrayFields.has(field);
        return (
          comparableValue(normalizedRecord[field], nullAsEmptyArray) !==
          comparableValue(currentRecord[field], nullAsEmptyArray)
        );
      }),
    )
    .map(([group]) => group);
}

export function hasMaterialPageReviewChanges(
  normalized: ReturnType<typeof normalizePageReviewInput>,
  current: PageReview,
) {
  return semanticChangedReviewFields(normalized, current).length > 0;
}
