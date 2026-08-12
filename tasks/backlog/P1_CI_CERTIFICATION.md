# P1-CI-CERT-001 — 外部 CI 与保护规则认证

状态：`READY/NOT_RUN`（Workflow 已补 Node 22/24、并发策略和证据留存；正式托管执行/保护规则未认证）。

## 目标

在正式托管仓库执行 CI，配置 required checks、最小权限、并发取消、产物保留和受保护分支。

## 依赖

- 托管仓库、组织权限、Runner 和保护规则决策。

## 验收

Pull Request 上真实执行全部适用 Gate；权限和保护规则经审阅；Workflow 文件存在本身不算通过。

## 当前证据

- Local Quality 使用 Node 22/24 matrix，Node 24 运行 10M Benchmark。
- API runtime deploy、SBOM/License 和覆盖率随本地验收执行，证据 artifact 保留 14 天。
- Database workflow 为手工目标环境门禁并保留 `output/acceptance/database/`。
- Workflow 使用只读 contents 权限和并发取消策略。
- 未完成：托管仓库真实运行、required checks、branch protection、组织 Runner 与 artifact policy 批准。
