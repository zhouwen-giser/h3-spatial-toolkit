# 推荐架构

## 逻辑结构

```text
GIS / Vehicle / Road / Telemetry applications
                    │
       REST API / CLI / TypeScript SDK
                    │
     Standard Schema + Resolution Policy
                    │
   ┌────────────────┼────────────────┐
   │                │                │
h3-js 4.5      PostGIS/H3 4.5    deck.gl boundary
default sync   exact + shared     visual QA
                    │
       Phase 2: DuckDB / ClickHouse / Sedona
```

## 决策

1. `packages/core` 是唯一允许直接处理 H3 `(lat,lng)` 的层。
2. Geometry 输入先做结构与坐标范围校验；生产数据库再用 `ST_IsValid`/`ST_MakeValid` 策略处理拓扑。
3. Analysis 包只组合 H3 primitives，不引入数据库和 Web 框架。
4. API/CLI 负责协议、限额和输入输出；PostGIS 是 Adapter，不是 core dependency。
5. Web Demo 使用 deck.gl `PolygonLayer` 渲染标准 H3 boundary；无 WebGL 环境用相同数据的 SVG 降级。官方 `H3HexagonLayer` 已完成调查，但其 umbrella package 当前引入有高危公告且无已发布修复的 build-only image parser，因此 MVP 选择更小依赖面。

## 运行选择

- 同步、少量、低延迟：h3-js。
- 精确 geometry、共享查询、持久聚合：PostGIS/H3。
- 文件型离线分析：DuckDB H3（Phase 2）。
- 高并发/十亿级时空聚合：ClickHouse（Phase 2）。
- 分布式 ETL/Feature pipeline：Sedona（Phase 2）。

## Production readiness

已具备：版本锁定、输入验证、结构化错误、批量/body/timeout、healthcheck、graceful shutdown、单元/API/CLI/边界测试、coverage threshold、Docker healthcheck、Apache-2.0 项目许可。

上线前门禁：目标数据库集成、auth/tenant quota、rate limit、OTel、SLO、async large jobs、SBOM/镜像签名、backup/restore、extension upgrade rehearsal、负载/故障注入。当前 `pnpm audit --prod` 已通过，但应在每次发布和基础镜像变更时重跑。
