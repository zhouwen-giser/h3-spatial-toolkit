# 未完成工作登记册

## 1. 说明

本表是系统功能之外的工程任务总账。它避免因模板包含 Docker、Workflow 或文档就误判相应能力已经完成。

## 2. 未完成工作总表

| Work Item | 领域 | Work 状态 | Gate 状态 | 需要的环境/决策 | 目标 Gate |
|---|---|---|---|---|---|
| P0-DB-CERT-001 | PostGIS/H3 实机认证 | REVIEW | PARTIAL | 严格切片通过；完整 runner 会重建本地合成认证库，等待用户明确授权 | G4 |
| P0-GOLDEN-001 | h3-js/h3-pg 跨引擎 | COMPLETE_LOCAL | PASS（slice） | Windows Docker DB 11/11；随完整 G4 run-id 重新绑定最终镜像 | G4 |
| P1-DB-MIGRATION-001 | Migration/upgrade/rollback | REVIEW | PARTIAL | 升级与 DDL rollback 个别切片通过；完整 run-scoped G4/目标 DB 演练待办 | G4/G6 |
| P1-API-HARDEN-001 | Error/limits/semantic validation | COMPLETE_LOCAL | PASS | 已完成；生产负载仍由独立项认证 | G1/G2 |
| P1-BROWSER-A11Y-001 | 浏览器/WebGL/SVG/A11y | COMPLETE_LOCAL | PASS | Windows Chromium/Firefox/WebKit 9/9；跨平台持续矩阵由 CI 项跟踪 | G2 |
| P1-WEB-BUNDLE-001 | Web Demo 分包/预算 | COMPLETE_LOCAL | PASS | 动态拆包、预算和真实本地浏览器已通过 | G2/G3 |
| P1-SHELL-QUALITY-001 | Shell 静态/运行矩阵 | REVIEW | PARTIAL | 固定 Docker ShellCheck v0.11.0 与 Git Bash 本地 PASS；目标 OS shell 由跨平台 CI 项跟踪 | G0/G6 |
| P1-LOAD-SOAK-001 | 并发/Soak/Chaos | READY | NOT_RUN | Target cluster、SLO、代表性数据和故障注入授权 | G3/G6 |
| P1-SEC-OBS-001 | OIDC/Tenant/OTel/SLO | IN_PROGRESS | PARTIAL | 本地 Auth contract/日志/Metrics PASS；具体 IdP/JWKS/Gateway/OTel 平台待定 | G5/G6 |
| P1-DATA-GOV-001 | 数据分类/保留/删除 | BLOCKED | BLOCKED | Owner/legal policy | G5 |
| P1-SUPPLY-001 | SBOM/image scan/sign | IN_PROGRESS | PARTIAL | Source SBOM 145 / License 146 PASS；source-label 绑定前镜像扫描 3 Critical + 19 High、阈值 FAIL；需绑定当前 commit 重扫并完成 Registry signing/provenance | G5 |
| P1-DEPLOY-DR-001 | HA/backup/PITR/failover | READY | NOT_RUN | Deployment/DB platform、RTO/RPO 和演练授权 | G6 |
| P1-CROSS-PLATFORM-001 | Node/OS/arch matrix | READY | PARTIAL | Workflow 已定义；托管 Linux/macOS/Windows/arm64 执行待证实 | G6 |
| P1-CI-CERT-001 | 外部 CI 与保护规则 | READY | PARTIAL | Hosted PR 可运行；完整矩阵、required checks 和 branch protection 待证实 | G0/G7 |
| P1-GOV-OWNER-001 | CODEOWNERS/批准人 | BLOCKED | BLOCKED | 人员和职责决策 | G7 |
| P1-PUBLISH-001 | npm/内部 Registry 发布 | BLOCKED | BLOCKED | 分发模式决策 | G7 |
| P1-RELEASE-001 | Changelog/Release metadata | IN_PROGRESS | PARTIAL | 0.3.0/1.4.0 本地 metadata PASS；远端 CI/Owner/发布待办；package gate 本轮排除 | G7 |
| P2-JOB-001 | 异步 Job/Worker/Result | PLANNED | NOT_RUN | Queue/Object Store ADR | Future |
| P2-OLAP-001 | DuckDB/ClickHouse Adapter | DEFERRED | NOT_RUN | 真实规模证据 | Future |
| P2-ADV-ANALYTICS-001 | Hotspot/时空统计 | DEFERRED | NOT_RUN | 业务需求和统计验证 | Future |

## 3. 当前 Work 环境已完成的工程补强

- Format、ESLint、Type、Unit/Coverage、Build。
- Markdown fence/relative link/瞬态路径检查。
- JSON/Package/Task/Version/Secret/仓库卫生检查。
- OpenAPI Parser、向后兼容基线、JSON Schema 正反例。
- 生产依赖 Audit 与 License Policy。
- API/CLI 编译产物 Smoke。
- API 统一 Envelope/语义/限额、日志脱敏和低基数 Prometheus Metrics。
- 平台中立的注入 Authenticator/Principal/Tenant/Scope 边界和稳定 401/403 fail-closed 契约。
- Web Deck.gl 动态拆包和可执行 Bundle Budget。
- Chromium 151、Firefox 153、WebKit 26.5 的 WebGL/SVG/键盘/Focus/200% 等效回流/Axe 9/9。
- 带完整环境键、correctness checksum、1 次预热 + 3 次记录 median 和 20% 阈值的 10K–10M Benchmark；Windows 静默独立复验 9/9 PASS，并发负载 FAIL 留档，历史 Linux NOT_COMPARABLE。
- 可再生的 6 Point + 4 Polygon 跨引擎 Golden 基线及 PostGIS 对照 runner。
- CycloneDX 1.6 源码 SBOM（145 components / 134 external packages）、146 production packages License 检查和 npm audit 0。
- 数据库扩展版本、Schema/Upsert 断言、Migration、Smoke、10K–10M、四类计划、Golden、逻辑 Backup/Restore、升级和 DDL rollback 的 run-scoped 证据脚本；完整执行等待授权。
- Bash syntax/strict-mode/ShellCheck 本地门禁和 API SIGTERM/Windows IPC graceful shutdown smoke。
- 26.0 MB production-only API deploy、devDependency exclusion 和 non-root Dockerfile；API/PostgreSQL 镜像已在 source-label 绑定前构建/扫描，但 3 Critical + 19 High 导致阈值 FAIL，且不能绑定当前 commit。

以上新增项目于 2026-08-13 在 Windows x64、Node v22.14.0 环境按各自范围执行，并在 `evidence/gates/` 或忽略提交的 run output 中留证。它们的通过范围仅限对应本地源码、算法、浏览器或数据库切片，不能推导生产平台 PASS。

历史 `0.2.0` / 模板 `1.3.0` 曾执行可复现源码 ZIP、Manifest、Release Summary、Checksum 和解压内容审计；用户已明确将这些步骤从当前 `0.3.0` / `1.4.0` 完成要求中移除，因此 `G7_RELEASE_PACKAGE=NOT_RUN`，历史结果不计入当前 PASS。

当前工作量判断：本地源码/浏览器候选已完成主要能力；若目标是包含完整 G4、具体身份/租户、平台观测、Load、镜像供应链、HA/DR 和发布批准的生产同步服务，尚需约 18–31 人日；若异步大任务也属于“软件完成”口径，再增加 10–15 人日。详细假设见 `docs/18_DEVELOPMENT_PLAN.md` 3.1 节。

## 4. 禁止替代关系

- `docker-compose.yml` 存在 ≠ Docker/DB/HA 已运行。
- Vite build PASS ≠ 浏览器/WebGL/A11y PASS。
- `pnpm audit` PASS ≠ Auth/Tenant/SBOM/Image Security PASS。
- 单机 Benchmark PASS ≠ Load/Soak/SLO PASS。
- Runbook 存在 ≠ Backup/Restore/Failover 已演练。
- Workflow 文件存在 ≠ 外部 CI/Branch Protection 已执行。
- 个别数据库严格切片 PASS ≠ 一次完整 run-scoped G4 PASS。
- 本地注入鉴权 contract PASS ≠ 具体 OIDC/JWKS/Gateway/持久租户隔离 PASS。
- 镜像扫描已运行 ≠ 达到漏洞策略阈值或签名/provenance PASS。

## 5. 状态更新规则

1. Gate 状态只使用 `PASS/PARTIAL/NOT_RUN/BLOCKED`；Work 状态只使用 `PLANNED/READY/IN_PROGRESS/REVIEW/COMPLETE_LOCAL/COMPLETE/DEFERRED/BLOCKED`。
2. 每项状态只能由对应 Work Item 和 Gate 证据推动；阻塞原因写在说明中，不创造 `BLOCKED_BY_*` 或斜杠组合状态。
3. `NOT_RUN` 写明缺少的工具/环境；`BLOCKED` 写明依赖、政策或决策。
4. 完成后更新本表、任务文件、Project State、追踪矩阵和验收报告。
5. 不删除历史限制；用完成记录和证据链接关闭。
