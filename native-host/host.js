#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { startBridge } from './bridge.js';
import { toolRegistry } from './tools/index.js';

const server = new McpServer({ name: '2manytabs-mcp', version: '2.1.0' });

for (const tool of toolRegistry) {
  server.registerTool(
    tool.name,
    {
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
    },
    async (args) => {
      try {
        const text = await tool.execute(args);
        return { content: [{ type: 'text', text }] };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error in ${tool.name}: ${err.message}` }],
          isError: true,
        };
      }
    },
  );
}

startBridge();

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write(`[2manytabs-mcp] MCP server ready (${toolRegistry.length} tools) on stdio\n`);

const cleanup = () => process.exit(0);
process.stdin.on('close', cleanup);
process.stdin.on('end', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
