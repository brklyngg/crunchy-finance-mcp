#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";

async function main(): Promise<void> {
  const apiKey = process.env.CRUNCHY_API_KEY ?? process.argv[2];

  if (!apiKey) {
    console.error(
      "Error: API key required.\n" +
        "  Set CRUNCHY_API_KEY env var or pass as argument.\n" +
        "  Get a key at crunchy.tools",
    );
    process.exit(1);
  }

  const server = createMcpServer(apiKey);
  const transport = new StdioServerTransport();

  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
