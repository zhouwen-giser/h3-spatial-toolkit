# 发布与交付规范

## 1. 发布输入

- 版本化源码、lockfile、OpenAPI、JSON Schema、Migration。
- 设计、开发计划、门禁、追踪、未完成工作和验收报告。
- 测试、覆盖率、Benchmark、Security、DB/Browser/Deployment 证据。
- CHANGELOG、升级/回滚说明、License、CycloneDX 源码 SBOM、镜像信息。
- 当前分支的 Git commit、远端 branch/PR 状态和实际 CI 结果。

## 2. 当前交付方式

本轮采用 Git 仓库作为权威交付边界：每一轮修改都必须形成有意图的 commit 并 push 到远端；任务完成前必须验证最终 commit 已在远端分支/PR 可见。远端 push 证明源码提交可接管，但不自动证明 CI、生产 Gate、合并、Tag、Registry 或部署已完成。

用户已明确将以下步骤排除出本轮完成和交付要求：

- 生成新的可复现源码 ZIP、`SHA256SUMS`、`MANIFEST.json` 和 Release Summary；
- 在全新临时目录解压，执行 frozen install 和至少静态检查；
- 对交付包执行 `node_modules`、`dist`、`coverage`、临时输出、真实 `.env`、凭据或私钥内容审计。

因此当前 `G7_RELEASE_PACKAGE=NOT_RUN` 且不作为本轮完成阻塞项。仓库仍保留 `pnpm check:release` 作为未来可选能力，但不得执行后再把结果冒充当前要求；历史 `0.2.0` / 模板 `1.3.0` 包证据不认证 `0.3.0` / `1.4.0`。

## 3. 版本和兼容

- Project 使用 SemVer；Template 独立使用 `templateVersion`。
- 当前 Project 为 `0.3.0`，Template 为 `1.4.0`；前者因新增鉴权契约、具体 OpenAPI Schema、浏览器/性能/数据库认证能力而做 Minor 升级，后者因 Codex 接管/证据/CI 流程实质扩展而做 Minor 升级。
- `/v1` OpenAPI 与 JSON Schema 有冻结基线。
- Database Migration 只前向追加，不允许修改已发布 Migration 的含义。
- H3/h3-js/h3-pg 版本变化需 Cross-engine Golden 和 Benchmark。

## 4. 尚未完成的发布能力

| 项目 | 状态 | Work Item |
|---|---|---|
| npm 包发布策略/exports/API Extractor | BLOCKED：等待发布范围与兼容策略决策 | P1-PUBLISH-001 |
| Source SBOM/Third-party Notice | COMPLETE_LOCAL | P1-SUPPLY-001 |
| Container SBOM | PARTIAL | P1-SUPPLY-001 |
| Container digest/scan/sign | PARTIAL：digest/scan 本地推进，当前阈值 FAIL；sign/provenance NOT_RUN | P1-SUPPLY-001 |
| Release Owner/CODEOWNERS | BLOCKED | P1-GOV-OWNER-001 |
| Changelog/Gate metadata 自动校验 | 0.3.0/1.4.0 COMPLETE_LOCAL；外部 CI/批准待办 | P1-RELEASE-001 |
| 源码 ZIP/Manifest/Checksum/Summary | NOT_RUN；本轮用户明确排除 | G7_RELEASE_PACKAGE |
| 数据库升级/回滚 | G4 PASS：已认证实现提交 `cd3211f` 的完整 run；目标 HA/PITR 平台仍 PARTIAL | P1-DB-MIGRATION-001 |
| 正式部署和回滚 | PARTIAL：已认证实现提交 `cd3211f` 的 container runtime PASS；双副本/HA/DR NOT_RUN | P1-DEPLOY-DR-001 |

## 5. 发布判定

- `SOURCE_TEMPLATE_READY`：当前源码必需 Gate、版本/Changelog/Gate metadata 通过，并且最终 commit 已 push 到远端；本轮不要求源码包 Gate。
- `INTERNAL_CANDIDATE`：G4 数据库和基础 Security 通过，可进入受控环境。
- `RELEASE_CANDIDATE`：全部生产必需子门禁通过但尚待 Release Owner 批准。
- `PRODUCTION_READY`：所有 Gate、Owner 和批准齐备。

已认证实现提交 `cd3211f` 的本地与远端 quality/cross-platform/database Gate 已通过，满足当前 `SOURCE_TEMPLATE_READY` 证据边界；后续纯治理提交不冒充该实现认证 revision。项目仍不能标为 `PRODUCTION_READY`。PR 是否合并、Tag/Release 是否创建以及部署是否执行必须由对应授权和实际远端状态决定，不能从 push 推断。
