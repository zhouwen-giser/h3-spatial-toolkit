# 兼容性策略

## SemVer

- Patch：缺陷修复，不改变公开类型、Schema、默认语义和 API 行为。
- Minor：只增加可选能力，旧消费者无需修改。
- Major：允许 Breaking Change，但必须提供迁移说明和双版本窗口。

## 判定为 Breaking 的变化

- 移除或重命名 Path、Method、Status Code、字段、枚举值。
- 为请求增加必填字段，收窄数值范围、数组上限或允许的输入类型。
- 移除响应必填字段或改变字段类型/含义。
- 修改坐标顺序、Resolution Policy、Coverage/Flow/Aggregation 语义。
- 修改错误码或把可重试错误改为不可重试而无迁移期。

## 例外

安全漏洞紧急修复可先收紧输入，但必须记录 ADR、影响范围、缓解方案和恢复兼容计划。仅修改 `openapi.v1.baseline.json` 不能使未经批准的 Breaking Change 合法化。

