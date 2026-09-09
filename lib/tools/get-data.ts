import { z } from "zod";
import { fetchData, formatTable, MAX_ROWS } from "../census/data";
import { fetchVintages, type Dataset } from "../census/api";

export const getDataConfig = {
  title: "Get ACS data",
  description:
    "Retrieve American Community Survey estimates for one or more variables in a " +
    "given geography. Requires variable codes from search_columns and FIPS codes " +
    "from resolve_geography — call those first. Pass '*' as the county to get every " +
    "county in a state, which is useful for comparisons. Omit county entirely for " +
    "state-level figures.",
  inputSchema: z
    .object({
      variables: z
        .array(z.string().regex(/^[A-Z]\d{5}[A-Z]?_\d{3}[A-Z]*$/))
        .min(1)
        .max(20)
        .describe(
          "Variable codes from search_columns, e.g. ['B19013_001E']. Max 20."
        ),
      state: z
        .string()
        .regex(/^(\d{2}|\*)$/)
        .describe("Two-digit state FIPS, or '*' for all states."),
      county: z
        .string()
        .regex(/^(\d{3}|\*)$/)
        .optional()
        .describe(
          "Three-digit county FIPS, or '*' for all counties in the state. " +
            "Omit for state-level data."
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
  variables: string[];
  state: string;
  county?: string;
  vintage?: number;
  dataset: Dataset;
}

export async function getDataHandler({
  variables,
  state,
  county,
  vintage,
  dataset,
}: Args) {
  let usedVintage = vintage;
  let vintageNote = "";
  if (!usedVintage) {
    const available = await fetchVintages(dataset);
    usedVintage = available[available.length - 1];
    vintageNote = ` (defaulted to ${usedVintage}, the most recent ${dataset} vintage)`;
  }

  const result = await fetchData(usedVintage, dataset, variables, {
    state,
    county,
  });

  if (result.rows.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text:
            `No data returned for that geography in ${dataset} ${usedVintage}. ` +
            `If you used acs1, note it only covers areas over 65,000 population — ` +
            `try acs5 instead.`,
        },
      ],
      isError: true,
    };
  }

  const header =
    `ACS ${dataset} ${usedVintage}${vintageNote}, ` +
    `${result.totalRows} row(s)` +
    (result.truncated
      ? `, showing first ${MAX_ROWS}. Narrow the geography to see the rest.`
      : ".");

  return {
    content: [
      {
        type: "text" as const,
        text: `${header}\n\n${formatTable(result)}`,
      },
    ],
  };
}