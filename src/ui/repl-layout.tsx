import { Box, Text } from "ink";
import { useEffect, useState } from "react";
import type { ChatRow } from "../types/chat-row";

const CURSOR_BLINK_MS = 530;

/** Claude Code 风格顶栏的强调色（偏陶土橙） */
const HEADER_ACCENT = "#d97757";

/** 左侧小图标：纯 ASCII，避免终端字体缺字（每行 id 唯一，供 React key） */
const HEADER_MASCOT_LINES = [
  { id: "mascot-top", text: " +--+ " },
  { id: "mascot-face", text: " |oo| " },
  { id: "mascot-bottom", text: " +--+ " },
  { id: "mascot-feet", text: " ^^^^ " },
] as const;

function shortenPathForDisplay(cwd: string): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  if (home && (cwd === home || cwd.startsWith(`${home}/`))) {
    return `~${cwd.slice(home.length)}`;
  }
  return cwd;
}

export interface ReplHeaderProps {
  busy: boolean;
  cwd: string;
  maxTurns: number;
  model: string;
  statusText: string;
  version: string;
}

export function ReplHeader({
  model,
  busy,
  statusText,
  version,
  cwd,
  maxTurns,
}: ReplHeaderProps) {
  const pathLine = shortenPathForDisplay(cwd);
  const line2 = `${model} · max ${maxTurns} 轮 · ${busy ? "busy" : "idle"}`;
  const line4Left = busy ? "Thinking…" : "Hello Agent REPL";

  return (
    <Box flexDirection="row" paddingX={1} paddingY={0}>
      <Box flexDirection="column" marginRight={1}>
        {HEADER_MASCOT_LINES.map(({ id, text }) => (
          <Text color={HEADER_ACCENT} key={id}>
            {text}
          </Text>
        ))}
      </Box>
      <Box flexDirection="column">
        <Box flexDirection="row">
          <Text bold color="white">
            Hello Agent
          </Text>
          <Text dimColor>{` v${version}`}</Text>
        </Box>
        <Text dimColor>{line2}</Text>
        <Text dimColor>{pathLine}</Text>
        <Box flexDirection="row" flexWrap="wrap">
          <Text color={HEADER_ACCENT}>{line4Left}</Text>
          <Text dimColor>{` · ${statusText} · /help /clear /exit`}</Text>
        </Box>
      </Box>
    </Box>
  );
}

export interface ReplFooterProps {
  lastError?: string;
  showFooter: boolean;
  statusText: string;
}

export function ReplFooter({
  showFooter,
  statusText,
  lastError,
}: ReplFooterProps) {
  if (!showFooter) {
    return null;
  }
  return (
    <Box paddingX={1}>
      <Text color={lastError ? "red" : "green"}>Status: {statusText}</Text>
      {lastError ? <Text color="red">{` · Error: ${lastError}`}</Text> : null}
    </Box>
  );
}

export interface ReplMessagesProps {
  rows: ChatRow[];
}

export function ReplMessages({ rows }: ReplMessagesProps) {
  return (
    <Box flexDirection="column" paddingX={1}>
      {rows.length > 0 ? (
        rows.map((row) => {
          // 工具调用状态
          if (row.role === "status") {
            return (
              <Text color="yellow" key={row.id}>
                · {row.content}
              </Text>
            );
          }
          // 用户或助手消息
          return (
            <Text dimColor={row.role === "user"} key={row.id}>
              {row.role === "user" ? "> " : "◆ "}
              {row.content}
              {"streaming" in row && row.streaming ? "▋" : ""}
            </Text>
          );
        })
      ) : (
        <Text>Welcome to hello-agent-cli</Text>
      )}
    </Box>
  );
}

export interface ReplComposerProps {
  busy: boolean;
  input: string;
}

export function ReplComposer({ input, busy }: ReplComposerProps) {
  const [cursorOn, setCursorOn] = useState(true);

  useEffect(() => {
    if (busy) {
      setCursorOn(false);
      return;
    }
    setCursorOn(true);
    const id = setInterval(() => {
      setCursorOn((v) => !v);
    }, CURSOR_BLINK_MS);
    return () => clearInterval(id);
  }, [busy]);

  return (
    <Box borderStyle="single" flexDirection="column" paddingX={1}>
      <Box flexDirection="row">
        <Text>{`> ${input}`}</Text>
        {busy ? null : (
          <Text color="cyan" inverse={cursorOn}>
            {" "}
          </Text>
        )}
      </Box>
      <Text dimColor>
        {busy ? "Thinking..." : "Hints: /help /clear /exit · Ctrl+C 退出"}
      </Text>
    </Box>
  );
}
