# 项目当前状态

更新时间：2026-08-12。

## 基线

| 项目 | 状态 |
|---|---|
| 软件版本 | `h3-spatial-toolkit@0.2.0` |
| 模板版本 | `1.3.0` |
| Node/pnpm | Node ≥22；基线 Node 24 / pnpm 11.16 |
| H3 | h3-js 4.5.0；数据库目标 h3/h3_postgis 4.5.0 |
| 本地测试 | 84 passed；1 PostGIS suite skipped（缺少 Docker） |
| 覆盖率 | Lines 94.33%；Branches 89.00%；Functions 92.30% |
| 构建 | 8 packages + API + CLI + Web Demo PASS |
| Contract | OpenAPI 9 paths + baseline 7 paths + 4 JSON Schema；无 breaking change |
| 生产依赖 | 0 个已知漏洞；146 个生产组件 License 检查，0 manual review；CycloneDX SBOM 145 components |
| 源码包 | 198 文件 Manifest；两次 ZIP 二进制一致；Release Summary、内容与解压审计 PASS |
| 数据库门禁 | NOT RUN：当前 Work 环境无 Docker/Compose；本地 psql 不是硬依赖 |

## 当前工作

`P0-DB-CERT-001`：下一关键路径；Golden、EXPLAIN、Backup/Restore 和证据采集已自动化，当前 Work 环境缺少 Docker，严格保持 `NOT_RUN`。

`P1-API-HARDEN-001` 已完成本地 G1/G2 认证。Web Bundle、本地 Metrics/日志、Golden 基线、源码 SBOM/License Inventory、26.0 MB production-only API layout、Graceful Shutdown 和 Release Metadata 自动化已实现；真实 Browser、Auth/Tenant、镜像构建/扫描/签名、OTel exporter、外部 CI/批准等能力继续保持 `REVIEW/PARTIAL/BLOCKED/NOT_RUN`。

## 门禁状态

| Gate | 状态 | 说明 |
|---|---|---|
| G0 Template/Docs/Repository/Shell Baseline | PASS | Contract、文档、任务/版本/Secret/格式/Lint、Bash syntax/strict mode 有证据；ShellCheck 未执行 |
| G1 Local Quality/Golden Fixture | PASS | Type、84 tests、coverage、11 builds、Schema/License/Audit；h3-js Golden 可再生 |
| G2 API Contract/API/CLI | PASS | OpenAPI 9 paths/JSON Schema/v1 compatibility；compiled smoke PASS |
| G2 Web Bundle | PASS | Entry/async/total 均在预算内；不替代 Browser/A11y |
| G2 Browser/Accessibility | NOT_RUN | 当前 Work 环境没有真实浏览器 |
| G3 Performance | PASS | 10K–10M 真实运行，结果见 `benchmark/results/latest.json` |
| G3 Load/Soak | NOT_RUN | 需要目标并发和持续运行环境 |
| G4 Database | NOT_RUN | 必须在 Docker/Compose 环境执行；数据库客户端使用认证镜像内工具 |
| G5 Security | PARTIAL | 本地 audit/146-component license/源码 SBOM/secret/限额/脱敏/Metrics 可执行；身份、租户、镜像签名未完成 |
| G6 Deployment/Recovery | PARTIAL | 26.0 MB production-only layout、non-root、readiness、graceful shutdown PASS；Docker/HA/恢复/跨平台未认证 |
| G7 Release Package | PASS | 固定时间戳 Manifest、双构建 ZIP、Release Summary、解压/内容审计 PASS |
| G7 Production Release | BLOCKED | 依赖数据库、安全、浏览器、部署与恢复门禁 |

## 下一步

1. 在目标环境执行 `docker compose up -d --build`。
2. 执行 `pnpm acceptance:database`。
3. 审阅自动生成的 Cross-engine Golden 差异；如有允许差异则建立 ADR。
4. 审阅脚本自动保存的 EXPLAIN、扩展版本、测试日志和恢复演练证据。
5. 在真实浏览器执行 `P1-BROWSER-A11Y-001`，认证已通过本地预算的 Web Bundle。
6. 选定 OIDC/Tenant/Gateway/OTel 平台，完成 `P1-SEC-OBS-001` 目标环境部分。

完整未完成工作和不能在当前 Work 环境执行的项目见 `docs/29_UNFINISHED_WORK_REGISTER.md`。状态不得从 `NOT_RUN/BLOCKED` 直接人工改为 `PASS`，必须先生成对应 Gate 证据。

当前判定是 `SOURCE_TEMPLATE_READY`，不是 `PRODUCTION_READY`。
