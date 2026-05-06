import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { bashTool } from "./bash-tool";
import type { AgentTool } from "./types";
import { uppercaseTool } from "./uppercase-tool";

// 工具列表
export const AGENT_TOOLS: readonly AgentTool[] = [bashTool, uppercaseTool];

// 工具名称匹配工具
export function toolMatchesName(
  tool: { name: string; aliases?: readonly string[] },
  name: string
): boolean {
  return tool.name === name || (tool.aliases?.includes(name) ?? false);
}

// 根据工具名称查找工具
export function findToolByName(
  tools: readonly AgentTool[],
  name: string
): AgentTool | undefined {
  return tools.find((t) => toolMatchesName(t, name));
}

// 根据工具名称查找工具
export function findAgentTool(name: string): AgentTool | undefined {
  return findToolByName(AGENT_TOOLS, name);
}

// 生成 OpenAI tools 列表
export function toolsToOpenAI(): ChatCompletionTool[] {
  return AGENT_TOOLS.map((t) => t.toOpenAI());
}
