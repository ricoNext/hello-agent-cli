import OpenAI from "openai";
import type {
  ChatCompletionMessage,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { executeBash } from "../tools/bash.js";
import { openaiTools } from "../tools/openai-tools.js";

const SYSTEM: ChatCompletionMessageParam = {
  role: "system",
  content:
    "你是命令行里的编码助手。需要列文件、统计数量、跑测试时，优先用 bash 工具获取真实输出；不要编造命令结果。",
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export function callModel(
  model: string,
  messages: ChatCompletionMessageParam[]
) {
  return client.chat.completions.create({
    model,
    messages: [SYSTEM, ...messages],
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

export async function runAgentPipe(opts: {
  prompt: string;
  model: string;
  maxTurns: number;
}): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("错误：请设置 OPENAI_API_KEY");
    process.exit(1);
  }

  const messages: ChatCompletionMessageParam[] = [
    { role: "user", content: opts.prompt },
  ];

  for (let turn = 0; turn < opts.maxTurns; turn++) {
    const res = await callModel(opts.model, messages);
    const choice = res.choices[0];
    const msg = choice?.message;
    if (!msg) {
      console.error("模型未返回 message");
      process.exit(1);
    }

    if (msg.tool_calls?.length) {
      const chunk = await handleToolCalls(msg);
      messages.push(...chunk);
      continue;
    }

    console.log(msg.content ?? "");
    return;
  }

  console.error(`已达到最大轮次 ${opts.maxTurns}，停止以防死循环。`);
  process.exit(1);
}
