# MVP 范围与五日时间盒

> 本文是初始 MVP 时间盒复盘；当前工程门禁、测试数和工作量以 `docs/18_DEVELOPMENT_PLAN.md`、`docs/22_TEMPLATE_ACCEPTANCE_REPORT.md` 为准。

## Production-candidate MVP

包含：

- Core/Hierarchy/Neighborhood/Geometry 标准 SDK
- Aggregation/Coverage/Flow-basic Composite
- IO Schema、EPSG:4326 Coordinate Policy、Resolution Policy
- Fastify REST + OpenAPI、CLI JSON/CSV/GeoJSON
- PostgreSQL/PostGIS/H3 Adapter、Docker Compose、SQL/migrations
- deck.gl Web Demo + SVG fallback
- Unit/Geometry/API/CLI/Regression/PostGIS integration test template
- 10K/100K/1M/10M Point Benchmark 与 1M/10M aggregation

不包含：Hotspot/Local Moran/Gi*、ML、Streaming、ClickHouse、DuckDB Adapter、Vector Tile、多租户权限、异步作业平台。

## Gate 结果

| Gate | Planned | Result |
|---|---|---|
| 0 / 0.5d | Survey/license/version/ADR | Complete |
| 1 / Day 1 | core/geometry/neighborhood | Complete, tested |
| 2 / Day 2 | aggregation/coverage/flow-basic | Complete, tested |
| 3 / Day 3 | PostGIS/API/CLI/Docker | Code complete；DB runtime not executed |
| 4 / Day 4 | benchmark/edges/web/docs | Complete except target-browser matrix |
| 5 / Day 5 | acceptance/gap/roadmap/package | Complete with conditional DB gate |

## 5 天判断

5 天足以交付 **可运行、可评审、可进入目标环境验收的 production-candidate MVP**。不足以交付无条件 production-ready 系统，真正 Blocker 是：

1. 当前机器无 Docker/Compose，无法证明 h3-pg 4.5.0 镜像在此处构建、迁移、双向转换与索引计划通过；认证脚本使用镜像内数据库客户端。
2. 没有目标生产数据分布、并发、SLO 和部署发行版，无法完成容量与超时定标。
3. Auth、tenant quota、observability backend、SBOM/镜像签名和漏洞处置需要实际平台约束。
4. 100M/ClickHouse Benchmark 属于 OLAP 决策，不应阻塞核心 Toolkit。

这些是可验证的外部门禁，不是笼统的“工作量大”。
