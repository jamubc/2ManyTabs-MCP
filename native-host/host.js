#!/usr/bin/env node
// 2ManyTabs MCP – Host (MCP server over stdio)
//
//   Hermes ─stdio(JSON-RPC)─▶ host.js ─ws/127.0.0.1:9876─▶ background.js ─▶ chrome.tabs
//
// Architecture mirrors gemini-mcp-tool's "unified tool" pattern: one self-contained
// file per tool, collected in tools/index.js. The difference — and the point of this
// rewrite — is that SDK 1.x's McpServer.registerTool() absorbs the hand-rolled
// registry.ts (zod-to-json-schema, getToolDefinitions, executeTool, manual Zod parsing)
// that the 0.5-era SDK forced us to write. We keep the modular philosophy; the SDK
// keeps the boilerplate.

import { McpServer }            from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { startBridge }          from './bridge.js';
import { toolRegistry }         from './tools/index.js';

const server = new McpServer({ name: '2manytabs-mcp', version: '2.0.0' });

// Register every tool generically. Adding a tool requires zero changes here.
for (const tool of toolRegistry) {
  server.registerTool(
    tool.name,
    {
      title:       tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,   // raw Zod shape — SDK derives JSON Schema + validates
      annotations: tool.annotations,    // readOnly/destructive hints (new in modern MCP)
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

// Bring up the extension bridge, then connect MCP over stdio.
startBridge();

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write(`[2manytabs-mcp] MCP server ready (${toolRegistry.length} tools) on stdio\n`);

// Ensure clean exit when the parent process disconnects or terminates
const cleanup = () => process.exit(0);
process.stdin.on('close', cleanup);
process.stdin.on('end', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
