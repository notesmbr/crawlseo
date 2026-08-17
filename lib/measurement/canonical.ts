export function normalizedSiteHostname(domain: string) {
  const candidate = domain.includes("://") ? domain : `https://${domain}`;
  return new URL(candidate).hostname.toLowerCase().replace(/^www\./, "");
}

export function siteOrigin(domain: string) {
  return `https://${normalizedSiteHostname(domain)}`;
}

export function normalizeCanonicalForSite(value: string, domain: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "(not set)" || trimmed.length > 2048) {
    throw new Error("A canonical URL on this site is required.");
  }

  const origin = siteOrigin(domain);
  const parsed = new URL(trimmed.startsWith("/") ? trimmed : trimmed, origin);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("The canonical must use HTTP or HTTPS.");
  }
  if (normalizedSiteHostname(parsed.hostname) !== normalizedSiteHostname(domain)) {
    throw new Error("The canonical must belong to this site.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("The canonical must not include credentials.");
  }

  const pathname = parsed.pathname.replace(/\/{2,}/g, "/");
  const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  return `${origin}${normalizedPath}`;
}

export function canonicalPath(canonicalUrl: string) {
  return new URL(canonicalUrl).pathname;
}

export function parseDateOnly(value: string, fieldName: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${fieldName} must use YYYY-MM-DD.`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${fieldName} must be a real calendar date.`);
  }
  return date;
}

export function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}
