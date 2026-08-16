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
  if (url.username || url.password) {
    throw new Error("Owner page must not include URL credentials");
  }
  if (url.port) {
    throw new Error("Owner page must use the standard HTTPS port");
  }
  if (url.search || url.hash) {
    throw new Error("Owner page must be a canonical URL without a query or fragment");
  }
  if (expectedDomain) {
    const configured = new URL(`https://${expectedDomain.trim()}`);
    if (
      configured.username ||
      configured.password ||
      configured.port ||
      configured.pathname !== "/" ||
      configured.search ||
      configured.hash
    ) {
      throw new Error("Configured site domain must be a hostname without a port or path");
    }
    const configuredHost = configured.hostname.toLowerCase().replace(/\.$/, "");
    const requestedHost = url.hostname.toLowerCase().replace(/\.$/, "");
    if (
      requestedHost.replace(/^www\./, "") !==
      configuredHost.replace(/^www\./, "")
    ) {
      throw new Error(`Owner page must belong to ${expectedDomain}`);
    }
    // The configured Site.domain is the canonical host. Equivalent www/bare
    // input must not create two stored URL identities for the same page.
    url.hostname = configuredHost;
  }
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}
