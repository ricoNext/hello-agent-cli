// src/tools/bash.ts
const MAX_OUT = 8000;

// 定义 BashResult 接口
export interface BashResult {
  exitCode: number;
  stderr: string;
  stdout: string;
}

// 执行 bash 命令
export async function executeBash(command: string): Promise<string> {
  // 使用 Bun.spawn 执行 bash 命令
  const proc = Bun.spawn(["sh", "-c", command], {
    cwd: process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
  });

  // 等待命令执行完成
  const exitCode = await proc.exited;
  // 获取 stdout 输出
  const stdout = await new Response(proc.stdout).text();
  // 获取 stderr 输出
  const stderr = await new Response(proc.stderr).text();

  // 截断输出
  const out = truncate(stdout, MAX_OUT);
  // 截断 stderr 输出
  const err = truncate(stderr, MAX_OUT);
  // 返回结果
  const payload: BashResult = { stdout: out, stderr: err, exitCode };
  // 返回 JSON 字符串
  return JSON.stringify(payload, null, 2);
}

// 截断输出
function truncate(s: string, max: number): string {
  if (s.length <= max) {
    return s;
  }
  return `${s.slice(0, max)}\n…(truncated, ${s.length} chars)`;
}
