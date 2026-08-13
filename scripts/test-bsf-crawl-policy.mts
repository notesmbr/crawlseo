import assert from "node:assert/strict";
import {
  classifyCrawlIssues,
  countImagesMissingAlt,
  crawlIssueFingerprint,
  decodeHtmlEntities,
  indexablePagesOnly,
  indexableUrlsMissingFromSitemap,
  shouldEnqueueCrawlUrl,
  sitemapQueueUrls,
  type CrawlIssueLike,
} from "../lib/crawler/policy.ts";

const imageAudit = countImagesMissingAlt(`
  <img src="hero.jpg" alt="River at sunrise">
  <img src="divider.svg" alt="">
  <img src="texture.svg" data-alt="decorative">
`);
assert.deepEqual(imageAudit, { imageCount: 3, imagesMissingAlt: 1 });

const sitemapUrls = Array.from({ length: 750 }, (_, index) => `https://example.com/${index}`);
assert.equal(sitemapQueueUrls(sitemapUrls, 1_000).length, 750);
assert.equal(sitemapQueueUrls(sitemapUrls, 200).length, 200);

const canonicalSet = new Set([
  "https://example.com/",
  "https://example.com/river",
]);
assert.equal(
  shouldEnqueueCrawlUrl("https://example.com/river", {
    sitemapOnly: true,
    allowedUrls: canonicalSet,
  }),
  true,
);
assert.equal(
  shouldEnqueueCrawlUrl("https://example.com/river?source=widget", {
    sitemapOnly: true,
    allowedUrls: canonicalSet,
  }),
  false,
);
assert.equal(
  shouldEnqueueCrawlUrl("https://example.com/private", {
    sitemapOnly: true,
    allowedUrls: canonicalSet,
  }),
  false,
);
assert.equal(
  shouldEnqueueCrawlUrl("https://example.com/private", { sitemapOnly: false }),
  true,
);

assert.equal(
  decodeHtmlEntities("/app/open/river?river_id=pine&amp;source=web&#x5F;river"),
  "/app/open/river?river_id=pine&source=web_river",
);

const indexabilityPages = [
  { url: "https://example.com/", indexable: true },
  { url: "https://example.com/private", indexable: false },
  { url: "https://example.com/new", indexable: true },
];
assert.deepEqual(indexablePagesOnly(indexabilityPages), [
  indexabilityPages[0],
  indexabilityPages[2],
]);
assert.deepEqual(
  indexableUrlsMissingFromSitemap(indexabilityPages, ["https://example.com/"]),
  ["https://example.com/new"],
);

const missingTitle: CrawlIssueLike = {
  url: "https://example.com/new-page/",
  type: "MISSING_TITLE",
  severity: "CRITICAL",
  message: "Missing <title> tag",
};
const informational: CrawlIssueLike = {
  url: "https://example.com/new-page",
  type: "MISSING_SCHEMA",
  severity: "INFO",
  message: "No structured data",
};
const fingerprint = crawlIssueFingerprint(missingTitle);

const firstNewRun = classifyCrawlIssues([missingTitle, informational], {
  hasVerifiedBaseline: true,
  baselineFingerprints: new Set(),
  previousFingerprints: new Set(),
});
assert.equal(firstNewRun[0].isNew, true);
assert.equal(firstNewRun[0].isActionable, true);
assert.equal(firstNewRun[0].isVerified, false);
assert.equal(firstNewRun[0].suppressedReason, "awaiting_second_crawl");
assert.equal(firstNewRun[1].isActionable, false);

const repeatedRun = classifyCrawlIssues([missingTitle], {
  hasVerifiedBaseline: true,
  baselineFingerprints: new Set(),
  previousFingerprints: new Set([fingerprint]),
});
assert.equal(repeatedRun[0].isVerified, true);
assert.equal(repeatedRun[0].suppressedReason, null);

const knownBaselineRun = classifyCrawlIssues([missingTitle], {
  hasVerifiedBaseline: true,
  baselineFingerprints: new Set([fingerprint]),
  previousFingerprints: new Set([fingerprint]),
});
assert.equal(knownBaselineRun[0].isNew, false);
assert.equal(knownBaselineRun[0].isVerified, false);
assert.equal(knownBaselineRun[0].suppressedReason, "known_baseline");

console.log("BlueStreamFly crawl policy checks passed.");
