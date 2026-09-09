import type { Vintage } from "./types";

const CATALOG_URL = "https://api.census.gov/data.json";

/** Datasets we expose. acs5 covers all geographies; acs1 needs pop > 65,000. */
export type Dataset = "acs1" | "acs5";

export function baseUrl(vintage: Vintage, dataset: Dataset): string {
  return `https://api.census.gov/data/${vintage}/acs/${dataset}`;
}

/** Vintages available for a dataset, ascending. Network call — cache the result. */
export async function fetchVintages(dataset: Dataset): Promise<Vintage[]> {
  const res = await fetch(CATALOG_URL);
  if (!res.ok) {
    throw new Error(`Census catalog unavailable (HTTP ${res.status})`);
  }
  const catalog = await res.json();

  return catalog.dataset
    .filter(
      (d: { c_dataset?: string[] }) =>
        Array.isArray(d.c_dataset) &&
        d.c_dataset.length === 2 &&
        d.c_dataset[0] === "acs" &&
        d.c_dataset[1] === dataset
    )
    .map((d: { c_vintage: number }) => d.c_vintage)
    .sort((a: number, b: number) => a - b);
}