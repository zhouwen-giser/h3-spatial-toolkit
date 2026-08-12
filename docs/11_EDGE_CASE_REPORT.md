# Edge Case Report

## 已自动执行

| Case | Test | Result |
|---|---|---|
| Coordinate order | Tokyo known cell + out-of-range swap | Pass |
| Resolution 0 / 15 | point indexing | Pass |
| Pentagon | `getPentagons` + describe | Pass |
| Antimeridian | crossing Polygon→Cells | Pass |
| North/South polar caps | Polygon→Cells at res 3 | Pass |
| Polygon holes | cover count reduced | Pass |
| MultiPolygon | union and dedupe | Pass |
| Invalid Polygon | empty/unclosed rejection | Pass |
| Very small Polygon | coarse cover returns empty | Pass |
| Cells→MultiPolygon | same-resolution set | Pass |
| Grid continuity | neighbor/distance/path | Pass |

42 tests passed；PostGIS integration 1 test suite skipped because `TEST_DATABASE_URL` is absent。Coverage：总行 94.08%，Geometry 94.59%。

## 语义注意

- Antimeridian/极区行为来自 H3 4.5；GeoJSON 客户端和 PostGIS 仍可能有不同的 ring/winding/validity 规则。
- `polygonToCells` 使用 cell centroid containment；very small polygon 在 coarse resolution 返回空是正确且必须显式处理的结果。
- H3 官方说明 `cellsToMultiPolygon` 要求同分辨率且无重复；Toolkit 负责去重，但不自动混合 resolution。
- `gridPathCells` 跨 pentagon 或很远时可能失败，且具体路径不保证跨版本稳定；道路/轨迹应用不能把它当 routing engine。

## 仍需生产验证

极大 Polygon 的 cell 上限、恶意坐标深度、GeometryCollection、NaN/Infinity JSON、PostGIS `ST_IsValid` 修复策略、目标浏览器 WebGL/显卡矩阵和 100M 级文件输入。
