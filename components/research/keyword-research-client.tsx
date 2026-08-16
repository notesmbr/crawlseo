"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  Search,
} from "lucide-react";

type KeywordPlannerCapability = {
  provider: "google_ads_keyword_planner";
  configured: boolean;
  manualOnly: true;
  status: "ready" | "missing_configuration" | "invalid_configuration";
};

type MonthlySearchVolume = {
  year: number;
  month: string;
  searches: number;
};

type KeywordResult = {
  keyword: string;
  averageMonthlySearches: number | null;
  monthlySearchVolumes: MonthlySearchVolume[];
  advertiserCompetition: string | null;
  advertiserCompetitionIndex: number | null;
  lowTopOfPageBidMicros: number | null;
  highTopOfPageBidMicros: number | null;
  closeVariants: string[];
};

type KeywordResponse = {
  source?: "google_autocomplete" | "google_ads_keyword_planner";
  capability?: KeywordPlannerCapability;
  checkedAt?: string;
  keywords?: KeywordResult[];
  error?: string;
  code?: string;
};

export function KeywordResearchClient({
  siteId,
  initialQuery,
  initialPageUrl,
  keywordPlannerCapability,
}: {
  siteId: string;
  initialQuery: string;
  initialPageUrl: string;
  keywordPlannerCapability: KeywordPlannerCapability;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [pageUrl, setPageUrl] = useState(initialPageUrl);
  const [loadingMode, setLoadingMode] = useState<"suggestions" | "planner" | null>(
    null,
  );
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [source, setSource] = useState<KeywordResponse["source"]>(undefined);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [capability, setCapability] = useState(keywordPlannerCapability);
  const [error, setError] = useState<string | null>(null);
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);

  async function runResearch(mode: "suggestions" | "planner") {
    const seed = query.trim();
    if (!seed || loadingMode) return;

    setLoadingMode(mode);
    setResults([]);
    setSource(undefined);
    setCheckedAt(null);
    setError(null);
    setCopiedKeyword(null);

    try {
      const endpoint = `/api/sites/${siteId}/keyword-research`;
      const response =
        mode === "planner"
          ? await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                query: seed,
                pageUrl: pageUrl.trim() || null,
              }),
            })
          : await fetch(`${endpoint}?q=${encodeURIComponent(seed)}`, {
              cache: "no-store",
            });
      const data = (await response.json()) as KeywordResponse;
      if (data.capability) setCapability(data.capability);
      if (!response.ok) {
        setError(data.error || "Google keyword research could not be checked.");
        return;
      }

      setResults(Array.isArray(data.keywords) ? data.keywords : []);
      setSource(data.source);
      setCheckedAt(data.checkedAt ?? null);
    } catch {
      setError("Google keyword research could not be reached. Try again.");
    } finally {
      setLoadingMode(null);
    }
  }

  async function copyKeyword(keyword: string) {
    try {
      await navigator.clipboard.writeText(keyword);
      setCopiedKeyword(keyword);
    } catch {
      setError("The keyword could not be copied.");
    }
  }

  return (
    <div className="space-y-5">
      <div
        className={`flex items-start gap-3 rounded-lg border p-4 ${
          capability.configured
            ? "border-signal/30 bg-signal/5"
            : "border-warning/30 bg-warning/5"
        }`}
      >
        {capability.configured ? (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-signal" />
        ) : (
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
        )}
        <div className="text-sm">
          <p className="font-medium text-foreground">
            {capability.configured
              ? "Google Keyword Planner is ready"
              : "Google Keyword Planner needs server setup"}
          </p>
          <p className="mt-0.5 text-muted-foreground">
            {capability.configured
              ? "It runs only when you click the check button. Results do not choose a keyword owner or save a decision."
              : "Google suggestions still work. Planner estimates stay unavailable until the server credentials and Google Ads access are configured."}
          </p>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void runResearch("suggestions");
        }}
        className="panel p-4"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] lg:items-end">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Keyword or question
            </span>
            <span className="relative block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                maxLength={200}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Example: fishing creek fly fishing report"
                className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/55 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Page URL for Planner (optional)
            </span>
            <input
              type="url"
              value={pageUrl}
              onChange={(event) => setPageUrl(event.target.value)}
              placeholder="https://bluestreamfly.com/..."
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/55 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <button
            type="submit"
            disabled={!query.trim() || loadingMode !== null}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
          >
            {loadingMode === "suggestions" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            Get suggestions
          </button>
          <button
            type="button"
            disabled={
              !query.trim() || loadingMode !== null || !capability.configured
            }
            onClick={() => void runResearch("planner")}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {loadingMode === "planner" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Check Keyword Planner
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Google suggestions help find wording. Keyword Planner provides advertising
          estimates; advertiser competition is not organic ranking difficulty.
        </p>
      </form>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {source && results.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="border-b border-border bg-muted/25 px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              {source === "google_ads_keyword_planner"
                ? "Google Keyword Planner estimates"
                : "Google suggestions"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Research only. Copy a query into the page review when we decide it
              fits; nothing here assigns ownership or saves automatically.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Keyword
                  </th>
                  {source === "google_ads_keyword_planner" && (
                    <>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Avg. monthly searches
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        12-month pattern
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Advertiser competition
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Top-of-page bid
                      </th>
                    </>
                  )}
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr
                    key={result.keyword}
                    className="border-b border-border/50 transition-colors hover:bg-muted/25"
                  >
                    <td className="max-w-md px-4 py-3">
                      <span className="font-medium text-foreground">
                        {result.keyword}
                      </span>
                      {result.closeVariants.length > 0 && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          Includes close variants
                        </span>
                      )}
                    </td>
                    {source === "google_ads_keyword_planner" && (
                      <>
                        <td className="px-4 py-3 text-right font-data text-foreground">
                          {result.averageMonthlySearches?.toLocaleString() ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-data text-xs text-muted-foreground">
                          {monthlyPattern(result.monthlySearchVolumes)}
                        </td>
                        <td className="px-4 py-3 text-right text-foreground">
                          {competitionLabel(
                            result.advertiserCompetition,
                            result.advertiserCompetitionIndex,
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-data text-foreground">
                          {bidRange(
                            result.lowTopOfPageBidMicros,
                            result.highTopOfPageBidMicros,
                          )}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void copyKeyword(result.keyword)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      >
                        {copiedKeyword === result.keyword ? (
                          <Check className="size-3 text-signal" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                        {copiedKeyword === result.keyword ? "Copied" : "Copy"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
            {results.length} result{results.length === 1 ? "" : "s"}
            {checkedAt
              ? ` · checked ${new Date(checkedAt).toLocaleString()}`
              : ""}
          </div>
        </div>
      )}

      {!loadingMode && source && results.length === 0 && !error && (
        <div className="panel flex flex-col items-center py-12 text-center">
          <Search className="size-10 text-muted-foreground/30" />
          <p className="mt-3 font-medium text-foreground">No results found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a clearer phrase or remove the optional page URL.
          </p>
        </div>
      )}
    </div>
  );
}

function monthlyPattern(volumes: MonthlySearchVolume[]) {
  if (volumes.length === 0) return "—";
  const first = volumes[0]?.searches;
  const last = volumes.at(-1)?.searches;
  if (first === undefined || last === undefined) return "—";
  return `${first.toLocaleString()} → ${last.toLocaleString()}`;
}

function competitionLabel(value: string | null, index: number | null) {
  if (!value) return "—";
  const label = value.charAt(0).toUpperCase() + value.slice(1);
  return index === null ? label : `${label} (${index})`;
}

function bidRange(lowMicros: number | null, highMicros: number | null) {
  if (lowMicros === null && highMicros === null) return "—";
  const amount = (value: number | null) =>
    value === null ? "—" : `$${(value / 1_000_000).toFixed(2)}`;
  return `${amount(lowMicros)}–${amount(highMicros)}`;
}
