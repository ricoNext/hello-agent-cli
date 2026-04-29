# Agent CLI 教程大纲 （基于 Claude Code 泄露版）

> [Claude Code 泄露版代码仓库](https://github.com/ricoNext/claude-code)

## 基于 Claude Code 源码的工业级实现教程

**技术栈**：TypeScript + Node.js/Bun + React Ink + OpenAI/Anthropic API

**教程定位**：从 Claude Code 51 万行源码中提炼核心架构，用 5000 行代码实现 80% 的核心能力

教程代码按照章节分别存放在对应的分支上， 例如:

[01:50 行实现最小 Agent CLI](https://github.com/ricoNext/hello-agent-cli/tree/chapter-01)
[02:生产级 CLI 入口的快路径设计](https://github.com/ricoNext/hello-agent-cli/tree/chapter-02)
[03:流式输出与交互式 REPL](https://github.com/ricoNext/hello-agent-cli/tree/chapter-03)


---

## 第零部分：开始之前

### 0.1 这本教程适合谁？

**✅ 你应该读这本教程，如果你是：**

- 已经在使用 Claude Code/Cursor，想要理解其底层实现
- 技术创业者，想要构建自己的 AI 编码工具
- 企业技术团队，需要定制内部开发工具
- 对工业级 Agent 架构感兴趣的开发者
- 希望学习 Anthropic 的工程实践

**❌ 这本教程可能不适合你，如果你：**

- 只想要开箱即用的工具（直接用 Claude Code 即可）
- 没有 TypeScript 基础
- 只想要简单的代码补全功能

### 0.2 为什么要学习 Claude Code 的架构？

**Claude Code 是目前最先进的 Agent CLI 实现**：

- 51 万行生产级代码，经过数百万次真实使用验证
- Anthropic 投入数百人团队持续优化
- 包含大量未公开的前沿技术（记忆系统、子代理编排、安全沙箱）

**学习价值**：

- **架构设计**：如何设计一个可扩展的 Agent 系统
- **工程实践**：如何处理边界情况、错误恢复、性能优化
- **产品思维**：如何平衡自主性与可控性
- **商业洞察**：了解 AI 工具的未来方向

### 0.3 教程结构与学习路径

**教程分为 6 个主要部分，共 26 章**：

```plaintext
第 0 部分：准备（序章）
第 1 部分：核心架构（5 章）← 理解 Claude Code 的设计哲学
第 2 部分：工具系统（8 章）← 实现 30+ 工具，含生产力工具与子代理
第 3 部分：高级特性（5 章）← 记忆、权限、沙箱
第 4 部分：工程化（4 章）← 测试、监控、部署
第 5 部分：扩展生态（3 章）← Skills、插件、子代理编排
第 6 部分：实战案例（1 章）← 完整项目
```

详细学习路径见文末。

### 0.4 环境准备

**必需工具**：

- Node.js 20+ 或 Bun 1.0+
- TypeScript 5.0+
- OpenAI/Anthropic API Key

**推荐工具**：

- VS Code + TypeScript 插件
- Git
- Docker（用于沙箱）

**代码仓库**：

- 配套代码：`github.com/your-repo/agent-cli-tutorial`
- 每章对应一个 Git 分支
- 完整可运行的示例

---

## 第一部分：核心架构 - 理解 Claude Code 的设计哲学

### 1. Claude Code 架构全景

**1.1 从 51 万行代码看整体架构**

- 项目结构：1900+ 文件的组织方式
- 核心模块：REPL、QueryEngine、工具系统、权限系统
- 数据流：从用户输入到工具执行的完整路径
- 代码分割：450 个 chunk 的打包策略

**1.2 技术栈选择的深层原因**

- 为什么选择 React + Ink？（终端 UI 的最佳实践）
- 为什么是单进程事件循环？（vs 多进程架构）
- 为什么用 Bun?（vs Node.js）
- 34 行状态管理的设计哲学

**1.3 与其他 Agent 工具的架构对比**

- Claude Code vs Cursor：Terminal-native vs IDE-integrated
- Claude Code vs Aider：Agentic loop vs Git patch
- Claude Code vs ChatGPT：本地执行 vs 云端沙箱
- 架构选择的权衡（Trade-offs）

### 2. 启动流程与入口设计

**2.1 cli.tsx：302 行的入口艺术**

- 动态 import 策略（零模块加载的 --version）
- 性能分析埋点（profileCheckpoint）
- 反调试检查（生产环境保护）
- Polyfill 注入（兼容性处理）

**2.2 命令行参数解析**

- Commander.js 的使用
- 子命令架构（claude、mcp、auth、plugin 等）
- 参数验证与错误处理

**2.3 初始化流程**

- 认证系统（OAuth + API Key）
- 遥测与分析（GrowthBook 集成）
- 策略限制（policyLimits）
- 配置加载（6 层优先级）

**2.4 实战：实现一个最小化的 CLI 入口**

- 约 100 行代码
- 支持基础命令行参数
- 完整的错误处理

### 3. REPL 交互界面：终端 UI 核心

**3.1 React Ink 终端渲染原理**

- Ink 的工作机制
- 虚拟 DOM 到终端输出
- 性能优化（避免重渲染）

**3.2 主屏幕组件架构**

- 消息列表渲染
- 流式输出处理
- 工具调用可视化
- 状态栏设计

**3.3 交互模式设计**

- 对话模式（持续会话）
- 管道模式（-p 参数）
- 非交互模式（脚本调用）

**3.4 实战：构建一个简单的 REPL**

- 使用 Ink 渲染终端 UI
- 实现消息历史显示
- 支持流式输出
- 约 300 行代码

### 4. 对话引擎：QueryEngine 的核心循环

**4.1 Agentic Loop 的五步流水线**

```plaintext
用户输入 → 上下文构建 → LLM 推理 → 工具调用 → 结果处理
    ↑                                              ↓
    └──────────────── 循环直到任务完成 ──────────────┘
```

**4.2 流式对话与工具调用**

- Server-Sent Events (SSE) 处理
- 工具调用的解析与执行
- 并行工具调用（Parallel Tool Use）
- 错误恢复与重试

**4.3 上下文管理**

- 消息历史维护
- Token 计数与限制
- 自动压缩（auto-compact）
- 上下文窗口优化

**4.4 会话状态管理**

- QueryEngine 的状态机
- 会话归因（attribution）
- 会话恢复（/resume）

**4.5 实战：实现核心对话循环**

- 约 500 行代码
- 支持流式对话
- 支持工具调用
- 完整的错误处理

### 5. 上下文构建：context.ts 的智能预处理

**5.1 五步预处理流水线**

```plaintext
1. Git 状态检测
2. CLAUDE.md 加载
3. 记忆召回
4. 文件上下文
5. 环境信息
```

**5.2 Git 集成**

- 自动检测 Git 仓库
- 读取 git status、git diff
- 分支信息、提交历史
- .gitignore 处理

**5.3 `CLAUDE.md`：项目级上下文**

- 文件格式规范
- 自动生成策略
- 更新时机

**5.4 智能文件选择**

- 相关性排序
- Token 预算分配
- 增量更新

**5.5 实战：实现上下文构建系统**

- Git 信息提取
- 文件相关性计算
- 上下文组装
- 约 400 行代码

---

## 第二部分：工具系统 - 实现 30+ 生产级工具

### 6. 工具系统架构

**6.1 工具的定义与注册**

- Tool Schema 设计（JSON Schema）
- 工具接口（ITool）
- 工具注册机制（getTools()）
- 工具分类（核心工具 vs 条件工具 vs Feature Flag 工具）

**6.2 工具执行流程**

- 工具调用解析
- 参数验证
- 权限检查（pre-hook）
- 执行与结果捕获
- 后处理（post-hook）

**6.3 工具设计的最佳实践**

- 单一职责原则
- 幂等性设计
- 错误处理
- 超时控制

**6.4 实战：实现工具系统框架**

- 工具注册器
- 工具执行器
- Hook 系统
- 约 200 行代码

### 7. 核心工具（一）：文件操作

**7.1 FileReadTool：智能文件读取**

- 支持的文件类型（文本、PDF、图片、Notebook）
- 大文件处理（分块读取）
- 编码检测
- 二进制文件处理

**7.2 FileWriteTool：安全文件写入**

- 文件创建 vs 覆写
- 备份机制
- Diff 生成
- 权限检查

**7.3 FileEditTool：精确文件编辑**

- Search-Replace 模式
- Diff-based 编辑
- 冲突检测
- 撤销机制

**7.4 NotebookEditTool：Jupyter Notebook 编辑**

- Notebook 格式解析
- 单元格级别编辑
- 输出保留

**7.5 实战：实现文件操作工具集**

- 完整的文件读写编辑
- 支持多种文件格式
- 约 600 行代码

### 8. 核心工具（二）：Shell、搜索与语言服务

**8.1 BashTool：Shell 命令执行**

- 命令执行（child_process）
- 输出捕获（stdout/stderr）
- 流式输出
- 超时控制
- 交互式命令处理

**8.2 PowerShellTool：Windows 支持**

- PowerShell 执行
- 跨平台兼容性

**8.3 GlobTool：文件模式匹配**

- Glob 语法支持
- 性能优化（大型代码库）
- .gitignore 集成

**8.4 GrepTool：代码搜索**

- 正则表达式搜索
- 多文件搜索
- 上下文行数控制
- 性能优化（ripgrep 集成）

**8.5 LSPTool：语言服务器协议集成**

- LSP 协议基础
- 代码诊断、跳转与补全
- 与编辑器工具链集成

**8.6 实战：实现 Shell、搜索与语言服务工具**

- 安全的命令执行
- 高性能代码搜索
- LSP 客户端接入
- 约 500 行代码

### 9. 核心工具（三）：网络与交互

**9.1 WebFetchTool：网页抓取**

- URL 抓取（HTTP 请求）
- HTML → Markdown 转换
- AI 摘要生成
- 超时与重试

**9.2 WebBrowserTool：浏览器自动化**

- 与 WebFetchTool 的区别（完整浏览器 vs 简单 HTTP）
- 页面渲染与 JavaScript 执行
- 截图与元素交互
- Chrome CDP 集成

**9.3 WebSearchTool：网页搜索**

- 搜索引擎集成
- 域名过滤
- 结果排序

**9.4 AskUserQuestionTool：用户交互**

- 多问题提示
- 选项预览
- 输入验证

**9.5 SendMessageTool：消息发送**

- 跨 Agent 通信（Mailbox 机制）
- 异步消息传递

**9.6 实战：实现网络与交互工具**

- 网页抓取与浏览器自动化
- 用户交互界面
- 约 400 行代码

### 10. 核心工具（四）：生产力与工作流

**10.1 TodoWriteTool：结构化任务管理**

- 任务列表的创建与更新
- 状态追踪（pending / in_progress / completed）
- 与 Agentic Loop 的配合模式
- 为什么任务管理是 Agent 的核心能力

**10.2 Plan Mode：先规划后执行**

- EnterPlanModeTool / ExitPlanModeTool 的设计
- 规划阶段与执行阶段的权限隔离
- Plan Mode 与 Manual/Auto 模式的关系
- 如何在工具中实现"只读规划"约束

**10.3 Git Worktree 支持**

- EnterWorktreeTool / ExitWorktreeTool
- 为什么用 Worktree 而不是分支切换
- 多任务并行隔离的实现
- 与沙箱系统的配合

**10.4 WorkflowTool 与 ScheduleCronTool：自动化编排**

- 工作流定义（DAG 结构）
- 定时任务调度
- 触发器与条件分支

**10.5 实战：实现生产力工具集**

- TodoWriteTool 实现
- Plan Mode 状态机
- 约 400 行代码

### 11. 高级工具（一）：子代理系统

> 本章聚焦**单个子代理的实现机制**；多代理编排模式见第 24 章。

**11.1 AgentTool：子代理派生**

- Fork 模式（继承上下文）
- Async 模式（后台运行）
- Background 模式（长期任务）
- Remote 模式（远程执行）

**11.2 子代理的生命周期**

- 创建与初始化
- 上下文传递
- 结果回传
- 清理与回收

**11.3 内置 Agent**

- Explore Agent（快速代码库探索）
- Plan Agent（架构设计与规划）
- Verification Agent（验证与测试）

**11.4 实战：实现子代理系统**

- 子代理派生
- 上下文隔离
- 结果聚合
- 约 500 行代码

### 12. 高级工具（二）：MCP 协议

**12.1 MCP（Model Context Protocol）概述**

- 协议规范
- 为什么需要 MCP？
- MCP vs 传统工具

**12.2 MCP Server 开发**

- Server 实现
- 工具注册
- 资源管理

**12.3 内置 MCP Servers**

- GitHub MCP Server
- 文件系统 MCP Server
- Chrome MCP Server

**12.4 MCP 客户端实现**

- Server 发现与连接
- 工具调用代理（MCPTool / ListMcpResourcesTool / ReadMcpResourceTool）
- MCP 认证（McpAuthTool）
- 错误处理

**12.5 实战：实现 MCP 客户端**

- 连接 MCP Server
- 动态工具加载
- 约 400 行代码

### 13. 工具优化与监控

**13.1 工具性能优化**

- 缓存策略
- 并行执行
- 懒加载

**13.2 工具监控**

- 执行时间追踪
- 成功率统计
- 错误日志

**13.3 工具调试**

- Debug 模式
- 工具调用日志
- 参数验证

**13.4 实战：实现工具监控系统**

- 性能追踪
- 日志记录
- 约 200 行代码

---

## 第三部分：高级特性 - 记忆、权限、沙箱

### 14. 记忆系统：三层架构

**14.1 记忆系统架构**

```plaintext
第一层：热数据（当前会话）
第二层：话题文件（项目级记忆）
第三层：长期记忆（跨会话知识）
```

**14.2 自动记忆提取**

- 提取时机（stopHooks）
- 提取策略（5 重门禁）
- 记忆子代理（extractMemories）
- 记忆巩固（autoDream）

**14.3 记忆召回**

- 相关性排序（findRelevantMemories）
- 话题文件选择（最多 5 个）
- Token 预算管理

**14.4 `CLAUDE.md` 管理**

- 自动生成
- 手动编辑
- 版本控制

**14.5 实战：实现记忆系统**

- 三层记忆架构
- 自动提取与召回
- 约 600 行代码

### 15. 权限系统：多层安全防线

**15.1 权限模式**

- Manual 模式（每次询问）
- Plan 模式（先规划后执行，与第 10 章 Plan Mode 的关联）
- Auto 模式（YOLO 分类器）

**15.2 YOLO 分类器**

- 安全操作自动批准
- 危险操作拦截
- 分类规则

**15.3 路径验证**

- 文件路径白名单
- 敏感目录保护
- 符号链接检查

**15.4 规则匹配**

- 命令黑名单
- 参数校验
- 正则表达式匹配

**15.5 权限审计**

- 操作日志
- 拒绝原因
- 用户反馈

**15.6 实战：实现权限系统**

- 三种权限模式
- YOLO 分类器
- 约 800 行代码

### 16. 安全沙箱：四层纵深防御

**16.1 沙箱架构**

```plaintext
第一层：OS 原生沙箱（bubblewrap/Seatbelt）
第二层：权限系统
第三层：资源限制
第四层：审计日志
```

**16.2 OS 原生沙箱实现**

- Linux：bubblewrap
- macOS：Seatbelt（sandbox-exec）
- Windows：Windows Sandbox API

**16.3 Git Worktree 与文件系统隔离**

- Worktree 作为轻量级隔离单元（与第 10 章的配合）
- 只读目录与读写目录划分
- 禁止访问的敏感路径

**16.4 网络隔离**

- 域名白名单
- 端口限制
- 代理配置

**16.5 资源限制**

- CPU 限制
- 内存限制
- 磁盘限制
- 超时控制

**16.6 实战：实现安全沙箱**

- OS 原生沙箱
- Worktree 隔离集成
- 资源限制
- 约 700 行代码

### 17. 自动压缩：上下文窗口管理

**17.1 压缩策略**

- Auto-compact（自动触发）
- Micro-compact（增量压缩）
- API compact（云端压缩）

**17.2 压缩算法**

- 消息合并
- 摘要生成
- 重要信息保留

**17.3 压缩时机**

- Token 阈值（95%）
- 消息数量
- 用户触发（/compact）

**17.4 实战：实现自动压缩**

- 压缩算法
- 触发机制
- 约 300 行代码

### 18. Hook 系统：工具调用的拦截器

**18.1 Hook 类型**

- Pre-hook（工具调用前）
- Post-hook（工具调用后）
- Stop-hook（对话结束后）

**18.2 Hook 配置**

- settings.json 配置
- 动态加载
- 优先级管理

**18.3 内置 Hooks**

- 记忆提取（extractMemories）
- 权限检查
- 性能追踪

**18.4 自定义 Hooks**

- Hook 接口
- 注册机制
- 错误处理

**18.5 实战：实现 Hook 系统**

- Hook 框架
- 内置 Hooks
- 约 200 行代码

---

## 第四部分：工程化 - 测试、监控、部署

### 19. 测试策略

**19.1 单元测试**

- 工具函数测试
- Mock LLM 响应
- 测试覆盖率

**19.2 集成测试**

- 完整对话流程
- 工具调用链
- 错误场景

**19.3 端到端测试**

- 真实 API 调用
- 文件系统操作
- 性能基准

**19.4 实战：构建测试套件**

- Jest/Vitest 配置
- 测试用例编写
- CI/CD 集成

### 20. 监控与可观测性

**20.1 日志系统**

- 结构化日志
- 日志级别
- 日志轮转

**20.2 性能监控**

- API 延迟
- 工具执行时间
- Token 消耗

**20.3 错误追踪**

- Sentry 集成
- 错误聚合
- 告警机制

**20.4 用户分析**

- GrowthBook 集成
- A/B 测试
- Feature Flag

**20.5 实战：实现监控系统**

- 日志与追踪
- 性能指标
- 约 300 行代码

### 21. 配置管理

**21.1 配置层级**

```plaintext
1. 默认配置
2. 全局配置（~/.config/agent-cli/）
3. 项目配置（.agent-cli/）
4. 环境变量
5. 命令行参数
6. 运行时覆盖
```

**21.2 配置格式**

- JSON Schema 验证
- 配置迁移
- 向后兼容

**21.3 敏感信息管理**

- API Key 加密
- 密钥轮转
- 环境变量

**21.4 实战：实现配置系统**

- 多层配置
- 验证与迁移
- 约 200 行代码

### 22. 打包与分发

**22.1 构建策略**

- Code splitting（450 个 chunk）
- Tree shaking
- 压缩优化

**22.2 多平台支持**

- macOS（Intel + Apple Silicon）
- Linux（x64 + ARM）
- Windows

**22.3 分发渠道**

- npm 包
- Homebrew
- Standalone 可执行文件

**22.4 自动更新**

- 版本检测
- 增量更新
- 回滚机制

**22.5 实战：构建与发布**

- Bun 打包配置
- CI/CD 流程
- 多平台构建

---

## 第五部分：扩展生态 - Skills、插件、子代理

### 23. 插件与 Skills 系统

**23.1 Skills 系统概述**

- Skills vs 工具（能力封装 vs 单次调用）
- `src/skills/` 目录结构
- DiscoverSkillsTool 与 SkillTool 的工作机制
- Skills 的加载与热更新（loadSkillsDir）

**23.2 插件架构**

- 插件接口
- 插件生命周期
- 插件隔离

**23.3 插件开发**

- 插件模板
- 工具注册
- 配置管理
- MCP Skills（mcpSkills / mcpSkillBuilders）

**23.4 插件管理**

- 安装与卸载（/plugin install）
- 版本管理
- 依赖解析

**23.5 实战：实现插件与 Skills 系统**

- Skills 加载器
- 插件管理命令
- 约 400 行代码

### 24. 子代理编排

> 本章聚焦**多代理协同的编排模式**；单个子代理实现见第 11 章。

**24.1 编排模式**

- 顺序执行
- 并行执行
- 条件分支
- 循环迭代

**24.2 Agent Swarms（团队协作）**

- Team 创建（TeamCreateTool / TeamDeleteTool）
- 角色分配
- 任务分发
- 结果聚合

**24.3 后台任务系统**

- 任务创建（TaskCreateTool）
- 任务监控（TaskGetTool / TaskListTool / TaskOutputTool）
- 任务控制（TaskUpdateTool / TaskStopTool）

**24.4 Coordinator 模式**

- `src/coordinator/coordinatorMode.ts`
- Worker Agent 的角色（workerAgent.ts）
- 多 Agent 上下文隔离

**24.5 实战：实现子代理编排**

- 编排引擎
- 团队协作
- 约 500 行代码

### 25. 多云 API 支持

**25.1 API 抽象层**

- 统一接口
- Provider 适配器
- 自动切换

**25.2 支持的 Providers**

- Anthropic Direct（API Key + OAuth）
- AWS Bedrock（凭据刷新）
- Google Vertex（GCP 凭据）
- Azure Foundry（API Key + Azure AD）

**25.3 成本优化**

- 模型选择策略
- 智能路由
- 缓存机制

**25.4 实战：实现多云支持**

- Provider 适配器
- 智能路由
- 约 400 行代码

---

## 第六部分：实战案例 - 构建完整的 Agent CLI

### 26. 综合实战：从零到生产

**26.1 项目规划**

- 功能清单
- 技术选型
- 架构设计

**26.2 核心实现**

- REPL 界面（300 行）
- 对话引擎（500 行）
- 工具系统（1000 行）
- 权限系统（800 行）
- 沙箱系统（700 行）
- 记忆系统（600 行）
- 其他（1100 行）

**总计：约 5000 行核心代码**

**26.3 测试与优化**

- 单元测试
- 性能优化
- 用户体验

**26.4 部署与运维**

- 打包发布
- 监控告警
- 用户反馈

**26.5 持续迭代**

- Feature Flag 管理
- A/B 测试
- 版本规划

---

## 附录

### A. Claude Code 源码导读

**A.1 核心文件清单**

- `src/entrypoints/cli.tsx`（入口，302 行）
- `src/main.tsx`（主流程）
- `src/screens/REPL.tsx`（终端 UI 主屏幕）
- `src/query.ts`（核心对话循环）
- `src/QueryEngine.ts`（会话引擎）
- `src/context.ts`（上下文构建）
- `src/hooks/toolPermission/`（权限系统）
- `src/tools/`（30+ 工具实现）
- `src/services/mcp/`（MCP 客户端，12000+ 行）
- `src/memdir/`（记忆目录系统）
- `src/skills/`（Skills 系统）
- `src/coordinator/`（多 Agent 协调器）

**A.2 关键设计模式**

- 事件驱动架构
- 插件化设计
- Hook 模式
- Provider 模式

**A.3 性能优化技巧**

- 动态 import
- Code splitting
- 缓存策略
- 并行执行

### B. 工具 Schema 完整参考

- 30+ 工具的完整 Schema
- 参数说明
- 使用示例

### C. System Prompt 模板库

- 通用 Agent Prompt
- Explore Agent
- Plan Agent
- Verification Agent
- 记忆提取 Agent
- Coordinator Agent

### D. 配置文件参考

- settings.json 完整配置
- `CLAUDE.md` 模板
- .gitignore 规则

### E. 常见问题排查（FAQ）

- 启动失败
- API 调用错误
- 工具执行失败
- 权限问题
- 性能问题

### F. 术语表

- Agent、Tool、Hook、MCP 等核心概念
- Feature Flag、YOLO、Compact、Worktree 等术语
- Skills、Coordinator、Swarm 等多代理术语

### G. 推荐资源

- Claude Code 官方文档
- Anthropic 研究论文
- 开源项目
- 社区讨论

---

## 学习路径建议

### 快速入门路径（2-3 天）

- 第 0 部分：了解定位
- 第 1 章：架构全景
- 第 2-4 章：启动流程、REPL、对话引擎
- 动手：运行 Claude Code 源码

### 核心实现路径（1-2 周）

- 第 1-2 部分：核心架构 + 工具系统
- 动手：实现 5-10 个核心工具
- 动手：构建基础对话循环

### 生产就绪路径（3-4 周）

- 第 1-4 部分：完整学习
- 动手：实现完整的 Agent CLI
- 动手：添加测试与监控

### 深度研究路径（1-2 个月）

- 全部内容 + Claude Code 源码研读
- 动手：实现所有高级特性
- 动手：贡献开源项目

---

## 核心价值主张

**这不是一本"玩具教程"，而是一本"工业级实战指南"**：

1. **真实架构**：基于 Claude Code 51 万行源码提炼
2. **生产就绪**：5000 行代码实现 80% 核心能力
3. **深度解析**：不只是"怎么做"，更重要的是"为什么这样做"
4. **可复用**：每个模块都可以独立使用
5. **持续更新**：跟随 Claude Code 的演进持续更新

**学完这本教程，你将能够**：

- 理解工业级 Agent 的设计哲学
- 构建自己的 Agent CLI 工具
- 为企业定制内部开发工具
- 参与开源 Agent 项目
- 在 AI 工具领域创业

---

**技术要点**：TypeScript + Node.js/Bun + React Ink + OpenAI/Anthropic API；基于 Claude Code 真实架构；5000 行核心代码；30+ 生产级工具。
