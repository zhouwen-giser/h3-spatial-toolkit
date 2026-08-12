# API 与 CLI 设计

## 1. REST API

Fastify 在运行时生成 OpenAPI，UI 位于 `/documentation`，JSON 位于 `/documentation/json`。

| Method | Path | Purpose | 默认关键门禁 |
|---|---|---|---|
| POST | `/v1/h3/index` | Point batch→H3 | 100K points；result cell limit |
| POST | `/v1/h3/polygon/cover` | Polygon/MultiPolygon→cells/GeoJSON | coordinate、estimate、result、GeoJSON bytes |
| POST | `/v1/h3/neighbors` | Grid disk | radius ≤20；estimated/result cells |
| POST | `/v1/h3/aggregate` | 标准 H3 aggregation | 100K records；distinct ≤50K；result cells |
| POST | `/v1/h3/coverage` | Area/visited coverage | area preflight；visit cell validity/resolution |
| POST | `/v1/h3/flow` | Trajectories→aggregated OD | 100K total points；endpoint resolution |
| GET | `/health` | Process health | 不代表数据库 readiness |
| GET | `/ready` | H3 engine readiness | 当前 REST 路径不依赖数据库，database=`not-required` |
| GET | `/metrics` | Prometheus exposition | 可由 `METRICS_ENABLED=false` 关闭；仅低基数标签 |

## 2. 成功与错误契约

业务成功统一返回：

```json
{
  "data": [{ "index": "8a2f5a32d957fff", "resolution": 10 }],
  "meta": {
    "requestId": "req-1",
    "durationMs": 1.234,
    "toolkitVersion": "0.3.0",
    "engine": "h3-js",
    "engineVersion": "4.5.0",
    "warnings": []
  }
}
```

`x-request-id` 响应头与 `meta.requestId` 一致。`durationMs` 是服务端处理时间，不含客户端网络耗时。

失败统一返回：

```json
{
  "error": {
    "code": "RESULT_CELL_LIMIT_EXCEEDED",
    "message": "Estimated polygon result exceeds server policy",
    "details": { "actual": 900000, "limit": 250000, "recommendedResolution": 8 }
  },
  "meta": {
    "requestId": "req-2",
    "durationMs": 0.812,
    "toolkitVersion": "0.3.0",
    "engine": "h3-js",
    "engineVersion": "4.5.0",
    "warnings": []
  }
}
```

| HTTP | 类别 | 代表错误码 |
|---:|---|---|
| 400 | JSON Schema/请求结构错误 | `REQUEST_VALIDATION_FAILED` |
| 404 | 路由不存在 | `ROUTE_NOT_FOUND` |
| 408 | HTTP 请求接收超时 | `REQUEST_TIMEOUT` |
| 413 | Body/计算/结果资源门禁 | `*_LIMIT_EXCEEDED` |
| 422 | H3 与业务语义错误 | `INVALID_H3_CELL`、`CELL_RESOLUTION_MISMATCH` |
| 500 | 未知内部错误 | `INTERNAL_ERROR` |

未知错误不会返回异常类名、堆栈、SQL、内部路径或原始消息。Validation 只返回字段路径、关键字和通用消息；H3 Cell、坐标和 Polygon 不在错误 details allow-list 中。

## 3. 资源策略

| 环境变量 | 默认值 | 作用 |
|---|---:|---|
| `BODY_LIMIT_BYTES` | 10 MiB | HTTP body 字节上限 |
| `REQUEST_TIMEOUT_MS` | 30000 | Fastify 接收请求体超时；不是同步 CPU 计算硬截止时间 |
| `MAX_BATCH_RECORDS` | 100000 | Point/record/trajectory/visit 数组上限 |
| `MAX_FLOW_POINTS` | 100000 | 所有 trajectories 的总点数上限 |
| `MAX_RESULT_CELLS` | 250000 | Cell/Metric/Flow 结果数量上限 |
| `MAX_GEOJSON_BYTES` | 10 MiB | GeoJSON 序列化结果上限 |
| `MAX_POLYGON_COORDINATES` | 50000 | Polygon/MultiPolygon 总坐标数上限 |
| `MAX_NEIGHBOR_RADIUS` | 20 | Grid disk radius 上限 |
| `MAX_DISTINCT_VALUES` | 50000 | 单次 distinctCount 基数上限 |
| `ALLOWED_RESOLUTIONS` | 0–15 | REST 允许的 H3 Resolution allow-list |
| `METRICS_ENABLED` | true | 是否暴露 Prometheus `/metrics` |
| `LOG_LEVEL` | info | Pino 结构化日志级别 |
| `AUTH_MODE` | local | `required` 仅在部署组合注入 authenticator 时允许启动 |

环境变量必须是安全范围内的整数；非法、空或越界值导致服务启动失败，不能静默退回默认值。完整样例见 `.env.example`。

当前同步 H3 handler 是单线程 CPU 计算，事件循环定时器不能在计算期间抢占它；因此本地限额负责把工作量封顶，但 `REQUEST_TIMEOUT_MS` 不能被宣称为计算超时。真正的计算硬截止需 worker/chunk deadline 或 Gateway 终止能力，继续登记为生产缺口。

Polygon 在调用 H3 前按坐标数和球面 bounding area 估算输出规模，在计算后再次检查真实 Cell 数。估算接近阈值时通过 `meta.warnings` 返回提示；超限响应可给出较低的推荐 Resolution。估算是保护门禁，不是精确面积分析。

## 4. 语义校验

- 外部位置固定为 `{longitude, latitude}` / GeoJSON `[longitude, latitude]`。
- Polygon 只允许 Polygon/MultiPolygon、闭合 Ring、2D/3D finite Position。
- Coverage 的 `visitedCells` 必须是合法 H3 Cell，且 Resolution 与请求一致。
- Aggregate Cell 必须合法并与请求 Resolution 一致。
- Flow endpoint 必须合法、同 Resolution；count 非负且 weight finite。
- LineString 无法建立连续 H3 grid path 时明确返回 `GRID_PATH_UNAVAILABLE`，不再静默拼接不连续 Cell。

## 5. CLI

| Command | Input |
|---|---|
| `h3 point` | `--lng --lat --resolution` |
| `h3 polygon` | GeoJSON file |
| `h3 neighbors` | cell + k |
| `h3 aggregate` | JSON/CSV |
| `h3 coverage` | JSON area + visits |
| `h3 flow` | JSON trajectories |

公共参数：`--format json|csv`、`--output path`。Polygon 可通过 `--output-type geojson` 输出 FeatureCollection。CLI 复用 SDK 的稳定语义错误，但不复用 HTTP Envelope。

## 6. 尚未完成的生产能力

本轮已完成请求 ID、统一响应、同步资源门禁、语义校验、低基数 HTTP 指标和认证头日志脱敏。指标不使用 cell、坐标、tenant 或 request ID 标签；当前是进程内 Prometheus exposition，并不等于完整 OTel/SLO 能力。下列能力仍由独立 Work Item 跟踪：

- OIDC/mTLS、Scope、Tenant、Gateway rate limit 和 tenant quota。
- OTel exporter/traces、跨实例聚合、审计日志、Dashboard/Alert 和 SLO。
- Async Job、结果分页/对象存储和超限任务转异步建议。
- 真实 Load/Soak、浏览器、容器和目标部署认证。
