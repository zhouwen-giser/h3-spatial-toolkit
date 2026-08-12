# Codex 开发模板验收报告

执行日期：2026-08-13。软件版本：`0.3.0`；模板版本：`1.4.0`。

## 总结

**源码候选状态：本地 Gate 范围内可交付；项目生产状态：`BLOCKED`。**

当前 Windows Work 环境已真实完成本地源码/契约/API/CLI 子门禁、三引擎浏览器与可访问性矩阵，以及具备完整环境键的单机性能比较。平台中立的 fail-closed 鉴权边界也已由本地契约测试覆盖。已认证实现提交 `cd3211f` 的托管数据库 run `31642261871` 已把 Schema/Upsert/Adapter/Golden、索引计划、10M 规模、扩展升级、DDL rollback、backup checksum 和非空逻辑恢复收敛为同一 run-id 的 56 个 artifacts，因此 `G4_DATABASE=PASS`。

具体 IdP/JWKS、持久租户隔离、Gateway、OTel/SLO、Load/Soak、HA/PITR、镜像漏洞处置/签名和生产批准仍未完成。已认证实现提交 `cd3211f` 的远端 quality/portable/browser run `31642176184` 已 9/9 jobs 成功，覆盖 Ubuntu x64、Windows x64、macOS arm64、Linux arm64、Node 22/24 与托管三浏览器，因此 `G6_CROSS_PLATFORM=PASS`。该实现提交的 API/数据库镜像实际运行使 `G6_CONTAINER_RUNTIME=PASS`，但聚合 Deployment/Recovery 仍为 `PARTIAL`。

用户已明确将新源码 ZIP、`SHA256SUMS`、`MANIFEST.json`、Release Summary、全新目录解压/frozen install/static 复验和交付包内容审计排除出本轮完成要求。因此当前 `G7_RELEASE_PACKAGE=NOT_RUN`；历史 `0.2.0` / 模板 `1.3.0` 的包证据不适用于当前源码树。

## 模板内容验收

| 项目 | 结果 |
|---|---|
| Codex 入口、仓库规则、Project State | PASS |
| 完整系统详细设计与 I0–I5 计划 | PASS |
| G0–G7 分层门禁与证据格式 | PASS |
| 工程治理、测试、发布、运维、安全隐私 | PASS |
| FR-001–FR-012、NFR-001–NFR-012 追踪 | PASS |
| 当前任务、Backlog 和未完成工作登记 | PASS |
| PR/Issue/ADR/Task/Acceptance 模板 | PASS |
| CI/Database/Browser Workflow 定义 | PASS（定义本身不替代远端执行） |

## 已执行门禁

| Gate | 命令/关键结果 | 状态 |
|---|---|---|
| G0 Contract/Docs/Repository/Shell | 当前版本、任务、文档、Secret、格式、Lint、Bash syntax/strict mode；固定 Docker ShellCheck v0.11.0 实际执行 | PASS |
| G1 Local/Golden/Build | 16 files passed + 1 DB file skipped；131 tests passed + 13 DB tests skipped；Statements 93.16%、Branches 89%、Functions 93.58%、Lines 94.73%；Build/Golden PASS | PASS |
| G2 Contract/API/CLI | 0.3.0 OpenAPI、历史兼容基线、具体成功 Schema、六命令正反例、资源边界和 compiled smoke | PASS |
| G2 Web Bundle | Entry 405,176 / gzip 126,346 bytes；Deck async 632,091 / gzip 181,874 bytes；total JS 1,037,334 bytes | PASS |
| G2 Browser/Accessibility | Chromium 151.0.7922.34、Firefox 153.0、WebKit 26.5；正常 WebGL + 强制 SVG；键盘/Focus/Resolution/Clear/Reset/200% 等效回流；Axe critical/serious 0 | PASS：9/9 |
| G3 Algorithm Performance | Windows Node 22 完整环境键；每场景 1 次预热 + 3 次记录并取 median；correctness 通过；静默独立复验 9/9 在 20% 阈值内 | PASS |
| G4 PostgreSQL H3/PostGIS | run `31642261871`：PostgreSQL 17.10/PostGIS 3.5.7/h3 4.5.0；13/13 integration、10M 四计划、升级/回滚、backup checksum、两表逻辑恢复共 56 artifacts | PASS |
| G5 Local Auth Contract | `local` 默认兼容；`required` 缺 authenticator 启动失败；Principal/Tenant/Scope/401/403 fail closed | PARTIAL：本地边界已证实，具体 IdP/Gateway 未接入 |
| G5 Dependency/License/Secret/Source SBOM | npm audit 0；CycloneDX 145 components / 134 external packages；License 检查 146 production packages | PASS（不含镜像阈值/签名） |
| G6 Local Runtime Layout | production-only layout、non-root、readiness 和 graceful shutdown 本地验证 | PASS（不等于容器/HA/跨平台） |
| G6 Container Runtime | 已认证实现提交 `cd3211f` 的 API readiness/non-root/runtime hygiene；独立 PostgreSQL runtime 在完整 G4 中 healthy | PASS（不等于漏洞、签名、rollout 或 HA） |
| G6 Cross-platform | run `31642176184`：2 quality + 6 portable + 1 browser；Ubuntu/Windows/macOS、x64/arm64、Node 22/24、Chromium/Firefox/WebKit | PASS：9/9 jobs |

## 未执行、部分执行或阻塞门禁

| Gate | 状态 | 原因/解锁条件 |
|---|---|---|
| G3 Load/Soak/Chaos | NOT_RUN | 需目标集群、SLO、代表性数据和故障注入授权；单机 Benchmark 不替代 |
| G5 Auth/Tenant | PARTIAL | 本地注入契约 fail closed；具体 OIDC/JWKS、持久租户隔离、Gateway 和跨组件传播待定 |
| G5 Image scan/sign/provenance | PARTIAL | 已认证实现提交 `cd3211f` 的扫描共 3 Critical + 19 High（API 2C/2H；PostgreSQL 1C/17H），阈值 FAIL；Registry 签名/provenance NOT_RUN |
| G6 HA/Recovery | NOT_RUN | Container runtime 已 PASS，但目标平台双副本 rollout、HA、PITR、Failover、RTO/RPO 演练未执行；聚合 Deployment 保持 PARTIAL |
| G7 Release Metadata | PASS | 当前 `acceptance:local` 已执行 0.3.0/1.4.0 版本、Changelog 与 Gate 分类检查 |
| G7 Release Package | NOT_RUN | 用户明确排除当前轮的新 ZIP/Manifest/Checksum/Summary/解压复验和内容审计 |
| G7 Production Release | BLOCKED | G3 Load、具体 G5、G6 HA/Recovery、Owner/批准链仍未完成；G4 与跨平台已不再是阻塞项 |

## 最新 Benchmark 摘要

可比较环境：Windows x64、Node v22.14.0、16 CPUs、h3-js 4.5.0；CPU/OS/内存档位与基线完全匹配。

| 场景 | 规模 | 结果 |
|---|---:|---:|
| Point→H3 | 10M | median 13,664.91ms；731,801 records/s；较同环境 median 基线 -7.27% duration；p95 13,820.54ms |
| Aggregation | 10M | median 13,447.17ms；743,651 records/s；较同环境 median 基线 -11.53% duration；p95 13,495.98ms |
| Large Polygon Res 9 | 647,905 cells | median 1,804.39ms；较同环境 median 基线 -8.01% duration；p95 2,030.28ms |

静默独立复验 9/9 场景在 20% 阈值内。一次与 Docker/其他 Agent 并发的独立复验在 Point 10K/10M 超阈值并被如实保留为 FAIL，证明门禁没有放行噪声或失败；其后在静默条件下以同一基线和阈值复验 PASS。历史 Linux Node 24 因 CPU model、OS release 和 memory bucket 为 unknown，明确为 `NOT_COMPARABLE`。完整结果位于 `benchmark/results/latest.json` 和版本化 archives；这仍不是并发或长稳验证。

## 本轮完成的工程补强

1. 软件版本升级为 `0.3.0`，Codex 模板升级为 `1.4.0`，同步 Workspace/OpenAPI/运行时版本常量和治理文档。
2. OpenAPI 成功响应补齐具体 Schema，并将兼容检查扩展到 request body required 方向、新增边界、required 字段和枚举移除；历史 `0.1.0` 契约与 0.2.0 安全例外 ADR 保留。
3. API/CLI 六个命令补齐正向、非法 operation、输入/输出组合预算和 Windows IPC 关停路径。
4. 新增平台中立鉴权边界：只信任已验证 Principal，Tenant 不接受调用方覆盖，六业务 Scope 和 Metrics Scope fail closed。
5. 新增 Playwright/Axe 三引擎矩阵并真实执行 9/9，覆盖正常 WebGL、强制 SVG、键盘/Focus、缩放与关键交互。
6. Benchmark 采用完整环境键、1 次预热、3 次记录、median 判定与 p95 诊断；无匹配基线时门禁 `NOT_COMPARABLE` 并非零退出，同环境回归超过 20% 失败。
7. 数据库追加 Schema 不变量、真实四列 Upsert、两阶段查询、四类计划探针、10K–10M、逻辑恢复指纹、扩展升级和 DDL 回滚自动化；已认证实现提交 `cd3211f` 的托管完整 run 已 PASS。
8. CI 扩展到 Node/OS/架构和三浏览器矩阵，并由已认证实现提交 `cd3211f` 的远端 run 9/9 jobs 实际认证。
9. 基础/应用/数据库镜像 digest 固定、源码 revision 绑定和实际运行已完成；Scanner 阈值仍失败，不声称供应链完成。

## 交付判定

当前源码具备由后续 Codex 读取设计、选择 Work Item、安装、开发、执行本地/浏览器/数据库门禁和记录证据的完整入口。`cd3211f` 已在远端 PR 由 quality/portable/browser/database workflows 实际认证；本轮最终治理同步仍按用户要求通过 Git commit/push 交付，不生成新的源码交付包。

生产发布不得引用 G4、容器运行或跨平台 PASS 代替具体身份平台、Load/Soak、镜像阈值/签名、HA/PITR 和组织批准。完整待办见 `docs/29_UNFINISHED_WORK_REGISTER.md`。
