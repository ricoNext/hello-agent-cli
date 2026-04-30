# 手把手造一个 Agent CLI 工具（精简版）

如果你想真正搞懂 Claude Code / Cursor 背后的 Agent 是怎么“会思考、会调工具、会持续完成任务”的，这套教程就是给你的。  
你将从 0 开始，一步步做出一个可运行、可扩展、可发布的 Agent CLI，不只会“调用模型”，还会完整打通 REPL、Agentic Loop、上下文构建、工具系统和工程化发布。

---

## 教程结构（共 28 章）

```plaintext
第 0 部分：准备         (第 0 章)
第 1 部分：核心骨架     (第 1-8 章)
第 2 部分：工具系统     (第 9-15 章)
第 3 部分：高级特性     (第 16-20 章)
第 4 部分：工程化       (第 21-24 章)
第 5 部分：扩展生态     (第 25-27 章)
第 6 部分：综合实战     (第 28 章)
```

---

## 第 0 章：开始之前

- 实现目标：明确教程定位、环境准备、项目结构和学习方式。
- 里程碑：`bun init -y && bun add @anthropic-ai/sdk ink react commander lodash-es`

---

## 第一部分：核心骨架

### 第 1 章：50 行的最小 Agent

- 实现目标：完成最小可运行问答（stdin -> LLM -> stdout）。
- 里程碑：`echo "用一句话解释闭包" | bun run src/index.ts -p`

### 第 2 章：高性能 CLI 入口

- 实现目标：实现 `--version` 快速路径、参数分发、动态加载。
- 里程碑：`bun run src/index.ts --version`

### 第 3 章：流式输出与交互式 REPL

- 实现目标：支持流式输出和交互式 REPL。
- 里程碑：`bun run src/index.ts`

### 第 4 章：Agentic Loop——让 Agent 真正干活

- 实现目标：实现 LLM -> tool -> LLM 的循环调用，直到任务完成。
- 里程碑：`bun run src/index.ts -p "当前目录有多少个 .ts 文件？"`

### 第 5 章：上下文构建——让 Agent 了解它在哪

- 实现目标：构建并注入 Git/项目规则/日期等上下文。
- 里程碑：`bun run src/index.ts -p "我们现在在哪个分支？最近有什么改动？"`

### 第 6 章：链路打通——让 REPL 复用 Loop 与 Context

- 实现目标：打通 REPL、Loop、Context 三层，使 `REPL` 与 `-p` 共用执行链路。
- 里程碑：`bun run src/index.ts` 后在 REPL 内触发工具调用与上下文回答。

### 第 7 章：流式回复与统一执行链路——REPL 里「能打工具也能逐字吐」

- 实现目标：承接第 6 章的统一循环。
  工具轮仍为阻塞式，保证 `tool_calls` 拼接完整后再执行；
  对用户可见的**最后一轮文本**可走流式 `delta`，驱动 Ink 逐段刷新；
  整体与 `-p` 共用上下文，并与后续权限策略衔接。
- 里程碑：`bun run src/index.ts`，在 REPL 中先触发需 `bash` 的问题，再问开放题，二者均正常；后者可见流式打字（或等价的分块刷新），前者工具结果后再出整段结论。

### 第 8 章：REPL 展示与交互优化——搭建正式终端 UI 骨架

- 实现目标：对齐 claude-js 的 REPL 组件思路，升级消息区、输入区、状态栏、工具进行中区域等布局与交互骨架；未实现的能力可先隐藏或占位，但组件结构先搭好。
- 里程碑：`bun run src/index.ts`，可看到分区化 REPL 布局（消息列表/
  输入行/状态提示），支持流式文本渲染、工具进行中提示、基础键位交互
  （如 `/clear`、`/help`、滚动或焦点切换预留）。

---

## 第二部分：工具系统

### 第 9 章：工具框架——让 LLM 能调用函数

- 实现目标：定义 Tool 接口、注册表、执行器。
- 里程碑：`bun run src/index.ts -p "把字符串 hello 转为大写"`

### 第 10 章：文件操作工具——读、写、编辑

- 实现目标：实现 `read_file`、`write_file`、`edit_file`。
- 里程碑：`bun run src/index.ts "修改 README.md，把所有 TODO 改为 DONE"`

### 第 11 章：Shell 执行与代码搜索

- 实现目标：实现 `bash`、`glob`、`grep` 三类高频工具。
- 里程碑：`bun run src/index.ts "运行测试，找出失败原因，给我摘要"`

### 第 12 章：网络与交互工具

- 实现目标：实现 `web_fetch`、`web_search`、`ask_user`。
- 里程碑：`bun run src/index.ts "搜索 Bun 1.2 breaking changes，然后问我是否更新"`

### 第 13 章：生产力工具——计划、待办、工作区隔离

- 实现目标：实现 `todo_write`、计划模式、worktree 隔离流程。
- 里程碑：`bun run src/index.ts "先给我计划，再重构认证系统"`

### 第 14 章：子代理系统——并行处理复杂任务

- 实现目标：支持子代理并行执行与主代理汇总。
- 里程碑：`bun run src/index.ts "并行为 src/utils/ 每个文件生成测试"`

### 第 15 章：MCP 协议——接入外部工具生态

- 实现目标：实现 MCP 客户端并动态加载外部工具。
- 里程碑：`bun run src/index.ts "列出这个仓库最新的 5 个 PR"`

---

## 第三部分：高级特性

### 第 16 章：记忆系统——让 Agent 记住重要信息

- 实现目标：实现跨会话记忆提取、存储、召回。
- 里程碑：重启会话后仍能回答“项目测试命令是什么”。

### 第 17 章：权限系统——在自主性与安全性之间取得平衡

- 实现目标：实现工具调用权限判定与确认流程。
- 里程碑：危险命令需要确认，安全命令自动放行。

### 第 18 章：安全沙箱——纵深防御

- 实现目标：实现可选 OS 沙箱与资源/路径隔离。
- 里程碑：沙箱模式下拒绝访问项目外敏感路径。

### 第 19 章：上下文压缩——让长任务不崩溃

- 实现目标：长对话自动压缩，保持任务连续性。
- 里程碑：上下文接近上限时自动 compact 并继续工作。

### 第 20 章：Hook 系统——让工具调用可拦截、可扩展

- 实现目标：实现 Pre/Post/Session 三级 Hook。
- 里程碑：工具执行后自动触发自定义命令（如 `git add`）。

---

## 第四部分：工程化

### 第 21 章：测试策略——让代码可信

- 实现目标：建立单元、集成、端到端测试体系。
- 里程碑：`bun test` 核心模块通过。

### 第 22 章：监控与可观测性

- 实现目标：接入结构化日志、性能打点、错误追踪。
- 里程碑：可查看一次会话的完整调用链和耗时。

### 第 23 章：配置管理——多层优先级系统

- 实现目标：实现全局/项目/环境变量/CLI 参数优先级。
- 里程碑：`myagent config set model ...` 后立即生效。

### 第 24 章：打包与分发

- 实现目标：支持本地打包、npm 发布、多平台分发。
- 里程碑：`npm i -g myagent && myagent --version`

---

## 第五部分：扩展生态

### 第 25 章：Skills 与插件系统

- 实现目标：实现 Skill 扫描、加载与插件扩展入口。
- 里程碑：安装后可调用自定义 Skill。

### 第 26 章：子代理编排——多 Agent 协同

- 实现目标：实现 Coordinator/Worker 协同执行。
- 里程碑：多模块任务可并行拆解并汇总。

### 第 27 章：多云 API 支持

- 实现目标：统一 Provider 抽象，支持多云模型接入。
- 里程碑：切换环境变量即可切换 Provider。

---

## 第六部分：综合实战

### 第 28 章：从零到生产——完整项目实战

- 实现目标：从空目录到可发布的 `myagent v1.0.0` 全流程演练。
- 里程碑：完成一次可复现的构建、测试、发布流程。

---

## 学习路径建议

- 快速上手：第 1-3 章
- 可用 Agent：第 1-12 章
- 生产可用：第 1-23 章
- 完整版本：全部 28 章

---

## 学习代码仓库地址

[hello-agent-cli 代码仓库](https://github.com/ricoNext/hello-agent-cli)

每章的代码按照分支存放在仓库中， 分支名称为 `chapter-xxx`。

---

### A. Claude Code 核心文件速查

[Claude Code 代码仓库](https://github.com/ricoNext/claude-code)

| 文件 | 行数 | 对应章节 |
| --- | --- | --- |
| `src/entrypoints/cli.tsx` | 320 | 第 2 章 |
| `src/main.tsx` | 4,683 | 第 2 章 |
| `src/screens/REPL.tsx` | 5,009 | 第 3 / 7 / 8 章 |
| `src/query.ts` | 1,732 | 第 4 章 |
| `src/QueryEngine.ts` | 1,320 | 第 4 章 |
| `src/context.ts` | 189 | 第 5 章 |
| `src/tools.ts` | 389 | 第 9 章 |
| `src/services/api/claude.ts` | 3,420 | 第 1 章 |
| `src/services/mcp/` | 12,242 | 第 15 章 |
| `src/memdir/` | — | 第 16 章 |
| `src/hooks/toolPermission/` | — | 第 17 章 |
| `src/services/compact/` | — | 第 19 章 |
| `src/utils/config.ts` | 1,000+ | 第 23 章 |

### B. System Prompt 模板库

- 通用 Agent 系统提示词
- 子代理（Explore / Plan / Verify）提示词
- 记忆提取专用提示词
- Coordinator 角色提示词

### C. 学习路径建议

| 目标 | 需完成 | 耗时 |
| --- | --- | --- |
| 快速上手，能聊天 | 第 1-3 章 | 1-2 天 |
| 能干活的 Agent | 第 1-12 章 | 3-5 天 |
| 生产可用 | 第 1-23 章 | 2-3 周 |
| 完整版本 | 全部 28 章 | 1 个月 |

### D. 常见问题

- **用 OpenAI 还是 Anthropic？** 两者均可；Anthropic 的 Tool Use API 更贴近本教程的设计
- **必须用 Bun 吗？** 推荐用 Bun，Node.js 也可以，但需跳过第 2 章的部分优化技巧
- **React Ink 难吗？** 会 React 的话 Ink 一天上手；不会 React 可以先用 `readline` 实现简单版本
- **API 费用多少？** 完成全教程约 $5-20，可用 `DeepSeek` / `GLM` / `Qwen` 降低成本
