import { GoogleAuth } from "google-auth-library";

const GOOGLE_ADS_API_BASE = "https://googleads.googleapis.com";
const GOOGLE_ADS_SCOPE = "https://www.googleapis.com/auth/adwords";
const DEFAULT_API_VERSION = "v25";
const DEFAULT_LANGUAGE_CONSTANT_ID = "1000";
const DEFAULT_GEO_TARGET_CONSTANT_IDS = ["2840"];
const MAX_RESULTS = 25;
const REQUEST_TIMEOUT_MS = 20_000;

type Environment = Record<string, string | undefined>;

export type GoogleAdsKeywordPlannerCapability = {
  provider: "google_ads_keyword_planner";
  configured: boolean;
  manualOnly: true;
  status: "ready" | "missing_configuration" | "invalid_configuration";
};

export type GoogleAdsKeywordPlannerConfig = {
  apiVersion: string;
  credentialsFile: string;
  customerId: string;
  developerToken: string;
  loginCustomerId: string | null;
  languageConstantId: string;
  geoTargetConstantIds: string[];
};

export type GoogleAdsMonthlySearchVolume = {
  year: number;
  month: string;
  searches: number;
};

export type GoogleAdsKeywordIdea = {
  keyword: string;
  averageMonthlySearches: number | null;
  monthlySearchVolumes: GoogleAdsMonthlySearchVolume[];
  advertiserCompetition: "low" | "medium" | "high" | "unspecified" | null;
  advertiserCompetitionIndex: number | null;
  lowTopOfPageBidMicros: number | null;
  highTopOfPageBidMicros: number | null;
  closeVariants: string[];
};

export type GoogleAdsKeywordPlannerResult = {
  source: "google_ads_keyword_planner";
  query: string;
  pageUrl: string | null;
  checkedAt: string;
  requestId: string | null;
  targeting: {
    languageConstantId: string;
    geoTargetConstantIds: string[];
    network: "GOOGLE_SEARCH";
  };
  keywords: GoogleAdsKeywordIdea[];
};

export class GoogleAdsKeywordPlannerError extends Error {
  readonly code:
    | "GOOGLE_KEYWORD_PLANNER_NOT_CONFIGURED"
    | "GOOGLE_KEYWORD_PLANNER_INVALID_CONFIGURATION"
    | "GOOGLE_KEYWORD_PLANNER_AUTH_FAILED"
    | "GOOGLE_KEYWORD_PLANNER_RATE_LIMITED"
    | "GOOGLE_KEYWORD_PLANNER_REQUEST_FAILED"
    | "GOOGLE_KEYWORD_PLANNER_INVALID_RESPONSE";
  readonly status: number;
  readonly requestId: string | null;
  readonly retryAfterSeconds: number | null;

  constructor(
    message: string,
    code:
      | "GOOGLE_KEYWORD_PLANNER_NOT_CONFIGURED"
      | "GOOGLE_KEYWORD_PLANNER_INVALID_CONFIGURATION"
      | "GOOGLE_KEYWORD_PLANNER_AUTH_FAILED"
      | "GOOGLE_KEYWORD_PLANNER_RATE_LIMITED"
      | "GOOGLE_KEYWORD_PLANNER_REQUEST_FAILED"
      | "GOOGLE_KEYWORD_PLANNER_INVALID_RESPONSE",
    status: number,
    requestId: string | null = null,
    retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "GoogleAdsKeywordPlannerError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function trimmed(value: string | undefined) {
  return value?.trim() || null;
}

function digitsOnly(value: string, field: string) {
  const normalized = value.replaceAll("-", "");
  if (!/^\d{10}$/.test(normalized)) {
    throw new GoogleAdsKeywordPlannerError(
      `The server has an invalid ${field}.`,
      "GOOGLE_KEYWORD_PLANNER_INVALID_CONFIGURATION",
      503,
    );
  }
  return normalized;
}

function constantId(value: string, field: string) {
  if (!/^\d+$/.test(value)) {
    throw new GoogleAdsKeywordPlannerError(
      `The server has an invalid ${field}.`,
      "GOOGLE_KEYWORD_PLANNER_INVALID_CONFIGURATION",
      503,
    );
  }
  return value;
}

export function readGoogleAdsKeywordPlannerConfig(
  environment: Environment = process.env,
): GoogleAdsKeywordPlannerConfig {
  const credentialsFile = trimmed(environment.GOOGLE_APPLICATION_CREDENTIALS);
  const developerToken = trimmed(environment.GOOGLE_ADS_DEVELOPER_TOKEN);
  const customerId = trimmed(environment.GOOGLE_ADS_CUSTOMER_ID);

  if (!credentialsFile || !developerToken || !customerId) {
    throw new GoogleAdsKeywordPlannerError(
      "Google Keyword Planner needs server setup before it can be checked.",
      "GOOGLE_KEYWORD_PLANNER_NOT_CONFIGURED",
      503,
    );
  }

  const apiVersion = trimmed(environment.GOOGLE_ADS_API_VERSION) ?? DEFAULT_API_VERSION;
  if (!/^v\d+$/.test(apiVersion)) {
    throw new GoogleAdsKeywordPlannerError(
      "The server has an invalid Google Ads API version.",
      "GOOGLE_KEYWORD_PLANNER_INVALID_CONFIGURATION",
      503,
    );
  }

  const languageConstantId = constantId(
    trimmed(environment.GOOGLE_ADS_LANGUAGE_CONSTANT_ID) ??
      DEFAULT_LANGUAGE_CONSTANT_ID,
    "Google Ads language constant",
  );
  const configuredGeoTargets = trimmed(
    environment.GOOGLE_ADS_GEO_TARGET_CONSTANT_IDS,
  )
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const geoTargetConstantIds = (
    configuredGeoTargets?.length
      ? configuredGeoTargets
      : DEFAULT_GEO_TARGET_CONSTANT_IDS
  ).map((value) => constantId(value, "Google Ads geo target constant"));
  const rawLoginCustomerId = trimmed(environment.GOOGLE_ADS_LOGIN_CUSTOMER_ID);

  return {
    apiVersion,
    credentialsFile,
    customerId: digitsOnly(customerId, "Google Ads customer ID"),
    developerToken,
    loginCustomerId: rawLoginCustomerId
      ? digitsOnly(rawLoginCustomerId, "Google Ads login customer ID")
      : null,
    languageConstantId,
    geoTargetConstantIds,
  };
}

export function getGoogleAdsKeywordPlannerCapability(
  environment: Environment = process.env,
): GoogleAdsKeywordPlannerCapability {
  try {
    readGoogleAdsKeywordPlannerConfig(environment);
    return {
      provider: "google_ads_keyword_planner",
      configured: true,
      manualOnly: true,
      status: "ready",
    };
  } catch (error) {
    return {
      provider: "google_ads_keyword_planner",
      configured: false,
      manualOnly: true,
      status:
        error instanceof GoogleAdsKeywordPlannerError &&
        error.code === "GOOGLE_KEYWORD_PLANNER_INVALID_CONFIGURATION"
          ? "invalid_configuration"
          : "missing_configuration",
    };
  }
}

export function redactGoogleAdsSecrets(
  value: unknown,
  config?: Partial<GoogleAdsKeywordPlannerConfig>,
) {
  let text = value instanceof Error ? value.message : String(value ?? "");
  const secrets = [
    config?.developerToken,
    config?.credentialsFile,
    config?.customerId,
    config?.loginCustomerId,
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const secret of secrets) {
    text = text.split(secret).join("[REDACTED]");
  }

  return text
    .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/(developer-token\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/("private_key"\s*:\s*")[^"]+/gi, "$1[REDACTED]");
}

export function buildGoogleAdsKeywordIdeasRequest(
  query: string,
  pageUrl: string | null,
  config: Pick<
    GoogleAdsKeywordPlannerConfig,
    "languageConstantId" | "geoTargetConstantIds"
  >,
) {
  const seed = query.trim();
  return {
    language: `languageConstants/${config.languageConstantId}`,
    geoTargetConstants: config.geoTargetConstantIds.map(
      (id) => `geoTargetConstants/${id}`,
    ),
    includeAdultKeywords: false,
    keywordPlanNetwork: "GOOGLE_SEARCH",
    pageSize: MAX_RESULTS,
    ...(pageUrl
      ? { keywordAndUrlSeed: { keywords: [seed], url: pageUrl } }
      : { keywordSeed: { keywords: [seed] } }),
  };
}

type GoogleAdsKeywordIdeaResponse = {
  results?: Array<{
    text?: unknown;
    closeVariants?: unknown;
    keywordIdeaMetrics?: {
      avgMonthlySearches?: unknown;
      monthlySearchVolumes?: unknown;
      competition?: unknown;
      competitionIndex?: unknown;
      lowTopOfPageBidMicros?: unknown;
      highTopOfPageBidMicros?: unknown;
    };
  }>;
};

function finiteNumber(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

const MONTH_ORDER = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

function monthlyVolumes(value: unknown): GoogleAdsMonthlySearchVolume[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const record = entry as Record<string, unknown>;
      const year = finiteNumber(record.year);
      const searches = finiteNumber(record.monthlySearches);
      const month = typeof record.month === "string" ? record.month : null;
      if (year === null || searches === null || !month || !MONTH_ORDER.includes(month)) {
        return [];
      }
      return [{ year, month: month.toLowerCase(), searches }];
    })
    .sort((left, right) => {
      const yearDifference = left.year - right.year;
      if (yearDifference !== 0) return yearDifference;
      return (
        MONTH_ORDER.indexOf(left.month.toUpperCase()) -
        MONTH_ORDER.indexOf(right.month.toUpperCase())
      );
    });
}

function advertiserCompetition(
  value: unknown,
): GoogleAdsKeywordIdea["advertiserCompetition"] {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();
  return ["low", "medium", "high", "unspecified"].includes(normalized)
    ? (normalized as GoogleAdsKeywordIdea["advertiserCompetition"])
    : null;
}

export function mapGoogleAdsKeywordIdeas(
  response: GoogleAdsKeywordIdeaResponse,
): GoogleAdsKeywordIdea[] {
  if (!Array.isArray(response.results)) return [];

  return response.results.flatMap((result) => {
    if (!result || typeof result.text !== "string" || !result.text.trim()) return [];
    const metrics = result.keywordIdeaMetrics ?? {};
    return [
      {
        keyword: result.text.trim(),
        averageMonthlySearches: finiteNumber(metrics.avgMonthlySearches),
        monthlySearchVolumes: monthlyVolumes(metrics.monthlySearchVolumes),
        advertiserCompetition: advertiserCompetition(metrics.competition),
        advertiserCompetitionIndex: finiteNumber(metrics.competitionIndex),
        lowTopOfPageBidMicros: finiteNumber(metrics.lowTopOfPageBidMicros),
        highTopOfPageBidMicros: finiteNumber(metrics.highTopOfPageBidMicros),
        closeVariants: Array.isArray(result.closeVariants)
          ? result.closeVariants.filter(
              (variant): variant is string =>
                typeof variant === "string" && Boolean(variant.trim()),
            )
          : [],
      },
    ];
  });
}

async function serviceAccountAccessToken(config: GoogleAdsKeywordPlannerConfig) {
  const auth = new GoogleAuth({
    keyFile: config.credentialsFile,
    scopes: [GOOGLE_ADS_SCOPE],
  });
  const client = await auth.getClient();
  const result = await client.getAccessToken();
  const token = typeof result === "string" ? result : result?.token;
  if (!token) {
    throw new GoogleAdsKeywordPlannerError(
      "Google Keyword Planner could not authenticate with its server account.",
      "GOOGLE_KEYWORD_PLANNER_AUTH_FAILED",
      503,
    );
  }
  return token;
}

function googleErrorStatus(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const error = (value as { error?: unknown }).error;
  if (!error || typeof error !== "object") return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "string" ? status : null;
}

function retryAfterSeconds(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export async function generateGoogleAdsKeywordIdeas(
  input: { query: string; pageUrl?: string | null },
  options: {
    environment?: Environment;
    fetchImpl?: typeof fetch;
    getAccessToken?: (config: GoogleAdsKeywordPlannerConfig) => Promise<string>;
    now?: () => Date;
  } = {},
): Promise<GoogleAdsKeywordPlannerResult> {
  const query = input.query.trim();
  if (!query || query.length > 200) {
    throw new GoogleAdsKeywordPlannerError(
      "Enter a keyword between 1 and 200 characters.",
      "GOOGLE_KEYWORD_PLANNER_REQUEST_FAILED",
      400,
    );
  }

  const pageUrl = input.pageUrl?.trim() || null;
  const config = readGoogleAdsKeywordPlannerConfig(options.environment);
  const getAccessToken = options.getAccessToken ?? serviceAccountAccessToken;
  let accessToken: string;
  try {
    accessToken = await getAccessToken(config);
  } catch (error) {
    if (error instanceof GoogleAdsKeywordPlannerError) throw error;
    throw new GoogleAdsKeywordPlannerError(
      "Google Keyword Planner could not authenticate with its server account.",
      "GOOGLE_KEYWORD_PLANNER_AUTH_FAILED",
      503,
    );
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "developer-token": config.developerToken,
  };
  if (config.loginCustomerId) {
    headers["login-customer-id"] = config.loginCustomerId;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(
      `${GOOGLE_ADS_API_BASE}/${config.apiVersion}/customers/${config.customerId}:generateKeywordIdeas`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(
          buildGoogleAdsKeywordIdeasRequest(query, pageUrl, config),
        ),
        cache: "no-store",
        signal: controller.signal,
      },
    );
  } catch {
    throw new GoogleAdsKeywordPlannerError(
      "Google Keyword Planner could not be reached. Try again.",
      "GOOGLE_KEYWORD_PLANNER_REQUEST_FAILED",
      502,
    );
  } finally {
    clearTimeout(timeout);
  }

  const requestId =
    response.headers.get("request-id") ??
    response.headers.get("google-ads-request-id");
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    if (response.ok) {
      throw new GoogleAdsKeywordPlannerError(
        "Google Keyword Planner returned an unreadable response.",
        "GOOGLE_KEYWORD_PLANNER_INVALID_RESPONSE",
        502,
        requestId,
      );
    }
  }

  if (!response.ok) {
    const providerStatus = googleErrorStatus(payload);
    const retryAfter = retryAfterSeconds(response.headers.get("retry-after"));
    if (response.status === 429 || providerStatus === "RESOURCE_EXHAUSTED") {
      throw new GoogleAdsKeywordPlannerError(
        "Google Keyword Planner is rate limited. Wait a moment and try again.",
        "GOOGLE_KEYWORD_PLANNER_RATE_LIMITED",
        429,
        requestId,
        retryAfter,
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new GoogleAdsKeywordPlannerError(
        "Google Keyword Planner could not use the configured Google Ads access.",
        "GOOGLE_KEYWORD_PLANNER_AUTH_FAILED",
        503,
        requestId,
      );
    }
    throw new GoogleAdsKeywordPlannerError(
      "Google Keyword Planner could not complete this check.",
      "GOOGLE_KEYWORD_PLANNER_REQUEST_FAILED",
      502,
      requestId,
    );
  }

  if (!payload || typeof payload !== "object") {
    throw new GoogleAdsKeywordPlannerError(
      "Google Keyword Planner returned an unreadable response.",
      "GOOGLE_KEYWORD_PLANNER_INVALID_RESPONSE",
      502,
      requestId,
    );
  }

  return {
    source: "google_ads_keyword_planner",
    query,
    pageUrl,
    checkedAt: (options.now?.() ?? new Date()).toISOString(),
    requestId,
    targeting: {
      languageConstantId: config.languageConstantId,
      geoTargetConstantIds: [...config.geoTargetConstantIds],
      network: "GOOGLE_SEARCH",
    },
    keywords: mapGoogleAdsKeywordIdeas(payload as GoogleAdsKeywordIdeaResponse),
  };
}
