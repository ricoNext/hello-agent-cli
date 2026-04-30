import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { dirname, join } from "node:path";
import { memoize } from "lodash-es";

const MAX_GIT_CONTEXT_CHARS = 2000;

export interface SystemContext {
  // Git 状态
  gitStatus: string | null;
}

export interface UserContext {
  // 来自 CLAUDE.md / .claude/CLAUDE.md / .claude/rules/*.md 的聚合指令
  claudeMd: string | null;
  // 当前日期
  currentDate: string;
}

// 执行命令
function run(command: string): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(command, {
      shell: true,
      // 忽略错误输出
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString(); // 拼接 stdout
    });

    // 这里故意不 throw：Context Builder 应该“尽量给信息”，而不是因单点失败中断整轮
    child.on("close", () => {
      resolve(stdout.trim());
    });
  });
}

// 判断是否是 Git 仓库
async function isGitRepo(): Promise<boolean> {
  const output = await run("git rev-parse --is-inside-work-tree");
  return output === "true";
}

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}\n...(truncated, use bash tool for full git details)`;
}

// 获取系统上下文
export const getSystemContext = memoize(async (): Promise<SystemContext> => {
  const gitStatus = await getGitStatusMemoized();
  return { gitStatus };
});

// 获取用户上下文
export const getUserContext = memoize(async (): Promise<UserContext> => {
  const [claudeMd, currentDate] = await Promise.all([
    getClaudeMdContextMemoized(),
    Promise.resolve(
      `Today's date is ${new Date().toISOString().slice(0, 10)}.`
    ),
  ]);

  return { claudeMd, currentDate };
});

// 获取 Git 状态
const getGitStatusMemoized = memoize(async () => getGitStatus());

// 获取 Claude MD 上下文
const getClaudeMdContextMemoized = memoize(async () => getClaudeMdContext());

async function getGitStatus(): Promise<string | null> {
  const inRepo = await isGitRepo();
  // 如果不是 Git 仓库，返回 null
  if (!inRepo) {
    return null;
  }

  // 并行获取 Git 状态：分支、主分支、状态、最近提交
  const [branch, mainBranch, status, log] = await Promise.all([
    run("git branch --show-current"),
    run(
      "git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'"
    ),
    run("git status --short"),
    run("git log --oneline -n 5"),
  ]);

  // 拼接 Git 状态文本
  const text = [
    "This is the git status at the start of the conversation. Note that this status is a snapshot in time, and will not update during the conversation.",
    "",
    `Current branch: ${branch || "(unknown)"}`,
    `Main branch (you will usually use this for PRs): ${mainBranch || "main"}`,
    "",
    "Status:",
    status || "(clean)",
    "",
    "Recent commits:",
    log || "(none)",
  ].join("\n");

  // 截断 Git 状态文本
  return truncate(text, MAX_GIT_CONTEXT_CHARS);
}

// 判断文件是否存在
async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

// 获取 Claude MD 上下文
async function getClaudeMdContext(): Promise<string | null> {
  const chunks: string[] = [];
  let current = process.cwd();

  // 遍历当前目录及其父目录，获取 CLAUDE.md 文件内容
  while (true) {
    // 第一步先支持 CLAUDE.md（后续再扩展 .claude/rules）
    const candidate = join(current, "CLAUDE.md");
    // 判断文件是否存在
    const exists = await fileExists(candidate);
    // 如果文件存在，获取文件内容
    if (exists) {
      const content = (await fs.readFile(candidate, "utf-8")).trim();
      // 如果文件内容不为空，添加到 chunks 中
      if (content) {
        chunks.push(`Contents of ${candidate}:\n\n${content}`);
      }
    }

    // 获取父目录
    const parent = dirname(current);
    // 如果父目录与当前目录相同，则结束遍历
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return chunks.length > 0 ? chunks.join("\n\n") : null;
}

// 构建系统提示词
export async function buildSystemPrompt(
  baseSystemPrompt: string
): Promise<string> {
  const [systemCtx, userCtx] = await Promise.all([
    getSystemContext(),
    getUserContext(),
  ]);
  const blocks = [baseSystemPrompt.trim()];

  if (systemCtx.gitStatus) {
    blocks.push(
      "",
      "<system_context>",
      systemCtx.gitStatus,
      "</system_context>"
    );
  }

  if (userCtx.claudeMd) {
    blocks.push("", "<user_context>", userCtx.claudeMd, "</user_context>");
  }

  blocks.push("", userCtx.currentDate);
  return blocks.join("\n");
}
