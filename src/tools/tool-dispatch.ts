import { findAgentTool } from "./registry";

export async function runToolCall(
  id: string,
  name: string,
  argumentsJson: string | undefined
): Promise<{ id: string; body: string }> {
  let args: unknown;
  try {
    args = JSON.parse(argumentsJson || "{}");
  } catch {
    return { id, body: "tool 参数 JSON 解析失败" };
  }
  const tool = findAgentTool(name);
  if (!tool) {
    return { id, body: `未知工具: ${name}` };
  }
  try {
    const body = await tool.execute(args);
    return { id, body };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return { id, body: `工具执行错误: ${m}` };
  }
}
