# H3 Core 能力矩阵

基线：[H3 Core 4.5.0](https://github.com/uber/h3/releases/tag/v4.5.0)。H3 Cell 是 64-bit index，包含 mode、resolution 0–15、base cell 0–121 和层级 digits；JS 对外使用 15 位十六进制字符串，避免 JavaScript `Number` 精度问题。

| Domain | Core API | 4.5.0 | Toolkit decision | Boundary / risk |
|---|---|---|---|---|
| Cell | latLngToCell/cellToLatLng/cellToBoundary | Stable | Thin wrapper | 坐标顺序转换 |
| Inspection | isValidCell/getResolution/isPentagon | Stable | Direct reuse | Pentagon 单独回归 |
| Hierarchy | parent/children/center child | Stable | Thin wrapper | 必须验证 resolution 方向 |
| Hierarchy | compact/uncompact | Stable | Thin wrapper | 输入去重、同层语义 |
| Traversal | gridDisk/gridRing | Stable | Thin wrapper | 输出顺序无保证；pentagon distortion |
| Traversal | gridDistance/gridPathCells | Stable | Thin wrapper | 远距离或 pentagon 两侧可能失败；路径具体序列不保证跨版本稳定 |
| Traversal | Local IJ | Experimental semantics | Deferred | 坐标空间有删除/扭曲，输出不保证版本兼容 |
| Region | polygonToCells | Stable | Thin wrapper | 默认以 cell centroid 判断包含，不是“所有相交单元” |
| Region | cellsToMultiPolygon | Stable | Thin wrapper | 同分辨率、无重复；否则行为未定义 |
| Directed Edge | create/origin/destination/boundary/reverse | Stable | R0 available, MVP 未暴露业务 API | 仅相邻 cells |
| Vertex | cellToVertex(es)/vertexToLatLng | Stable | R0 available, deferred endpoint | 拓扑顶点不等于所有几何折点 |
| Misc | area/edge length/cell count | Stable | Aggregation/density use | 球面模型近似 |

## API 稳定性、性能与线程

- v4 采用语义化版本；4.0 曾重命名大量 API，Toolkit 锁 major/minor 并通过回归隔离调用方。
- h3-js 是 Core 的 Emscripten 构建，Node 与浏览器共享实现；本机 10M Point→H3 约 89.8 万 records/s，机器相关。
- JS 单线程调用无共享可变业务状态，可在 Worker/Node worker 中水平并行；服务层仍需批量上限、超时和内存保护。
- 许可证：H3 Core 与 h3-js 均 Apache-2.0。
