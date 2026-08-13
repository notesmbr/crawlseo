import { db } from "./db.ts";
import type { KeywordData } from "@/lib/google";

export type StoredKeywordRow = {
  query: string;
  page: string;
  device: string;
  country: string;
  date: Date;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type KeywordMetricRow = Pick<
  StoredKeywordRow,
  "clicks" | "impressions" | "position"
>;

export function rollupKeywordMetrics(rows: KeywordMetricRow[]) {
  let clicks = 0;
  let impressions = 0;
  let positionWeight = 0;
  let weightedPosition = 0;

  for (const row of rows) {
    const weight = row.impressions > 0 ? row.impressions : 1;
    clicks += row.clicks;
    impressions += row.impressions;
    positionWeight += weight;
    weightedPosition += row.position * weight;
  }

  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: positionWeight > 0 ? weightedPosition / positionWeight : 0,
  };
}

function utcDay(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid GSC date: ${value}`);
  return date;
}

export function normalizeQuery(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeLandingPage(value: string) {
  const url = new URL(value);
  url.hash = "";
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

function requiredDimension(
  value: string | undefined,
  dimension: "query" | "page" | "device" | "country",
) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`GSC keyword row is missing its ${dimension} dimension`);
  }
  return normalized;
}

export function prepareKeywordRows(rows: KeywordData[]): StoredKeywordRow[] {
  type Accumulator = StoredKeywordRow & {
    positionWeight: number;
    weightedPosition: number;
  };
  const grouped = new Map<string, Accumulator>();

  for (const row of rows) {
    const query = normalizeQuery(requiredDimension(row.query, "query"));
    const page = normalizeLandingPage(requiredDimension(row.page, "page"));
    const device = requiredDimension(row.device, "device").toUpperCase();
    const country = requiredDimension(row.country, "country").toLowerCase();
    const date = utcDay(row.date);
    const dateKey = date.toISOString().slice(0, 10);
    const key = [query, dateKey, page, device, country].join("\u0000");
    const positionWeight = row.impressions > 0 ? row.impressions : 1;
    const existing = grouped.get(key);

    if (existing) {
      existing.clicks += row.clicks;
      existing.impressions += row.impressions;
      existing.positionWeight += positionWeight;
      existing.weightedPosition += row.position * positionWeight;
      continue;
    }

    grouped.set(key, {
      query,
      page,
      device,
      country,
      date,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: 0,
      position: 0,
      positionWeight,
      weightedPosition: row.position * positionWeight,
    });
  }

  return [...grouped.values()]
    .map(({ positionWeight, weightedPosition, ...row }) => {
      const metrics = rollupKeywordMetrics([
        {
          clicks: row.clicks,
          impressions: row.impressions,
          position: positionWeight > 0 ? weightedPosition / positionWeight : 0,
        },
      ]);
      return { ...row, ...metrics };
    })
    .sort(
      (a, b) =>
        a.date.getTime() - b.date.getTime() ||
        a.query.localeCompare(b.query) ||
        a.page.localeCompare(b.page) ||
        a.device.localeCompare(b.device) ||
        a.country.localeCompare(b.country),
    );
}

export async function replaceKeywordRows(
  siteId: string,
  startDate: string,
  endDate: string,
  rawRows: KeywordData[],
) {
  const rows = prepareKeywordRows(rawRows);
  const start = utcDay(startDate);
  const end = utcDay(endDate);

  await db.$transaction(async (tx) => {
    await tx.keyword.deleteMany({
      where: { siteId, date: { gte: start, lte: end } },
    });

    const batchSize = 1_000;
    for (let index = 0; index < rows.length; index += batchSize) {
      await tx.keyword.createMany({
        data: rows.slice(index, index + batchSize).map((row) => ({
          siteId,
          ...row,
        })),
      });
    }
  });

  return rows.length;
}
