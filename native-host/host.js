#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { startBridge } from './bridge.js';
import { z } from 'zod';
import { toolRegistry } from './tools/index.js';
import { SERVER_INSTRUCTIONS, cleanupGuide } from './lib/guide.js';

const server = new McpServer(
  { name: '2manytabs-mcp', version: '3.0.0' },
  { instructions: SERVER_INSTRUCTIONS },
);

// The same method as start_tab_cleanup, for clients that list MCP prompts as commands.
server.registerPrompt(
  'close-the-loops',
  {
    title: 'Clean up my tabs',
    description: 'Sort your open tabs, close what you no longer need, and keep the few real to-dos.',
    argsSchema: {
      focus: z.string().optional()
        .describe('Optional: only part of the job, e.g. "my YouTube tabs" or "duplicates".'),
    },
  },
  ({ focus }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `I have too many browser tabs open. Help me with ${focus ? `this: ${focus}` : 'them'}.\n\n` +
          'Follow this method, and start with step 1:\n\n' + cleanupGuide(),
      },
    }],
  }),
);

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
