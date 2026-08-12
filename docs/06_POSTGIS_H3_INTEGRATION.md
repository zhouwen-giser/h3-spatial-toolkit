# PostGIS / H3 集成设计

模板 v1.4.0 已预置可再生的 `h3-cross-engine-golden.json`、PostGIS 对照测试、严格 Schema/Upsert 断言、四类索引计划探针、10K–10M 规模、扩展升级、DDL 回滚和带逻辑指纹的 custom-format Backup/Restore。`pnpm acceptance:database` 会把每次完整执行写入独立的 `output/acceptance/database/runs/<run-id>/`。2026-08-13 已认证实现提交 `cd3211f` 的 GitHub-hosted run `31642261871` 已将全部检查收敛为同一 run-id 的 56 个 artifacts，G4 `PASS`。

## 职责边界

| H3 | PostGIS |
|---|---|
| Spatial Key、层级、邻域、粗筛、聚合 | Exact geometry、Intersection、Contains、Distance、Buffer、Validation、Projection |
| 球面离散网格与近似统计 | CRS-aware 精确空间语义 |
| `h3index` B-tree/Hash/BRIN | geometry GiST/SP-GiST |

## 两阶段查询

1. 用查询 Polygon 生成目标 resolution 的 H3 cells。
2. 通过 `h3_cell` B-tree 找候选记录。
3. 对候选记录执行 `ST_Intersects`/`ST_Contains` 精确判定。

SQL 在 `database/sql/two_stage_filter.sql`。此模式只有在 feature 表保存与查询策略一致的 H3 resolution 时才有效；多 resolution 场景应保存 canonical resolution，或按父级生成表达式索引。

## 下推策略

| Workload | Preferred layer | Reason |
|---|---|---|
| 单请求少量点、交互式邻域 | Application/h3-js | 无 DB round-trip |
| 批量导入预计算 key | 流式 Application 或 SQL COPY | 依据数据入口决定 |
| 跨表 join、共享聚合、持久 metric | PostgreSQL H3 | 数据本地性与查询计划 |
| 精确边界/距离/投影 | PostGIS | H3 不提供 exact geometry contract |
| >10M 重复分析/长期时空 cube | PostgreSQL 分区或 OLAP | Node 响应体与内存成为瓶颈 |

## 扩展成熟度

[postgis/h3-pg](https://github.com/postgis/h3-pg) 是当前 canonical 仓库；4.5.0 在 [PGXN](https://pgxn.org/dist/h3/4.5.0/) 标记 Stable，仓库 CI 覆盖 PostgreSQL 14–18，并提供 `h3`、`h3_postgis`、B-tree/Hash/BRIN operator class。

结论是“可进入生产候选验证”，不是“无需验证即可上线”。需要在目标发行版检查：扩展安装来源、升级脚本、主从/备份、索引计划、Polygon 大输入、锁/内存、PostGIS SRID 和真实数据压测。

## 仓库实现

- `database/Dockerfile` 从 PGXN 固定安装 H3 4.5.0。
- `001_extensions.sql` 启用 PostGIS、H3、H3 PostGIS。
- `002_schema.sql` 建立 geometry GiST 与 h3 B-tree。
- `packages/postgis` 提供 Point↔H3、Geometry→Cells、Cell→Geometry Adapter。
- `scripts/verify-database.sh` 运行 SQL smoke 与 Vitest integration。

认证脚本使用容器内的 `psql/pg_dump/pg_restore`，本地 psql 不是执行前提。Windows 本地数据库仅绑定 loopback 端口 `55432`；托管 workflow 使用一次性 Compose 数据库和显式 reset guard。已认证实现提交 `cd3211f` 的完整 G4 已通过；它仍不能声明托管 HA/PITR/Failover 或生产就绪。
