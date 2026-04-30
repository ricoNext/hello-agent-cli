// 定义消息角色
export type Role = "user" | "assistant" | "system";

// 定义消息接口
export interface Message {
  content: string;
  role: Role;
}
