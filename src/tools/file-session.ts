import { relative, resolve } from "node:path";

const readPaths = new Set<string>();

/** 相对路径相对于 process.cwd() */
export function toWorkspaceAbsolutePath(filePath: string): string {
  return resolve(process.cwd(), filePath);
}

// 标记文件为已读
export function markFileAsRead(absPath: string): void {
  readPaths.add(absPath);
}

// 清除文件的已读标记
export function clearReadMark(absPath: string): void {
  readPaths.delete(absPath);
}

// 判断文件是否已读
export function wasFileReadInSession(absPath: string): boolean {
  return readPaths.has(absPath);
}

// 断言路径是否在当前工作区之内
export function assertPathInsideCwd(absPath: string): string | null {
  const cwd = resolve(process.cwd());
  const rel = relative(cwd, absPath);
  if (rel.startsWith("..") || rel === "") {
    return rel === ""
      ? "错误：目标路径不能等于工作区根目录本身"
      : "错误：禁止访问工作区外的路径";
  }
  return null;
}
