import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { FeedItem } from "./types";

// Source adapters — each returns FeedItem[] ready for extraction+matching.
// Scope today: Reddit public JSON + DLD transactions CSV. Portals (Bayut /
// Property Finder / Dubizzle) are deliberately SKIPPED under the Spec 09
// honesty guardrail — their ToS prohibit scraping and we won't pretend
// otherwise for a demo build.

const UA =
  "ZAAHI-LandMonitor/0.1 (research/vision-and-competitors; legal contact d.tsvyk@gmail.com)";

export const SKIPPED_PORTAL_NOTES = [
  "Bayut (ToS prohibits automated scraping · partner API negotiation pending per Spec 09 §2.1.1)",
  "PropertyFinder (ToS prohibits scraping · Mubadala-adjacency → partner-API route preferred · Spec 09 §2.1.2)",
  "Dubizzle (ToS prohibits scraping · shared Dubizzle Group ownership with Bayut · Spec 09 §2.1.3)",
];

function hashId(source: string, sourceId: string): string {
  return crypto
    .createHash("sha1")
    .update(`${source}|${sourceId}`)
    .digest("hex")
    .slice(0, 16);
}

// ————————— Reddit —————————

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  permalink: string;
  author: string;
  created_utc: number;
  subreddit: string;
  is_self: boolean;
}

interface RedditListing {
  data?: { children?: Array<{ data: RedditPost }> };
}

const REDDIT_SUBREDDITS = ["dubai", "dubairealestate", "UAE"];

/**
 * Reddit public JSON endpoint — rate-limited to 60 req/min without auth.
 * We make 3 req/ingest (one per subreddit · new.json). Comfortable margin.
 */
export async function fetchReddit(): Promise<FeedItem[]> {
  const out: FeedItem[] = [];
  const now = new Date().toISOString();
  for (const sub of REDDIT_SUBREDDITS) {
    const url = `https://www.reddit.com/r/${sub}/new.json?limit=50`;
    try {
      const r = await fetch(url, { headers: { "user-agent": UA } });
      if (!r.ok) {
        console.error(`[land-monitor:reddit] ${sub} → ${r.status}`);
        continue;
      }
      const listing = (await r.json()) as RedditListing;
      const children = listing.data?.children ?? [];
      for (const { data } of children) {
        const body = [data.title, data.selftext].filter(Boolean).join("\n\n");
        if (!body.trim()) continue;
        out.push({
          id: hashId("REDDIT", data.id),
          source: "REDDIT",
          sourceLabel: `r/${data.subreddit}`,
          sourceUrl: `https://www.reddit.com${data.permalink}`,
          sourceId: data.id,
          title: data.title,
          snippet: body.slice(0, 200),
          postedAt: new Date(data.created_utc * 1000).toISOString(),
          ingestedAt: now,
          extracted: null,
          match: null,
          author: data.author ? `u/${data.author}` : null,
        });
      }
    } catch (e) {
      console.error(`[land-monitor:reddit] ${sub} failed:`, e);
    }
  }
  return out;
}

// ————————— DLD transactions CSV —————————

/**
 * Local CSV snapshot of DLD land transactions — shipped in data/. This is
 * *closed-transactions* data, not live listings. We surface the most recent
 * land-type rows so the pipeline has ground-truth recent land activity
 * to cross-reference with the Reddit feed. Honest about what it is: on the
 * UI we badge these as "Closed transaction (DLD)" not "Live listing".
 */
export async function fetchDldTransactionsCsv(): Promise<FeedItem[]> {
  const csvPath = path.join(process.cwd(), "data/dld-transactions.csv");
  let text: string;
  try {
    text = await fs.readFile(csvPath, "utf8");
  } catch {
    return [];
  }
  const lines = text.split("\n");
  if (lines.length < 2) return [];
  const header = lines[0].replace(/^﻿/, "").split(",");
  // Try to locate fields we care about tolerantly — DLD CSV headers shift.
  const idxDate = header.findIndex((h) => /date/i.test(h) && !/registration/i.test(h));
  const idxArea = header.findIndex((h) => /area_en|AREA_EN/i.test(h));
  const idxPrice = header.findIndex((h) => /value|amount|price/i.test(h));
  const idxType = header.findIndex((h) => /property.*sub.*type|prop_sub_type/i.test(h));
  const idxProject = header.findIndex((h) => /project_en|PROJECT_EN/i.test(h));
  const out: FeedItem[] = [];
  const now = new Date().toISOString();
  // Take the last 50 rows with recognisable fields — the CSV is historical,
  // so "last 50" is a demo heuristic not a claim about real-time data.
  const sliced = lines.slice(-200).filter(Boolean);
  let emitted = 0;
  for (let i = sliced.length - 1; i >= 0 && emitted < 50; i--) {
    const row = sliced[i];
    const cells = row.split(",").map((c) => c.replace(/^"|"$/g, ""));
    const date = idxDate >= 0 ? cells[idxDate] : "";
    const area = idxArea >= 0 ? cells[idxArea] : "";
    const price = idxPrice >= 0 ? cells[idxPrice] : "";
    const subType = idxType >= 0 ? cells[idxType] : "";
    const project = idxProject >= 0 ? cells[idxProject] : "";
    if (!area && !price) continue;
    // Only land / plot / agricultural records for today's land-focused MVP.
    if (!/land|plot|agricultural|residential|commercial/i.test(subType)) continue;
    const sourceId = `csv-${i}-${area}-${price}`;
    const title = `DLD transaction · ${area}${project ? ` · ${project}` : ""}`;
    const snippet = `${subType || "LAND"} · ${area || "(area unknown)"} · AED ${price || "?"} · ${date || "(undated)"}`;
    out.push({
      id: hashId("DLD_TRANSACTIONS_CSV", sourceId),
      source: "DLD_TRANSACTIONS_CSV",
      sourceLabel: "DLD Transactions (CSV snapshot)",
      sourceUrl: "https://dubailand.gov.ae/en/open-data/real-estate-data/",
      sourceId,
      title,
      snippet,
      postedAt: date
        ? new Date(Date.parse(date) || Date.now()).toISOString()
        : now,
      ingestedAt: now,
      extracted: null,
      match: null,
      author: "DLD Open Data",
    });
    emitted++;
  }
  return out;
}
