import type { ChatCompletionTool } from "openai/resources/chat/completions";

export interface AgentTool {
  /** 可选：工具的别名，便于改名兼容 */
  readonly aliases?: readonly string[];
  /** 已解析的 JSON 参数 → 写入 `role: "tool"` 的消息体正文 */
  execute: (args: unknown) => Promise<string>;
  /** 工具的名称 */
  readonly name: string;
  /** 生成挂到 `chat.completions.create({ tools })` 的一项 */
  toOpenAI: () => ChatCompletionTool;
}
