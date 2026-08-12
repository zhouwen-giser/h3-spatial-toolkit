# 需求追踪矩阵

## 1. 功能需求

| 需求 | 实现位置 | 主要测试 | Gate | 当前状态 |
|---|---|---|---|---|
| FR-001 Point/Cell | `packages/core` | `core.test.ts` | G1/G2/G4 | SDK PASS；DB NOT RUN |
| FR-002 Geometry/Cells | `packages/geometry` | `geometry.test.ts` | G1/G2/G4 | SDK PASS；DB NOT RUN |
| FR-003 Hierarchy | `packages/core` | `core.test.ts` | G1/G4 | SDK PASS |
| FR-004 Neighborhood | `packages/neighborhood` | `analysis.test.ts` | G1/G2 | PASS |
| FR-005 Aggregation | `packages/aggregation`、SQL | `analysis.test.ts`、Benchmark | G1/G3/G4 | Node PASS；DB NOT RUN |
| FR-006 Coverage | `packages/coverage` | `analysis.test.ts`、API hardening tests | G1/G2 | PASS；Cell/Resolution 语义校验已实现 |
| FR-007 Flow | `packages/flow` | `analysis.test.ts`、API hardening tests | G1/G2 | PASS；endpoint/总点限额已实现 |
| FR-008 IO/Schema | `packages/io`、`schema/` | `cli-io.test.ts` | G0/G1 | PASS |
| FR-009 REST/CLI/SDK | `apps/api`、`apps/cli` | API hardening tests、API/CLI Smoke | G2 | 0.2.0 CONTRACT PASS |
| FR-010 PostGIS | `packages/postgis`、`database/` | Golden/integration/smoke/EXPLAIN/restore | G4 | Docker 10K/Golden 11/11/basic restore PASS；完整 G4 PARTIAL |
| FR-011 Web Demo | `apps/web-demo` | build/browser matrix | G2/G6 | Build PASS；浏览器矩阵待完成 |
| FR-012 Benchmark | `benchmark/` | 10K–10M | G3 | BASELINE PASS |

## 2. 非功能需求

| NFR | 目标 | 设计/任务 | Gate | 当前状态 |
|---|---|---|---|---|
| NFR-001 正确性 | 坐标、Resolution、跨引擎一致 | 8–10、13 章；P0-GOLDEN | G1/G4 | Node PASS；DB Golden 11/11；严格 Schema/规模 PARTIAL |
| NFR-002 性能 | 10K–10M 可复验、同步有上限 | 14 章；P1-LOAD-SOAK | G3 | 单机 PASS；同步限额 PASS；Load NOT_RUN |
| NFR-003 可用性 | API 99.9% 目标、优雅停机 | 7、15、17 章；P1-DEPLOY-DR | G6/G7 | PARTIAL |
| NFR-004 安全 | 身份、租户、限额、供应链 | 16 章；P1-SEC-OBS/P1-SUPPLY | G5 | 限额/脱敏 PASS；身份/租户/供应链平台 BLOCKED |
| NFR-005 可观测 | Log/Metrics/Trace/SLO | 17 章；P1-SEC-OBS | G5/G6 | 本地结构化日志/指标 PASS；Trace/SLO/平台 BLOCKED |
| NFR-006 可维护 | 分包、ADR、纯核心、追踪 | 6、21 章；P1-GOV-OWNER | G0/G1 | 本地待复验；Owner BLOCKED |
| NFR-007 可移植 | Node/Browser/PostGIS/Adapter | 6、7、23 章；P1-CROSS-PLATFORM | G1/G6 | Linux Node 24 only |
| NFR-008 可恢复 | Backup/PITR/Job 幂等 | 15、23 章；P1-DEPLOY-DR/P2-JOB | G6 | DB backup/restore 脚本已预置；实机 NOT_RUN |
| NFR-009 可访问 | 键盘、Focus、WebGL fallback | P1-BROWSER-A11Y | G2 | NOT_RUN |
| NFR-010 数据治理 | 分类、保留、删除、导出 | P1-DATA-GOV | G5 | BLOCKED_BY_POLICY |
| NFR-011 供应链 | License、SBOM、签名、provenance | P1-SUPPLY | G5/G7 | Source SBOM/146-component License PASS；镜像/签名平台 NOT_RUN |
| NFR-012 可发布 | 可复现源码包、Owner、升级回滚 | 25 章；P1-RELEASE/P1-PUBLISH | G7 | Source package/metadata 自动化；Production BLOCKED |

## 3. 维护规则

- 新增需求时先分配稳定 ID，再实现代码。
- 每个需求至少关联一个测试和一个 Gate。
- 状态只允许：`PLANNED`、`IN_PROGRESS`、`PASS`、`PARTIAL`、`NOT_RUN`、`BLOCKED`。
- 若实现与设计不同，先记录 ADR，再更新本矩阵。
- `PASS` 必须能定位到命令和证据文件，不能只引用人工口头结论。
