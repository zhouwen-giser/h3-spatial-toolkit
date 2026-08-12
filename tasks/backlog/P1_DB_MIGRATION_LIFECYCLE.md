# P1-DB-MIGRATION-001 — 数据库迁移生命周期

Work 状态：`REVIEW`。Gate 状态：`PARTIAL`。

## 目标

建立 append-only Migration、重复执行、升级、forward-fix、备份恢复和扩展版本迁移规范。

## 依赖

- P0-DB-CERT-001。
- 目标 PostgreSQL/HA 平台与备份存储。

## 验收

空库和上一版本升级均通过；失败注入后可恢复；迁移、扩展升级、备份和回滚证据进入 G4/G6。

## 当前证据

- `003_invariants.sql` 为 append-only、事务内、可重复 Migration；Schema 正反例切片通过。
- 隔离数据库的 h3/h3_postgis 4.2.3→4.5.0 数据/索引 checksum 升级切片重复通过。
- 注入 SQLSTATE 23505 的事务 DDL rollback 证明失败后不遗留对象，重复通过。
- 完整 run-scoped G4 尚待用户批准重建本地合成认证库；目标 HA/PITR 平台仍未选择，因此不能标记 COMPLETE/PASS。
