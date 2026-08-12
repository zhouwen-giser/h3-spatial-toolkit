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
| 数据库 | 已认证实现提交 `cd3211f` 的托管 run-scoped G4 PASS：PostgreSQL 17.10 / PostGIS 3.5.7 / h3+h3_postgis 4.5.0，100K/1M/10M、计划、升级、回滚和逻辑恢复同一 run-id 完成 |
| 跨平台 | 已认证实现提交 `cd3211f` 的 GitHub-hosted quality/portable/browser 9/9 jobs PASS：Ubuntu x64、Windows x64、macOS arm64、Linux arm64，Node 22/24 |
| 供应链 | npm audit 0；Source SBOM 145 components / 134 external packages；License 检查 146 production packages；已认证实现提交 `cd3211f` 的镜像扫描 3 Critical + 19 High，阈值 FAIL；签名/provenance 未执行 |
| 交付 | `cd3211f` 已 push 且远端 quality/database runs 成功；当前治理同步仍须按用户要求 commit/push。新源码 ZIP/Manifest/Checksum/Summary 和解压内容复验继续 NOT_RUN |

## 当前工作

`P0-DB-CERT-001` 已以 `COMPLETE/PASS` 关闭。GitHub Actions run [`31642261871`](https://github.com/zhouwen-giser/h3-spatial-toolkit/actions/runs/31642261871) 在已认证实现提交 `cd3211f` 上完成 56 项同 run-id 证据：Migration 重复执行、严格 Schema/Upsert/exact-filter 断言、PostGIS Adapter 13/13、跨引擎 Golden 11/11、H3/GiST/time/parent 的 10K–10M 索引计划、4.2.3→4.5.0 扩展升级、SQLSTATE 23505 DDL rollback、backup SHA-256 与两表非空逻辑恢复指纹。`G4_DATABASE=PASS` 不替代托管 HA/PITR/Failover。

GitHub Actions run [`31642176184`](https://github.com/zhouwen-giser/h3-spatial-toolkit/actions/runs/31642176184) 的 2 个 quality、6 个 portable 和 1 个 browser job 全部成功，`G6_CROSS_PLATFORM=PASS`。绑定已认证实现提交 `cd3211f` 的 API runtime smoke 与托管数据库容器健康认证使 `G6_CONTAINER_RUNTIME=PASS`；这两个子门禁仍不提升聚合 Deployment/Recovery。

当前主 Work Item 切换到 `P1-SUPPLY-001`（`IN_PROGRESS/PARTIAL`）。API/PostgreSQL 镜像已绑定 `cd3211f` 并实际重扫，但 Docker Scout 仍报告 API 2 Critical + 2 High、PostgreSQL 1 Critical + 17 High，总计 3 Critical + 19 High；无 suppression，签名/provenance 未执行，因此 `G5_SBOM_IMAGE_SIGNING` 保持 `PARTIAL`。

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
| G4 Database | PASS | 已认证实现提交 `cd3211f` 的托管 run `31642261871`：同一 run-id 的镜像身份、断言、13/13 integration、10M 计划、升级/回滚、backup checksum 与逻辑恢复共 56 artifacts PASS |
| G5 Auth/Tenant | PARTIAL | 本地 injected authenticator/Principal/Tenant/Scope fail closed；具体 IdP/JWKS/Gateway/持久隔离未完成 |
| G5 Image/Signing | PARTIAL | 已认证实现提交 `cd3211f` 的扫描：API 2 Critical + 2 High，PostgreSQL 1 Critical + 17 High；总计 3 Critical + 19 High，阈值 FAIL；签名/provenance NOT_RUN |
| G6 Container Runtime | PASS | 已认证实现提交 `cd3211f` 的 API image readiness/non-root/runtime hygiene PASS；独立 PostgreSQL runtime image 在完整 G4 中 healthy |
| G6 Deployment/Recovery | PARTIAL | Container runtime 与 graceful shutdown 子门禁 PASS；双副本 rollout、HA/PITR/Failover/Load 未认证 |
| G6 Cross-platform | PASS | 已认证实现提交 `cd3211f` 的托管 run `31642176184`：Ubuntu x64 quality、Windows x64/macOS arm64/Linux arm64 portable Node 22/24、Linux 三浏览器共 9/9 jobs PASS |
| G7 Release Metadata | PASS | `acceptance:local` 已对 0.3.0/1.4.0 版本、Changelog 和 Gate policy 执行当前检查 |
| G7 Release Package | NOT_RUN | 用户明确排除新 ZIP/Manifest/Checksum/Summary、解压 frozen install/static 和内容审计 |
| G7 Production Release | BLOCKED | 依赖 G3 Load、具体 G5、G6 HA/Recovery、Owner 和批准链；G4 与跨平台 PASS 不解除这些条件 |

## 下一步

1. 处置已认证实现提交 `cd3211f` 镜像的 3 Critical + 19 High；达到政策阈值并完成 Registry 签名/provenance 前 G5 image 不得 PASS。
2. 选定 OIDC/JWKS、Tenant persistence、Gateway 和 OTel 平台，完成目标环境认证。
3. 在目标平台完成 Load/Soak、双副本 rollout、HA/PITR/Failover 和 RTO/RPO 演练。
4. 配置并审阅 required checks、branch protection、Owner/批准链与正式发布流程。
5. 每一轮修改均 commit 并 push；完成前验证最终 commit 已在远端分支/PR 可见。

状态词汇：Gate 只使用 `PASS/PARTIAL/NOT_RUN/BLOCKED`；Work Item 只使用 `PLANNED/READY/IN_PROGRESS/REVIEW/COMPLETE_LOCAL/COMPLETE/DEFERRED/BLOCKED`。状态不能靠静态定义或历史证据升级。

当前分类是由已认证实现提交 `cd3211f` 的远端 CI 与数据库 run 支撑、并由后续纯治理提交同步的 `SOURCE_TEMPLATE_READY`，不是 `PRODUCTION_READY`。
