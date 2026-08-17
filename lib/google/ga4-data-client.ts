import { GoogleAuth } from "google-auth-library";

const GA4_DATA_API_BASE = "https://analyticsdata.googleapis.com/v1beta";
const GA4_READONLY_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const PAGE_LIMIT = 100_000;

type Environment = Record<string, string | undefined>;

export type Ga4DailyPageMetric = {
  date: string;
  landingPage: string;
  screenPageViews: number;
  sessions: number;
  engagedSessions: number;
  activeUsers: number;
  keyEvents: number;
};

export type Ga4DataCapability = {
  available: boolean;
  mode: "service_account_adc";
  propertyConfigured: boolean;
  credentialsConfigured: boolean;
  missingConfiguration: string[];
};

export class Ga4DataApiError extends Error {
  readonly code:
    | "GA4_DATA_NOT_CONFIGURED"
    | "GA4_DATA_AUTH_FAILED"
    | "GA4_DATA_RATE_LIMITED"
    | "GA4_DATA_REQUEST_FAILED"
    | "GA4_DATA_INVALID_RESPONSE";
  readonly status: number;

  constructor(
    code:
      | "GA4_DATA_NOT_CONFIGURED"
      | "GA4_DATA_AUTH_FAILED"
      | "GA4_DATA_RATE_LIMITED"
      | "GA4_DATA_REQUEST_FAILED"
      | "GA4_DATA_INVALID_RESPONSE",
    message: string,
    status: number,
  ) {
    super(message);
    this.name = "Ga4DataApiError";
    this.code = code;
    this.status = status;
  }
}

function trimmed(value: string | undefined) {
  const candidate = value?.trim();
  return candidate || null;
}

function propertyId(environment: Environment) {
  const raw = trimmed(environment.GOOGLE_GA4_PROPERTY_ID);
  if (!raw) return null;
  const normalized = raw.replace(/^properties\//, "");
  return /^\d+$/.test(normalized) ? normalized : null;
}

function credentialsFile(environment: Environment) {
  return (
    trimmed(environment.GOOGLE_GA4_APPLICATION_CREDENTIALS) ??
    trimmed(environment.GOOGLE_APPLICATION_CREDENTIALS)
  );
}

function inlineCredentials(environment: Environment) {
  const clientEmail = trimmed(environment.GOOGLE_GA4_CLIENT_EMAIL);
  const privateKey = trimmed(environment.GOOGLE_GA4_PRIVATE_KEY);
  return clientEmail && privateKey
    ? { client_email: clientEmail, private_key: privateKey.replace(/\\n/g, "\n") }
    : null;
}

export function getGa4DataCapability(
  environment: Environment = process.env,
): Ga4DataCapability {
  const configuredProperty = propertyId(environment);
  const configuredCredentials =
    credentialsFile(environment) ?? inlineCredentials(environment);
  const missingConfiguration = [
    ...(configuredProperty ? [] : ["GOOGLE_GA4_PROPERTY_ID"]),
    ...(configuredCredentials
      ? []
      : [
          "GOOGLE_GA4_APPLICATION_CREDENTIALS, GOOGLE_APPLICATION_CREDENTIALS, or GOOGLE_GA4_CLIENT_EMAIL plus GOOGLE_GA4_PRIVATE_KEY",
        ]),
  ];
  return {
    available: missingConfiguration.length === 0,
    mode: "service_account_adc",
    propertyConfigured: Boolean(configuredProperty),
    credentialsConfigured: Boolean(configuredCredentials),
    missingConfiguration,
  };
}

export function buildGa4CanonicalReportRequest(input: {
  canonicalPath: string;
  startDate: string;
  endDate: string;
  offset?: number;
}) {
  return {
    dateRanges: [{ startDate: input.startDate, endDate: input.endDate }],
    dimensions: [{ name: "date" }, { name: "landingPage" }],
    metrics: [
      { name: "screenPageViews" },
      { name: "sessions" },
      { name: "engagedSessions" },
      { name: "activeUsers" },
      { name: "keyEvents" },
    ],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: "sessionDefaultChannelGroup",
              stringFilter: {
                matchType: "EXACT",
                value: "Organic Search",
                caseSensitive: false,
              },
            },
          },
          {
            filter: {
              fieldName: "landingPage",
              stringFilter: {
                matchType: "EXACT",
                value: input.canonicalPath,
                caseSensitive: true,
              },
            },
          },
        ],
      },
    },
    keepEmptyRows: false,
    limit: String(PAGE_LIMIT),
    offset: String(input.offset ?? 0),
  };
}

type Ga4RunReportResponse = {
  rowCount?: number;
  dimensionHeaders?: Array<{ name?: string }>;
  metricHeaders?: Array<{ name?: string }>;
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
};

function nonNegativeNumber(value: string | undefined, field: string) {
  const parsed = Number(value ?? "0");
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Ga4DataApiError(
      "GA4_DATA_INVALID_RESPONSE",
      `Google Analytics returned an invalid ${field} aggregate.`,
      502,
    );
  }
  return parsed;
}

export function parseGa4CanonicalReport(data: Ga4RunReportResponse) {
  const dimensions = (data.dimensionHeaders ?? []).map((header) => header.name);
  const metrics = (data.metricHeaders ?? []).map((header) => header.name);
  const expectedDimensions = ["date", "landingPage"];
  const expectedMetrics = [
    "screenPageViews",
    "sessions",
    "engagedSessions",
    "activeUsers",
    "keyEvents",
  ];
  if (
    dimensions.join("|") !== expectedDimensions.join("|") ||
    metrics.join("|") !== expectedMetrics.join("|")
  ) {
    throw new Ga4DataApiError(
      "GA4_DATA_INVALID_RESPONSE",
      "Google Analytics returned an unexpected aggregate schema.",
      502,
    );
  }

  return (data.rows ?? []).map((row): Ga4DailyPageMetric => {
    const [rawDate, landingPage] = row.dimensionValues ?? [];
    const dateValue = rawDate?.value ?? "";
    if (!/^\d{8}$/.test(dateValue) || !landingPage?.value) {
      throw new Ga4DataApiError(
        "GA4_DATA_INVALID_RESPONSE",
        "Google Analytics returned an invalid aggregate dimension.",
        502,
      );
    }
    const values = row.metricValues ?? [];
    return {
      date: `${dateValue.slice(0, 4)}-${dateValue.slice(4, 6)}-${dateValue.slice(6, 8)}`,
      landingPage: landingPage.value,
      screenPageViews: Math.round(nonNegativeNumber(values[0]?.value, "screenPageViews")),
      sessions: Math.round(nonNegativeNumber(values[1]?.value, "sessions")),
      engagedSessions: Math.round(nonNegativeNumber(values[2]?.value, "engagedSessions")),
      activeUsers: Math.round(nonNegativeNumber(values[3]?.value, "activeUsers")),
      keyEvents: nonNegativeNumber(values[4]?.value, "keyEvents"),
    };
  });
}

async function accessToken(environment: Environment) {
  const keyFilename = credentialsFile(environment);
  const credentials = inlineCredentials(environment);
  if (!keyFilename && !credentials) {
    throw new Ga4DataApiError(
      "GA4_DATA_NOT_CONFIGURED",
      "Google Analytics aggregate access is not configured.",
      503,
    );
  }
  try {
    const auth = new GoogleAuth({
      ...(keyFilename ? { keyFilename } : { credentials: credentials! }),
      scopes: [GA4_READONLY_SCOPE],
    });
    const token = await auth.getAccessToken();
    if (!token) throw new Error("No access token");
    return token;
  } catch {
    throw new Ga4DataApiError(
      "GA4_DATA_AUTH_FAILED",
      "Google Analytics aggregate authentication failed.",
      502,
    );
  }
}

export async function fetchGa4CanonicalDailyMetrics(
  input: {
    canonicalPath: string;
    startDate: string;
    endDate: string;
  },
  dependencies: {
    environment?: Environment;
    fetchImpl?: typeof fetch;
    accessTokenProvider?: () => Promise<string>;
  } = {},
) {
  const environment = dependencies.environment ?? process.env;
  const configuredProperty = propertyId(environment);
  if (!getGa4DataCapability(environment).available || !configuredProperty) {
    throw new Ga4DataApiError(
      "GA4_DATA_NOT_CONFIGURED",
      "Google Analytics aggregate access is not configured.",
      503,
    );
  }

  const token = dependencies.accessTokenProvider
    ? await dependencies.accessTokenProvider()
    : await accessToken(environment);
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const allRows: Ga4DailyPageMetric[] = [];
  let offset = 0;

  while (true) {
    const response = await fetchImpl(
      `${GA4_DATA_API_BASE}/properties/${configuredProperty}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildGa4CanonicalReportRequest({ ...input, offset })),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        throw new Ga4DataApiError(
          "GA4_DATA_RATE_LIMITED",
          "Google Analytics aggregate quota is temporarily exhausted.",
          429,
        );
      }
      if (response.status === 401 || response.status === 403) {
        throw new Ga4DataApiError(
          "GA4_DATA_AUTH_FAILED",
          "Google Analytics aggregate access was denied.",
          502,
        );
      }
      throw new Ga4DataApiError(
        "GA4_DATA_REQUEST_FAILED",
        "Google Analytics could not return page aggregates.",
        502,
      );
    }

    let data: Ga4RunReportResponse;
    try {
      data = (await response.json()) as Ga4RunReportResponse;
    } catch {
      throw new Ga4DataApiError(
        "GA4_DATA_INVALID_RESPONSE",
        "Google Analytics returned an unreadable aggregate response.",
        502,
      );
    }
    const rows = parseGa4CanonicalReport(data);
    allRows.push(...rows);
    const rowCount = Number(data.rowCount ?? rows.length);
    offset += rows.length;
    if (rows.length === 0 || offset >= rowCount || rows.length < PAGE_LIMIT) break;
  }

  return allRows;
}
