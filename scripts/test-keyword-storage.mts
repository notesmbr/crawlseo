import assert from "node:assert/strict";
import {
  normalizeQuery,
  prepareKeywordRows,
  rollupKeywordMetrics,
} from "../lib/keyword-storage.ts";

assert.equal(normalizeQuery("  Hoh   River Fishing Report "), "hoh river fishing report");

const rows = prepareKeywordRows([
  {
    query: "river report",
    page: "https://example.com/river-a",
    date: "2026-08-01",
    device: "MOBILE",
    country: "USA",
    clicks: 2,
    impressions: 10,
    ctr: 0.2,
    position: 4,
  },
  {
    query: "river report",
    page: "https://example.com/river-a",
    date: "2026-08-01",
    device: "MOBILE",
    country: "USA",
    clicks: 1,
    impressions: 5,
    ctr: 0.2,
    position: 10,
  },
  {
    query: "river report",
    page: "https://example.com/river-a/",
    date: "2026-08-01",
    device: "DESKTOP",
    country: "USA",
    clicks: 1,
    impressions: 5,
    ctr: 0.2,
    position: 10,
  },
  {
    query: "river report",
    page: "https://example.com/river-b",
    date: "2026-08-01",
    device: "MOBILE",
    country: "USA",
    clicks: 0,
    impressions: 3,
    ctr: 0,
    position: 20,
  },
]);

assert.equal(
  rows.length,
  3,
  "page, device, and country must remain part of the stored GSC grain",
);
assert.deepEqual(
  rows.map((row) => [
    row.page,
    row.device,
    row.country,
    row.clicks,
    row.impressions,
    row.position,
  ]),
  [
    ["https://example.com/river-a", "DESKTOP", "usa", 1, 5, 10],
    ["https://example.com/river-a", "MOBILE", "usa", 3, 15, 6],
    ["https://example.com/river-b", "MOBILE", "usa", 0, 3, 20],
  ],
);

assert.throws(
  () => prepareKeywordRows([{ ...rows[0], date: "2026-08-01", device: undefined }]),
  /missing its device dimension/,
);

assert.deepEqual(
  rollupKeywordMetrics([
    { clicks: 2, impressions: 10, position: 4 },
    { clicks: 1, impressions: 5, position: 10 },
  ]),
  { clicks: 3, impressions: 15, ctr: 0.2, position: 6 },
);

console.log("Keyword query-to-page storage checks passed.");
