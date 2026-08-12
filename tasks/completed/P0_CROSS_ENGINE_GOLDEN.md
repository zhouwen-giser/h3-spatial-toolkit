# P0-GOLDEN-001 — h3-js/h3-pg 跨引擎 Golden

Work 状态：`COMPLETE_LOCAL`。Gate 状态：`PASS`（cross-engine slice；聚合 G4 仍为 `PARTIAL`）。

## 目标

用固定的点、层级、Pentagon、极区、Antimeridian、hole 与 MultiPolygon 数据证明 Node 与 PostgreSQL H3 语义一致。

## 依赖

- P0-DB-CERT-001。
- 已记录的 h3-js、h3-pg、PostGIS 版本和容差策略。

## 验收

Point/Parent/Boundary/Polygon 集合一致；允许差异有 ADR、可复现输入和版本化期望值，证据进入 G4。

## 当前证据

- `database/fixtures/h3-cross-engine-golden.json` 固定 6 个 Point/Hierarchy/Boundary 与 4 个 Polygon 集合案例。
- 覆盖 Resolution 0/15、Pentagon、南北极、Antimeridian、hole 和 MultiPolygon。
- `pnpm check:golden` 防止期望值随依赖或脚本漂移；Node 侧 11 个测试 PASS。
- 2026-08-13 Windows Docker/PostGIS 实机对照 11/11 PASS。完整 G4 仍需在获授权的 run-scoped runner 中重新绑定最终镜像身份；本项 PASS 不提升聚合 G4。
