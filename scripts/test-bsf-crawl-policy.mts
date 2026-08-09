import assert from "node:assert/strict";
import {
  classifyCrawlIssues,
  countImagesMissingAlt,
  crawlIssueFingerprint,
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
