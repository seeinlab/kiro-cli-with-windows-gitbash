#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

// --- File logger (never writes to stdout) ---
const logDir = join(homedir(), '.kiro', 'logs');
const logFile = join(logDir, 'win-gitbash-mcp.log');
try { mkdirSync(logDir, { recursive: true }); } catch {}

function log(level: string, msg: string) {
  const ts = new Date().toISOString();
  try { appendFileSync(logFile, `${ts} [${level}] ${msg}\n`); } catch {}
}

log('INFO', '=== MCP server starting ===');

// Catch anything that might leak to stdout and crash the transport
process.on('uncaughtException', (err) => {
  log('FATAL', `uncaughtException: ${err.stack ?? err.message}`);
});
process.on('unhandledRejection', (reason) => {
  log('FATAL', `unhandledRejection: ${reason}`);
});

const server = new McpServer({
  name: 'win-gitbash-mcp',
  version: '0.1.1',
});

server.tool(
  'execute_bash',
  'Execute a bash command via Git Bash on Windows.',
  { command: z.string().describe('The bash command to execute') },
  async ({ command }) => {
    log('INFO', `exec: ${command}`);
    const gitBash = 'C:\\Program Files\\Git\\bin\\bash.exe';

    const result = spawnSync(gitBash, ['-c', command], {
      encoding: 'utf8',
      timeout: 30000,
    });

    if (result.error) {
      log('ERROR', `spawn error: ${result.error.message}`);
      return { content: [{ type: 'text' as const, text: `[error: ${result.error.message}]` }], isError: true };
    }

    const stdout = result.stdout ?? '';
    const stderr = result.stderr ?? '';
    const output = stdout + stderr;
    const isError = result.status !== 0;

    log('INFO', `exit=${result.status} signal=${result.signal} stdout=${stdout.length}b stderr=${stderr.length}b`);
    if (isError) {
      log('WARN', `stderr: ${stderr.slice(0, 500)}`);
    }

    return {
      content: [{ type: 'text' as const, text: output || '(no output)' }],
      isError,
    };
  }
);

const transport = new StdioServerTransport();
void server.connect(transport).then(() => {
  log('INFO', 'MCP server connected to transport');
}).catch((err) => {
  log('FATAL', `connect failed: ${err}`);
});
