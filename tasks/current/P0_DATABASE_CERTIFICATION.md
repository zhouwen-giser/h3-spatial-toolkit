# P0-DB-CERT-001 — PostgreSQL H3/PostGIS 目标环境认证

状态：`READY/NOT_RUN`（Golden、证据脚本、EXPLAIN 和恢复流程已预置；当前 Work 环境缺少 Docker，不能伪造执行）。

## 目标

在具备 Docker/Compose 的目标环境证明数据库镜像、迁移、H3/PostGIS 函数、Adapter、四列 Upsert、索引计划和恢复流程真实通过。

## 范围

- Docker image build/health。
- Migration 和 Smoke SQL。
- PostGIS integration tests。
- h3-js/h3-pg Golden Dataset。
- `EXPLAIN (ANALYZE, BUFFERS)`。
- Backup/restore 基础演练。

## 不做

- OIDC、异步 Job、ClickHouse。
- 未经授权连接真实生产数据库。

## 依赖

- Docker Engine 与 Compose plugin。
- Docker 镜像内的 `psql/pg_dump/pg_restore`；本地安装 psql 不再是硬依赖。
- 允许构建 H3/H3 PostGIS native extension 的网络、CPU 和磁盘。
- 可安全销毁的认证数据库；不得连接生产实例。

## 步骤

1. 读取 `docs/06_POSTGIS_H3_INTEGRATION.md`、详细设计 13 章和 G4。
2. 记录 Docker、OS、CPU、内存和目标镜像版本。
3. `docker compose up -d --build`。
4. `pnpm acceptance:database`；脚本会自动保存扩展版本、重复 Migration、Smoke 和测试日志。
5. 运行已预置的 Cross-engine Golden Tests。
6. 自动导入 10K Fixture，保存两阶段和聚合 EXPLAIN。
7. 自动执行 custom-format backup/restore，并复验 count 和 backup SHA-256。
8. 更新状态、追踪矩阵和验收报告。

## 验收

严格以 `docs/19_ACCEPTANCE_GATES.md#7-g4--postgresql-h3postgis` 为准。

## 阻塞处理

如果环境缺少 Docker/Compose 或不允许 native extension build，保持 `NOT_RUN` 并报告具体缺口，不改用静态检查声称通过。当前环境探测结果为 Docker/Compose 不可用。
