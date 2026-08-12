# 需求追踪矩阵

## 1. 功能需求

| 需求 | 实现位置 | 主要测试 | Gate | 当前状态 |
|---|---|---|---|---|
| FR-001 Point/Cell | `packages/core` | `core.test.ts`、PostGIS integration | G1/G2/G4 | SDK PASS；已认证实现提交 `cd3211f` 的 DB Adapter 13/13；G4 PASS |
| FR-002 Geometry/Cells | `packages/geometry` | `geometry.test.ts`、PostGIS integration | G1/G2/G4 | SDK 与 Antimeridian Polygon/MultiPolygon DB PASS；G4 PASS |
| FR-003 Hierarchy | `packages/core` | `core.test.ts` | G1/G4 | SDK PASS |
| FR-004 Neighborhood | `packages/neighborhood` | `analysis.test.ts` | G1/G2 | PASS |
| FR-005 Aggregation | `packages/aggregation`、SQL | `analysis.test.ts`、Benchmark、SQL assertions | G1/G3/G4 | Node 与真实四列 Upsert/幂等更新 PASS；G4 PASS |
| FR-006 Coverage | `packages/coverage` | `analysis.test.ts`、API hardening tests | G1/G2 | PASS；Cell/Resolution 语义校验已实现 |
| FR-007 Flow | `packages/flow` | `analysis.test.ts`、API hardening tests | G1/G2 | PASS；endpoint/总点限额已实现 |
| FR-008 IO/Schema | `packages/io`、`schema/` | `cli-io.test.ts` | G0/G1 | PASS |
| FR-009 REST/CLI/SDK | `apps/api`、`apps/cli` | API hardening/auth tests、API/CLI Smoke | G2/G5 | 0.3.0 CONTRACT PASS；具体 IdP 集成 PARTIAL |
| FR-010 PostGIS | `packages/postgis`、`database/` | Golden/integration/smoke/EXPLAIN/scale/lifecycle/restore | G4 | 已认证实现提交 `cd3211f` 的 run `31642261871` 共 56 artifacts 完整 PASS；G4 PASS |
| FR-011 Web Demo | `apps/web-demo`、`browser-tests/` | build/browser matrix/Axe | G2/G6 | Build/Budget 与本地 9/9 PASS；托管 Linux 三浏览器 PASS；G6 Cross-platform PASS |
| FR-012 Benchmark | `benchmark/` | 10K–10M correctness/performance gate | G3 | 预热 1 次 + 记录 3 次 median；Windows Node 22 静默独立复验 9/9 PASS；并发负载失败记录保留；历史 Linux NOT_COMPARABLE |

## 2. 非功能需求

| NFR | 目标 | 设计/任务 | Gate | 当前状态 |
|---|---|---|---|---|
| NFR-001 正确性 | 坐标、Resolution、跨引擎一致 | 8–10、13 章；P0-GOLDEN | G1/G4 | Node PASS；已认证实现提交 `cd3211f` 的 DB Golden 11/11、Schema/Upsert/10M PASS |
| NFR-002 性能 | 10K–10M 可复验、同步有上限 | 14 章；P1-LOAD-SOAK | G3 | 同环境 median3 单机 9/9 PASS；同步限额 PASS；Load/Soak NOT_RUN |
| NFR-003 可用性 | API 99.9% 目标、优雅停机 | 7、15、17 章；P1-DEPLOY-DR | G6/G7 | PARTIAL |
| NFR-004 安全 | 身份、租户、限额、供应链 | 16 章；P1-SEC-OBS/P1-SUPPLY | G5 | 限额/脱敏 PASS；本地 fail-closed Auth/Tenant contract PASS；具体 IdP/Gateway/镜像阈值/签名 PARTIAL |
| NFR-005 可观测 | Log/Metrics/Trace/SLO | 17 章；P1-SEC-OBS | G5/G6 | 本地结构化日志/指标 PASS；Trace/SLO/平台 BLOCKED |
| NFR-006 可维护 | 分包、ADR、纯核心、追踪 | 6、21 章；P1-GOV-OWNER | G0/G1 | 本地与托管源码门禁 PASS；Owner BLOCKED |
| NFR-007 可移植 | Node/Browser/PostGIS/Adapter | 6、7、23 章；P1-CROSS-PLATFORM | G1/G6 | 已认证实现提交 `cd3211f` 的 Ubuntu/Windows/macOS、x64/arm64、Node 22/24 与托管三浏览器 9/9 jobs PASS |
| NFR-008 可恢复 | Backup/PITR/Job 幂等 | 15、23 章；P1-DEPLOY-DR/P2-JOB | G6 | G4 非空 backup/restore、扩展升级与事务 rollback PASS；PITR、HA/Failover、Job NOT_RUN |
| NFR-009 可访问 | 键盘、Focus、WebGL fallback | P1-BROWSER-A11Y | G2 | Chromium/Firefox/WebKit 9/9 PASS；Axe critical/serious 0 |
| NFR-010 数据治理 | 分类、保留、删除、导出 | P1-DATA-GOV | G5 | BLOCKED：Owner/Legal 数据政策尚未批准 |
| NFR-011 供应链 | License、SBOM、签名、provenance | P1-SUPPLY | G5/G7 | Source SBOM 145 components / 134 external packages、License 146 production packages PASS；已认证实现提交 `cd3211f` 的镜像扫描 3 Critical + 19 High 且阈值 FAIL；signing/provenance NOT_RUN |
| NFR-012 可发布 | 版本/Changelog/Gate、Owner、升级回滚 | 25 章；P1-RELEASE/P1-PUBLISH | G7 | Metadata automation available；本轮源码包 Gate 依用户要求 NOT_RUN/不作为完成条件；Production BLOCKED |

## 3. 维护规则

- 新增需求时先分配稳定 ID，再实现代码。
- 每个需求至少关联一个测试和一个 Gate。
- Gate 状态只允许：`PASS`、`PARTIAL`、`NOT_RUN`、`BLOCKED`。`PASS` 仅表示该 Gate 明确定义的证据范围通过。
- Work Item 状态只允许：`PLANNED`、`READY`、`IN_PROGRESS`、`REVIEW`、`COMPLETE_LOCAL`、`COMPLETE`、`DEFERRED`、`BLOCKED`；受政策或决策阻塞的原因写入说明列，不创造 `BLOCKED_BY_*` 状态变体。
- 若实现与设计不同，先记录 ADR，再更新本矩阵。
- `PASS` 必须能定位到命令和证据文件，不能只引用人工口头结论。
