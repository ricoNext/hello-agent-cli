import { createInterface } from "node:readline";
import type { AgentTool } from "./types";

// 回调类型：REPL 提供问题文本和一个 resolve 函数
type Resolver = (answer: string) => void;
type AskHandler = (question: string, resolve: Resolver) => void;

// 模块级变量：REPL 挂载时注入，其他场景为 null
let _handler: AskHandler | null = null;

/**
 * 由 REPL 在 useEffect 中调用，注入"展示问题并等待回答"的回调。
 * 非 REPL 环境（pipe 模式）无需注册，工具会回退到 stdin 读取。
 */
export function registerAskUserHandler(fn: AskHandler): void {
  _handler = fn;
}

export const askUserTool: AgentTool = {
  name: "ask_user",
  toOpenAI: () => ({
    type: "function",
    function: {
      name: "ask_user",
      description:
        "向用户提出一个需要明确回复的问题，等待用户输入后继续任务。" +
        "适用于需要用户确认、选择方案或补充信息的场景。",
      parameters: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "要向用户展示的问题文本",
          },
        },
        required: ["question"],
      },
    },
  }),
  async execute(args: unknown) {
    const a = args as { question?: unknown };
    const question = typeof a.question === "string" ? a.question.trim() : "";
    if (!question) {
      return "错误：question 为空";
    }

    // REPL 模式：通过注册的回调，让 Ink UI 接管输入
    if (_handler) {
      return await new Promise<string>((resolve) => {
        _handler?.(question, resolve);
      });
    }

    // 降级：非交互式（pipe 模式）从 stdin 读取
    return await new Promise<string>((resolve) => {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(`\n${question}\n> `, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  },
};
