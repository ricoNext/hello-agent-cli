import type { Role } from "./message.js";

/** 终端里展示的一行（含用户与助手） */
export interface ChatRow {
  content: string;
  id: string;
  role: Role;
  /** 在流式生成未结束时为 true */
  streaming?: boolean;
}
