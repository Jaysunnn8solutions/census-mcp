import { createMcpHandler } from "mcp-handler";
import {
  listVintagesConfig,
  listVintagesHandler,
} from "../../lib/tools/list-vintages";

const handler = createMcpHandler((server) => {
  server.registerTool(
    "list_vintages",
    listVintagesConfig,
    listVintagesHandler
  );
});

export { handler as GET, handler as POST };