import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  normalizeOwnerPage,
  normalizeSavedQuery,
} from "../lib/saved-keyword-ownership.ts";

assert.equal(
  normalizeSavedQuery("  Hoh   River Fishing Report "),
  "hoh river fishing report",
);
assert.equal(
  normalizeOwnerPage(
    "https://bluestreamfly.com/fly-fishing-reports/idaho/lochsa-river/",
    "bluestreamfly.com",
  ),
  "https://bluestreamfly.com/fly-fishing-reports/idaho/lochsa-river",
);
assert.equal(
  normalizeOwnerPage(
    "https://www.bluestreamfly.com/fly-fishing-reports/idaho/lochsa-river",
    "bluestreamfly.com",
  ),
  "https://bluestreamfly.com/fly-fishing-reports/idaho/lochsa-river",
  "www input canonicalizes to the configured bare host",
);
assert.equal(
  normalizeOwnerPage("https://bluestreamfly.com/page", "www.bluestreamfly.com"),
  "https://www.bluestreamfly.com/page",
  "bare input canonicalizes to the configured www host",
);
assert.equal(
  normalizeOwnerPage("https://bluestreamfly.com:443/page", "bluestreamfly.com"),
  "https://bluestreamfly.com/page",
  "the standard HTTPS port canonicalizes away",
);
assert.throws(
  () => normalizeOwnerPage("https://bluestreamfly.com/page?preview=1"),
  /canonical URL/,
);
assert.throws(
  () => normalizeOwnerPage("https://example.com/page", "bluestreamfly.com"),
  /must belong/,
);
assert.throws(
  () =>
    normalizeOwnerPage(
      "https://user:secret@bluestreamfly.com/page",
      "bluestreamfly.com",
    ),
  /credentials/,
);
assert.throws(
  () =>
    normalizeOwnerPage(
      "https://bluestreamfly.com:8443/page",
      "bluestreamfly.com",
    ),
  /standard HTTPS port/,
);

const [schema, userRoute, internalRoute, invariantMigration] = await Promise.all([
  readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8"),
  readFile(
    new URL("../app/api/sites/[siteId]/saved-keywords/route.ts", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../app/api/internal/bsf/keyword-owners/route.ts", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL(
      "../prisma/migrations/20260813211500_enforce_single_keyword_owner/migration.sql",
      import.meta.url,
    ),
    "utf8",
  ),
]);

assert.match(schema, /model SavedKeyword[\s\S]*@@unique\(\[siteId, query\]\)/);
assert.doesNotMatch(schema, /@@unique\(\[siteId, query, ownerPage\]\)/);
assert.match(userRoute, /siteId_query:\s*\{/);
assert.match(userRoute, /update:\s*\{[\s\S]*ownerPage,/);
assert.match(internalRoute, /siteId_query:\s*\{/);
assert.match(internalRoute, /new Set\(normalized\.map\(\(owner\) => owner\.query\)\)/);
assert.match(
  invariantMigration,
  /CREATE UNIQUE INDEX "SavedKeyword_siteId_query_key"/,
);
assert.doesNotMatch(
  invariantMigration,
  /CREATE UNIQUE INDEX "SavedKeyword_siteId_query_ownerPage_key"/,
);

console.log("Saved keyword ownership checks passed.");
