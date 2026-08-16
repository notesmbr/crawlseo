export const inventoryPageFamilyByType = {
  home: "HOME",
  "report directory": "REPORT_DIRECTORY",
  "state report hub": "STATE_REPORT_HUB",
  "river report": "RIVER_REPORT",
  "article directory": "ARTICLE_DIRECTORY",
  article: "ARTICLE",
  "fly directory": "FLY_DIRECTORY",
  "fly family guide": "FLY_FAMILY_GUIDE",
  "fly pattern guide": "FLY_PATTERN_GUIDE",
  "weekly conditions hub": "WEEKLY_CONDITIONS_HUB",
  "widget landing page": "WIDGET_LANDING_PAGE",
  "trust / company": "TRUST_COMPANY",
  "trust / methodology": "TRUST_METHODOLOGY",
  legal: "LEGAL",
  support: "SUPPORT",
  utility: "UTILITY",
  other: "OTHER",
} as const;

export type InventoryPageFamily =
  (typeof inventoryPageFamilyByType)[keyof typeof inventoryPageFamilyByType];

export type PageReviewInventoryEntry = {
  pageId: string;
  canonicalUrl: string;
  pageFamily: InventoryPageFamily;
};

export function parseCsvRows(source: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      if (field.length > 0) {
        throw new Error("Malformed CSV: quote appears inside an unquoted field");
      }
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("Malformed CSV: unclosed quoted field");
  if (field.length > 0 || row.length > 0) {
    row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
    rows.push(row);
  }

  return rows.filter(
    (candidate) =>
      candidate.length > 1 || candidate.some((value) => value.trim().length > 0),
  );
}

export function parsePageReviewInventory(source: string) {
  const rows = parseCsvRows(source);
  if (rows.length === 0) throw new Error("Inventory CSV is empty");

  const headers = rows[0].map((header) => header.trim());
  const requiredHeaders = ["page_id", "canonical_url", "page_type"] as const;
  const positions = Object.fromEntries(
    requiredHeaders.map((header) => [header, headers.indexOf(header)]),
  ) as Record<(typeof requiredHeaders)[number], number>;
  for (const header of requiredHeaders) {
    if (positions[header] < 0) {
      throw new Error(`Inventory CSV is missing ${header}`);
    }
  }

  const entries: PageReviewInventoryEntry[] = [];
  const pageIds = new Set<string>();
  const canonicals = new Set<string>();

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (row.length !== headers.length) {
      throw new Error(
        `Inventory row ${rowIndex + 1} has ${row.length} columns; expected ${headers.length}`,
      );
    }

    const pageId = row[positions.page_id].trim();
    const rawCanonical = row[positions.canonical_url].trim();
    const rawPageType = row[positions.page_type].trim().toLowerCase();
    if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(pageId)) {
      throw new Error(`Inventory row ${rowIndex + 1} has an invalid page_id`);
    }
    const pageFamily = inventoryPageFamilyByType[
      rawPageType as keyof typeof inventoryPageFamilyByType
    ];
    if (!pageFamily) {
      throw new Error(
        `Inventory row ${rowIndex + 1} has unsupported page_type: ${row[positions.page_type]}`,
      );
    }

    const canonical = new URL(rawCanonical);
    if (canonical.protocol !== "https:" || canonical.search || canonical.hash) {
      throw new Error(
        `Inventory row ${rowIndex + 1} must have a canonical HTTPS URL without query or fragment`,
      );
    }
    if (canonical.pathname.length > 1 && canonical.pathname.endsWith("/")) {
      canonical.pathname = canonical.pathname.slice(0, -1);
    }
    const canonicalUrl = canonical.toString();

    if (pageIds.has(pageId)) {
      throw new Error(`Inventory has duplicate page_id: ${pageId}`);
    }
    if (canonicals.has(canonicalUrl)) {
      throw new Error(`Inventory has duplicate canonical_url: ${canonicalUrl}`);
    }
    pageIds.add(pageId);
    canonicals.add(canonicalUrl);
    entries.push({ pageId, canonicalUrl, pageFamily });
  }

  return entries;
}
