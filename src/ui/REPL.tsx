import { Box, Text, useApp, useInput } from "ink";
import { useState } from "react";
import { streamChatCompletion } from "../agent/streamQuery.js";
import type { ChatRow } from "../types/chatRow.js";
import type { Message } from "../types/message.js";

/** 顶层定义，避免在热路径中重复创建正则（lint: performance） */
const SLASH_CMD_SPLIT = /\s+/;

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function roughTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function REPLApp({ model }: { model: string }) {
  const { exit } = useApp();
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [history, setHistory] = useState<Message[]>([]);
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
    // 如果输入为空或正在请求，则返回
    if (!trimmed || busy) {
      return;
    }

    if (trimmed.startsWith("/")) {
      runSlash(trimmed);
      return;
    }

    // 创建用户消息行
    const userRow: ChatRow = { id: uid(), role: "user", content: trimmed };

    // 创建助手消息行
    const botId = uid();

    // 更新终端消息列表
    setRows((r) => [
      ...r,
      userRow,
      { id: botId, role: "assistant", content: "", streaming: true },
    ]);
    // 更新对话历史
    const nextHistory: Message[] = [
      ...history,
      { role: "user", content: trimmed },
    ];
    // 更新对话历史
    setHistory(nextHistory);
    // 更新是否正在请求
    setBusy(true);

    // 记录开始时间
    const t0 = performance.now();
    // 累加文本
    let acc = "";

    // 尝试流式请求
    try {
      await streamChatCompletion({
        model,
        messages: nextHistory,
        onDelta: (t) => {
          // 累加文本
          acc += t;
          setRows((prev) =>
            // 更新助手消息行
            prev.map((row) =>
              row.id === botId ? { ...row, content: row.content + t } : row
            )
          );
        },
      });

      // --------------------流式请求完成之后的逻辑--------------------

      // 计算请求时间
      const sec = ((performance.now() - t0) / 1000).toFixed(1);
      // 创建完成提示
      const footer = `[完成，约 ${roughTokens(acc)} tokens，${sec}s]`;

      // 更新助手消息行
      setRows((prev) =>
        prev.map((row) =>
          row.id === botId
            ? { ...row, content: `${row.content}\n${footer}`, streaming: false }
            : row
        )
      );
      // 更新对话历史
      setHistory((h) => [...h, { role: "assistant", content: acc }]);
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

export async function runRepl(opts: { model: string }): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("错误：请设置 OPENAI_API_KEY");
    process.exit(1);
  }
  const { render } = await import("ink");
  const app = render(<REPLApp model={opts.model} />);
  await app.waitUntilExit();
}
