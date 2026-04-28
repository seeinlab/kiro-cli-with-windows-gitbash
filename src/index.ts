#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

// --- File logger (controlled by LOG_ENABLED env var) ---
const logEnabled = (process.env.LOG_ENABLED ?? 'true') !== 'false';
const logDir = join(homedir(), '.kiro', 'logs');
const logFile = join(logDir, 'win-gitbash-mcp.log');
if (logEnabled) try { mkdirSync(logDir, { recursive: true }); } catch {}

function log(level: string, msg: string) {
  if (!logEnabled && level !== 'FATAL') return;
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

    const { stdout, stderr, exitCode } = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
      const child = spawn(gitBash, ['-c', command], { stdio: ['pipe', 'pipe', 'pipe'] });
      const out: Buffer[] = [];
      const err: Buffer[] = [];
      child.stdout.on('data', (d) => out.push(d));
      child.stderr.on('data', (d) => err.push(d));

      const timer = setTimeout(() => { child.kill('SIGTERM'); }, 120_000);

      child.on('error', (e) => {
        clearTimeout(timer);
        resolve({ stdout: '', stderr: e.message, exitCode: 1 });
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8'), exitCode: code ?? 1 });
      });
    });

    const output = stdout + stderr;
    const isError = exitCode !== 0;

    log('INFO', `exit=${exitCode} stdout=${stdout.length}b stderr=${stderr.length}b`);
    if (isError) log('WARN', `stderr: ${stderr.slice(0, 500)}`);

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
