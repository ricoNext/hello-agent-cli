import OpenAI from "openai";
import type {
  ChatCompletionMessage,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { executeBash } from "../tools/bash";
import { openaiTools } from "../tools/openai-tools";
import { buildSystemPrompt } from "./context";

/** 与 `-p`、REPL 共用的执行选项 */
export interface RunAgentConversationOptions {
  maxTurns: number;
  model: string;
  // 流式输出最后一轮 assistant 的文本
  onAssistantDelta?: (text: string) => void;
  onToolRound?: (info: { toolNames: string[] }) => void;
  // 是否流式输出
  streamFinalAssistant?: boolean;
}

const BASE_SYSTEM =
  "你是命令行里的编码助手。需要列文件、统计数量、跑测试时，优先用工具获取真实输出，不要编造结果。";

let cachedSystemPrompt: string | null = null;

async function getSystemPrompt(): Promise<string> {
  if (cachedSystemPrompt) {
    return cachedSystemPrompt;
  }
  cachedSystemPrompt = await buildSystemPrompt(BASE_SYSTEM);
  return cachedSystemPrompt;
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export async function callModel(
  model: string,
  messages: ChatCompletionMessageParam[]
) {
  const systemPrompt = await getSystemPrompt();

  return client.chat.completions.create({
    model,
    messages: [{ role: "system", content: systemPrompt }, ...messages],

    tools: openaiTools,
    tool_choice: "auto",
  });
}

async function handleToolCalls(
  msg: ChatCompletionMessage
): Promise<ChatCompletionMessageParam[]> {
  const calls = msg.tool_calls ?? [];
  const appended: ChatCompletionMessageParam[] = [];

  const results = await Promise.all(
    calls.map(async (tc) => {
      if (tc.type !== "function") {
        return { id: tc.id, body: "不支持的 tool_calls.type" };
      }
      const name = tc.function.name;
      let args: { command?: string };
      try {
        args = JSON.parse(tc.function.arguments || "{}") as {
          command?: string;
        };
      } catch {
        return { id: tc.id, body: "tool 参数 JSON 解析失败" };
      }
      try {
        if (name === "bash") {
          const cmd = args.command ?? "";
          if (!cmd.trim()) {
            return { id: tc.id, body: "错误：command 为空" };
          }
          const body = await executeBash(cmd);
          return { id: tc.id, body };
        }
        return { id: tc.id, body: `未知工具: ${name}` };
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        return { id: tc.id, body: `工具执行错误: ${m}` };
      }
    })
  );

  appended.push(msg);
  for (const r of results) {
    appended.push({ role: "tool", tool_call_id: r.id, content: r.body });
  }
  return appended;
}

/**
 * 运行 Agent 对话
 * @param initialMessages 初始消息
 * @param opts 执行选项
 * @returns 最终消息和最后一轮助手消息
 */
export async function runAgentConversation(
  initialMessages: ChatCompletionMessageParam[],
  opts: RunAgentConversationOptions
): Promise<{
  messages: ChatCompletionMessageParam[];
  finalAssistantText: string;
}> {
  const working: ChatCompletionMessageParam[] = [...initialMessages];

  for (let turn = 0; turn < opts.maxTurns; turn++) {
    if (opts.streamFinalAssistant) {
      const streamed = await callModelStreamFinalText({
        model: opts.model,
        messages: working,
        onDelta: opts.onAssistantDelta,
      });

      if (streamed.kind === "tools") {
        const msg = streamed.assistantMessage;
        const names =
          msg.tool_calls
            ?.filter((t) => t.type === "function")
            .map((t) => t.function.name) ?? [];
        opts.onToolRound?.({ toolNames: names });

        const chunk = await handleToolCalls(msg);
        working.push(...chunk);
        continue;
      }

      const text = streamed.text;
      working.push({ role: "assistant", content: text });
      return { messages: working, finalAssistantText: text };
    }

    const res = await callModel(opts.model, working);
    const msg = res.choices[0]?.message;
    if (!msg) {
      throw new Error("模型未返回 message");
    }

    if (msg.tool_calls?.length) {
      const names = msg.tool_calls
        .filter((t) => t.type === "function")
        .map((t) => t.function.name);
      opts.onToolRound?.({ toolNames: names });

      const chunk = await handleToolCalls(msg);
      working.push(...chunk);
      continue;
    }

    const text = msg.content ?? "";
    working.push({ role: "assistant", content: text });
    return { messages: working, finalAssistantText: text };
  }

  throw new Error(`已达到最大轮次 ${opts.maxTurns}，停止以防死循环。`);
}

export async function runAgentPipe(opts: {
  prompt: string;
  model: string;
  maxTurns: number;
}): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("错误：请设置 OPENAI_API_KEY");
    process.exit(1);
  }

  try {
    const { finalAssistantText } = await runAgentConversation(
      [{ role: "user", content: opts.prompt }],
      { model: opts.model, maxTurns: opts.maxTurns }
    );
    console.log(finalAssistantText);
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    console.error(m);
    process.exit(1);
  }
}

// 流式输出最后一轮 assistant 的文本类型定义
// 如果最后一轮没有工具轮，则返回文本
// 如果最后一轮有工具轮，则返回工具轮的 assistant message
type StreamFinalResult =
  | { kind: "text"; text: string }
  | { kind: "tools"; assistantMessage: ChatCompletionMessage };

// 流式输出最后一轮 assistant 的文本
async function callModelStreamFinalText(opts: {
  model: string;
  messages: ChatCompletionMessageParam[];
  onDelta?: (text: string) => void;
}): Promise<StreamFinalResult> {
  const systemPrompt = await getSystemPrompt();
  const acc: string[] = [];
  let sawToolCalls = false;

  const stream = await client.chat.completions.create({
    model: opts.model,
    messages: [{ role: "system", content: systemPrompt }, ...opts.messages],
    tools: openaiTools,
    tool_choice: "auto",
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (delta?.tool_calls?.length) {
      sawToolCalls = true;
      break;
    }

    const piece = delta?.content ?? "";
    if (piece) {
      acc.push(piece);
      opts.onDelta?.(piece);
    }
  }

  if (!sawToolCalls) {
    return { kind: "text", text: acc.join("") };
  }

  // 回退到第 6 章稳定路径，拿完整 message 再判断工具轮
  const res = await callModel(opts.model, opts.messages);
  const msg = res.choices[0]?.message;
  if (!msg) {
    throw new Error("模型未返回 message");
  }
  if (!msg.tool_calls?.length) {
    return { kind: "text", text: msg.content ?? "" };
  }
  return { kind: "tools", assistantMessage: msg };
}
