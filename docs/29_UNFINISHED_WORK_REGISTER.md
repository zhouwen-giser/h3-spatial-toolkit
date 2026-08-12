# 未完成工作登记册

## 1. 说明

本表是系统功能之外的工程任务总账。它避免因模板包含 Docker、Workflow 或文档就误判相应能力已经完成。

## 2. 未完成工作总表

| Work Item | 领域 | 当前状态 | 需要的环境/决策 | 目标 Gate |
|---|---|---|---|---|
| P0-DB-CERT-001 | PostGIS/H3 实机认证 | REVIEW/PARTIAL | 10K/Golden/basic restore PASS；Schema/index/scale/lifecycle 待补 | G4 |
| P0-GOLDEN-001 | h3-js/h3-pg 跨引擎 | COMPLETE_LOCAL | Windows Docker DB 11/11；完整 G4 由 P0 其余项阻塞 | G4 |
| P1-DB-MIGRATION-001 | Migration/upgrade/rollback | NOT_RUN | Target DB | G4/G6 |
| P1-API-HARDEN-001 | Error/limits/semantic validation | COMPLETE_LOCAL | 已完成；生产负载仍由独立项认证 | G1/G2 |
| P1-BROWSER-A11Y-001 | 浏览器/WebGL/SVG/A11y | NOT_RUN | Chromium-family 已安装；Firefox/WebKit 与 harness 待办 | G2 |
| P1-WEB-BUNDLE-001 | Web Demo 分包/预算 | REVIEW_LOCAL | 动态拆包与预算 PASS；真实 Browser 待办 | G2/G3 |
| P1-SHELL-QUALITY-001 | Shell 静态/运行矩阵 | PARTIAL | Bash baseline PASS；shellcheck + target shells 待办 | G0/G6 |
| P1-LOAD-SOAK-001 | 并发/Soak/Chaos | NOT_RUN | Target cluster | G3/G6 |
| P1-SEC-OBS-001 | OIDC/Tenant/OTel/SLO | PARTIAL | 本地日志/Metrics PASS；IdP/Gateway/platform 待定 | G5/G6 |
| P1-DATA-GOV-001 | 数据分类/保留/删除 | BLOCKED_BY_POLICY | Owner/legal policy | G5 |
| P1-SUPPLY-001 | SBOM/image scan/sign | PARTIAL | Source SBOM/License PASS；Registry/image/signing 待办 | G5 |
| P1-DEPLOY-DR-001 | HA/backup/PITR/failover | NOT_RUN | Deployment/DB platform | G6 |
| P1-CROSS-PLATFORM-001 | Node/OS/arch matrix | PARTIAL | macOS/Windows/arm64 runners | G6 |
| P1-CI-CERT-001 | 外部 CI/保护规则 | NOT_RUN | Hosted repository | G0/G7 |
| P1-GOV-OWNER-001 | CODEOWNERS/批准人 | BLOCKED_BY_ORG | 人员和职责决策 | G7 |
| P1-PUBLISH-001 | npm/内部 Registry 发布 | BLOCKED_BY_DECISION | 分发模式 | G7 |
| P1-RELEASE-001 | Changelog/Release 自动化 | PARTIAL_LOCAL | 本地 metadata/summary PASS；外部 CI/Owner/发布待办 | G7 |
| P2-JOB-001 | 异步 Job/Worker/Result | PLANNED | Queue/Object Store ADR | Future |
| P2-OLAP-001 | DuckDB/ClickHouse Adapter | DEFERRED | 真实规模证据 | Future |
| P2-ADV-ANALYTICS-001 | Hotspot/时空统计 | DEFERRED | 业务需求和统计验证 | Future |

## 3. 当前 Work 环境已完成的工程补强

- Format、ESLint、Type、Unit/Coverage、Build。
- Markdown fence/relative link/瞬态路径检查。
- JSON/Package/Task/Version/Secret/仓库卫生检查。
- OpenAPI Parser、向后兼容基线、JSON Schema 正反例。
- 生产依赖 Audit 与 License Policy。
- API/CLI 编译产物 Smoke。
- API 统一 Envelope/语义/限额、日志脱敏和低基数 Prometheus Metrics。
- Web Deck.gl 动态拆包和可执行 Bundle Budget。
- 10K–10M Benchmark。
- 可复现源码 ZIP、Manifest、Release Summary、Checksum 和内容排除审计。
- 可再生的 6 Point + 4 Polygon 跨引擎 Golden 基线及 PostGIS 对照 runner。
- CycloneDX 1.6 源码 SBOM（145 components）与完整生产依赖许可清单。
- 数据库扩展版本、Migration、Smoke、10K Fixture、EXPLAIN、Golden、Backup/Restore 一键证据脚本。
- Bash syntax/strict-mode 本地门禁和 API SIGTERM graceful shutdown smoke。
- 26.0 MB production-only API deploy、devDependency exclusion 和 non-root Dockerfile；实际容器构建/扫描仍待办。

以上项目已于 2026-08-12 在 Linux x64、Node v24.14.0 环境执行成功，并生成 `evidence/gates/` 摘要。它们的通过范围仅限本地源码、算法和源码包门禁。

当前工作量判断：本地源码模板已经完成；若目标是包含数据库、身份/租户、平台观测、Browser、Load、镜像供应链、HA/DR 和发布批准的生产同步服务，尚需约 23–37 人日；若异步大任务也属于“软件完成”口径，再增加 10–15 人日。详细假设见 `docs/18_DEVELOPMENT_PLAN.md` 3.1 节。

## 4. 禁止替代关系

- `docker-compose.yml` 存在 ≠ Docker/DB/HA 已运行。
- Vite build PASS ≠ 浏览器/WebGL/A11y PASS。
- `pnpm audit` PASS ≠ Auth/Tenant/SBOM/Image Security PASS。
- 单机 Benchmark PASS ≠ Load/Soak/SLO PASS。
- Runbook 存在 ≠ Backup/Restore/Failover 已演练。
- Workflow 文件存在 ≠ 外部 CI/Branch Protection 已执行。

## 5. 状态更新规则

1. 每项状态只能由对应 Work Item 和 Gate 证据推动。
2. `NOT_RUN` 写明缺少的工具/环境；`BLOCKED` 写明依赖或决策。
3. 完成后更新本表、任务文件、Project State、追踪矩阵和验收报告。
4. 不删除历史限制；用完成记录和证据链接关闭。
