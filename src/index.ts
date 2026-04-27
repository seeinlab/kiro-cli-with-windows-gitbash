#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { spawnSync } from 'node:child_process';
import { z } from 'zod';

const server = new McpServer({
  name: 'win-gitbash-mcp',
  version: '1.0.0',
});

server.tool(
  'execute_bash',
  'Execute a bash command via Git Bash on Windows.',
  { command: z.string().describe('The bash command to execute') },
  async ({ command }) => {
    const gitBash = 'C:\\Program Files\\Git\\bin\\bash.exe';
    const result = spawnSync(gitBash, ['-c', command], {
      encoding: 'utf8',
      timeout: 30000,
    });

    const output = (result.stdout ?? '') + (result.stderr ?? '');
    const isError = result.status !== 0 || result.error != null;

    if (result.error) {
      return { content: [{ type: 'text', text: `[error: ${result.error.message}]` }], isError: true };
    }

    return {
      content: [{ type: 'text', text: output || '(no output)' }],
      isError,
    };
  }
);

const transport = new StdioServerTransport();
void server.connect(transport);
