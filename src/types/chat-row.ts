import type { Role } from "./message.js";

/** 终端里展示的一行（含用户与助手） */
export type ChatRow =
  | {
      id: string;
      role: Role;
      content: string;
      streaming?: boolean;
    }
  | {
      id: string;
      role: "status";
      kind: "tool";
      content: string;
    };
