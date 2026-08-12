# P0-DB-CERT-001 — PostgreSQL H3/PostGIS 目标环境认证

Work 状态：`REVIEW`。Gate 状态：`PARTIAL`（严格 runner 与各子能力已实现，个别本地切片通过；完整 run-scoped 执行会重建本地合成认证库，等待用户明确授权）。

## 目标

在具备 Docker/Compose 的目标环境证明数据库镜像、迁移、H3/PostGIS 函数、Adapter、四列 Upsert、索引计划和恢复流程真实通过。

## 范围

- Docker image build/health。
- Migration 和 Smoke SQL。
- PostGIS integration tests。
- h3-js/h3-pg Golden Dataset。
- `EXPLAIN (ANALYZE, BUFFERS)`。
- Backup/restore 逻辑指纹、扩展升级与 DDL rollback 演练。

## 不做

- OIDC、异步 Job、ClickHouse。
- 未经授权连接真实生产数据库。

## 依赖

- Docker Engine 与 Compose plugin。
- Docker 镜像内的 `psql/pg_dump/pg_restore`；本地安装 psql 不再是硬依赖。
- 允许构建 H3/H3 PostGIS native extension 的网络、CPU 和磁盘。
- 可安全销毁的合成认证数据库；不得连接生产实例。清空/重载和隔离生命周期数据库创建/删除必须获得明确授权。

## 步骤

1. 读取 `docs/06_POSTGIS_H3_INTEGRATION.md`、详细设计 13 章和 G4。
2. 记录 Docker、OS、CPU、内存和目标镜像版本。
3. `docker compose up -d --build`。
4. `pnpm acceptance:database`；脚本会自动保存扩展版本、重复 Migration、Smoke 和测试日志。
5. 运行已预置的 Cross-engine Golden Tests。
6. 自动导入 10K/100K/1M/10M Fixture，保存 H3/GiST/time/parent 计划断言。
7. 自动执行 custom-format backup/restore，并复验 SHA-256 与源/恢复两表逻辑指纹。
8. 在隔离数据库执行 H3/H3 PostGIS 4.2.3→4.5.0 升级和事务 DDL rollback。
9. 更新状态、追踪矩阵和验收报告。

## 验收

严格以 `docs/19_ACCEPTANCE_GATES.md#7-g4--postgresql-h3postgis` 为准。

## 阻塞处理

如果环境缺少 Docker/Compose 或不允许 native extension build，保持 `NOT_RUN` 并报告具体缺口，不改用静态检查声称通过。

## 2026-08-13 实机进展

- Windows x64 / Node 22.14.0 / Docker 29.6.1 / Compose 5.2.0。
- API/PostgreSQL 镜像构建和容器健康检查通过；PostgreSQL 仅发布到 `127.0.0.1:55432`。
- H3 4.5.0、H3 PostGIS 4.5.0；Migration 重复执行和 SQL Smoke 通过。最终 PostGIS/镜像身份须由完整 run-id 固化。
- Schema 写入一致性负例、真实四列 aggregate Upsert、两阶段正确性、H3/GiST/time/parent 计划、100K/1M/10M 均已作为本地切片通过。
- PostGIS Adapter 13/13（含 Antimeridian MultiPolygon 与非法 Cell）、跨引擎 Golden 11/11 通过。
- 隔离扩展升级与 DDL rollback 脚本分别重复通过；严格 runner 会统一保存备份 SHA 和两表源/恢复逻辑指纹。
- **未完成**：尚未执行一次完整 `output/acceptance/database/runs/<run-id>/` 认证。原因是 runner 会 truncate/reload loopback 上的本地合成认证库，并创建/删除隔离数据库；必须等待用户明确批准，不能把个别切片拼接成 G4 PASS。
- 当前摘要：`evidence/gates/G4_DATABASE.json`；详细运行日志在忽略提交的 `output/acceptance/database/`。
