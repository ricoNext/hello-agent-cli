import { Box, Text, useApp, useInput } from "ink";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { useState } from "react";
import { runAgentConversation } from "../agent/loop";
import type { ChatRow } from "../types/chat-row";

/** 顶层定义，避免在热路径中重复创建正则（lint: performance） */
const SLASH_CMD_SPLIT = /\s+/;

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function roughTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function REPLApp({
  model,
  maxTurns,
}: {
  model: string;
  maxTurns: number;
}) {
  const { exit } = useApp();
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [history, setHistory] = useState<ChatCompletionMessageParam[]>([]);
  const [busy, setBusy] = useState(false);

  useInput((ch, key) => {
    if (busy) {
      return;
    }
    if (key.return) {
      const line = input;
      if (line.trim().startsWith("/")) {
        // 如果输入以 / 开头，则认为是斜杠命令
        if (!runSlash(line)) {
          // 如果斜杠命令不存在，则创建一个助手消息行，提示未知命令
          setRows((r) => [
            ...r,
            { id: uid(), role: "assistant", content: `未知命令：${line}` },
          ]);
        }
      } else {
        submit(line);
      }
      setInput("");
      return;
    }
    if (key.backspace || key.delete) {
      setInput((s) => s.slice(0, -1));
      return;
    }
    if (key.ctrl && (ch === "c" || ch === "C")) {
      exit();
      return;
    }
    if (ch && !key.ctrl && !key.meta) {
      setInput((s) => s + ch);
    }
  });

  const submit = async (line: string) => {
    const trimmed = line.trim();
    if (!trimmed || busy) {
      return;
    }

    if (trimmed.startsWith("/")) {
      runSlash(trimmed);
      return;
    }

    const userRow: ChatRow = { id: uid(), role: "user", content: trimmed };
    const botId = uid();

    const userMsg: ChatCompletionMessageParam = {
      role: "user",
      content: trimmed,
    };
    const nextMessages: ChatCompletionMessageParam[] = [...history, userMsg];

    setRows((r) => [
      ...r,
      userRow,
      { id: botId, role: "assistant", content: "", streaming: true },
    ]);
    setBusy(true);

    const t0 = performance.now();

    try {
      const { messages: after, finalAssistantText } =
        await runAgentConversation(nextMessages, {
          model,
          maxTurns,
          onToolRound: ({ toolNames }) => {
            setRows((prev) =>
              prev.map((row) =>
                row.id === botId
                  ? {
                      ...row,
                      content: `正在调用工具：${toolNames.join(", ") || "(未知)"}\n`,
                    }
                  : row
              )
            );
          },
        });

      const sec = ((performance.now() - t0) / 1000).toFixed(1);
      const footer = `\n[完成，约 ${roughTokens(finalAssistantText)} tokens，${sec}s]`;

      setRows((prev) =>
        prev.map((row) =>
          row.id === botId
            ? {
                ...row,
                content: `${finalAssistantText}${footer}`,
                streaming: false,
              }
            : row
        )
      );
      setHistory(after);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setRows((prev) =>
        prev.map((row) =>
          row.id === botId
            ? { ...row, content: `错误：${msg}`, streaming: false }
            : row
        )
      );
    } finally {
      setBusy(false);
    }
  };

  // 运行斜杠命令
  const runSlash = (line: string): boolean => {
    const cmd = line.slice(1).trim().split(SLASH_CMD_SPLIT)[0]?.toLowerCase();
    if (cmd === "exit" || cmd === "quit") {
      exit();
      return true;
    }
    if (cmd === "clear") {
      setRows([]);
      setHistory([]);
      return true;
    }
    if (cmd === "help") {
      setRows((r) => [
        ...r,
        { id: uid(), role: "assistant", content: "命令：/exit /clear /help" },
      ]);
      return true;
    }
    return false;
  };

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        hello-agent-cli REPL · 模型 {model}
      </Text>
      {rows.map((row) => (
        <Text dimColor={row.role === "user"} key={row.id}>
          {row.role === "user" ? "> " : "◆ "}
          {row.content}
          {row.streaming ? "▋" : ""}
        </Text>
      ))}
      <Text>{`> ${input}`}</Text>
    </Box>
  );
}

export async function runRepl(opts: {
  model: string;
  maxTurns: number;
}): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("错误：请设置 OPENAI_API_KEY");
    process.exit(1);
  }
  const { render } = await import("ink");
  const app = render(<REPLApp maxTurns={opts.maxTurns} model={opts.model} />);
  await app.waitUntilExit();
}
