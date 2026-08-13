export function normalizeSavedQuery(value: string) {
  const query = value.trim().replace(/\s+/g, " ").toLowerCase();
  if (query.length < 2 || query.length > 200) {
    throw new Error("Query must be between 2 and 200 characters");
  }
  return query;
}

export function normalizeOwnerPage(value: string, expectedDomain?: string) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Owner page must use HTTPS");
  if (url.search || url.hash) {
    throw new Error("Owner page must be a canonical URL without a query or fragment");
  }
  if (
    expectedDomain &&
    url.hostname.replace(/^www\./, "").toLowerCase() !==
      expectedDomain.replace(/^www\./, "").toLowerCase()
  ) {
    throw new Error(`Owner page must belong to ${expectedDomain}`);
  }
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}
