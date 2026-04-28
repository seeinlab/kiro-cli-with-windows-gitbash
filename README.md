# win-gitbash-mcp

Workaround for [kiro-cli shell tool bug on Windows](https://github.com/kirodotdev/Kiro/issues/7431).

TypeScript MCP server that runs bash commands via Git Bash natively on Windows — no container needed.

## Requirements

- Node.js
- Git Bash (`C:\Program Files\Git\bin\bash.exe`)
- kiro-cli running natively on Windows

## Build

```bash
npm install
npm run bundle
# outputs dist/index.js (standalone, no node_modules needed)
```

## Setup

### 1. Copy bundle to kiro settings folder

```bash
cp dist/index.js %USERPROFILE%\.kiro\settings\win-gitbash-mcp.js
```

### 2. Add to `%USERPROFILE%\.kiro\settings\mcp.json`

Copy from [`kiro/mcp.json`](kiro/mcp.json) and replace `<username>` with your Windows username:

```json
{
  "mcpServers": {
    "win-gitbash-mcp": {
      "command": "node",
      "args": ["%USERPROFILE%\\.kiro\\settings\\win-gitbash-mcp.js"],
      "autoApprove": ["execute_bash"]
    }
  }
}
```

### 3. Add to `%USERPROFILE%\.kiro\steering\gitbash.md`

Copy from [`kiro/gitbash.md`](kiro/gitbash.md):

```markdown
---
inclusion: always
---
- When running shell commands, always use the `execute_bash` tool from the `win-gitbash-mcp` MCP server instead of the built-in shell tool.
- Use Unix-style paths in commands (e.g. `/c/Users/foo/project` not `C:\Users\foo\project`).
```

### 4. Restart kiro-cli

## How it works

- kiro-cli spawns `node win-gitbash-mcp.js` as a persistent stdio MCP server process
- Each `execute_bash` call spawns `bash.exe -c <command>` via Git Bash
- `win-gitbash-mcp.js` is a standalone bundle — copy it anywhere with Node.js installed

## Tool

| Tool | Description |
|------|-------------|
| `execute_bash` | Run any bash command via Git Bash on Windows |
