# 项目当前状态

更新时间：2026-08-13。

## 基线

| 项目 | 状态 |
|---|---|
| 软件版本 | `h3-spatial-toolkit@0.2.0` |
| 模板版本 | `1.3.0` |
| Node/pnpm | Node ≥22；基线 Node 24 / pnpm 11.16 |
| H3 | h3-js 4.5.0；数据库目标 h3/h3_postgis 4.5.0 |
| 本地测试 | 历史本地基线 84 passed；本轮 PostGIS 11/11 passed |
| 覆盖率 | Lines 94.33%；Branches 89.00%；Functions 92.30% |
| 构建 | 8 packages + API + CLI + Web Demo PASS |
| Contract | OpenAPI 9 paths + baseline 7 paths + 4 JSON Schema；无 breaking change |
| 生产依赖 | 0 个已知漏洞；146 个生产组件 License 检查，0 manual review；CycloneDX SBOM 145 components |
| 源码包 | 198 文件 Manifest；两次 ZIP 二进制一致；Release Summary、内容与解压审计 PASS |
| 数据库门禁 | PARTIAL：Docker/Compose 实机、扩展 4.5.0/4.5.0、PostGIS 3.5.2、10K、Golden 11/11、基础恢复通过；完整 G4 尚未通过 |

## 当前工作

`P0-DB-CERT-001`：`REVIEW/PARTIAL`。当前 Windows x64 / Node 22、Docker 29.6.1、Compose 5.2.0 环境已完成镜像构建与健康检查、重复 Migration、Smoke、10K Fixture、两类 EXPLAIN、h3-js/h3-pg Golden 11/11 和 custom-format 基础恢复。已修复 Docker context 污染、非交互 pnpm、Git Bash `/dev/stdin` 转换和宿主 5432 端口冲突；PostgreSQL 仅绑定 `127.0.0.1:55432`。完整 G4 仍缺 Schema 一致性负例、可执行 Upsert、索引计划断言、100K/1M/10M、源/恢复逻辑校验及升级/回滚，不得标记 PASS。

`P1-API-HARDEN-001` 已完成本地 G1/G2 认证。Web Bundle、本地 Metrics/日志、Golden 基线、源码 SBOM/License Inventory、26.0 MB production-only API layout、Graceful Shutdown 和 Release Metadata 自动化已实现；真实 Browser、Auth/Tenant、镜像构建/扫描/签名、OTel exporter、外部 CI/批准等能力继续保持 `REVIEW/PARTIAL/BLOCKED/NOT_RUN`。

## 门禁状态

| Gate | 状态 | 说明 |
|---|---|---|
| G0 Template/Docs/Repository/Shell Baseline | PASS | Contract、文档、任务/版本/Secret/格式/Lint、Bash syntax/strict mode 有证据；ShellCheck 未执行 |
| G1 Local Quality/Golden Fixture | PASS | Type、84 tests、coverage、11 builds、Schema/License/Audit；h3-js Golden 可再生 |
| G2 API Contract/API/CLI | PASS | OpenAPI 9 paths/JSON Schema/v1 compatibility；compiled smoke PASS |
| G2 Web Bundle | PASS | Entry/async/total 均在预算内；不替代 Browser/A11y |
| G2 Browser/Accessibility | NOT_RUN | 本机有 Chromium-family 浏览器，但尚无 Firefox/WebKit 与可复验 A11y harness |
| G3 Performance | PASS | 10K–10M 真实运行，结果见 `benchmark/results/latest.json` |
| G3 Load/Soak | NOT_RUN | 需要目标并发和持续运行环境 |
| G4 Database | PARTIAL | Docker 实机 10K/Golden 11/11/基础恢复通过；严格规模、Schema、索引和生命周期证据待补 |
| G5 Security | PARTIAL | 本地 audit/146-component license/源码 SBOM/secret/限额/脱敏/Metrics 可执行；身份、租户、镜像签名未完成 |
| G6 Deployment/Recovery | PARTIAL | 26.0 MB production-only layout、non-root、readiness、graceful shutdown PASS；Docker/HA/恢复/跨平台未认证 |
| G7 Release Package | PASS | 固定时间戳 Manifest、双构建 ZIP、Release Summary、解压/内容审计 PASS |
| G7 Production Release | BLOCKED | 依赖数据库、安全、浏览器、部署与恢复门禁 |

## 下一步

1. 增加 Cell/Resolution 与 Geometry/Cell 写入一致性约束及负例。
2. 实机执行并断言四列 Upsert 与两阶段查询正确性。
3. 将 EXPLAIN 升级为可失败的 H3 B-tree、Geometry GiST、时间和 Parent index 计划门禁。
4. 补齐 100K/1M/10M、源/恢复逻辑校验及 Migration/Extension 升级回滚。
5. 在真实浏览器执行 `P1-BROWSER-A11Y-001`，认证已通过本地预算的 Web Bundle。
6. 选定 OIDC/Tenant/Gateway/OTel 平台，完成 `P1-SEC-OBS-001` 目标环境部分。

完整未完成工作和不能在当前 Work 环境执行的项目见 `docs/29_UNFINISHED_WORK_REGISTER.md`。状态不得从 `NOT_RUN/BLOCKED` 直接人工改为 `PASS`，必须先生成对应 Gate 证据。

当前判定是 `SOURCE_TEMPLATE_READY`，不是 `PRODUCTION_READY`。
