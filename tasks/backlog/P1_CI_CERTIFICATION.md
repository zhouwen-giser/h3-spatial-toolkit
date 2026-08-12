# P1-CI-CERT-001 — 外部 CI 与保护规则认证

Work 状态：`REVIEW`。Gate 状态：`PARTIAL`（已认证实现提交 `cd3211f` 的托管 quality/database 执行成功；required checks、保护规则和组织 artifact policy 尚未认证）。

## 目标

在正式托管仓库执行 CI，配置 required checks、最小权限、并发取消、产物保留和受保护分支。

## 依赖

- 托管仓库、组织权限、Runner 和保护规则决策。

## 验收

Pull Request 上真实执行全部适用 Gate；权限和保护规则经审阅；Workflow 文件存在本身不算通过。

## 当前证据

- 已认证实现提交 `cd3211f` 的 run `31642176184` 中 2 个 quality、6 个 portable 和 1 个 browser job 全部 SUCCESS；覆盖 Node 22/24、Ubuntu x64、Windows x64、macOS arm64、Linux arm64，并在托管 Linux 运行 Chromium/Firefox/WebKit（Firefox 无 WebGL 时走真实 SVG fallback）。
- 已认证实现提交 `cd3211f` 的 database run `31642261871` SUCCESS，数据库 artifact 上传、日志采集与 volume teardown 均成功。
- API runtime、SBOM/License、覆盖率和 Benchmark 由适用 job 执行并保留 evidence artifact。
- Database workflow 为手工目标环境门禁并保留 `output/acceptance/database/`。
- Workflow 使用只读 contents 权限和并发取消策略。
- 未完成：required checks、branch protection、组织 Runner 与 artifact policy 批准。`G6_CROSS_PLATFORM=PASS` 不等于 CI 治理完成。
