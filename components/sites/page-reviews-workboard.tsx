"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronRight,
  ExternalLink,
  FileSearch,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CHANGE_STATE_OPTIONS,
  CHANGE_BLAST_RADIUS_OPTIONS,
  CHANGE_SCOPE_OPTIONS,
  DECISION_STATE_OPTIONS,
  DIFFERENTIATION_EVIDENCE_OPTIONS,
  EVIDENCE_STATE_OPTIONS,
  EXPERIMENT_STATE_OPTIONS,
  GA4_BASELINE_METHOD_OPTIONS,
  GA4_KPI_METRIC_OPTIONS,
  GATE_STATUS_OPTIONS,
  GSC_BASELINE_METHOD_OPTIONS,
  GSC_KPI_METRIC_OPTIONS,
  GOOGLE_TRENDS_DIRECTION_OPTIONS,
  GOOGLE_TRENDS_METHOD_OPTIONS,
  INDEX_POLICIES,
  INTENT_OPTIONS,
  KEYWORD_OWNERSHIP_OPTIONS,
  KEYWORD_PLANNER_METHOD_OPTIONS,
  KEYWORD_PLANNER_NETWORK_OPTIONS,
  MANUAL_CHAT_STATE_OPTIONS,
  MEASUREMENT_KPI_DIRECTION_OPTIONS,
  MEASUREMENT_KPI_SOURCE_OPTIONS,
  PAGE_FAMILIES,
  PAGE_REVIEW_PRIORITIES,
  PAGE_REVIEW_STATUSES,
  PERFORMANCE_STATE_OPTIONS,
  PAID_ADVERTISER_COMPETITION_OPTIONS,
  SERP_DEVICE_OPTIONS,
  SERP_COMPETITION_OPTIONS,
  SERP_METHOD_OPTIONS,
  emptyEeatEvidenceDetail,
  emptyMeasurementComparisonWindow,
  isActiveManualState,
  isApprovedManualState,
  matchesPageReviewFilters,
  normalizePageReview,
  normalizePageReviewSummary,
  pageReviewDraftStorageKey,
  pageReviewPatchInput,
  inspectPageReviewDraft,
  serializePageReviewDraft,
  shouldConfirmRouteNavigation,
  validatePageReview,
  type PageReviewFilters,
  type PageReviewRecord,
  type PageReviewSummary,
  type EeatEvidenceDetail,
  type GoogleTrendsEvidence,
  type KeywordPlannerEvidence,
  type Ga4BaselineEvidence,
  type GscBaselineEvidence,
  type MeasurementPlanEvidence,
  type MeasurementComparisonWindow,
  type ReviewGate,
  type SerpCompetitor,
} from "@/lib/page-review-workboard";

type Props = {
  siteId: string;
  domain: string;
};

type PlannerCheckResponse = {
  source: "google_ads_keyword_planner";
  query: string;
  checkedAt: string;
  targeting: {
    languageConstantId: string;
    geoTargetConstantIds: string[];
    network: "GOOGLE_SEARCH";
  };
  keywords: Array<{
    keyword: string;
    averageMonthlySearches: number | null;
    monthlySearchVolumes: Array<{ year: number; month: string; searches: number }>;
    advertiserCompetition: "low" | "medium" | "high" | "unspecified" | null;
    advertiserCompetitionIndex: number | null;
    lowTopOfPageBidMicros: number | null;
    highTopOfPageBidMicros: number | null;
  }>;
};

const EMPTY_FILTERS: PageReviewFilters = {
  query: "",
  status: "",
  family: "",
  priority: "",
  cluster: "",
};

const SECTION_LINKS = [
  ["record", "Record"],
  ["keywords", "Keywords"],
  ["google-demand", "Google demand"],
  ["topic", "Topic"],
  ["intent", "Intent"],
  ["serp", "SERP"],
  ["offer", "Offer"],
  ["eeat", "E-E-A-T"],
  ["measurement", "Measurement"],
  ["decision", "Decision"],
  ["gates", "Gates"],
  ["notes", "Notes"],
] as const;

function getReviews(payload: unknown): PageReviewSummary[] {
  if (Array.isArray(payload)) return payload.map(normalizePageReviewSummary);
  if (payload && typeof payload === "object") {
    const reviews = (payload as { items?: unknown; reviews?: unknown }).items ??
      (payload as { reviews?: unknown }).reviews;
    if (Array.isArray(reviews)) return reviews.map(normalizePageReviewSummary);
  }
  return [];
}

function humanize(value: string) {
  if (/^p\d$/i.test(value)) return value.toUpperCase();
  if (!value) return "Not recorded";
  return value.replaceAll("_", " ");
}

function toLocalDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function googleTrendsUrl(query: string) {
  const url = new URL("https://trends.google.com/trends/explore");
  url.searchParams.set("geo", "US");
  if (query.trim()) url.searchParams.set("q", query.trim());
  return url.toString();
}

function normalizedUiQuery(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

const GOOGLE_MONTH_NUMBER = new Map(
  [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ].map((month, index) => [month, index + 1]),
);

function readSessionDraft(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionDraft(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Draft recovery is best effort; the editor remains usable when storage is unavailable.
  }
}

function clearSessionDraft(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Draft recovery is best effort; saving and resetting must still succeed.
  }
}

export function PageReviewsWorkboard({ siteId, domain }: Props) {
  const [reviews, setReviews] = useState<PageReviewSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<PageReviewRecord | null>(null);
  const [savedDraft, setSavedDraft] = useState<PageReviewRecord | null>(null);
  const [filters, setFilters] = useState<PageReviewFilters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [plannerChecking, setPlannerChecking] = useState(false);
  const [plannerError, setPlannerError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [staleDraft, setStaleDraft] = useState<{
    baseVersion: number;
    draft: PageReviewRecord;
  } | null>(null);
  const allowNavigationRef = useRef(false);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/sites/${siteId}/page-reviews?limit=1000&offset=0`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? String(payload.error)
            : "Could not load page reviews.",
        );
      }

      const nextReviews = getReviews(payload);
      setReviews(nextReviews);
      setTotal(
        payload && typeof payload === "object" && "total" in payload && typeof payload.total === "number"
          ? payload.total
          : nextReviews.length,
      );
      setSelectedId((current) => {
        if (current && nextReviews.some((review) => review.id === current)) return current;
        return nextReviews[0]?.id ?? "";
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load page reviews.");
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    if (!dirty) {
      allowNavigationRef.current = false;
      return;
    }

    function confirmBeforeLeaving(event: BeforeUnloadEvent) {
      if (allowNavigationRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }

    function confirmRouteClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) {
        return;
      }
      if (!shouldConfirmRouteNavigation(window.location.href, link.href)) return;
      if (window.confirm("Leave this page and keep the unsaved draft for later?")) {
        allowNavigationRef.current = true;
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    function confirmHistoryNavigation() {
      if (allowNavigationRef.current) return;
      if (window.confirm("Leave this page and keep the unsaved draft for later?")) {
        allowNavigationRef.current = true;
        return;
      }
      allowNavigationRef.current = true;
      window.history.forward();
      window.setTimeout(() => {
        allowNavigationRef.current = false;
      }, 0);
    }

    window.addEventListener("beforeunload", confirmBeforeLeaving);
    document.addEventListener("click", confirmRouteClick, true);
    window.addEventListener("popstate", confirmHistoryNavigation);
    return () => {
      window.removeEventListener("beforeunload", confirmBeforeLeaving);
      document.removeEventListener("click", confirmRouteClick, true);
      window.removeEventListener("popstate", confirmHistoryNavigation);
    };
  }, [dirty]);

  useEffect(() => {
    if (!dirty || !draft?.id) return;
    writeSessionDraft(pageReviewDraftStorageKey(siteId, draft.id), serializePageReviewDraft(draft));
  }, [dirty, draft, siteId]);

  useEffect(() => {
    if (!selectedId) return;

    const controller = new AbortController();
    async function loadDetail() {
      setDetailLoading(true);
      setDetailError("");
      setDraft(null);
      setSavedDraft(null);
      setDirty(false);
      setValidationErrors([]);
      setStaleDraft(null);
      setNotice("");
      setPlannerError("");
      try {
        const response = await fetch(`/api/sites/${siteId}/page-reviews/${selectedId}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            payload && typeof payload === "object" && "error" in payload
              ? String(payload.error)
              : "Could not load this page review.",
          );
        }
        const review = normalizePageReview(
          payload && typeof payload === "object" && "review" in payload ? payload.review : payload,
        );
        const storageKey = pageReviewDraftStorageKey(siteId, review.id);
        const storedValue = readSessionDraft(storageKey);
        const recovery = storedValue ? inspectPageReviewDraft(storedValue, review) : null;
        if (recovery?.status === "invalid") clearSessionDraft(storageKey);
        setDraft(recovery?.status === "current" ? recovery.draft : review);
        setSavedDraft(structuredClone(review));
        if (recovery?.status === "current") {
          setDirty(true);
          setNotice("Recovered unsaved changes from this browser. Review them before saving.");
        } else if (recovery?.status === "stale") {
          setStaleDraft({ baseVersion: recovery.baseVersion, draft: recovery.draft });
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setDetailError(
            loadError instanceof Error ? loadError.message : "Could not load this page review.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setDetailLoading(false);
      }
    }

    void loadDetail();
    return () => controller.abort();
  }, [detailReloadKey, selectedId, siteId]);

  const clusters = useMemo(
    () =>
      [...new Set(reviews.map((review) => review.topicCluster).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [reviews],
  );

  const filteredReviews = useMemo(
    () => reviews.filter((review) => matchesPageReviewFilters(review, filters)),
    [filters, reviews],
  );

  function updateField<K extends keyof PageReviewRecord>(field: K, value: PageReviewRecord[K]) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
    setDirty(true);
    setNotice("");
  }

  function updateReviewStatus(value: string) {
    if (value !== "monitoring") {
      updateField("status", value);
      return;
    }
    setDraft((current) =>
      current ? { ...current, status: "monitoring", manualChatState: "monitoring" } : current,
    );
    setDirty(true);
    setNotice("");
  }

  function updateManualChatState(value: string) {
    if (value !== "monitoring") {
      updateField("manualChatState", value);
      return;
    }
    setDraft((current) =>
      current ? { ...current, status: "monitoring", manualChatState: "monitoring" } : current,
    );
    setDirty(true);
    setNotice("");
  }

  function updateChangeBlastRadius(value: string) {
    setDraft((current) => {
      if (!current) return current;
      if (["shared_template", "mixed"].includes(value)) {
        const familyCount = reviews.filter(
          (review) => review.pageFamily === current.pageFamily,
        ).length;
        return {
          ...current,
          changeBlastRadius: value,
          affectedPageFamily: current.pageFamily,
          affectedCanonicalCount: String(familyCount),
          blastRadiusNote:
            current.blastRadiusNote ||
            (value === "mixed"
              ? `Apply the shared ${humanize(current.pageFamily)} template change to all ${familyCount} current canonicals and record the page-local evidence separately.`
              : `Apply the shared ${humanize(current.pageFamily)} template change to all ${familyCount} current canonicals.`),
        };
      }
      if (value === "page_local") {
        return {
          ...current,
          changeBlastRadius: value,
          affectedPageFamily: "",
          affectedCanonicalCount: "1",
        };
      }
      if (value === "not_applicable") {
        return {
          ...current,
          changeBlastRadius: value,
          affectedPageFamily: "",
          affectedCanonicalCount: "",
          blastRadiusNote: "",
        };
      }
      return { ...current, changeBlastRadius: value };
    });
    setDirty(true);
    setNotice("");
  }

  function updateCompetitor(index: number, field: keyof SerpCompetitor, value: string) {
    if (!draft) return;
    const serpTopFive = draft.serpTopFive.map((competitor, competitorIndex) =>
      competitorIndex === index ? { ...competitor, [field]: value } : competitor,
    );
    updateField("serpTopFive", serpTopFive);
  }

  function updateGate(key: "day7" | "day28" | "day56", field: keyof ReviewGate, value: string) {
    if (!draft) return;
    updateField(key, { ...draft[key], [field]: value });
  }

  function updateEeatDetail(index: number, field: keyof EeatEvidenceDetail, value: string) {
    if (!draft) return;
    const eeatDetails = draft.eeatDetails.map((detail, detailIndex) =>
      detailIndex === index ? { ...detail, [field]: value } : detail,
    );
    updateField("eeatDetails", eeatDetails);
  }

  function updateKeywordPlanner(field: keyof KeywordPlannerEvidence, value: string) {
    if (!draft) return;
    updateField("keywordPlanner", { ...draft.keywordPlanner, [field]: value });
  }

  function updateGoogleTrends(field: keyof GoogleTrendsEvidence, value: string) {
    if (!draft) return;
    updateField("googleTrends", { ...draft.googleTrends, [field]: value });
  }

  function updateMeasurementPlan(
    field: Exclude<keyof MeasurementPlanEvidence, "gsc" | "ga4">,
    value: string,
  ) {
    if (!draft) return;
    updateField("measurementPlan", { ...draft.measurementPlan, [field]: value });
  }

  function updateMeasurementPlanState(value: string) {
    if (!draft) return;
    updateField("measurementPlan", {
      ...draft.measurementPlan,
      evidenceState: value,
      notApplicableReason:
        value === "not_applicable"
          ? draft.measurementPlan.notApplicableReason
          : "",
    });
  }

  function updateGscBaseline(field: keyof GscBaselineEvidence, value: string) {
    if (!draft) return;
    updateField("measurementPlan", {
      ...draft.measurementPlan,
      gsc: { ...draft.measurementPlan.gsc, [field]: value },
    });
  }

  function updateGscBaselineState(value: string) {
    if (!draft) return;
    updateField("measurementPlan", {
      ...draft.measurementPlan,
      gsc: {
        ...draft.measurementPlan.gsc,
        evidenceState: value,
        notApplicableReason:
          value === "not_applicable"
            ? draft.measurementPlan.gsc.notApplicableReason
            : "",
      },
    });
  }

  function updateGa4Baseline(field: keyof Ga4BaselineEvidence, value: string) {
    if (!draft) return;
    updateField("measurementPlan", {
      ...draft.measurementPlan,
      ga4: { ...draft.measurementPlan.ga4, [field]: value },
    });
  }

  function updateGa4BaselineState(value: string) {
    if (!draft) return;
    updateField("measurementPlan", {
      ...draft.measurementPlan,
      ga4: {
        ...draft.measurementPlan.ga4,
        evidenceState: value,
        notApplicableReason:
          value === "not_applicable"
            ? draft.measurementPlan.ga4.notApplicableReason
            : "",
      },
    });
  }

  function updatePrimaryKpiSource(value: string) {
    if (!draft) return;
    const validMetrics = value === "gsc" ? GSC_KPI_METRIC_OPTIONS : GA4_KPI_METRIC_OPTIONS;
    updateField("measurementPlan", {
      ...draft.measurementPlan,
      primaryKpiSource: value,
      primaryKpiMetric: validMetrics.includes(
        draft.measurementPlan.primaryKpiMetric as never,
      )
        ? draft.measurementPlan.primaryKpiMetric
        : "",
    });
  }

  function addMeasurementComparisonWindow() {
    if (!draft) return;
    updateField("measurementPlan", {
      ...draft.measurementPlan,
      comparisonWindows: [
        ...draft.measurementPlan.comparisonWindows,
        emptyMeasurementComparisonWindow(),
      ],
    });
  }

  function updateMeasurementComparisonWindow(
    index: number,
    field: keyof MeasurementComparisonWindow,
    value: string,
  ) {
    if (!draft) return;
    updateField("measurementPlan", {
      ...draft.measurementPlan,
      comparisonWindows: draft.measurementPlan.comparisonWindows.map(
        (window, windowIndex) =>
          windowIndex === index ? { ...window, [field]: value } : window,
      ),
    });
  }

  function removeMeasurementComparisonWindow(index: number) {
    if (!draft) return;
    updateField("measurementPlan", {
      ...draft.measurementPlan,
      comparisonWindows: draft.measurementPlan.comparisonWindows.filter(
        (_, windowIndex) => windowIndex !== index,
      ),
    });
  }

  async function checkKeywordPlanner() {
    if (!draft?.primaryQuery.trim() || plannerChecking) return;
    setPlannerChecking(true);
    setPlannerError("");
    setNotice("");
    try {
      const response = await fetch(`/api/sites/${siteId}/keyword-research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: draft.primaryQuery,
          pageUrl: draft.canonicalUrl,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | PlannerCheckResponse
        | { error?: unknown }
        | null;
      if (!response.ok || !payload || !("keywords" in payload)) {
        throw new Error(
          payload && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Google Keyword Planner could not complete this check.",
        );
      }

      const exactQuery = normalizedUiQuery(payload.query);
      const result =
        payload.keywords.find((keyword) => normalizedUiQuery(keyword.keyword) === exactQuery) ??
        payload.keywords[0];
      if (!result) {
        throw new Error("Google Keyword Planner returned no keyword evidence for this query.");
      }
      const completeMetrics =
        result.averageMonthlySearches !== null && result.advertiserCompetition !== null;
      const monthlySearches = result.monthlySearchVolumes.flatMap((month) => {
        const monthNumber = GOOGLE_MONTH_NUMBER.get(month.month.toLowerCase());
        return monthNumber
          ? [{ year: month.year, month: monthNumber, searches: month.searches }]
          : [];
      });
      const keywordPlanner: KeywordPlannerEvidence = {
        ...draft.keywordPlanner,
        evidenceState: completeMetrics ? "verified" : "partial",
        query: payload.query,
        checkedAt: payload.checkedAt,
        method: "google_ads_api",
        sourceUrl:
          "https://developers.google.com/google-ads/api/docs/keyword-planning/generate-keyword-ideas",
        geoTarget: payload.targeting.geoTargetConstantIds.join(", "),
        language: payload.targeting.languageConstantId,
        network: "google_search",
        averageMonthlySearches:
          result.averageMonthlySearches === null ? "" : String(result.averageMonthlySearches),
        monthlySearches,
        paidAdvertiserCompetition:
          result.advertiserCompetition === "unspecified"
            ? "unknown"
            : (result.advertiserCompetition ?? ""),
        paidAdvertiserCompetitionIndex:
          result.advertiserCompetitionIndex === null
            ? ""
            : String(result.advertiserCompetitionIndex),
        lowTopOfPageBidMicros:
          result.lowTopOfPageBidMicros === null ? "" : String(result.lowTopOfPageBidMicros),
        highTopOfPageBidMicros:
          result.highTopOfPageBidMicros === null ? "" : String(result.highTopOfPageBidMicros),
        limitation: completeMetrics
          ? "Google Ads Keyword Planner estimates are rounded and describe paid-search demand, not organic ranking difficulty."
          : "Google did not return a complete volume or advertiser-competition estimate. Missing values are unknown, not zero.",
        notApplicableReason: "",
      };
      setDraft((current) => (current ? { ...current, keywordPlanner } : current));
      setDirty(true);
      setNotice(
        "Keyword Planner evidence was copied into this unsaved review. It did not choose ownership, approve, save, or publish anything.",
      );
    } catch (plannerCheckError) {
      setPlannerError(
        plannerCheckError instanceof Error
          ? plannerCheckError.message
          : "Google Keyword Planner could not complete this check.",
      );
    } finally {
      setPlannerChecking(false);
    }
  }

  function addEeatDetail() {
    if (!draft) return;
    updateField("eeatDetails", [...draft.eeatDetails, emptyEeatEvidenceDetail()]);
  }

  function removeEeatDetail(index: number) {
    if (!draft) return;
    updateField(
      "eeatDetails",
      draft.eeatDetails.filter((_, detailIndex) => detailIndex !== index),
    );
  }

  function selectReview(id: string) {
    if (id === selectedId) return;
    if (dirty && !window.confirm("Discard the unsaved changes for this review?")) return;
    setSelectedId(id);
  }

  function resetDraft() {
    if (!savedDraft) return;
    clearSessionDraft(pageReviewDraftStorageKey(siteId, savedDraft.id));
    setStaleDraft(null);
    setDraft(structuredClone(savedDraft));
    setDirty(false);
    setValidationErrors([]);
    setNotice("Unsaved changes were reset.");
  }

  function restoreStaleDraft() {
    if (!staleDraft) return;
    setDraft(staleDraft.draft);
    setDirty(true);
    setStaleDraft(null);
    setValidationErrors([]);
    setNotice(
      "Older draft restored against the current server version. Compare every field before saving.",
    );
  }

  function discardStaleDraft() {
    if (!staleDraft) return;
    clearSessionDraft(pageReviewDraftStorageKey(siteId, staleDraft.draft.id));
    setStaleDraft(null);
    setNotice("Older browser draft discarded. The current server record is unchanged.");
  }

  async function saveDraft() {
    if (!draft) return;
    const errors = validatePageReview(draft);
    setValidationErrors(errors);
    if (errors.length > 0) return;

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/sites/${siteId}/page-reviews/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pageReviewPatchInput(draft)),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? String(payload.error)
            : "Could not save this review.",
        );
      }

      const saved = normalizePageReview(
        payload && typeof payload === "object" && "review" in payload
          ? payload.review
          : payload,
      );
      clearSessionDraft(pageReviewDraftStorageKey(siteId, draft.id));
      setStaleDraft(null);
      setReviews((current) =>
        current.map((review) =>
          review.id === saved.id ? normalizePageReviewSummary(saved) : review,
        ),
      );
      setDraft(saved);
      setSavedDraft(structuredClone(saved));
      setDirty(false);
      setNotice(
        isApprovedManualState(saved.manualChatState)
          ? "Approved review saved. No content was scheduled or published."
          : "Draft saved. No content was scheduled or published.",
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{domain}</p>
          <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">Page reviews</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review one canonical page at a time. Search the full inventory, open one record, and save human evidence.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-2 rounded-full bg-primary" />
          {total.toLocaleString()} manual records
        </div>
      </div>

      <div className="flex items-start gap-3 border-l-2 border-primary bg-primary/5 px-4 py-3 text-sm">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-primary" />
        <div>
          <p className="font-medium text-foreground">Manual only</p>
          <p className="text-muted-foreground">
            Nothing here is reviewed, scheduled, changed, or published automatically. Saving updates this evidence record only.
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4" />
          <span>{error}</span>
          <Button type="button" variant="ghost" size="xs" className="ml-auto" onClick={() => void loadReviews()}>
            Retry
          </Button>
        </div>
      )}

      <div className="min-h-[720px] overflow-hidden rounded-2xl border border-border bg-card xl:grid xl:grid-cols-[440px_minmax(0,1fr)]">
        <aside className="border-b border-border xl:border-b-0 xl:border-r">
          <div className="space-y-3 border-b border-border bg-card p-4">
            <label className="relative block">
              <span className="sr-only">Search page reviews</span>
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <input
                value={filters.query}
                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                placeholder="Search URL, page ID, keyword, cluster…"
                className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <FilterSelect
                label="Status"
                value={filters.status}
                options={PAGE_REVIEW_STATUSES}
                onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
              />
              <FilterSelect
                label="Family"
                value={filters.family}
                options={PAGE_FAMILIES}
                onChange={(value) => setFilters((current) => ({ ...current, family: value }))}
              />
              <FilterSelect
                label="Priority"
                value={filters.priority}
                options={PAGE_REVIEW_PRIORITIES}
                onChange={(value) => setFilters((current) => ({ ...current, priority: value }))}
              />
              <FilterSelect
                label="Cluster"
                value={filters.cluster}
                options={clusters}
                onChange={(value) => setFilters((current) => ({ ...current, cluster: value }))}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{filteredReviews.length.toLocaleString()} of {total.toLocaleString()} pages</span>
              {Object.values(filters).some(Boolean) && (
                <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="font-medium text-primary hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[640px] overflow-auto xl:h-[calc(100vh-330px)] xl:max-h-none">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading reviews…
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <FileSearch className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 font-medium">No matching pages</p>
                <p className="mt-1 text-sm text-muted-foreground">Clear a filter or search for another canonical URL.</p>
              </div>
            ) : (
              <table className="w-full table-fixed text-left text-xs">
                <thead className="sticky top-0 z-10 bg-muted/95 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground backdrop-blur">
                  <tr className="border-b border-border">
                    <th className="w-[55%] px-4 py-2.5">Page / cluster</th>
                    <th className="w-[31%] px-2 py-2.5">Review / chat</th>
                    <th className="w-[14%] px-2 py-2.5">Pri.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredReviews.map((review) => {
                    const selected = review.id === selectedId;
                    return (
                      <tr
                        key={review.id}
                        aria-selected={selected}
                        className={cn(
                          "group cursor-pointer transition-colors hover:bg-muted/45",
                          selected && "bg-primary/10 hover:bg-primary/10",
                        )}
                        onClick={() => selectReview(review.id)}
                      >
                        <td className="px-4 py-3 align-top">
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={(event) => {
                              event.stopPropagation();
                              selectReview(review.id);
                            }}
                          >
                            <span className="block truncate font-medium text-foreground">{review.pageId || review.canonicalUrl}</span>
                            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                              {humanize(review.pageFamily)} · {review.topicCluster || "No cluster"}
                            </span>
                          </button>
                        </td>
                        <td className="px-2 py-3 align-top">
                          <div className="flex flex-col items-start gap-1">
                            <StatusChip value={review.reviewStatus} />
                            <ManualStateChip value={review.manualChatState} />
                          </div>
                        </td>
                        <td className="px-2 py-3 align-top font-data font-semibold text-foreground">
                          <span className="inline-flex items-center gap-1">
                            {humanize(review.priority)}
                            <ChevronRight className={cn("size-3 text-muted-foreground opacity-0", selected && "opacity-100")} />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </aside>

        <main className="min-w-0 bg-background/35">
          {detailLoading ? (
            <div className="flex min-h-[640px] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading the full review…
            </div>
          ) : detailError ? (
            <div className="flex min-h-[640px] items-center justify-center p-8 text-center">
              <div>
                <AlertCircle className="mx-auto size-7 text-destructive" />
                <p className="mt-3 font-medium">Could not open this review</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">{detailError}</p>
                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setDetailReloadKey((value) => value + 1)}>
                  Retry
                </Button>
              </div>
            </div>
          ) : !draft ? (
            <div className="flex min-h-[640px] items-center justify-center p-8 text-center">
              <div>
                <FileSearch className="mx-auto size-7 text-muted-foreground" />
                <p className="mt-3 font-medium">Choose one page to review</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  The editor opens one canonical record at a time. There are no bulk changes on this workboard.
                </p>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void saveDraft();
              }}
            >
              <div className="sticky top-0 z-20 border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{draft.pageId || "Untitled page record"}</p>
                    <p className="truncate text-xs text-muted-foreground">{draft.canonicalUrl}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {dirty && <span className="text-xs text-warning">Unsaved changes</span>}
                    <Button type="button" variant="ghost" size="sm" disabled={!dirty || saving} onClick={resetDraft}>
                      <RotateCcw /> Reset
                    </Button>
                    <Button type="submit" size="sm" disabled={!dirty || saving}>
                      {saving ? <Loader2 className="animate-spin" /> : <Save />}
                      Save review
                    </Button>
                  </div>
                </div>
                <nav aria-label="Review sections" className="mt-3 flex gap-1 overflow-x-auto pb-0.5">
                  {SECTION_LINKS.map(([id, label]) => (
                    <a key={id} href={`#review-${id}`} className="whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                      {label}
                    </a>
                  ))}
                </nav>
              </div>

              <div className="p-5 sm:p-6">
                {staleDraft && (
                  <div role="alert" className="mb-5 border-l-2 border-warning bg-warning/10 px-4 py-3 text-sm text-foreground">
                    <p className="font-medium">An older unsaved draft is still available</p>
                    <p className="mt-1 text-muted-foreground">
                      It was based on version {staleDraft.baseVersion}; the server is now on version {draft.version}. It was not applied or deleted.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={restoreStaleDraft}>
                        Restore for comparison
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={discardStaleDraft}>
                        Discard older draft
                      </Button>
                    </div>
                  </div>
                )}
                {validationErrors.length > 0 && (
                  <div role="alert" className="mb-5 border-l-2 border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <p className="font-medium">Fix these fields before saving</p>
                    <ul className="mt-1 list-disc pl-4">
                      {validationErrors.map((message) => <li key={message}>{message}</li>)}
                    </ul>
                  </div>
                )}
                {notice && (
                  <div role="status" className="mb-5 flex items-center gap-2 border-l-2 border-signal bg-signal-muted px-4 py-3 text-sm text-signal">
                    <Check className="size-4" /> {notice}
                  </div>
                )}

                <EditorSection id="record" index="01" title="Record control" description="Canonical identity, eligibility, and queue state.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField label="Page ID" value={draft.pageId} onChange={() => undefined} readOnly />
                    <TextField label="Canonical URL" value={draft.canonicalUrl} onChange={() => undefined} readOnly copyable />
                    <SelectField label="Page family" value={draft.pageFamily} options={PAGE_FAMILIES} onChange={(value) => updateField("pageFamily", value)} />
                    <SelectField label="Index policy" value={draft.indexPolicy} options={INDEX_POLICIES} onChange={(value) => updateField("indexPolicy", value)} />
                    <SelectField label="Review status" value={draft.status} options={PAGE_REVIEW_STATUSES} onChange={updateReviewStatus} />
                    <SelectField label="Priority" value={draft.priority} options={PAGE_REVIEW_PRIORITIES} onChange={(value) => updateField("priority", value)} />
                    <SelectField label="Manual collaboration state" value={draft.manualChatState} options={MANUAL_CHAT_STATE_OPTIONS} onChange={updateManualChatState} />
                    <TextField label="User decision reference" value={draft.userDecisionReference} onChange={(value) => updateField("userDecisionReference", value)} placeholder="Task, message, or dated approval reference" />
                  </div>
                </EditorSection>

                <EditorSection id="keywords" index="02" title="Keyword ownership" description="One intent owner, or a clear reason no keyword applies.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField label="Ownership decision" value={draft.keywordOwner} options={KEYWORD_OWNERSHIP_OPTIONS} onChange={(value) => updateField("keywordOwner", value)} />
                    <TextField label="Primary query" value={draft.primaryQuery} onChange={(value) => updateField("primaryQuery", value)} placeholder="Exact reviewed query" />
                    <div className="sm:col-span-2">
                      <TextField label="Keyword owner canonical" value={draft.ownerCanonical} onChange={(value) => updateField("ownerCanonical", value)} placeholder="Required only when another canonical owns this query" />
                    </div>
                    <TextArea label="Secondary queries" value={draft.secondaryQueries} onChange={(value) => updateField("secondaryQueries", value)} hint="One per line; these stay with the same intent owner." />
                    <TextArea label="Not-applicable reason" value={draft.notApplicableReason} onChange={(value) => updateField("notApplicableReason", value)} required={draft.keywordOwner === "not_applicable"} hint="Required when ownership is not applicable." />
                  </div>
                </EditorSection>

                <EditorSection
                  id="google-demand"
                  index="03"
                  title="Google demand checks"
                  description="Check the exact primary query. Keyword Planner shows ad-market demand, not organic difficulty. Trends shows relative interest, not search volume."
                >
                  <div className="grid gap-8 xl:grid-cols-2">
                    <section aria-labelledby="keyword-planner-title" className="border-t-2 border-primary pt-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 id="keyword-planner-title" className="font-heading text-base font-semibold text-foreground">
                            Google Keyword Planner
                          </h3>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Run this only while reviewing this page. Google&apos;s competition and bid fields describe paid advertisers, not organic results.
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={!draft.primaryQuery.trim() || plannerChecking}
                            onClick={() => void checkKeywordPlanner()}
                          >
                            {plannerChecking ? <Loader2 className="animate-spin" /> : <Search />}
                            Check Planner now
                          </Button>
                          <a
                            href={`/sites/${siteId}/keyword-research?query=${encodeURIComponent(draft.primaryQuery)}&pageUrl=${encodeURIComponent(draft.canonicalUrl)}`}
                            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-input px-3 text-xs font-medium text-foreground hover:bg-muted"
                          >
                            Full keyword tool <ExternalLink className="size-3.5" aria-hidden="true" />
                          </a>
                        </div>
                      </div>
                      {plannerError && (
                        <p role="alert" className="mt-3 border-l-2 border-destructive bg-destructive/10 px-3 py-2 text-xs text-destructive">
                          {plannerError}
                        </p>
                      )}
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <SelectField label="Evidence state" value={draft.keywordPlanner.evidenceState} options={EVIDENCE_STATE_OPTIONS} onChange={(value) => updateKeywordPlanner("evidenceState", value)} />
                        <SelectField label="Check method" value={draft.keywordPlanner.method} options={["", ...KEYWORD_PLANNER_METHOD_OPTIONS]} onChange={(value) => updateKeywordPlanner("method", value)} />
                        <TextField label="Exact query checked" value={draft.keywordPlanner.query} onChange={(value) => updateKeywordPlanner("query", value)} placeholder={draft.primaryQuery || "Exact primary query"} />
                        <TextField label="Checked at" type="datetime-local" value={toLocalDateTime(draft.keywordPlanner.checkedAt)} onChange={(value) => updateKeywordPlanner("checkedAt", value)} />
                        <div className="sm:col-span-2">
                          <TextField label="Official Google source URL" value={draft.keywordPlanner.sourceUrl} onChange={(value) => updateKeywordPlanner("sourceUrl", value)} placeholder="https://ads.google.com/aw/keywordplanner/…" />
                        </div>
                        <TextField label="Location target" value={draft.keywordPlanner.geoTarget} onChange={(value) => updateKeywordPlanner("geoTarget", value)} placeholder="United States or Google geo ID" />
                        <TextField label="Language" value={draft.keywordPlanner.language} onChange={(value) => updateKeywordPlanner("language", value)} placeholder="English" />
                        <SelectField label="Google search network" value={draft.keywordPlanner.network} options={["", ...KEYWORD_PLANNER_NETWORK_OPTIONS]} onChange={(value) => updateKeywordPlanner("network", value)} />
                        <TextField label="Average monthly searches" type="number" value={draft.keywordPlanner.averageMonthlySearches} onChange={(value) => updateKeywordPlanner("averageMonthlySearches", value)} placeholder="Blank means unknown, not zero" />
                        <SelectField label="Paid advertiser competition" value={draft.keywordPlanner.paidAdvertiserCompetition} options={["", ...PAID_ADVERTISER_COMPETITION_OPTIONS]} onChange={(value) => updateKeywordPlanner("paidAdvertiserCompetition", value)} />
                        <TextField label="Paid competition index" type="number" value={draft.keywordPlanner.paidAdvertiserCompetitionIndex} onChange={(value) => updateKeywordPlanner("paidAdvertiserCompetitionIndex", value)} />
                        <TextField label="Low top-of-page bid (micros)" type="number" value={draft.keywordPlanner.lowTopOfPageBidMicros} onChange={(value) => updateKeywordPlanner("lowTopOfPageBidMicros", value)} />
                        <TextField label="High top-of-page bid (micros)" type="number" value={draft.keywordPlanner.highTopOfPageBidMicros} onChange={(value) => updateKeywordPlanner("highTopOfPageBidMicros", value)} />
                        <div className="sm:col-span-2">
                          <TextArea label="Limitation" value={draft.keywordPlanner.limitation} onChange={(value) => updateKeywordPlanner("limitation", value)} hint="Required for partial evidence. Missing volume is unknown, not zero." compact />
                        </div>
                        {draft.keywordPlanner.evidenceState === "not_applicable" && (
                          <div className="sm:col-span-2">
                            <TextArea label="Why Planner is not applicable" value={draft.keywordPlanner.notApplicableReason} onChange={(value) => updateKeywordPlanner("notApplicableReason", value)} required compact />
                          </div>
                        )}
                      </div>
                      {draft.keywordPlanner.monthlySearches.length > 0 && (
                        <div className="mt-5 border-y border-border py-4">
                          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Monthly search history</p>
                          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
                            {draft.keywordPlanner.monthlySearches.map((month) => (
                              <div key={`${month.year}-${month.month}`} className="flex justify-between gap-3 border-b border-border/60 pb-1">
                                <span>{month.year}-{String(month.month).padStart(2, "0")}</span>
                                <span className="font-data font-semibold text-foreground">{month.searches.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </section>

                    <section aria-labelledby="google-trends-title" className="border-t-2 border-primary pt-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 id="google-trends-title" className="font-heading text-base font-semibold text-foreground">Google Trends</h3>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Google&apos;s official Trends API is limited alpha. Until access is approved, open the official tool and record the manual check here.
                          </p>
                        </div>
                        <a
                          href={googleTrendsUrl(draft.primaryQuery)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-input px-3 text-xs font-medium text-foreground hover:bg-muted"
                        >
                          Open Google Trends <ExternalLink className="size-3.5" aria-hidden="true" />
                          <span className="sr-only"> in a new tab</span>
                        </a>
                      </div>
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <SelectField label="Evidence state" value={draft.googleTrends.evidenceState} options={EVIDENCE_STATE_OPTIONS} onChange={(value) => updateGoogleTrends("evidenceState", value)} />
                        <SelectField label="Check method" value={draft.googleTrends.method} options={["", ...GOOGLE_TRENDS_METHOD_OPTIONS]} onChange={(value) => updateGoogleTrends("method", value)} />
                        <TextField label="Exact query checked" value={draft.googleTrends.query} onChange={(value) => updateGoogleTrends("query", value)} placeholder={draft.primaryQuery || "Exact primary query"} />
                        <TextField label="Checked at" type="datetime-local" value={toLocalDateTime(draft.googleTrends.checkedAt)} onChange={(value) => updateGoogleTrends("checkedAt", value)} />
                        <div className="sm:col-span-2">
                          <TextField label="Official Google Trends URL" value={draft.googleTrends.sourceUrl} onChange={(value) => updateGoogleTrends("sourceUrl", value)} placeholder={googleTrendsUrl(draft.primaryQuery)} />
                        </div>
                        <TextField label="Geography" value={draft.googleTrends.geo} onChange={(value) => updateGoogleTrends("geo", value)} placeholder="United States" />
                        <TextField label="Timeframe" value={draft.googleTrends.timeframe} onChange={(value) => updateGoogleTrends("timeframe", value)} placeholder="Past 5 years" />
                        <SelectField label="Observed direction" value={draft.googleTrends.direction} options={["", ...GOOGLE_TRENDS_DIRECTION_OPTIONS]} onChange={(value) => updateGoogleTrends("direction", value)} />
                        <TextArea label="Comparison queries" value={draft.googleTrends.comparisonQueries} onChange={(value) => updateGoogleTrends("comparisonQueries", value)} hint="One exact comparison term per line." compact />
                        <div className="sm:col-span-2">
                          <TextArea label="Finding" value={draft.googleTrends.finding} onChange={(value) => updateGoogleTrends("finding", value)} hint="State direction or seasonality. Trends values are relative interest, not volume." compact />
                        </div>
                        <div className="sm:col-span-2">
                          <TextArea label="Limitation" value={draft.googleTrends.limitation} onChange={(value) => updateGoogleTrends("limitation", value)} hint="Required for partial evidence; use insufficient data when the niche term has no chart." compact />
                        </div>
                        {draft.googleTrends.evidenceState === "not_applicable" && (
                          <div className="sm:col-span-2">
                            <TextArea label="Why Trends is not applicable" value={draft.googleTrends.notApplicableReason} onChange={(value) => updateGoogleTrends("notApplicableReason", value)} required compact />
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </EditorSection>

                <EditorSection id="topic" index="04" title="Topical authority" description="Place the page in a maintainable cluster instead of creating isolated content.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField label="Topic cluster" value={draft.topicCluster} onChange={(value) => updateField("topicCluster", value)} />
                    <TextField label="Parent page" value={draft.parentPage} onChange={(value) => updateField("parentPage", value)} placeholder="Full canonical URL; leave blank when not applicable" />
                    <TextArea label="Cluster gaps" value={draft.clusterGaps} onChange={(value) => updateField("clusterGaps", value)} hint="One evidence-backed gap per line." />
                    <TextArea label="Maintenance owner" value={draft.maintenanceOwner} onChange={(value) => updateField("maintenanceOwner", value)} hint="Person, team, or source-maintenance workflow." />
                    <div className="sm:col-span-2">
                      <TextField label="Contributor or transparent team byline" value={draft.editorialOwner} onChange={(value) => updateField("editorialOwner", value)} placeholder="BlueStreamFly River Review Team" />
                      <p className="mt-1 text-xs text-muted-foreground">River reports default to BlueStreamFly River Review Team. This is organizational accountability, not a claim of first-hand fishing experience. Use a person’s name only when that real person performed the stated work.</p>
                    </div>
                  </div>
                </EditorSection>

                <EditorSection id="intent" index="05" title="Intent and job to be done" description="Describe the user’s need before proposing a change.">
                  <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
                    <SelectField label="Primary intent" value={draft.primaryIntent} options={INTENT_OPTIONS} onChange={(value) => updateField("primaryIntent", value)} />
                    <TextArea label="Job to be done" value={draft.jobToBeDone} onChange={(value) => updateField("jobToBeDone", value)} hint="The searcher wants to … so they can …" />
                  </div>
                </EditorSection>

                <EditorSection id="serp" index="06" title="Live SERP evidence" description="Dated search context and the five offers visible when reviewed.">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <TextField label="Snapshot time" type="datetime-local" value={toLocalDateTime(draft.serpSnapshotAt)} onChange={(value) => updateField("serpSnapshotAt", value)} />
                    <TextField label="Exact query" value={draft.serpQuery} onChange={(value) => updateField("serpQuery", value)} />
                    <TextField label="Location" value={draft.serpLocation} onChange={(value) => updateField("serpLocation", value)} />
                    <SelectField label="Device" value={draft.serpDevice} options={["", ...SERP_DEVICE_OPTIONS]} onChange={(value) => updateField("serpDevice", value)} />
                    <SelectField label="Method" value={draft.serpMethod} options={["", ...SERP_METHOD_OPTIONS]} onChange={(value) => updateField("serpMethod", value)} />
                    <SelectField label="SERP evidence state" value={draft.serpEvidenceState} options={EVIDENCE_STATE_OPTIONS} onChange={(value) => updateField("serpEvidenceState", value)} />
                    <TextField label="SERP features" value={draft.serpFeatures} onChange={(value) => updateField("serpFeatures", value)} placeholder="AI Overview, PAA, video…" />
                    <div className="sm:col-span-2 lg:col-span-3">
                      <TextArea label="Evidence summary / search limitation" value={draft.serpEvidenceSummary} onChange={(value) => updateField("serpEvidenceSummary", value)} />
                    </div>
                    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-[220px_1fr] lg:col-span-3">
                      <SelectField label="SERP competition level" value={draft.serpCompetition} options={SERP_COMPETITION_OPTIONS} onChange={(value) => updateField("serpCompetition", value)} />
                      <TextArea label="Competition summary" value={draft.serpCompetitionSummary} onChange={(value) => updateField("serpCompetitionSummary", value)} hint="Explain the observed offer set; do not turn this into an unsupported difficulty score." />
                    </div>
                  </div>
                  <div className="mt-6 overflow-hidden border-y border-border">
                    {draft.serpTopFive.map((competitor, index) => (
                      <div key={competitor.position} className="grid gap-3 border-b border-border/70 py-4 last:border-b-0 lg:grid-cols-[36px_1fr_1fr]">
                        <span className="font-data text-sm font-semibold text-primary">{String(index + 1).padStart(2, "0")}</span>
                        <div className="space-y-3">
                          <TextField label="Result URL" value={competitor.url} onChange={(value) => updateCompetitor(index, "url", value)} />
                          <TextField label="Title / page type" value={competitor.title} onChange={(value) => updateCompetitor(index, "title", value)} />
                        </div>
                        <div className="space-y-3">
                          <TextArea label="Competitor offer" value={competitor.offer} onChange={(value) => updateCompetitor(index, "offer", value)} compact />
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                            <TextArea label="Evidence / trust" value={competitor.evidence} onChange={(value) => updateCompetitor(index, "evidence", value)} compact />
                            <TextArea label="Important gap" value={competitor.gap} onChange={(value) => updateCompetitor(index, "gap", value)} compact />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </EditorSection>

                <EditorSection id="offer" index="07" title="Our offer" description="State what the page provides now and the honest difference.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <TextArea label="Top-result offer summary" value={draft.competitorOffer} onChange={(value) => updateField("competitorOffer", value)} />
                    </div>
                    <TextArea label="Current offer" value={draft.currentOffer} onChange={(value) => updateField("currentOffer", value)} />
                    <TextArea label="Honest differentiation" value={draft.differentiation} onChange={(value) => updateField("differentiation", value)} hint="Unlike the current top results, this page helps … by …" />
                    <div className="sm:col-span-2 sm:max-w-xs">
                      <SelectField label="Differentiation evidence state" value={draft.differentiationEvidenceState} options={DIFFERENTIATION_EVIDENCE_OPTIONS} onChange={(value) => updateField("differentiationEvidenceState", value)} />
                    </div>
                  </div>
                </EditorSection>

                <EditorSection id="eeat" index="08" title="E-E-A-T evidence and gaps" description="Record observable trust evidence; do not assign a score.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2 sm:max-w-xs">
                      <SelectField label="E-E-A-T evidence state" value={draft.eeatEvidenceState} options={EVIDENCE_STATE_OPTIONS} onChange={(value) => updateField("eeatEvidenceState", value)} />
                    </div>
                    <TextArea label="Evidence on page / site" value={draft.eeatEvidence} onChange={(value) => updateField("eeatEvidence", value)} hint="One observable item per line; do not assign a score." />
                    <TextArea label="Gaps and evidence needed" value={draft.eeatGaps} onChange={(value) => updateField("eeatGaps", value)} hint="One missing or partial item per line." />
                  </div>
                  <div className="mt-6 border-t border-border pt-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Structured evidence details</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Add only evidence a person checked. Every entry needs a source, date, reviewer, and honest limitation.
                        </p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={addEeatDetail}>
                        <Plus /> Add evidence
                      </Button>
                    </div>

                    {draft.eeatDetails.length === 0 ? (
                      <div className="mt-4 border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                        No structured evidence has been recorded. Nothing will be filled in automatically.
                      </div>
                    ) : (
                      <div className="mt-4 divide-y divide-border border-y border-border">
                        {draft.eeatDetails.map((detail, index) => (
                          <div key={index} className="py-4">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="font-data text-xs font-semibold text-primary">
                                Evidence {String(index + 1).padStart(2, "0")}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                aria-label={`Remove evidence entry ${index + 1}`}
                                onClick={() => removeEeatDetail(index)}
                              >
                                <Trash2 /> Remove
                              </Button>
                            </div>
                            <div className="grid gap-3 lg:grid-cols-5">
                              <TextArea label="Evidence" value={detail.evidence} onChange={(value) => updateEeatDetail(index, "evidence", value)} compact />
                              <TextArea label="Source" value={detail.source} onChange={(value) => updateEeatDetail(index, "source", value)} hint="URL or named source" compact />
                              <TextField label="Checked at" type="datetime-local" value={toLocalDateTime(detail.checkedAt)} onChange={(value) => updateEeatDetail(index, "checkedAt", value)} />
                              <TextField label="Reviewer" value={detail.reviewer} onChange={(value) => updateEeatDetail(index, "reviewer", value)} placeholder="Person or team" />
                              <TextArea label="Limitation" value={detail.limitation} onChange={(value) => updateEeatDetail(index, "limitation", value)} hint="Use “None noted” only when true." compact />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </EditorSection>

                <EditorSection
                  id="measurement"
                  index="09"
                  title="Measurement plan"
                  description="Freeze the page’s real starting point and success rule before an approved change. Blank metrics mean unknown, not zero."
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <SelectField
                      label="Plan evidence state"
                      value={draft.measurementPlan.evidenceState}
                      options={EVIDENCE_STATE_OPTIONS}
                      onChange={updateMeasurementPlanState}
                    />
                    <TextField
                      label="Baseline as of"
                      type="date"
                      value={draft.measurementPlan.baselineAsOf}
                      onChange={(value) => updateMeasurementPlan("baselineAsOf", value)}
                    />
                    <TextField
                      label="Window start"
                      type="date"
                      value={draft.measurementPlan.windowStart}
                      onChange={(value) => updateMeasurementPlan("windowStart", value)}
                    />
                    <TextField
                      label="Window end"
                      type="date"
                      value={draft.measurementPlan.windowEnd}
                      onChange={(value) => updateMeasurementPlan("windowEnd", value)}
                    />
                    <div className="sm:col-span-2 lg:col-span-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                          <TextField
                            label="Exact baseline canonical"
                            value={draft.measurementPlan.baselineCanonical}
                            onChange={(value) => updateMeasurementPlan("baselineCanonical", value)}
                            placeholder={draft.canonicalUrl}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateMeasurementPlan("baselineCanonical", draft.canonicalUrl)}
                        >
                          Use this canonical
                        </Button>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        GSC and GA4 values below must use this exact page, not a directory, query group, or site total.
                      </p>
                    </div>
                  </div>

                  <div className="mt-7 grid gap-8 xl:grid-cols-2">
                    <section aria-labelledby="gsc-baseline-title" className="border-t-2 border-primary pt-4">
                      <div>
                        <h3 id="gsc-baseline-title" className="font-heading text-base font-semibold text-foreground">
                          Search Console baseline
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Exact page-filter totals for the dates above. CTR is stored as a 0–1 ratio; blank is unknown.
                        </p>
                      </div>
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <SelectField label="Evidence state" value={draft.measurementPlan.gsc.evidenceState} options={EVIDENCE_STATE_OPTIONS} onChange={updateGscBaselineState} />
                        <SelectField label="Check method" value={draft.measurementPlan.gsc.method} options={["", ...GSC_BASELINE_METHOD_OPTIONS]} onChange={(value) => updateGscBaseline("method", value)} />
                        <TextField label="Checked at" type="datetime-local" value={toLocalDateTime(draft.measurementPlan.gsc.checkedAt)} onChange={(value) => updateGscBaseline("checkedAt", value)} />
                        <TextField label="Clicks" type="number" value={draft.measurementPlan.gsc.clicks} onChange={(value) => updateGscBaseline("clicks", value)} placeholder="Blank = unknown" />
                        <TextField label="Impressions" type="number" value={draft.measurementPlan.gsc.impressions} onChange={(value) => updateGscBaseline("impressions", value)} placeholder="Blank = unknown" />
                        <TextField label="CTR (0–1)" type="number" step="any" min="0" max="1" value={draft.measurementPlan.gsc.ctr} onChange={(value) => updateGscBaseline("ctr", value)} placeholder="0.042, not 4.2" />
                        <TextField label="Average position" type="number" step="any" min="0" value={draft.measurementPlan.gsc.position} onChange={(value) => updateGscBaseline("position", value)} placeholder="Blank = unknown" />
                        <div className="sm:col-span-2">
                          <TextField label="Official Search Console URL" value={draft.measurementPlan.gsc.sourceUrl} onChange={(value) => updateGscBaseline("sourceUrl", value)} placeholder="https://search.google.com/search-console/…" />
                        </div>
                        <div className="sm:col-span-2">
                          <TextArea label="GSC limitation" value={draft.measurementPlan.gsc.limitation} onChange={(value) => updateGscBaseline("limitation", value)} hint="Required for partial evidence. State data lag, short history, or missing rows plainly." compact />
                        </div>
                        {draft.measurementPlan.gsc.evidenceState === "not_applicable" && (
                          <div className="sm:col-span-2">
                            <TextArea label="Why GSC is not applicable" value={draft.measurementPlan.gsc.notApplicableReason} onChange={(value) => updateGscBaseline("notApplicableReason", value)} required compact />
                          </div>
                        )}
                      </div>
                    </section>

                    <section aria-labelledby="ga4-baseline-title" className="border-t-2 border-primary pt-4">
                      <div>
                        <h3 id="ga4-baseline-title" className="font-heading text-base font-semibold text-foreground">
                          GA4 baseline
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Exact pageLocation totals for the same canonical and dates. Do not force GA4 sessions to equal GSC clicks.
                        </p>
                      </div>
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <SelectField label="Evidence state" value={draft.measurementPlan.ga4.evidenceState} options={EVIDENCE_STATE_OPTIONS} onChange={updateGa4BaselineState} />
                        <SelectField label="Check method" value={draft.measurementPlan.ga4.method} options={["", ...GA4_BASELINE_METHOD_OPTIONS]} onChange={(value) => updateGa4Baseline("method", value)} />
                        <TextField label="Checked at" type="datetime-local" value={toLocalDateTime(draft.measurementPlan.ga4.checkedAt)} onChange={(value) => updateGa4Baseline("checkedAt", value)} />
                        <TextField label="Views (screenPageViews)" type="number" value={draft.measurementPlan.ga4.screenPageViews} onChange={(value) => updateGa4Baseline("screenPageViews", value)} placeholder="Blank = unknown" />
                        <TextField label="Sessions" type="number" value={draft.measurementPlan.ga4.sessions} onChange={(value) => updateGa4Baseline("sessions", value)} placeholder="Blank = unknown" />
                        <TextField label="Engaged sessions" type="number" value={draft.measurementPlan.ga4.engagedSessions} onChange={(value) => updateGa4Baseline("engagedSessions", value)} placeholder="Blank = unknown" />
                        <TextField label="Active users" type="number" value={draft.measurementPlan.ga4.activeUsers} onChange={(value) => updateGa4Baseline("activeUsers", value)} placeholder="Blank = unknown" />
                        <TextField label="Key events" type="number" value={draft.measurementPlan.ga4.keyEvents} onChange={(value) => updateGa4Baseline("keyEvents", value)} placeholder="Blank = unknown" />
                        <div className="sm:col-span-2">
                          <TextField label="Official GA4 URL" value={draft.measurementPlan.ga4.sourceUrl} onChange={(value) => updateGa4Baseline("sourceUrl", value)} placeholder="https://analytics.google.com/analytics/web/…" />
                        </div>
                        <div className="sm:col-span-2">
                          <TextArea label="GA4 limitation" value={draft.measurementPlan.ga4.limitation} onChange={(value) => updateGa4Baseline("limitation", value)} hint="Required for partial evidence. State consent, collection date, or missing event limits plainly." compact />
                        </div>
                        {draft.measurementPlan.ga4.evidenceState === "not_applicable" && (
                          <div className="sm:col-span-2">
                            <TextArea label="Why GA4 is not applicable" value={draft.measurementPlan.ga4.notApplicableReason} onChange={(value) => updateGa4Baseline("notApplicableReason", value)} required compact />
                          </div>
                        )}
                      </div>
                    </section>
                  </div>

                  <div className="mt-7 border-t border-border pt-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Comparison windows</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Keep prior-period or longer-context totals beside the primary baseline. Record only values the exact canonical returned.
                        </p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={addMeasurementComparisonWindow}>
                        <Plus /> Add window
                      </Button>
                    </div>
                    {draft.measurementPlan.comparisonWindows.length === 0 ? (
                      <p className="mt-4 border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                        No comparison window recorded. Add one when a prior period or longer baseline was actually checked.
                      </p>
                    ) : (
                      <div className="mt-4 divide-y divide-border border-y border-border">
                        {draft.measurementPlan.comparisonWindows.map((window, index) => (
                          <div key={`${window.label}-${index}`} className="py-5">
                            <div className="mb-4 flex items-center justify-between">
                              <span className="font-data text-xs font-semibold text-primary">
                                Window {String(index + 1).padStart(2, "0")}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => removeMeasurementComparisonWindow(index)}
                              >
                                <Trash2 /> Remove
                              </Button>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                              <TextField label="Window label" value={window.label} onChange={(value) => updateMeasurementComparisonWindow(index, "label", value)} placeholder="Prior 28 days" />
                              <TextField label="Start" type="date" value={window.windowStart} onChange={(value) => updateMeasurementComparisonWindow(index, "windowStart", value)} />
                              <TextField label="End" type="date" value={window.windowEnd} onChange={(value) => updateMeasurementComparisonWindow(index, "windowEnd", value)} />
                              <TextArea label="Limitation" value={window.limitation} onChange={(value) => updateMeasurementComparisonWindow(index, "limitation", value)} compact />
                            </div>
                            <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">GSC</p>
                            <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                              <TextField label="Clicks" type="number" value={window.clicks} onChange={(value) => updateMeasurementComparisonWindow(index, "clicks", value)} placeholder="Blank = unknown" />
                              <TextField label="Impressions" type="number" value={window.impressions} onChange={(value) => updateMeasurementComparisonWindow(index, "impressions", value)} placeholder="Blank = unknown" />
                              <TextField label="CTR (0–1)" type="number" step="any" min="0" max="1" value={window.ctr} onChange={(value) => updateMeasurementComparisonWindow(index, "ctr", value)} placeholder="0.1381" />
                              <TextField label="Average position" type="number" step="any" min="0" value={window.position} onChange={(value) => updateMeasurementComparisonWindow(index, "position", value)} placeholder="Blank = unknown" />
                            </div>
                            <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">GA4</p>
                            <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                              <TextField label="Views" type="number" value={window.screenPageViews} onChange={(value) => updateMeasurementComparisonWindow(index, "screenPageViews", value)} placeholder="Unknown" />
                              <TextField label="Sessions" type="number" value={window.sessions} onChange={(value) => updateMeasurementComparisonWindow(index, "sessions", value)} placeholder="Unknown" />
                              <TextField label="Engaged sessions" type="number" value={window.engagedSessions} onChange={(value) => updateMeasurementComparisonWindow(index, "engagedSessions", value)} placeholder="Unknown" />
                              <TextField label="Active users" type="number" value={window.activeUsers} onChange={(value) => updateMeasurementComparisonWindow(index, "activeUsers", value)} placeholder="Unknown" />
                              <TextField label="Key events" type="number" step="any" min="0" value={window.keyEvents} onChange={(value) => updateMeasurementComparisonWindow(index, "keyEvents", value)} placeholder="Unknown" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-7 border-t border-border pt-5">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="sm:col-span-2 lg:col-span-4">
                        <TextArea label="Hypothesis" value={draft.measurementPlan.hypothesis} onChange={(value) => updateMeasurementPlan("hypothesis", value)} hint="If we make the approved change, the primary KPI should move because …" />
                      </div>
                      <SelectField label="Primary KPI source" value={draft.measurementPlan.primaryKpiSource} options={["", ...MEASUREMENT_KPI_SOURCE_OPTIONS]} onChange={updatePrimaryKpiSource} />
                      <SelectField
                        label="Primary KPI metric"
                        value={draft.measurementPlan.primaryKpiMetric}
                        options={[
                          "",
                          ...(draft.measurementPlan.primaryKpiSource === "ga4"
                            ? GA4_KPI_METRIC_OPTIONS
                            : GSC_KPI_METRIC_OPTIONS),
                        ]}
                        onChange={(value) => updateMeasurementPlan("primaryKpiMetric", value)}
                      />
                      <SelectField label="Expected direction" value={draft.measurementPlan.primaryKpiDirection} options={["", ...MEASUREMENT_KPI_DIRECTION_OPTIONS]} onChange={(value) => updateMeasurementPlan("primaryKpiDirection", value)} />
                      <TextField label="Evaluation window (days)" type="number" value={draft.measurementPlan.evaluationWindowDays} onChange={(value) => updateMeasurementPlan("evaluationWindowDays", value)} placeholder="28 or 56" />
                      <div className="sm:col-span-2 lg:col-span-4">
                        <TextArea label="Success criteria" value={draft.measurementPlan.successCriteria} onChange={(value) => updateMeasurementPlan("successCriteria", value)} hint="State the comparison and decision rule before implementation; low data may remain inconclusive." compact />
                      </div>
                      <TextField label="GA4 conversion event" value={draft.measurementPlan.conversionEventName} onChange={(value) => updateMeasurementPlan("conversionEventName", value)} placeholder="official_source_click" />
                      <div className="sm:col-span-1 lg:col-span-3">
                        <TextField label="Conversion goal" value={draft.measurementPlan.conversionDescription} onChange={(value) => updateMeasurementPlan("conversionDescription", value)} placeholder="The visitor opens a useful official source." />
                      </div>
                      <div className="sm:col-span-2 lg:col-span-4">
                        <TextArea label="Why no conversion goal applies" value={draft.measurementPlan.conversionNotApplicableReason} onChange={(value) => updateMeasurementPlan("conversionNotApplicableReason", value)} hint="Use only when this page has no honest conversion. Leave blank when a goal is recorded." compact />
                      </div>
                      <div className="sm:col-span-2">
                        <TextArea label="Guardrails" value={draft.measurementPlan.guardrails} onChange={(value) => updateMeasurementPlan("guardrails", value)} hint="One per line: facts, safety, engagement, indexability, or another metric that must not regress." />
                      </div>
                      <div className="sm:col-span-2">
                        <TextArea label="Plan limitation" value={draft.measurementPlan.limitation} onChange={(value) => updateMeasurementPlan("limitation", value)} hint="Required for a partial plan. Name what the evidence cannot prove." />
                      </div>
                      {draft.measurementPlan.evidenceState === "not_applicable" && (
                        <div className="sm:col-span-2 lg:col-span-4">
                          <TextArea label="Why a measurement plan is not applicable" value={draft.measurementPlan.notApplicableReason} onChange={(value) => updateMeasurementPlan("notApplicableReason", value)} required />
                        </div>
                      )}
                    </div>
                  </div>
                </EditorSection>

                <EditorSection id="decision" index="10" title="Decision and change control" description="Choose the change the evidence supports. It may be focused or comprehensive. Saving does not publish it.">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <SelectField label="Decision" value={draft.decisionAction} options={DECISION_STATE_OPTIONS} onChange={(value) => updateField("decisionAction", value)} />
                    <SelectField label="Change state" value={draft.decisionChangeState} options={CHANGE_STATE_OPTIONS} onChange={(value) => updateField("decisionChangeState", value)} />
                    <TextField label="Change ID" value={draft.changeId} onChange={(value) => updateField("changeId", value)} placeholder="Only after a change is approved" />
                    <div className="sm:col-span-2 lg:col-span-1">
                      <TextField label="Changed at" type="datetime-local" value={toLocalDateTime(draft.decisionChangedAt)} onChange={(value) => updateField("decisionChangedAt", value)} />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3 grid gap-4 sm:grid-cols-2">
                      <TextArea label="Decision rationale / observed problem" value={draft.decisionProblem} onChange={(value) => updateField("decisionProblem", value)} />
                      <TextArea label="Recommended change and full scope" value={draft.proposedChange} onChange={(value) => updateField("proposedChange", value)} hint="Use a focused fix when the problem is limited. Use a full rewrite, redesign, merge, or technical repair when that is what the page needs." />
                    </div>
                  </div>

                  <div className="mt-7 border-t border-border pt-5">
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-foreground">Change scope and blast radius</h3>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Record the full solution, the pages it affects, existing wins to protect, and the condition that would trigger a rollback.
                      </p>
                    </div>
                    {draft.pageFamily === "river_report" && (
                      <p className="mb-5 border-l-2 border-primary pl-3 text-sm leading-6 text-foreground">
                        River-report rule: shared structure, decision logic, safety presentation, source UX, and reusable modules use <strong>shared template</strong> and target every current river report. River facts, rules, access, sources, hatch/tactic content, and reach-specific evidence remain <strong>page local</strong>.
                      </p>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <SelectField label="Performance state" value={draft.performanceState} options={PERFORMANCE_STATE_OPTIONS} onChange={(value) => updateField("performanceState", value)} />
                      <SelectField label="Scope class" value={draft.changeScope} options={CHANGE_SCOPE_OPTIONS} onChange={(value) => updateField("changeScope", value)} />
                      <SelectField label="Blast radius" value={draft.changeBlastRadius} options={CHANGE_BLAST_RADIUS_OPTIONS} onChange={updateChangeBlastRadius} />
                      {["shared_template", "mixed"].includes(draft.changeBlastRadius) && (
                        <SelectField label="Affected page family" value={draft.affectedPageFamily} options={["", ...PAGE_FAMILIES]} onChange={(value) => updateField("affectedPageFamily", value)} />
                      )}
                      {!["undecided", "not_applicable"].includes(draft.changeBlastRadius) && (
                        <TextField label="Affected canonical count" type="number" min="1" value={draft.affectedCanonicalCount} onChange={(value) => updateField("affectedCanonicalCount", value)} placeholder="1" />
                      )}
                      <SelectField label="Experiment state" value={draft.experimentState} options={EXPERIMENT_STATE_OPTIONS} onChange={(value) => updateField("experimentState", value)} />
                      <div className="sm:col-span-2 lg:col-span-3">
                        <TextArea label="Scope rationale" value={draft.scopeRationale} onChange={(value) => updateField("scopeRationale", value)} hint="Why this scope fully solves the verified problem; implementation effort alone must not shrink it." compact />
                      </div>
                      {!["undecided", "not_applicable"].includes(draft.changeBlastRadius) && (
                        <div className="sm:col-span-2 lg:col-span-3">
                          <TextArea label="Blast-radius details" value={draft.blastRadiusNote} onChange={(value) => updateField("blastRadiusNote", value)} hint="Name the shared component, navigation surface, source-sensitive behavior, and affected family or cohort." compact />
                        </div>
                      )}
                      <div className="sm:col-span-2 lg:col-span-3 grid gap-4 lg:grid-cols-3">
                        <TextArea label="Demonstrated wins" value={draft.demonstratedWins} onChange={(value) => updateField("demonstratedWins", value)} hint="One dated query, behavior, conversion, or durable-link signal per line. Leave empty when none are demonstrated." />
                        <TextArea label="Elements to preserve" value={draft.preservedElements} onChange={(value) => updateField("preservedElements", value)} hint="Working content, ownership, links, behavior, or trust evidence that should survive the change." />
                        <TextArea label="Winning elements intentionally changed" value={draft.intentionallyChangedElements} onChange={(value) => updateField("intentionallyChangedElements", value)} hint="One per line with the evidence-backed reason. Leave empty when not applicable." />
                      </div>
                      <div className="sm:col-span-2 lg:col-span-3">
                        <TextArea label="Rollback trigger" value={draft.rollbackTrigger} onChange={(value) => updateField("rollbackTrigger", value)} hint="State the measurable relevance, traffic, conversion, safety, or technical regression that would make us revert." compact />
                      </div>
                      {["frozen", "approved_contamination"].includes(draft.experimentState) && (
                        <>
                          <TextField label="Experiment ID" value={draft.experimentId} onChange={(value) => updateField("experimentId", value)} />
                          <TextField label="Original freeze date" type="datetime-local" value={toLocalDateTime(draft.experimentFrozenUntil)} onChange={(value) => updateField("experimentFrozenUntil", value)} />
                          <div className="sm:col-span-2 lg:col-span-3">
                            <TextArea label="Experiment exception / contamination reason" value={draft.experimentExceptionReason} onChange={(value) => updateField("experimentExceptionReason", value)} hint="Required before an explicitly approved intervention can override a frozen experiment." compact />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </EditorSection>

                <EditorSection id="gates" index="11" title="Day 7 / 28 / 56 gates" description="These are manual outcome checks, not scheduled jobs.">
                  <div className="divide-y divide-border border-y border-border">
                    <GateEditor label="Day 7" gate={draft.day7} onChange={(field, value) => updateGate("day7", field, value)} />
                    <GateEditor label="Day 28" gate={draft.day28} onChange={(field, value) => updateGate("day28", field, value)} />
                    <GateEditor label="Day 56" gate={draft.day56} onChange={(field, value) => updateGate("day56", field, value)} />
                  </div>
                </EditorSection>

                <EditorSection id="notes" index="12" title="Manual notes and timestamps" description="Keep the human review trail clear and dated.">
                  <TextArea label="Manual notes" value={draft.manualNotes} onChange={(value) => updateField("manualNotes", value)} />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <TextField label="First reviewed at" type="datetime-local" value={toLocalDateTime(draft.firstReviewedAt)} onChange={(value) => updateField("firstReviewedAt", value)} />
                    <TextField label="Last reviewed at" type="datetime-local" value={toLocalDateTime(draft.lastReviewedAt)} onChange={(value) => updateField("lastReviewedAt", value)} />
                    <TextField label="Next manual review" type="datetime-local" value={toLocalDateTime(draft.nextReviewAt)} onChange={(value) => updateField("nextReviewAt", value)} />
                    <TextField label={`Last saved · v${draft.version}`} value={draft.updatedAt || "Not saved yet"} onChange={() => undefined} readOnly />
                  </div>
                </EditorSection>

                <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">Manual record save only. No schedule, page edit, deployment, or publication is triggered.</p>
                  <Button type="submit" disabled={!dirty || saving}>
                    {saving ? <Loader2 className="animate-spin" /> : <Save />}
                    Save review
                  </Button>
                </div>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-8 w-full rounded-lg border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
        <option value="">All {label.toLowerCase()}</option>
        {options.map((option) => <option key={option} value={option}>{humanize(option)}</option>)}
      </select>
    </label>
  );
}

function StatusChip({ value }: { value: string }) {
  return (
    <span className={cn("inline-flex max-w-full truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold", value === "complete" && "bg-signal-muted text-signal", value === "blocked" && "bg-destructive/10 text-destructive", value === "researching" && "bg-primary/10 text-primary", !["complete", "blocked", "researching"].includes(value) && "bg-muted text-muted-foreground")}>
      {humanize(value)}
    </span>
  );
}

function ManualStateChip({ value }: { value: string }) {
  const active = isActiveManualState(value);

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium",
        active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
      )}
      title={`Manual collaboration: ${humanize(value)}`}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", active ? "bg-primary" : "bg-muted-foreground/45")} />
      {active ? "Active · " : "Chat · "}{humanize(value)}
    </span>
  );
}

function EditorSection({ id, index, title, description, children }: { id: string; index: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={`review-${id}`} className="scroll-mt-36 border-t border-border py-7 first:border-t-0 first:pt-0">
      <div className="mb-5 grid grid-cols-[34px_1fr] gap-3">
        <span className="font-data text-xs font-semibold text-primary">{index}</span>
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="sm:pl-[46px]">{children}</div>
    </section>
  );
}

function TextField({ label, value, onChange, placeholder, type = "text", readOnly = false, copyable = false, step, min, max }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; readOnly?: boolean; copyable?: boolean; step?: string; min?: string; max?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      <span className="relative block">
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} readOnly={readOnly} step={step} min={min} max={max} className={cn("h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15", readOnly && "cursor-text bg-muted/50 text-muted-foreground", copyable && "pr-14")} />
        {copyable && (
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(value)}
            className="absolute right-2 top-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10"
          >
            Copy
          </button>
        )}
      </span>
    </label>
  );
}

function TextArea({ label, value, onChange, hint, required = false, compact = false }: { label: string; value: string; onChange: (value: string) => void; hint?: string; required?: boolean; compact?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}{required && <span className="ml-1 text-destructive">*</span>}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} required={required} rows={compact ? 2 : 4} className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-5 text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15" />
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15">
        {options.map((option) => <option key={option} value={option}>{humanize(option)}</option>)}
      </select>
    </label>
  );
}

function GateEditor({ label, gate, onChange }: { label: string; gate: ReviewGate; onChange: (field: keyof ReviewGate, value: string) => void }) {
  return (
    <div className="py-5">
      <div className="grid gap-4 lg:grid-cols-[70px_160px_190px_190px] lg:items-start">
        <p className="pt-7 font-data text-sm font-semibold text-foreground">{label}</p>
        <SelectField label="Gate status" value={gate.status} options={GATE_STATUS_OPTIONS} onChange={(value) => onChange("status", value)} />
        <TextField label="Due at" type="datetime-local" value={toLocalDateTime(gate.dueAt)} onChange={(value) => onChange("dueAt", value)} />
        <TextField label="Reviewed at" type="datetime-local" value={toLocalDateTime(gate.reviewedAt)} onChange={(value) => onChange("reviewedAt", value)} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <TextArea label="Evidence" value={gate.evidence} onChange={(value) => onChange("evidence", value)} compact />
        <TextArea label="Decision" value={gate.decision} onChange={(value) => onChange("decision", value)} compact />
        <TextArea label="Rationale" value={gate.rationale} onChange={(value) => onChange("rationale", value)} compact />
        <TextArea label="Next action" value={gate.nextAction} onChange={(value) => onChange("nextAction", value)} compact />
      </div>
    </div>
  );
}
