# P0-DB-CERT-001 — PostgreSQL H3/PostGIS 目标环境认证

Work 状态：`COMPLETE`（2026-08-13）。Gate 状态：`PASS`。

## 目标

在具备 Docker/Compose 的目标环境证明数据库镜像、迁移、H3/PostGIS 函数、Adapter、四列 Upsert、索引计划和恢复流程真实通过。

## 范围

- Docker image build/health。
- Migration 和 Smoke SQL。
- PostGIS integration tests 与 h3-js/h3-pg Golden Dataset。
- `EXPLAIN (ANALYZE, BUFFERS)`、100K/1M/10M 规模。
- Backup/restore 逻辑指纹、扩展升级与 DDL rollback 演练。

## 不做

- OIDC、异步 Job、ClickHouse。
- 未经授权连接真实生产数据库。
- 托管 HA、PITR、Failover 和生产 RTO/RPO；这些由 `P1-DEPLOY-DR-001` 跟踪。

## 依赖

- Docker Engine 与 Compose plugin。
- Docker 镜像内的 `psql/pg_dump/pg_restore`。
- 可安全销毁的合成认证数据库；不得连接生产实例。

## 验收

严格以 `docs/19_ACCEPTANCE_GATES.md#7-g4--postgresql-h3postgis` 为准；`pnpm acceptance:database` 必须在同一 run-id 下完整通过，并保存版本、镜像、断言、计划、规模、升级、回滚和恢复证据。

## 2026-08-13 完成证据

- certified implementation revision：`cd3211f956c5c77c06fd52c79c3cb86b8f92e2d3`。
- GitHub Actions run：[`31642261871`](https://github.com/zhouwen-giser/h3-spatial-toolkit/actions/runs/31642261871)；run-id `gha-31642261871-1-cd3211f956c5c77c06fd52c79c3cb86b8f92e2d3`，56 个证据文件，聚合命令 5 分 13 秒 PASS。
- Linux x86_64、Node 24.18.0、pnpm 11.16.0、Docker 28.0.4、Compose 2.38.2；PostgreSQL 17.10、PostGIS 3.5.7、h3/h3_postgis 4.5.0。
- Migration 重复执行、Smoke、3 个负例/2 个正例/2 个 Upsert/1 个 exact-filter 断言、PostGIS Adapter 13/13、跨引擎 Golden 11/11 PASS。
- H3/GiST/time/parent 四类计划在 10K/100K/1M/10M 均使用要求的索引且无目标表 Sequential Scan；10M 探针分别返回 209/1/1/181 行。
- 4.2.3→4.5.0 扩展升级保留 3 行与 4 个索引；SQLSTATE 23505 注入后的 DDL rollback 无残留对象。
- custom-format backup SHA-256 自校验 PASS；恢复后 `spatial_feature` 10,000,000 行、`h3_metric` 56 行，两表 XOR/SUM 逻辑指纹完全一致。
- Artifact 上传、Compose 日志采集和 `docker compose down -v` 均成功。
- 版本化摘要：`evidence/gates/G4_DATABASE.json`。本项 PASS 不提升 `G6_HA_RECOVERY` 或生产发布状态。

## 阻塞处理

本 Work Item 已关闭。未来变更 PostgreSQL/PostGIS/H3 版本、Migration、索引或恢复算法时，必须以新的 current-source run-id 重新认证，不得复用本次 PASS。
