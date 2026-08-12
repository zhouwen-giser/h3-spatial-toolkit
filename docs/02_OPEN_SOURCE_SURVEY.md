# 开源生态调查

调查日期：2026-08-11。技术判断仅使用官方仓库、官方文档、Release 和源码；本机结果单独记录。

## 核心链路

### H3 Core / h3-js / h3-py

- [H3 Core 4.5.0](https://github.com/uber/h3/releases/tag/v4.5.0) 是当前稳定基线，新增反向 Directed Edge 与双向 `gridPathCells` 改进。
- [h3-js 4.5.0](https://github.com/uber/h3-js/releases/tag/v4.5.0) 于 2026-07-01 发布并嵌入 Core 4.5.0；仓库明确支持 Node、Browser、ESM、CommonJS 和 TypeScript。
- [h3-py 4.5.0](https://github.com/uber/h3-py/releases/tag/v4.5.0) 适合作为 Jupyter/GeoPandas/离线对照；不进入 TypeScript 服务主链路。

### PostgreSQL / PostGIS

- canonical 仓库已迁移到 [postgis/h3-pg](https://github.com/postgis/h3-pg)；CI 当前覆盖 PostgreSQL 14–18。
- [PGXN 4.5.0](https://pgxn.org/dist/h3/4.5.0/) 同时发布 `h3` 与 `h3_postgis`，支持原生 `h3index`、B-tree/Hash/BRIN operator class 与 PostGIS 转换。
- 判断：点批量索引、层级 roll-up、服务内短批处理优先 Application Layer；共享数据集、SQL 聚合、空间 join 和持久索引下推 PostgreSQL。

## 离线与大数据

- [DuckDB H3 Community Extension](https://duckdb.org/community_extensions/extensions/h3.html) 已有广泛 H3 API 和签名分发，适合 GeoParquet/Arrow 离线模式；由于它是 Community Extension，本期标记 Optional。
- [ClickHouse H3 Functions](https://clickhouse.com/docs/reference/functions/regular-functions/geo/h3) 原生支持 H3 分桶；适合十亿级 GPS 与 H3×Time Cube，但不是 MVP 前置条件。
- [Apache Sedona H3](https://sedona.apache.org/latest/api/sql/Geometry-Functions/) 适合 Spark/Flink 大规模空间计算；官方也强调 H3 是近似索引，精确问题仍需 geometry。

## 数据科学与 Arrow

- [H3-Pandas](https://github.com/DahnJ/H3-Pandas) 可直接服务 GeoPandas 工作流，但扩展 API 和并行/向量化仍有开放问题，作为参考工具而非生产服务依赖。
- [h3ronpy](https://github.com/nmandery/h3ronpy) 的 Arrow/Polars/GeoPandas 与多线程转换值得 Phase 2 Benchmark，对 TypeScript MVP 无必要性。

## 可视化与人工验收

- [deck.gl H3HexagonLayer](https://deck.gl/docs/api-reference/geo-layers/h3-hexagon-layer) 直接消费 H3 index；低分辨率和 pentagon 会自动倾向高精度路径。
- [Kepler.gl H3 Layer](https://docs.kepler.gl/docs/user-guides/c-types-of-layers/j-h3) 可用 `hex_id`/`hexagon_id` 直接验收 CSV/H3 数据集。
- [QGIS H3 Toolkit 0.2.0](https://plugins.qgis.org/plugins/h3_toolkit/version/0.2.0/) 已支持 H3 v4.x，适合 GIS 人工验收；它依赖 QGIS Python 环境，不进入服务运行时。

## 排除项

没有发现成熟、通用且与业务语义无关的 H3 Coverage、OD、Hotspot 统一库可以直接替代 Toolkit 组合层。Coverage/Flow 采用小型 Composite；Local Moran’s I、Getis-Ord Gi*、时空异常检测延后，不用简单邻域计数冒充统计显著性算法。
