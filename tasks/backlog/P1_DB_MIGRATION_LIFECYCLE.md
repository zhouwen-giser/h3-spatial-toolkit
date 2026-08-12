# P1-DB-MIGRATION-001 — 数据库迁移生命周期

状态：`NOT_RUN`。

## 目标

建立 append-only Migration、重复执行、升级、forward-fix、备份恢复和扩展版本迁移规范。

## 依赖

- P0-DB-CERT-001。
- 目标 PostgreSQL/HA 平台与备份存储。

## 验收

空库和上一版本升级均通过；失败注入后可恢复；迁移、扩展升级、备份和回滚证据进入 G4/G6。
