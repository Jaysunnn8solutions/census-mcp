import { createMcpHandler } from "mcp-handler";
import {
  listVintagesConfig,
  listVintagesHandler,
} from "../../lib/tools/list-vintages";
import {
  resolveGeographyConfig,
  resolveGeographyHandler,
} from "../../lib/tools/resolve-geography";
import {
  searchColumnsConfig,
  searchColumnsHandler,
} from "../../lib/tools/search-columns";

const handler = createMcpHandler((server) => {
  server.registerTool("list_vintages", listVintagesConfig, listVintagesHandler);
  server.registerTool(
    "resolve_geography",
    resolveGeographyConfig,
    resolveGeographyHandler
  );
  server.registerTool(
    "search_columns",
    searchColumnsConfig,
    searchColumnsHandler
  );
});

export { handler as GET, handler as POST };