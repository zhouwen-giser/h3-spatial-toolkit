# H3 Spatial Toolkit — Codex 工作约定

本文件适用于整个仓库。进入项目后，Codex 必须先完成下列阅读，不得跳过直接改代码：

1. `CODEX_START_HERE.md`
2. `PROJECT_STATUS.md`
3. `docs/17_SYSTEM_DETAILED_DESIGN.md`
4. `docs/18_DEVELOPMENT_PLAN.md`
5. `docs/19_ACCEPTANCE_GATES.md`
6. `docs/21_TRUSTED_ACCESS_POLICY.md`
7. `docs/23_ENGINEERING_GOVERNANCE.md`
8. `docs/24_TEST_STRATEGY.md`
9. `docs/28_ENVIRONMENT_EXECUTION_MATRIX.md`
10. `docs/29_UNFINISHED_WORK_REGISTER.md`
11. 当前 `tasks/current/` 下的任务文件

## 工作方式

- 先运行 `pnpm environment:report` 和 `pnpm check:static`，确认环境、模板和任务状态可读。
- 检查现有实现和测试，不重复已经完成的工作。
- 一次只推进一个明确 Work Item；开始时把它写入 `PROJECT_STATUS.md` 和 `.codex/project-state.json`。
- 代码必须遵循 `Reuse → Wrap → Standardize → Extend`，不得重新实现 H3 Core 算法。
- 外部坐标始终使用 longitude/latitude；H3 原始 lat/lng 顺序只能出现在 Core 或数据库 Adapter 内。
- Analysis 包保持纯函数，不得依赖 Fastify、PostgreSQL 或 Web 框架。
- 所有新公共能力都要同步更新 TypeScript 类型、JSON Schema、REST/CLI 契约、测试和文档。
- 未执行的门禁必须写 `NOT RUN` 或 `BLOCKED`，不得根据静态检查推断数据库、Docker 或浏览器实测通过。
- 不得创建虚假证据、预填成功日志或把计划中的 Workflow/Runbook 当作已执行结果。

## 代码变更门禁

最小本地门禁：

```bash
pnpm acceptance:local
pnpm acceptance:api
pnpm benchmark
pnpm check:release
```

涉及数据库时追加：

```bash
docker compose up -d --build
pnpm acceptance:database
```

涉及性能路径时比较 Benchmark 基线并按需追加 Load/Soak；涉及 Web 时追加真实浏览器功能和可访问性验证并记录 WebGL/SVG 两种状态。当前环境缺失工具时，更新未完成工作登记册，不得降低门禁。

## 完成定义

一个 Work Item 只有同时满足以下条件才能标记完成：

- 实现与详细设计一致，或已提交并记录 ADR。
- 正向、错误和边界测试通过。
- 对应 Acceptance Gate 有可复验命令和证据。
- `PROJECT_STATUS.md`、`.codex/project-state.json`、任务文件和追踪矩阵已同步。
- 没有把规划能力写成已实现能力。

## 安全和可信访问

- 默认只进行本地、可恢复、任务相关的读取和写入。
- 不读取、复制或回显真实凭据；使用 `.env.example` 和 Secret 引用。
- 不执行外部发布、GitHub push、数据库删除、生产部署或其他不可逆操作，除非用户明确授权具体目标。
- 不关闭测试、校验、审计或安全门禁来换取“通过”。
- 遇到权限、凭据、目标环境或破坏性操作阻塞时停止并报告，不绕过限制。
