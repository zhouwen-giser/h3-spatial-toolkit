# 项目当前状态

更新时间：2026-08-13。

## 基线

| 项目 | 状态 |
|---|---|
| 软件版本 | `h3-spatial-toolkit@0.3.0` |
| 模板版本 | `1.4.0` |
| Node/pnpm | Node ≥22；当前 Windows Node 22.14.0 / pnpm 11.16 |
| H3 | h3-js 4.5.0；数据库目标 h3/h3_postgis 4.5.0 |
| API/CLI | 6 个业务端点/命令；具体 OpenAPI 成功 Schema、稳定错误、输入/输出组合预算和正反例 |
| 本地质量 | `pnpm acceptance:local` PASS：16 test files passed + 1 skipped；131 tests passed + 13 skipped；Statements 93.16%、Branches 89%、Functions 93.58%、Lines 94.73% |
| Browser | Chromium 151、Firefox 153、WebKit 26.5；WebGL/SVG/键盘/Focus/回流/Axe 9/9 PASS |
| Benchmark | 1 次预热 + 3 次记录的 median 门禁；Windows Node 22 exact-environment comparison 9/9 PASS；历史 Linux 记录 `NOT_COMPARABLE` |
| Auth | 本地注入 contract fail closed；具体 OIDC/JWKS/Gateway/持久 Tenant 为 PARTIAL |
| 数据库 | 严格 runner 已实现且个别切片通过至 10M；完整 run-scoped G4 等待本地合成库重建授权，PARTIAL |
| 供应链 | npm audit 0；Source SBOM 145 components / 134 external packages；License 检查 146 production packages；镜像扫描 3 Critical + 19 High，阈值 FAIL；签名/provenance 未执行 |
| 交付 | 当前轮以 Git commit/push/远端 PR 为交付边界；新源码 ZIP/Manifest/Checksum/Summary 和解压内容复验依用户要求 NOT_RUN |

## 当前工作

`P0-DB-CERT-001` 的 Work 状态为 `REVIEW`，Gate 状态为 `PARTIAL`。当前 Windows/Docker 环境已分别通过：append-only Schema 不变量与负例、真实四列 Upsert、两阶段查询、PostGIS Adapter 13/13、跨引擎 Golden 11/11、H3/GiST/time/parent 计划探针、100K/1M/10M、扩展 4.2.3→4.5.0 升级和事务 DDL rollback。严格 runner 已把最终镜像身份、完整规模、计划、两表逻辑恢复指纹和生命周期结果收敛到独立 run-id。

尚未执行一次完整 run-scoped 认证：该命令会 truncate/reload 仅绑定 `127.0.0.1:55432` 的本地合成认证库，并创建/删除隔离生命周期数据库，正在等待用户明确批准。个别切片不能拼接成 G4 PASS。

本轮并行完成了 API/CLI contract 强化、平台中立 Auth/Tenant 信任边界、真实三浏览器可访问性矩阵、可比较 Benchmark gate、CI 跨平台定义和镜像 digest/scan。G5/G6/G7 仍按各自缺口保持 `PARTIAL/NOT_RUN/BLOCKED`，不会因本地实现或 Workflow 文件存在而升级。

## 门禁状态

| Gate | 状态 | 说明 |
|---|---|---|
| G0 Template/Docs/Repository/Shell | PASS | `acceptance:local` 已通过版本/任务/文档/Secret/格式/Lint、Bash syntax/strict mode；固定 Docker `ShellCheck v0.11.0` 实际执行 PASS |
| G1 Local Quality/Golden Fixture | PASS | 16 files passed + 1 skipped；131 tests passed + 13 DB tests skipped；Statements 93.16%、Branches 89%、Functions 93.58%、Lines 94.73%；Build/Golden PASS |
| G2 API Contract/API/CLI | PASS | 0.3.0 OpenAPI 9 paths、具体 success schema、历史兼容、六命令正反例和 compiled smoke |
| G2 Web Bundle | PASS | Entry 405,176 / gzip 126,346 bytes；Deck async 632,091 / gzip 181,874 bytes；total JS 1,037,334 bytes，均在预算内 |
| G2 Browser/Accessibility | PASS | Chromium 151 / Firefox 153 / WebKit 26.5；9/9；Axe critical/serious 0 |
| G3 Performance | PASS | Windows Node 22 同环境 median3 9/9 在 20% 阈值内；并发负载失败记录保留，静默独立复验通过；历史 Linux 明确 NOT_COMPARABLE |
| G3 Load/Soak | NOT_RUN | 需要目标并发/长稳/故障注入环境和授权 |
| G4 Database | PARTIAL | 严格切片通过；完整 run-scoped runner 等待重建本地合成认证库的明确授权 |
| G5 Auth/Tenant | PARTIAL | 本地 injected authenticator/Principal/Tenant/Scope fail closed；具体 IdP/JWKS/Gateway/持久隔离未完成 |
| G5 Image/Signing | PARTIAL | source-label 绑定前扫描：API 2 Critical + 2 High，PostgreSQL 1 Critical + 17 High；总计 3 Critical + 19 High，阈值 FAIL；不能绑定当前 commit；签名/provenance NOT_RUN |
| G6 Deployment/Recovery | PARTIAL | 本地布局、容器候选和 graceful shutdown 有切片；HA/PITR/Failover/Load 未认证 |
| G6 Cross-platform | PARTIAL | Workflow 定义 Node/OS/arch/browser 矩阵；远端托管执行尚未全部成功 |
| G7 Release Metadata | PASS | `acceptance:local` 已对 0.3.0/1.4.0 版本、Changelog 和 Gate policy 执行当前检查 |
| G7 Release Package | NOT_RUN | 用户明确排除新 ZIP/Manifest/Checksum/Summary、解压 frozen install/static 和内容审计 |
| G7 Production Release | BLOCKED | 依赖 G3 Load、完整 G4、具体 G5、G6、Owner 和批准链 |

## 下一步

1. 获得明确授权后执行一次完整 `P0-DB-CERT-001` run-scoped runner，并只按同一 run-id 的结果决定 G4。
2. 固化当前 API/PostgreSQL 镜像最终 Scanner 计数和处置；达到策略阈值前 G5 image 不得 PASS。
3. 在远端 PR 上执行并审阅 Linux/macOS/Windows、Node 22/24、x64/arm64 和 Browser jobs；Workflow 定义不算通过。
4. 选定 OIDC/JWKS、Tenant persistence、Gateway 和 OTel 平台，完成目标环境认证。
5. 在目标平台完成 Load/Soak、HA/PITR/Failover、签名/provenance、Owner/required checks 和生产批准。
6. 每一轮修改均 commit 并 push；完成前验证最终 commit 已在远端分支/PR 可见。

状态词汇：Gate 只使用 `PASS/PARTIAL/NOT_RUN/BLOCKED`；Work Item 只使用 `PLANNED/READY/IN_PROGRESS/REVIEW/COMPLETE_LOCAL/COMPLETE/DEFERRED/BLOCKED`。状态不能靠静态定义或历史证据升级。

当前是等待远端 push/CI 固化的 `SOURCE_TEMPLATE_READY` 候选，不是 `PRODUCTION_READY`。
