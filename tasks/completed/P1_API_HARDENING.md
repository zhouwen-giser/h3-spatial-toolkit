# P1-API-HARDEN-001 — 同步 API 生产硬化

状态：`COMPLETED`（2026-08-12；G1/G2 本地加强门禁通过，G4 仍为 `NOT_RUN`）。

## 目标

稳定错误码和请求元数据，增加 Polygon/Neighbor/Flow/Distinct 资源门禁，补充 Coverage/Flow Resolution 语义校验，并同步 OpenAPI、SDK、CLI 和测试。

## 依赖

- G4 Database PASS，或架构负责人记录并行推进批准。本轮采用后者；数据库相关结论仍保持 `NOT_RUN`。

## 验收

G1/G2 加强项全部 PASS；超限、恶意输入和错误脱敏测试通过；OpenAPI 兼容门禁通过。

## 完成证据

- 完成时本地强化测试为 64 passed；当前 `0.2.0` 模板汇总为 84 passed、1 DB suite skipped，Lines 94.33%。
- `pnpm acceptance:api`：最终 9 OpenAPI paths、readiness、metrics、API/CLI compiled smoke PASS。
- `pnpm check:contracts`：当前 9 paths 对 v1 baseline 7 paths，无 breaking change；4 JSON Schema PASS。
- 新增统一成功/错误 Envelope、Request ID、启动配置校验和 400/404/408/413/422/500 稳定分类。
- 新增 Polygon/Neighbor/Flow/Distinct/result/GeoJSON 限额及 Coverage/Aggregate/Flow Resolution 校验。
- 未执行项：数据库、Gateway/OIDC/Tenant、Load/Soak 和真实部署均未由本任务覆盖。
