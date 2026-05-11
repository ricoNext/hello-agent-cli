import OpenAI from "openai";
import type {
  ChatCompletionMessage,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { openaiTools } from "../tools/openai-tools";
import { runToolCall } from "../tools/tool-dispatch";
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
  "你是命令行里的编码助手。" +
  "需要列文件、统计数量、跑测试时，优先用工具获取真实输出，不要编造结果。" +
  "若用户明确要求「只转大小写、不访问磁盘」，优先使用 `uppercase` 工具。" +
  "如果你需要修改文件，请先使用 `read_file` 工具读取文件，然后使用 `edit_file` 工具修改文件。" +
  // 新增：搜索工具使用规范
  "查找文件名时使用 `glob` 工具（而非 bash find 或 ls）；" +
  "在文件内容中搜索时使用 `grep` 工具（而非 bash grep）；" +
  "运行测试、构建、git 操作等需要「执行」语义的任务才使用 `bash` 工具。";

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

// 处理工具调用
async function handleToolCalls(
  msg: ChatCompletionMessage
): Promise<ChatCompletionMessageParam[]> {
  const calls = msg.tool_calls ?? [];
  const appended: ChatCompletionMessageParam[] = [];

  // 并发执行工具调用
  const results = await Promise.all(
    calls.map((tc) => {
      if (tc.type !== "function") {
        return { id: tc.id, body: "不支持的 tool_calls.type" };
      }
      return runToolCall(tc.id, tc.function.name, tc.function.arguments);
    })
  );

  // 将原始消息添加到消息列表中
  appended.push(msg);
  // 将工具调用的结果添加到消息列表中
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
  async function handleAssistantMessage(
    msg: ChatCompletionMessage
  ): Promise<{ done: boolean; text?: string }> {
    if (msg.tool_calls?.length) {
      const names = msg.tool_calls
        .filter((t) => t.type === "function")
        .map((t) => t.function.name);
      opts.onToolRound?.({ toolNames: names });
      const chunk = await handleToolCalls(msg);
      working.push(...chunk);
      return { done: false };
    }
    return { done: true, text: msg.content ?? "" };
  }

  const working: ChatCompletionMessageParam[] = [...initialMessages];

  for (let turn = 0; turn < opts.maxTurns; turn++) {
    if (opts.streamFinalAssistant) {
      const streamed = await callModelStreamFinalText({
        model: opts.model,
        messages: working,
        onDelta: opts.onAssistantDelta,
      });

      if (streamed.kind === "text") {
        const text = streamed.text;
        working.push({ role: "assistant", content: text });
        return { messages: working, finalAssistantText: text };
      }

      const handled = await handleAssistantMessage(streamed.message);
      if (handled.done) {
        return { messages: working, finalAssistantText: handled.text ?? "" };
      }
      continue;
    }

    // 第 6 章原逻辑（非流式）
    const res = await callModel(opts.model, working);
    const msg = res.choices[0]?.message;
    if (!msg) {
      throw new Error("模型未返回 message");
    }

    const handled = await handleAssistantMessage(msg);
    if (handled.done) {
      return { messages: working, finalAssistantText: handled.text ?? "" };
    }
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
  | { kind: "tools"; message: ChatCompletionMessage };

// 流式输出最后一轮 assistant 的文本
async function callModelStreamFinalText(opts: {
  model: string;
  messages: ChatCompletionMessageParam[];
  onDelta?: (text: string) => void;
}): Promise<StreamFinalResult> {
  // 获取系统提示词， getSystemPrompt 函数前面章节已实现
  const systemPrompt = await getSystemPrompt();
  // 初始化一个空数组， 用于存储流式输出的文本
  const acc: string[] = [];
  // 初始化一个标志， 用于判断最后一轮 assistant 是否包含 `tool_calls`
  let sawToolCalls = false;

  // 先尝试创建流式对话
  const stream = await client.chat.completions.create({
    model: opts.model,
    messages: [{ role: "system", content: systemPrompt }, ...opts.messages],
    // 使用前面章节已实现的 openaiTools 工具
    tools: openaiTools,
    tool_choice: "auto",
    // 设置流式输出
    stream: true,
  });

  // 遍历流式对话的每一段
  for await (const chunk of stream) {
    // delta 是流式对话的每一段的内容
    const delta = chunk.choices[0]?.delta;
    // 重点来了： 只要发现有 `tool_calls` 信息
    // 就跳出循环， 并且不消费流式对话的后续内容
    if (delta?.tool_calls?.length) {
      sawToolCalls = true;
      break;
    }
    // 不带 `tool_calls` 信息， 才会走到这里
    const piece = delta?.content ?? "";
    if (piece) {
      acc.push(piece);
      // 使用 onDelta 回调函数触发 REPL 的流式输出
      opts.onDelta?.(piece);
    }
  }

  // 消费完  stream 之后，如果 sawToolCalls 为 false， 则返回流式输出的文本
  if (!sawToolCalls) {
    return { kind: "text", text: acc.join("") };
  }

  // 对于是 `tool_calls` 的情况，
  // 我们直接调用 callModel 函数来获取完整的 assistant 消息
  const res = await callModel(opts.model, opts.messages);
  const msg = res.choices[0]?.message;
  if (!msg) {
    throw new Error("模型未返回 message");
  }
  return { kind: "tools", message: msg };
}
