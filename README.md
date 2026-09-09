# Census MCP

An [MCP](https://modelcontextprotocol.io) server that gives Claude structured access to U.S. Census American Community Survey (ACS) data — geography resolution, variable discovery, and data retrieval.

**Live server:** `https://census-mcp.vercel.app/mcp`
**Landing page:** https://census-mcp.vercel.app

Authless and read-only. No account or API key is needed to use it.

---

## Try it

**Claude (web or desktop)**

Settings → Connectors → Add custom connector → paste the URL above. Leave the OAuth fields empty.

**Claude Code**

```bash
claude mcp add --transport http census https://census-mcp.vercel.app/mcp
```

Then ask something like *"What's the median household income in Fulton County, Georgia?"*

---

## Tools

| Tool | Purpose |
|---|---|
| `list_vintages` | Which ACS years are available, and which is newest. Read from the Census catalog at runtime, not hardcoded. |
| `resolve_geography` | Converts a place name into the FIPS codes needed to query data. Returns all candidates rather than guessing. |
| `search_columns` | Finds variable codes by plain-language keyword across ~28,000 variables per vintage, ranked by relevance. |
| `get_data` | Retrieves estimates for chosen variables and geography. Supports wildcards for cross-geography comparison. |

### Example

A single question exercises three of them. The server exposes primitives; Claude decides how to combine them.

```
> What's the median household income in Fulton County, Georgia?

resolve_geography { query: "Fulton County", state: "Georgia" }
  → Fulton County, Georgia — state FIPS: 13, county FIPS: 121

search_columns { query: "median household income", limit: 5 }
  → B19013_001E — Median Household Income in the Past 12 Months
    (+ 4 race/ethnicity breakdowns)

get_data { variables: ["B19013_001E"], state: "13", county: "121" }
  → Fulton County, Georgia  95292

The median household income in Fulton County, Georgia is $95,292.
```

---

## Design decisions

**Discovery over enumeration.** A single ACS vintage publishes ~28,000 variables. That cannot fit in a model's context, so variable discovery is a ranked search tool rather than a schema dump. Scoring weights matches in the table concept above matches deep in a label, and penalizes cross-tabulation depth — ACS labels grow with each dimension, and the plain total is usually what someone means.

**Ambiguity is returned, not resolved.** `resolve_geography` returns every candidate. County names repeat across states, and guessing which DeKalb someone meant would produce confident wrong answers. When the query is ambiguous the model is told so and can ask.

**Defaults are stated, not silent.** Omitting a vintage doesn't fail; the server uses the newest available and says so in the response text, so the model can surface or override the assumption. Rejecting the call instead would cost a round trip and a chance for the model to give up.

**`acs5` is the default dataset.** The 1-year series only covers areas above 65,000 population, so a question about a rural county would silently return nothing. The 5-year series covers all geographies.

**Read-only by construction.** Every tool is annotated `readOnlyHint: true` and there is no write path. The Census API key is held server-side, so nobody connecting needs a credential — and the server can't be used to reach anything but the Census API.

**Bounded resources.** Variable catalogs are ~10 MB each and cached per process with capped eviction. Failed fetches are not cached, so a transient error doesn't poison the process. All outbound requests carry hard timeouts (10s data, 15s catalog) so a slow upstream fails with a readable message rather than being killed at the platform's 60s function limit.

**Results are capped with an explicit notice.** Wildcard queries can return every county in a state. Output is truncated at 200 rows and the response says so, so the model knows it didn't see everything.

**Errors are guidance, not stack traces.** The Census API returns HTTP 200 with an HTML error page on failure, which would otherwise surface as a JSON parse error. That's detected and translated. Empty results explain the likely cause — usually `acs1` coverage — rather than just reporting zero rows.

---

## Architecture

```
app/mcp/route.ts        tool registration only
lib/tools/              MCP schemas + handlers (one file per tool)
lib/census/             Census API client, geography, variables, data
  ├── api.ts            HTTP, key injection, error translation, catalog cache
  ├── geography.ts      state/county lookup and name matching
  ├── variables.ts      variable catalog load + ranked search
  ├── data.ts           estimate retrieval and table formatting
  └── types.ts          shared types
```

`lib/census/` knows about the Census API but nothing about MCP. `lib/tools/` knows about MCP but delegates data work downward. That boundary keeps the census logic unit-testable without spinning up a server.

---

## Running locally

Requires Node 22+ and a [Census API key](https://api.census.gov/data/key_signup.html) (free).

```bash
npm install
echo "CENSUS_API_KEY=your_key_here" > .env.local
npm run dev
```

Then point a client at `http://localhost:3000/mcp`:

```bash
claude mcp add --transport http census-local http://localhost:3000/mcp
```

```bash
npm run type-check   # tsc --noEmit
npm run lint
npm run build
```

---

## Notes and limitations

- Geography resolution covers states and counties. Places, tracts, and block groups are supported by the Census API but not yet exposed.
- County search requires a state to scope it — a nationwide county scan would mean 50 API calls per query.
- Variable search is keyword-based, not semantic. Precomputed embeddings would improve recall on paraphrases; keyword matching works well here because ACS labels are unusually verbose and descriptive.
- The catalog cache is per function instance and resets on cold start. Given the catalog changes about once a year, external cache infrastructure isn't justified.

---

## Data source

U.S. Census Bureau, American Community Survey. Public domain ([CC0](https://creativecommons.org/publicdomain/zero/1.0/)).

Built with [`mcp-handler`](https://github.com/vercel/mcp-handler) on Next.js, deployed on Vercel.