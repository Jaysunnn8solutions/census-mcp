import { z } from "zod";
import { getVariables, searchVariables } from "../census/variables";
import { fetchVintages, type Dataset } from "../census/api";

export const searchColumnsConfig = {
  title: "Search ACS variables",
  description:
    "Find American Community Survey variable codes by keyword. ACS has roughly " +
    "28,000 variables per year, so you cannot browse them — search instead. " +
    "Query with plain language describing the measure you want, e.g. 'median " +
    "household income', 'poverty', 'median home value', 'commute time'. Returns " +
    "variable codes to pass when querying data. All query terms must match, so " +
    "start broad and narrow if there are too many results.",
  inputSchema: z
    .object({
      query: z
        .string()
        .min(2)
        .max(100)
        .describe("Keywords describing the measure, e.g. 'median household income'"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(15)
        .describe("Maximum results to return"),
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
  limit: number;
  vintage?: number;
  dataset: Dataset;
}

export async function searchColumnsHandler({
  query,
  limit,
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

  const variables = await getVariables(usedVintage, dataset);
  const results = searchVariables(variables, query, limit);

  if (results.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text:
            `No variables matched "${query}" in ${dataset} ${usedVintage}. ` +
            `All terms must match — try fewer or broader words.`,
        },
      ],
      isError: true,
    };
  }

  const lines = results.map((r) => {
    const label = r.label.replace(/!!/g, " > ").replace(/:$/, "");
    return `${r.name} — ${r.concept}\n    ${label}`;
  });

  return {
    content: [
      {
        type: "text" as const,
        text:
          `${results.length} match(es) for "${query}"${vintageNote}, ` +
          `searched ${variables.length} variables:\n\n` +
          lines.join("\n"),
      },
    ],
  };
}