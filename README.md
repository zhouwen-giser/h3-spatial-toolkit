# H3 Spatial Toolkit

> 本仓库同时是可直接交给 Codex 的开发模板。首次进入请先阅读 [`CODEX_START_HERE.md`](CODEX_START_HERE.md)，Codex 的仓库级约束位于 [`AGENTS.md`](AGENTS.md)。

基于官方 H3 4.5.0 生态构建的 TypeScript 空间网格基础库和标准分析工具集。它采用 **Reuse → Wrap → Standardize → Extend**：H3 索引与遍历完全复用 `h3-js`，Toolkit 只统一坐标、Schema、错误、批量限制，并组合实现聚合、Coverage 与 Flow。

## 已交付能力

- Core、Hierarchy、Neighborhood、Geometry/H3 双向转换
- Count/Sum/Average/Weighted/Density/Distinct 聚合
- Area/Visited/Missing/Duplicate Coverage
- Trajectory、压缩序列、OD、Cell Flow
- REST API + OpenAPI、CLI、PostGIS/H3 Adapter
- deck.gl H3 Web Demo（含无 WebGL 的 SVG 降级）
- 10K/100K/1M/10M Benchmark、边界回归和 Docker 环境

## 快速开始

```bash
pnpm install
pnpm test
pnpm build
pnpm benchmark
pnpm dev
```

API 默认监听 `http://localhost:3000`，OpenAPI UI 位于 `/documentation`。

```bash
pnpm cli point --lng 139.7671 --lat 35.6812 --resolution 9
pnpm cli neighbors --cell 892f5a32d97ffff --k 1
pnpm dev:web
```

数据库环境（需要 Docker）：

```bash
docker compose up -d --build
docker compose ps
```

## 坐标契约

- 所有外部 GeoJSON 均为 EPSG:4326，并严格使用 `[longitude, latitude]`。
- Toolkit 的 Point 使用 `{ longitude, latitude }`。
- 只有封装内部在调用 H3 时转换为 `(latitude, longitude)`；业务代码不得直接交换坐标。

## 目录

- `packages/`：八个可复用包
- `apps/`：API、CLI、Web Demo
- `database/`：PostGIS/H3 迁移、SQL、Fixtures
- `benchmark/`：四级实测脚本和结果
- `test/`：单元、几何、API、CLI、回归、数据库集成
- `docs/`：30 份设计、证据、治理、开发计划和验收文档
- `tasks/`：当前、待办和已完成 Work Item
- `templates/`：Work Task、ADR 和验收报告模板

详见 [`docs/17_SYSTEM_DETAILED_DESIGN.md`](docs/17_SYSTEM_DETAILED_DESIGN.md)、[`docs/19_ACCEPTANCE_GATES.md`](docs/19_ACCEPTANCE_GATES.md) 与 [`docs/29_UNFINISHED_WORK_REGISTER.md`](docs/29_UNFINISHED_WORK_REGISTER.md)。模板 Gate 通过不代表数据库、浏览器或生产环境已经认证。
