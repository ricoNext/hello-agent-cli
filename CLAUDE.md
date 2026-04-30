# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install          # install dependencies
bun run dev          # run CLI in development
bun x ultracite fix  # format & lint (run before committing)
bun x ultracite check # check for issues without fixing
```

No test suite is configured yet.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | — | API key (also works with Alibaba Qwen via custom base URL) |
| `OPENAI_BASE_URL` | No | OpenAI default | Custom API endpoint |
| `OPENAI_MODEL` | No | `gpt-4o` | Model name |

## Architecture

This is a Bun-based AI agent CLI with three usage modes:

1. **Single query** — `bun run src/index.ts "prompt"` calls `runQuery()` for a one-shot response
2. **Pipe mode** — `echo "prompt" | bun run src/index.ts -p` runs `runAgentPipe()`, the agentic loop
3. **Interactive REPL** — `bun run src/index.ts` (no args) launches the Ink-based terminal UI

### Entry & Routing (`src/index.ts` → `src/cli.ts`)

`index.ts` fast-paths `--version` to avoid loading Commander. All other invocations delegate to `cli.ts` which uses Commander to route to the three modes above.

### Agentic Loop (`src/agent/loop.ts`)

`runAgentPipe()` is the core agent loop:
- Calls the model with bash tool definitions (`src/tools/openai-tools.ts`)
- If the model returns `tool_calls`, executes them via `src/tools/bash.ts` (Bun subprocess, stdout/stderr capped at 8000 chars)
- Appends tool results to message history and loops until no tool calls or `--max-turns` is reached

### Context Building (`src/agent/context.ts`)

`buildSystemPrompt()` enriches the system prompt with:
- Git state (branch, recent commits, working-tree diff) via `getSystemContext()`
- `.claude/CLAUDE.md` rules and current date via `getUserContext()`

Results are memoized for the session lifetime.

### Streaming (`src/agent/stream-query.ts`)

`streamQuery()` wraps the OpenAI streaming API and accepts an `onDelta` callback invoked per token — used by the REPL for live output.

### Interactive UI (`src/ui/repl-app.tsx`)

React + Ink component. Handles keyboard input, slash commands (`/exit`, `/quit`, `/clear`, `/help`), streaming display, and message history.

## Code Quality

This project uses **Ultracite** (Biome-based). A PostToolUse hook in `.claude/settings.json` auto-runs `bun fix` after every file write/edit. See `.claude/CLAUDE.md` for the full coding standards.
