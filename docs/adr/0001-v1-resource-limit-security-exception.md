# ADR-0001：v1 同步资源上限安全例外与基线轮换

状态：`ACCEPTED`（记录已在 `0.2.0` 实施的安全加固；后续变更不得引用本例外绕过兼容评审）。

## 背景

`0.1.0` 的 OpenAPI 基线没有表达同步数组、字符串、轨迹和结果上限。`0.2.0` 已在运行时和 OpenAPI 中加入这些上限，以避免单请求 CPU、内存和响应体被无界放大，但兼容检查器没有检测“旧基线无边界、新契约新增边界”，且把 request body 的 required 方向写反。因此历史基线仍停留在 `0.1.0`，`G2` 的 PASS 结论不充分。

## 决策

1. 按兼容策略的安全例外保留 `0.2.0` 已有资源上限，不恢复无界输入。
2. 将只读历史契约保存为 `contracts/openapi.v1.0.1.0.json`，完成本轮契约、测试和迁移说明后，把 `contracts/openapi.v1.baseline.json` 轮换为已认证的当前 v1 契约。
3. 修复兼容检查器，使其拒绝 optional→required request body、新增/收紧数值与数组/字符串边界、新增请求必填字段及移除请求枚举值；用 mutation tests 锁定方向。
4. v1 继续返回稳定 `413`/错误 Envelope。客户端不得依赖超出文档限额的单次同步请求；应拆批或降低 Resolution。未来进一步收紧默认值必须新建 ADR 或新契约版本。

## 影响与迁移

- 受影响消费者：向单请求发送超过 `MAX_BATCH_RECORDS`、`MAX_FLOW_POINTS`、`MAX_RESULT_CELLS`、Geometry/字符串边界或邻域半径上限的客户端。
- 迁移：按错误 `details.limit` 拆批；Polygon 降低 Resolution；大任务等待异步 Job API，不以重试同一超限请求替代迁移。
- 正常限额内的 v1 请求、响应字段、坐标顺序和 H3 语义不变。

## 缓解与恢复计划

- 所有限额由配置控制，但部署不得设置为无界；变更必须经过配置校验和负载证明。
- 若合理客户端被误伤，可在不超过已认证资源容量的范围内提高部署配置，并记录变更；不得删除保护逻辑。
- 若需要真正无界或异步大结果，使用未来版本化 Job API，而不是扩大 v1 同步语义。

## 证据

- `test/openapi-compatibility.test.ts`：兼容 mutation fixtures。
- `test/api-hardening.test.ts`：资源上限、错误 Envelope 与成功响应 Schema。
- `contracts/openapi.v1.0.1.0.json`：轮换前的历史 `0.1.0` 基线。
