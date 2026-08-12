# Gate 0 — GO / NO-GO

> 本文保留初始可行性与 42-test PoC 决策；当前模板验收以 `docs/22_TEMPLATE_ACCEPTANCE_REPORT.md` 为准。

**Decision: GO，建设独立 `h3-spatial-toolkit`，但 MVP 采用 Option B 的最小切片，而不是 Spatial Platform。**

## 证据结论

- H3 Core、h3-js、h3-py、h3-pg 已在 2026 年收敛到 4.5.0；主链路可以版本对齐。
- `h3-js` 直接支持 Node、浏览器、ESM、CommonJS 和 TypeScript 类型，适合作为唯一 TypeScript H3 Engine。
- `postgis/h3-pg` 是当前 canonical 仓库；旧 `zachasme/h3-pg` 已归档，不能继续作为维护状态证据。
- 许可证主链路均可接受：H3/h3-js/h3-pg 为 Apache-2.0，deck.gl 为 MIT。
- 初始本地 PoC 已证明 SDK/API/CLI/Web 构建和 42 项测试；数据库容器因当前环境没有 Docker/Compose 未实机执行。

## 架构决策

1. H3 算法完全依赖官方实现，不复制 Core。
2. EPSG:4326 外部坐标固定为 `longitude, latitude`；H3 的 `latitude, longitude` 仅存在于 Adapter 内部。
3. H3 负责粗筛、网格、邻域、层级与聚合键；PostGIS 负责精确几何、投影和拓扑。
4. ClickHouse、DuckDB、Python、Spark/Sedona 均为 Phase 2 Adapter，不进入 MVP 核心依赖。

## 真正 Blocker

- 生产发布前必须在目标 PostgreSQL 14–18 + PostGIS 环境执行 H3 4.5.0 双向转换、索引计划和数据量压测。
- 5 天足以交付可运行的 production-candidate MVP，不足以完成生产容量定标、安全基线、SLO、目标集群兼容和 100M 级 OLAP 验证。
