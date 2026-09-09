import { z } from "zod";
import { fetchVintages, type Dataset } from "../census/api";

export const listVintagesConfig = {
  title: "List ACS vintages",
  description:
    "List the American Community Survey data years (vintages) available for a dataset. " +
    "Call this when the user asks what years are available, or before querying if unsure " +
    "which vintage to use. acs5 (5-year estimates) covers all geographies including small " +
    "counties and tracts. acs1 (1-year estimates) is more current but only covers areas " +
    "with population over 65,000.",
  inputSchema: z
    .object({
      dataset: z
        .enum(["acs1", "acs5"])
        .default("acs5")
        .describe("Which ACS dataset. Defaults to acs5."),
    })
    .strict(),
  outputSchema: z
    .object({
      dataset: z.string(),
      vintages: z.array(z.number()).describe("Available years, ascending"),
      latest: z.number().describe("Most recent available vintage"),
    })
    .strict(),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

export async function listVintagesHandler({ dataset }: { dataset: Dataset }) {
  const vintages = await fetchVintages(dataset);

  if (vintages.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: `No vintages found for ${dataset}. The Census catalog may have changed.`,
        },
      ],
      isError: true,
    };
  }

  const latest = vintages[vintages.length - 1];

  return {
    content: [
      {
        type: "text" as const,
        text:
          `${dataset} vintages available: ${vintages[0]}–${latest}. ` +
          `Most recent is ${latest}.`,
      },
    ],
    structuredContent: { dataset, vintages, latest },
  };
}