import { z } from "zod";
import { fetchStates, fetchCounties, matchByName } from "../census/geography";
import { fetchVintages, type Dataset } from "../census/api";
import type { GeoCandidate } from "../census/types";

export const resolveGeographyConfig = {
  title: "Resolve a place name to Census geography codes",
  description:
    "Convert a place name like 'DeKalb County, Georgia' or 'Texas' into the FIPS " +
    "codes needed to query Census data. Returns all matching candidates rather than " +
    "guessing — if several places match, present them to the user and ask which they " +
    "meant. Call this before querying data for any named place.",
  inputSchema: z
    .object({
      query: z
        .string()
        .min(2)
        .max(100)
        .describe("Place name, e.g. 'DeKalb County' or 'Georgia'"),
      state: z
        .string()
        .optional()
        .describe(
          "Optional state name to narrow a county search, e.g. 'Georgia'. " +
            "Strongly recommended — county names repeat across states."
        ),
      vintage: z
        .number()
        .int()
        .optional()
        .describe("ACS year. Defaults to the most recent available."),
      dataset: z.enum(["acs1", "acs5"]).default("acs5"),
    })
    .strict(),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

interface Args {
  query: string;
  state?: string;
  vintage?: number;
  dataset: Dataset;
}

export async function resolveGeographyHandler({
  query,
  state,
  vintage,
  dataset,
}: Args) {
  // Default to the newest vintage and say so, rather than failing.
  let usedVintage = vintage;
  let vintageNote = "";
  if (!usedVintage) {
    const available = await fetchVintages(dataset);
    usedVintage = available[available.length - 1];
    vintageNote = ` (defaulted to ${usedVintage}, the most recent ${dataset} vintage)`;
  }

  const states = await fetchStates(usedVintage, dataset);
  const results: GeoCandidate[] = [];

  // A direct state-name match is worth returning on its own.
  results.push(...matchByName(states, query));

  // Search counties, scoped to one state when we can — 50 fetches is not an option.
  const searchStates = state ? matchByName(states, state) : [];
  for (const s of searchStates) {
    const counties = await fetchCounties(usedVintage, dataset, s.state);
    results.push(...matchByName(counties, query));
  }

  if (results.length === 0) {
    const hint = state
      ? `No match for "${query}" in ${state}.`
      : `No match for "${query}". If this is a county, pass the 'state' argument — ` +
        `county names repeat across states and a nationwide search isn't supported.`;
    return {
      content: [{ type: "text" as const, text: hint }],
      isError: true,
    };
  }

  const lines = results.map(
    (r) =>
      `${r.name} — level: ${r.level}, state FIPS: ${r.state}` +
      (r.county ? `, county FIPS: ${r.county}` : "")
  );

  return {
    content: [
      {
        type: "text" as const,
        text:
          `Found ${results.length} match(es)${vintageNote}:\n` + lines.join("\n"),
      },
    ],
  };
}