# P1-SEC-OBS-001 — 身份、租户、安全与可观测性

Work 状态：`IN_PROGRESS`。Gate 状态：`PARTIAL`（本地 Auth contract/Metrics/日志/脱敏已实现；具体 IdP/JWKS/Gateway/OTel/SLO 受目标平台阻塞）。

## 目标

实现 OIDC/mTLS、Scope、租户隔离、rate limit、OTel logs/metrics/traces 和 SLO。供应链产物由 `P1-SUPPLY-001` 跟踪。

## 依赖

- P1-API-HARDEN-001（已完成）。
- 测试 IdP、租户模型、Gateway 和可观测平台决策。

## 验收

Auth/Tenant/Observability 子门禁有目标环境证据；无鉴权绕过、跨租户、Secret 泄露和未处置 Critical/High 漏洞。

当前环境已本地验证低基数 Metrics、结构化 Request/Error 日志、健康/就绪状态、遥测脱敏和注入式鉴权信任边界；具体 OIDC/JWKS、持久 Tenant、Gateway rate limit、OTel exporter、Dashboard/SLO 仍依赖目标平台。

## 当前证据

- `/metrics`：Prometheus counter/histogram/gauge，标签仅 method、route template、status code、normalized error code。
- 遥测不包含 requestId、Cell、坐标、Polygon 或原始错误；测试覆盖敏感 Cell 不回显。
- Fastify JSON logger 使用 requestId，并对 Authorization、Cookie、API Key 配置 redaction。
- `METRICS_ENABLED`、`LOG_LEVEL` 启动校验和禁用行为有自动测试。
- `AUTH_MODE=required` 缺注入 authenticator 时启动失败；异常/空/畸形 Principal 为稳定 401，Scope 缺失为稳定 403。
- Tenant 只来自已验证 Principal，不能由 Body/Header 覆盖；六个业务 Scope 与 Metrics Scope 已固定并同步 OpenAPI。
- 未完成：具体 OIDC/JWKS 或 mTLS、expiry/revocation/rotation、持久 Tenant 隔离、Gateway rate/quota、OTel exporter、Dashboard、Alert、SLO 和目标环境安全测试。

同步计算硬截止仍属于本项：当前 `REQUEST_TIMEOUT_MS` 只约束 HTTP 请求接收，不能抢占单线程 H3 handler。完成生产 Gate 前必须采用 worker/chunk deadline 或 Gateway 终止方案，并固定 503/504 契约与超时测试。
