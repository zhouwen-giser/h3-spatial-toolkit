# 贡献指南

## 开始之前

1. 阅读 `CODEX_START_HERE.md`、`AGENTS.md` 和当前 Work Item。
2. 运行 `pnpm environment:report`，不要把缺失环境的 Gate 标成通过。
3. 运行 `pnpm install --frozen-lockfile` 和 `pnpm check:static`。
4. 一个变更只处理一个稳定 Work Item；范围变化先更新任务和设计。

## 分支与提交

- 建议分支：`feature/<work-item>-<topic>`、`fix/<work-item>-<topic>`。
- 提交信息应包含 Work Item，例如 `fix(P1-API-HARDEN-001): cap polygon output`。
- 不提交 `node_modules`、`dist`、`coverage`、`output`、真实环境文件、密钥或个人位置数据。
- 不修改已发布 Migration 的语义；新增顺序 Migration 和升级/回滚说明。

## 评审要求

- 公共 API/Schema 变化需更新 OpenAPI、JSON Schema、兼容基线、测试和文档。
- Breaking Change 需 ADR、Major/新版本和迁移路径。
- 新依赖需说明用途、License、漏洞、维护状态和替代方案。
- 数据库、安全、性能、浏览器或部署变更需对应专项 Gate 证据。
- PR 只能声明真实执行结果；其余写 `NOT_RUN` 或 `BLOCKED`。

## 最小验证

```bash
pnpm acceptance:local
pnpm acceptance:api
pnpm benchmark
pnpm check:release
```

目标环境测试按 `docs/19_ACCEPTANCE_GATES.md` 追加。完整完成定义见 `docs/23_ENGINEERING_GOVERNANCE.md`。
