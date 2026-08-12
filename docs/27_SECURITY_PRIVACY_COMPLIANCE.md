# 安全、隐私与合规基线

## 1. 保护对象

- 精确位置、轨迹、区域和对象关系。
- 租户身份、配额和分析结果。
- 数据库、Queue、Object Store 和 OTel 凭据。
- 源码、构建依赖、镜像和发布签名。

H3 Cell 仍能反推出近似位置，不能因为使用 Cell 而自动视为非敏感数据。

## 2. 信任边界

| 边界 | 主要风险 | 目标控制 |
|---|---|---|
| Client→Gateway | 未授权、滥用、巨大输入 | OIDC/mTLS、Scope、rate/quota/body limits |
| Gateway→API | 伪造 tenant/header | 可信身份传播和验证 |
| API→Database | SQL 注入、越权、长查询 | 参数化 SQL、最小权限、RLS/隔离、timeout |
| API→Job/Result | 重放、跨租户、过期下载 | 幂等、tenant binding、短期签名 URI |
| Build→Registry | 依赖/镜像篡改 | lock、SBOM、scan、sign、provenance |
| Telemetry | 位置/Secret 泄露 | 采样、脱敏、字段 allow-list |

## 3. 当前可执行控制

- 精确依赖版本和 frozen lockfile。
- `pnpm audit --prod`。
- 生产依赖 License Policy。
- 仓库 Secret Pattern 和密钥文件检查。
- 参数化 SQL 和输入范围/批量/body/timeout 基线。
- API 统一错误脱敏、认证头日志脱敏和低基数 Metrics 标签策略。
- Release ZIP 排除 `.env`、密钥、生成缓存。
- CycloneDX 源码 SBOM、完整传递生产依赖 License Inventory 与可再生漂移门禁。

这些检查通过只能说明本地基础控制有效，不能代替身份、跨租户、镜像或渗透测试。

## 4. 待完成控制

- OIDC issuer/audience、JWKS rotation、mTLS 和 Service Identity。
- Tenant isolation/RLS、Scope、admin separation 和审计。
- Abuse tests、fuzz、DAST、container/base image scan。
- SBOM、签名、provenance、Secret manager 和 rotation。
- 数据分类、用途、保留、删除、导出和跨区域政策的组织/法律评审。
- 真实事件响应和通知流程。

## 5. 数据最小化

- 日志不记录完整 Point、Polygon、Trajectory 或 properties。
- Metrics 不使用 cell/tenant/requestId 作为高基数标签。
- 测试使用虚构或脱敏 Fixture。
- 大结果设置 TTL；原始轨迹与聚合指标分开保留。
- 删除策略必须覆盖原始数据、Projection、Cache、Object Store 和 Backup。

## 6. 状态声明

当前 G5=`PARTIAL`。本地 npm audit 为 0；Source SBOM 为 145 components / 134 external packages；License 检查覆盖 146 production packages；同步资源门禁、错误/日志脱敏、指标标签和平台中立 Auth contract 已真实执行。容器 SBOM/扫描发生在 source-label 绑定前，API 为 2 Critical + 2 High、PostgreSQL 为 1 Critical + 17 High，合计 3 Critical + 19 High，阈值 FAIL，不能绑定当前 commit 或提升 Gate。具体 IdP/Tenant、镜像漏洞处置、signing/provenance、数据治理和目标平台安全测试仍保留为待办。
