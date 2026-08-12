# 标准数据模型

## TypeScript

```ts
interface H3Cell { index: string; resolution: number }
interface H3Metric { cell: string; resolution: number; metric: string; value: number }
interface H3TimeMetric extends H3Metric { timestamp: string; bucket: string }
interface H3Flow { origin: string; destination: string; count: number; weight?: number }
```

正式 JSON Schema 位于 `packages/io/src/index.ts`，Schema IDs：

- `https://schemas.h3-toolkit.dev/h3-cell.schema.json`
- `https://schemas.h3-toolkit.dev/h3-metric.schema.json`
- `https://schemas.h3-toolkit.dev/h3-time-metric.schema.json`
- `https://schemas.h3-toolkit.dev/h3-flow.schema.json`

## 约束

- H3 index 使用小写 15 位十六进制字符串；跨 JSON/JavaScript 不使用 64-bit Number。
- `resolution` 强制 0–15，所有 metric 必须显式保存。
- `timestamp` 使用 ISO-8601 UTC；`bucket` 使用受控枚举 `minute/hour/day/week/month`。
- Flow 的 origin/destination 必须同 resolution；有向与无向聚合不能混写同一 metric。

## Geometry Coordinate Policy

- CRS 固定 EPSG:4326。
- GeoJSON position 固定 `[longitude, latitude]`。
- Toolkit Point 固定 `{longitude, latitude}`。
- H3 原始 API 的 `(latitude, longitude)` 仅允许出现在 `packages/core` 与数据库 Adapter 内部。
- 输入端拒绝 longitude 超出 ±180、latitude 超出 ±90；这能捕获大量但不能捕获所有互换错误，因此测试还固定东京已知 index。

## Feature Store

推荐主键维度：`entity_id + feature_name + h3_cell + resolution + event_time + feature_version`。同时保留原始 geometry 或 source URI、计算算法版本和 coordinate policy。H3 是 coarse spatial key，不是 geometry 的无损表示。
