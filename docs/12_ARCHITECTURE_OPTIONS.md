# 架构选项比较

## Option A — Thin Wrapper

`Application → Toolkit → h3-js`

- 优点：1–2 天可形成基础 SDK、零数据库依赖、浏览器/Node 同构。
- 缺点：共享持久聚合、精确 geometry、跨表 join 和大批量治理不足。
- 适用：嵌入式 GIS/前端/单服务。

## Option B — Toolkit + PostGIS/H3

`Application → Toolkit → {h3-js, PostgreSQL H3 + PostGIS}`

- 优点：保留快速同步路径，同时获得 exact geometry、SQL 聚合、索引与持久化；职责清晰。
- 缺点：native extension 安装/升级必须治理；两套执行路径要一致性测试。
- 适用：生产级共享空间基础设施。

## Option C — Spatial Platform

`H3 API → Analysis Service → {h3-js, PostGIS, ClickHouse}`

- 优点：适合十亿级遥测、长周期 cube、多租户集中服务。
- 缺点：ClickHouse 双写/一致性、异步作业、运维、安全和 SLO 使 5 天目标不可实现。
- 适用：已有明确 OLAP 规模和组织平台需求后。

## Optional execution engines

| Engine | Value | MVP decision |
|---|---|---|
| DuckDB H3 | 单机 GeoParquet/Arrow，无服务器离线分析 | Optional Phase 2 |
| ClickHouse | billion-scale GPS、H3×Time Cube | Phase 2 after workload proof |
| h3-py/H3-Pandas | notebook/reference/manual analysis | Tooling only |
| h3ronpy | Arrow/Polars multi-threaded conversion | Benchmark candidate |
| Sedona | Spark/Flink distributed H3 | Enterprise extension |

## Decision

选择 **Option B 的最小实现**，但 Application h3-js 路径是默认，PostGIS Adapter 可选启用。这样不会因为本期数据库或 OLAP 延迟纯 Toolkit 交付，也避免 Option A 成为无法共享的散装 Wrapper。
