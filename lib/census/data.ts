import { fetchCensusRows, type Dataset } from "./api";
import type { Vintage } from "./types";

/** Hard cap on rows returned, so a wildcard query can't flood the context. */
export const MAX_ROWS = 200;

export interface GeographySpec {
  /** State FIPS, or "*" for all states. */
  state: string;
  /** County FIPS within the state, or "*" for all counties. Omit for state-level. */
  county?: string;
}

export interface DataResult {
  /** Column headers in order, e.g. ["NAME", "B19013_001E", "state", "county"] */
  headers: string[];
  /** Data rows, positionally aligned with headers. */
  rows: string[][];
  /** True when results were cut off at MAX_ROWS. */
  truncated: boolean;
  /** Rows available before truncation. */
  totalRows: number;
}

/**
 * Build the `for` and `in` parameters the Census API expects.
 * The API models geography hierarchically: a county query needs its state,
 * so the narrowest level goes in `for` and its parents in `in`.
 */
function geographyParams(geo: GeographySpec): Record<string, string> {
  if (geo.county !== undefined) {
    return {
      for: `county:${geo.county}`,
      in: `state:${geo.state}`,
    };
  }
  return { for: `state:${geo.state}` };
}

export async function fetchData(
  vintage: Vintage,
  dataset: Dataset,
  variables: string[],
  geo: GeographySpec
): Promise<DataResult> {
  // NAME comes back with every request so results are human-readable.
  const get = ["NAME", ...variables].join(",");

  const raw = await fetchCensusRows(vintage, dataset, {
    get,
    ...geographyParams(geo),
  });

  const [headers, ...allRows] = raw;
  const truncated = allRows.length > MAX_ROWS;

  return {
    headers,
    rows: truncated ? allRows.slice(0, MAX_ROWS) : allRows,
    truncated,
    totalRows: allRows.length,
  };
}

/** Render results as a plain text table the model can read directly. */
export function formatTable(result: DataResult): string {
  const { headers, rows } = result;

  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length))
  );

  const line = (cells: string[]) =>
    cells.map((c, i) => (c ?? "").padEnd(widths[i])).join("  ");

  return [
    line(headers),
    widths.map((w) => "-".repeat(w)).join("  "),
    ...rows.map(line),
  ].join("\n");
}