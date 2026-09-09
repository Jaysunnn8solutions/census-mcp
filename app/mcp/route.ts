import { createMcpHandler } from "mcp-handler";
import {
  listVintagesConfig,
  listVintagesHandler,
} from "../../lib/tools/list-vintages";
import {
  resolveGeographyConfig,
  resolveGeographyHandler,
} from "../../lib/tools/resolve-geography";

const handler = createMcpHandler((server) => {
  server.registerTool("list_vintages", listVintagesConfig, listVintagesHandler);
  server.registerTool(
    "resolve_geography",
    resolveGeographyConfig,
    resolveGeographyHandler
  );
});

export { handler as GET, handler as POST };