import type { Vintage } from "./types";

const CATALOG_URL = "https://api.census.gov/data.json";
const FETCH_TIMEOUT_MS = 10_000;

/** Datasets we expose. acs5 covers all geographies; acs1 needs pop > 65,000. */
export type Dataset = "acs1" | "acs5";

export function baseUrl(vintage: Vintage, dataset: Dataset): string {
  return `https://api.census.gov/data/${vintage}/acs/${dataset}`;
}

/**
 * The dataset catalog changes about once a year, so we fetch it once per
 * process. Caching the promise (not the result) means concurrent callers
 * share a single request instead of racing.
 */
let catalogPromise: Promise<{ dataset: unknown[] }> | null = null;

async function getCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetchJson(CATALOG_URL).catch((err) => {
      // Don't cache failures — the next call should retry.
      catalogPromise = null;
      throw err;
    });
  }
  return catalogPromise;
}

/** Fetch with a hard timeout so a hung upstream fails fast and legibly. */
async function fetchJson(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`Census API returned HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

/** Vintages available for a dataset, ascending. */
export async function fetchVintages(dataset: Dataset): Promise<Vintage[]> {
  const catalog = await getCatalog();

  return (catalog.dataset as Array<{ c_dataset?: string[]; c_vintage: number }>)
    .filter(
      (d) =>
        Array.isArray(d.c_dataset) &&
        d.c_dataset.length === 2 &&
        d.c_dataset[0] === "acs" &&
        d.c_dataset[1] === dataset
    )
    .map((d) => d.c_vintage)
    .sort((a, b) => a - b);
}