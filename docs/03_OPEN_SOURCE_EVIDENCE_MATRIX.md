# 开源证据矩阵

Stars 是 2026-08-11 GitHub 页面快照；“—”表示该条以产品/插件文档为证据而非 GitHub 热度。所有链接均指向 primary source。

| Project | Repository | Stars | Activity | License | Language | H3 Version | Capability | Maturity | Reuse Decision |
|---|---|---:|---|---|---|---|---|---|---|
| H3 Core | [uber/h3](https://github.com/uber/h3) | 6.5k | v4.5.0, 2026-05 | Apache-2.0 | C | 4.5.0 | 全部核心索引/遍历/区域 API | High | R0，唯一算法权威 |
| h3-js | [uber/h3-js](https://github.com/uber/h3-js) | 1.1k | v4.5.0, 2026-07 | Apache-2.0 | JS/TS/WASM | 4.5.0 | Node/Browser/TS H3 API | High | R0/R1，主 Engine |
| h3-py | [uber/h3-py](https://github.com/uber/h3-py) | 1.0k | v4.5.0, 2026-05 | Apache-2.0 | Python/C | 4.5.0 | Jupyter/GeoPandas/对照 | High | Phase 2 reference |
| h3-pg | [postgis/h3-pg](https://github.com/postgis/h3-pg) | 381 | PGXN 4.5.0, CI PG14–18 | Apache-2.0 | C/SQL | 4.5.0 | h3index/SQL/PostGIS/index | High | R0 Adapter，目标库复验后启用 |
| DuckDB H3 | [isaacbrodsky/h3-duckdb](https://github.com/isaacbrodsky/h3-duckdb) | 250 | Community Extension current | Apache-2.0 | C++/SQL | 4.x | Arrow/Parquet 离线 H3 | Medium-High | R4 MVP；Phase 2 |
| ClickHouse H3 | [official docs](https://clickhouse.com/docs/reference/functions/regular-functions/geo/h3) | — | 2026 H3 性能改进 | Apache-2.0 | C++/SQL | embedded | OLAP 聚合/层级 | High | R4 MVP；OLAP Adapter |
| deck.gl | [visgl/deck.gl](https://github.com/visgl/deck.gl) | 14.4k | 9.3.9 current | MIT | TS/WebGL | 4.x | H3HexagonLayer | High | R0 Web Demo |
| Kepler.gl | [keplergl/kepler.gl](https://github.com/keplergl/kepler.gl) | 12.0k | 2026 H3 updates | MIT | TS/WebGL | 4.x data | analyst H3 layer | High | R0 验收工具，不嵌入 |
| QGIS H3 Toolkit | [QGIS registry](https://plugins.qgis.org/plugins/h3_toolkit/) | — | 0.2.0, 2026-03 | GPL plugin | Python | 4.x | Grid/point count/processing | Medium | 人工验收，可选 |
| H3-Pandas | [DahnJ/H3-Pandas](https://github.com/DahnJ/H3-Pandas) | 224 | 0.3.0, 2025-03 | MIT | Python | 4.x | Pandas/GeoPandas aggregation | Medium | Reference only |
| h3ronpy | [nmandery/h3ronpy](https://github.com/nmandery/h3ronpy) | 117 | updated 2026-05 | MIT | Rust/Python | h3o | Arrow/Polars/vector/raster | Medium-High | Phase 2 benchmark |
| Apache Sedona | [official H3 docs](https://sedona.apache.org/latest/api/sql/Geometry-Functions/) | — | 2026 native H3 support | Apache-2.0 | JVM/Python/SQL | 4.x | Spark/Flink H3 | High | Phase 2 distributed |

证据原始清单见 `research/evidence/sources.json`。
