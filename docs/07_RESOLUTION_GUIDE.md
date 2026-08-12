# H3 Resolution Guide

官方数据来自 [H3 resolution tables](https://h3geo.org/docs/core-library/restable/)。面积为平均六边形面积，edge 为平均边长；实际 cell 尤其 pentagon 附近会变化。细分层级约按 7 倍增长，业务不得任意选择 resolution。

| Res | Avg area km² | Avg edge km | Typical interpretation |
|---:|---:|---:|---|
| 0 | 4,357,449.416 | 1,281.256 | 全球基底 |
| 1 | 609,788.442 | 483.057 | 大洲 |
| 2 | 86,801.780 | 182.513 | GLOBAL policy |
| 3 | 12,393.435 | 68.979 | 国家/大区 |
| 4 | 1,770.348 | 26.072 | REGIONAL policy |
| 5 | 252.904 | 9.854 | 城市群 |
| 6 | 36.129 | 3.725 | 城市粗粒度 |
| 7 | 5.161 | 1.406 | CITY policy |
| 8 | 0.737 | 0.531 | DISTRICT policy |
| 9 | 0.105 | 0.201 | 街区/遥测聚合常用 |
| 10 | 0.0150 | 0.0759 | STREET policy |
| 11 | 0.00215 | 0.0287 | 精细街道态势 |
| 12 | 0.000307 | 0.0108 | FINE policy |
| 13 | 0.0000439 | 0.00409 | 高数据量 |
| 14 | 0.00000627 | 0.00155 | 通常不用于大区聚合 |
| 15 | 0.000000895 | 0.000584 | 极细索引/边界测试 |

## 固定 Policy

| Policy | Resolution | Use | Guardrail |
|---|---:|---|---|
| GLOBAL | 2 | 全球态势 | 不用于局部精度结论 |
| REGIONAL | 4 | 国家/大区域 | 可视化 cell 数可控 |
| CITY | 7 | 城市级分布 | 适合跨城比较 |
| DISTRICT | 8 | 区县/片区 | 运营分析默认候选 |
| STREET | 10 | 街区/车辆 | 高密度数据需预聚合 |
| FINE | 12 | 精细局部分析 | 必须限制 Polygon 面积和批量 |

## 选择流程

先定义业务最小可区分尺度，再计算研究区域的预期 cell 数与事件密度，最后在 Web Demo 检查视觉效果。生产请求应接受 Policy 或经过 allow-list 的 resolution；大型 Polygon 在计算前用 PostGIS 估算面积和 `max cells`，超限时拒绝、降级 resolution 或转异步作业。

不要以 H3 cell edge 当作精确距离，也不要假设相邻 cell 的 geometry 完全规则。Resolution 变化会改变聚合含义，metric 必须同时保存 resolution。
