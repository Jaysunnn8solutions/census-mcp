import { fetchCensusRows, type Dataset } from "./api";
import type { GeoCandidate, Vintage } from "./types";

/** Turn Census rows (row 0 = headers) into objects keyed by header name. */
function toObjects(rows: string[][]): Record<string, string>[] {
  const [headers, ...data] = rows;
  return data.map((row) =>
    Object.fromEntries(headers.map((h, i) => [h, row[i]]))
  );
}

/**
 * All states, cached per process. Small (52 rows) and never changes
 * within a vintage, so one fetch serves every lookup.
 */
const stateCache = new Map<string, Promise<GeoCandidate[]>>();

export function fetchStates(
  vintage: Vintage,
  dataset: Dataset
): Promise<GeoCandidate[]> {
  const cacheKey = `${vintage}:${dataset}`;
  let cached = stateCache.get(cacheKey);
  if (!cached) {
    cached = fetchCensusRows(vintage, dataset, {
      get: "NAME",
      for: "state:*",
    })
      .then((rows) =>
        toObjects(rows).map((r) => ({
          name: r.NAME,
          level: "state" as const,
          state: r.state,
        }))
      )
      .catch((err) => {
        stateCache.delete(cacheKey);
        throw err;
      });
    stateCache.set(cacheKey, cached);
  }
  return cached;
}

/** Counties within one state. */
export async function fetchCounties(
  vintage: Vintage,
  dataset: Dataset,
  stateFips: string
): Promise<GeoCandidate[]> {
  const rows = await fetchCensusRows(vintage, dataset, {
    get: "NAME",
    for: "county:*",
    in: `state:${stateFips}`,
  });
  return toObjects(rows).map((r) => ({
    name: r.NAME,
    level: "county" as const,
    state: r.state,
    county: r.county,
  }));
}

/** Case-insensitive substring match on the Census NAME field. */
export function matchByName(
  candidates: GeoCandidate[],
  query: string
): GeoCandidate[] {
  const q = query.trim().toLowerCase();
  return candidates.filter((c) => c.name.toLowerCase().includes(q));
}