# Production Roadmap

## Phase 0 — Target environment certification（1–2 天）

- 构建数据库镜像并运行 `scripts/verify-database.sh`。
- 对 PG 版本、h3/h3_postgis 4.5.0、PostGIS、replica/backup、upgrade path 签字。
- EXPLAIN ANALYZE 两阶段查询，验证 H3 B-tree + geometry GiST。

Exit：Database Gate 通过，Docker healthcheck 与 restore rehearsal 通过。

## Phase 1 — Production hardening（3–5 天）

- OIDC/service auth、tenant quota、rate limit、async job、request/result size policy。
- OTel metrics/traces、structured log、SLO dashboard、timeout/cancellation。
- SBOM、dependency/image scan、license notice、signed image。
- workload replay：P50/P95/P99、并发、内存、large polygon、failure injection。

Exit：Production Readiness Gate 通过。

## Phase 2 — Optional engines

1. DuckDB H3 + Spatial + GeoParquet/Arrow Adapter；对比 h3ronpy。
2. ClickHouse H3×Time Cube：GPS billion-scale、materialized view、retention。
3. Sedona/Spark/Flink connector，仅在分布式 ETL 已存在时。
4. h3-py notebook/GeoPandas validation image。

每个 Adapter 必须实现同一 JSON Schema、coordinate policy 和 cross-engine golden test。

## Phase 3 — Advanced analytics

- Hotspot：Getis-Ord Gi*（空间权重、显著性、多重检验）。
- Local statistics：Local Moran’s I。
- Temporal cube/change detection/anomaly。
- Feature Store、OD Matrix、Accessibility、Vector Tile、Streaming aggregation。

## Compatibility policy

- H3/h3-js/h3-pg major/minor 对齐，patch 通过 golden tests 升级。
- 不承诺 `gridPathCells` 具体序列跨版本一致，只承诺连续性和长度语义。
- Schema 独立语义版本；breaking change 走 `/v2` 或 schema version。
