# API 与 Schema 契约基线

- `openapi.v1.baseline.json` 是当前 `/v1` 的向后兼容基线。
- `packages/io/schema/*.schema.json` 是跨语言标准对象契约。
- `pnpm check:contracts` 校验 OpenAPI 结构、禁止移除既有 Path/Method/Response，并检查请求字段、枚举和范围是否被收窄。
- 允许的新增字段必须保持可选；Breaking Change 必须建立 ADR、升级到 `/v2` 或新 Schema version，并有迁移期。

更新基线不能作为绕过兼容性失败的手段。只有接口评审批准、迁移文档完成、消费者测试通过后才能替换本文件。

`openapi.v1.0.1.0.json` 保留初始 v1 历史契约；`docs/adr/0001-v1-resource-limit-security-exception.md` 记录 `0.2.0` 资源上限安全例外、影响和基线轮换依据。
