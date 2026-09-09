import type { Dataset } from "./api";
import { baseUrl } from "./api";
import type { Vintage } from "./types";

const FETCH_TIMEOUT_MS = 15_000;

/** Cap how many catalogs we hold — each is roughly 10MB of raw JSON. */
const MAX_CACHED_CATALOGS = 2;

export interface CensusVariable {
  /** Variable code, e.g. "B19013_001E" */
  name: string;
  /** Hierarchical label, "!!"-delimited in the source */
  label: string;
  /** Table subject, e.g. "Median Household Income" */
  concept: string;
  /** Table ID, e.g. "B19013" */
  group: string;
  /** Lowercased label + concept, precomputed for matching */
  searchText: string;
}

/** Raw shape of one entry in variables.json */
interface RawVariable {
  label?: string;
  concept?: string;
  group?: string;
}

const catalogs = new Map<string, Promise<CensusVariable[]>>();

/**
 * Load and normalize the variable catalog for a vintage.
 * The raw payload is ~10MB / 28k entries, so we strip it to the fields we
 * search on and cache per process. Insertion-ordered eviction keeps memory
 * bounded when several vintages get queried.
 */
export function getVariables(
  vintage: Vintage,
  dataset: Dataset
): Promise<CensusVariable[]> {
  const key = `${vintage}:${dataset}`;
  let cached = catalogs.get(key);

  if (!cached) {
    cached = fetchVariables(vintage, dataset).catch((err) => {
      catalogs.delete(key);
      throw err;
    });
    catalogs.set(key, cached);

    while (catalogs.size > MAX_CACHED_CATALOGS) {
      const oldest = catalogs.keys().next().value;
      if (oldest === undefined) break;
      catalogs.delete(oldest);
    }
  }

  return cached;
}

async function fetchVariables(
  vintage: Vintage,
  dataset: Dataset
): Promise<CensusVariable[]> {
  const url = `${baseUrl(vintage, dataset)}/variables.json`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(
      `Could not load variable catalog for ${dataset} ${vintage} (HTTP ${res.status})`
    );
  }

  const json = (await res.json()) as { variables: Record<string, RawVariable> };

  const out: CensusVariable[] = [];
  for (const [name, raw] of Object.entries(json.variables)) {
    // Skip geography and metadata pseudo-variables; keep real estimates only.
    if (!raw.group || !raw.label) continue;
    if (raw.group === "N/A") continue;

    // Some pseudo-variables (GEO_ID, SUMLEVEL) carry every table ID in their
    // group field and every concept in their concept field, which makes them
    // match any query and balloons the payload. Real variables belong to one
    // table and are named like B19013_001E.
    if (raw.group.includes(",")) continue;
    if (!/^[A-Z]\d{5}[A-Z]?_\d{3}[A-Z]*$/.test(name)) continue;

    const label = raw.label;
    const concept = raw.concept ?? "";
    out.push({
      name,
      label,
      concept,
      group: raw.group,
      searchText: `${label} ${concept}`.toLowerCase().replace(/!!/g, " "),
    });
  }

  return out;
}

export interface ScoredVariable extends CensusVariable {
  score: number;
}

/**
 * Rank variables against a query.
 *
 * Scoring is deliberately simple: every query term must appear somewhere in
 * the variable's text (AND, not OR), then results are ranked by signals that
 * correlate with what people actually want — matches in the concept beat
 * matches deep in a label, and shorter labels beat longer ones because ACS
 * labels grow with each level of cross-tabulation.
 */
export function searchVariables(
  variables: CensusVariable[],
  query: string,
  limit = 25
): ScoredVariable[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (terms.length === 0) return [];

  const scored: ScoredVariable[] = [];

  for (const v of variables) {
    if (!terms.every((t) => v.searchText.includes(t))) continue;

    let score = 0;
    const conceptLower = v.concept.toLowerCase();

    // A term in the concept is a stronger signal than one buried in a label.
    for (const t of terms) {
      if (conceptLower.includes(t)) score += 10;
    }

    // Exact phrase match anywhere is a very strong signal.
    if (v.searchText.includes(query.toLowerCase())) score += 25;

    // Prefer totals over deeply nested cross-tabulations.
    const depth = (v.label.match(/!!/g) ?? []).length;
    score -= depth * 2;

    scored.push({ ...v, score });
  }

  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored.slice(0, limit);
}