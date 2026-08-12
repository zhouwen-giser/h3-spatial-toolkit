# P1-CI-CERT-001 — 外部 CI 与保护规则认证

Work 状态：`READY`。Gate 状态：`PARTIAL`（Workflow 已扩展并推送候选；完整托管执行/required checks/保护规则尚未认证）。

## 目标

在正式托管仓库执行 CI，配置 required checks、最小权限、并发取消、产物保留和受保护分支。

## 依赖

- 托管仓库、组织权限、Runner 和保护规则决策。

## 验收

Pull Request 上真实执行全部适用 Gate；权限和保护规则经审阅；Workflow 文件存在本身不算通过。

## 当前证据

- Portable acceptance 使用 Node 22/24 和 Linux/Windows/macOS、x64/arm64 适用矩阵；数据库单独运行。
- Browser job 在托管 Linux 运行 Chromium/Firefox/WebKit 并上传 acceptance evidence。
- API runtime、SBOM/License、覆盖率和 Benchmark 由适用 job 执行并保留 evidence artifact。
- Database workflow 为手工目标环境门禁并保留 `output/acceptance/database/`。
- Workflow 使用只读 contents 权限和并发取消策略。
- 未完成：完整托管矩阵成功、required checks、branch protection、组织 Runner 与 artifact policy 批准。部分 job 运行不等于 G6 cross-platform PASS。
