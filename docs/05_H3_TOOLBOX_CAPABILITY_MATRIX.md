# H3 Toolbox 能力矩阵

分类：R0 直接复用；R1 薄封装；R2 组合；R3 自研；R4 MVP 延后。状态“Done”表示本仓库有实现与测试，“Available”表示底层已有但本期不暴露。

| Area | Capability | Class | Source/algorithm | MVP status |
|---|---|---:|---|---|
| Core | LatLng→Cell, Cell→Center, Boundary, Resolution, Validation | R1 | h3-js Cell/Inspection | Done |
| Hierarchy | Parent, Children, Center Child, Compact, Uncompact | R1 | h3-js Hierarchy | Done |
| Neighborhood | Neighbor, Grid Disk, Ring, Distance, Path | R1 | h3-js Traversal | Done |
| Geometry | Point→Cell | R1 | Core wrapper | Done |
| Geometry | MultiPoint→Cells | R2 | pointToCell map | Done |
| Geometry | LineString→Cells | R2 | point index + grid path + compression | Done |
| Geometry | Polygon→Cells | R1 | polygonToCells | Done |
| Geometry | MultiPolygon→Cells | R2 | polygonToCells union/dedupe | Done |
| Geometry | Cells→Polygon / GeoJSON | R1 | cellsToMultiPolygon / boundary | Done |
| Aggregation | Count/Sum/Average/Min/Max | R2 | H3 group key + reducer | Done |
| Aggregation | Weighted Average/Density/Distinct | R2 | reducer + cellArea/set | Done |
| Coverage | Area/Visited/Missing/Ratio/Duplicate/Difference | R2 | polygon cover + set algebra | Done |
| Flow | Trajectory→Cells/Cell Sequence/Compression | R2 | pointToCell + adjacent dedupe | Done |
| Flow | OD/Cell Flow/Directed Flow/Aggregation | R2 | first/last + group key | Done |
| Temporal | Time Bucket | R2 | standard time truncation | Schema/SQL available; API R4 |
| Temporal | H3×Time/Spatial Series | R2 | H3 key + bucket | SQL available; API R4 |
| Temporal | Change Detection | R3 | domain baseline/threshold | R4 |
| Statistics | Density | R2 | count/cell area | Done |
| Statistics | Hotspot / Local Statistics | R3 | Gi*/Local Moran with weights/significance | R4 |
| Statistics | Spatial Correlation | R3 | weights matrix + hypothesis testing | R4 |
| Statistics | Anomaly Detection | R3 | temporal/spatial model | R4 |
| Index modes | Directed Edge / Vertex | R0 | H3 Core | Available, endpoint R4 |

## 汇总

按细分后的 51 项能力统计：R0=16、R1=11、R2=17、R3=0、R4=7。直接复用或小型组合占 **86.3%**。高级统计虽然未来属于 R3，但当前正确分类是 R4，不应为了达成比例提前放入 MVP。

## 关键语义

- Area Coverage 是 cell centroid cover，不是精确 geometry union。
- Visited Cell 证明轨迹进入某个网格，不证明覆盖该网格内全部道路。
- `gridPathCells` 是 H3 网格最短连续路径，不是道路最短路径，也不等价于轨迹插值。
