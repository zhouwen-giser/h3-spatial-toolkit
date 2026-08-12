# P1-SEC-OBS-001 — 身份、租户、安全与可观测性

状态：`PARTIAL`（本地 Metrics/日志/脱敏已实现；Auth/Tenant/OTel/SLO 受目标平台阻塞）。

## 目标

实现 OIDC/mTLS、Scope、租户隔离、rate limit、OTel logs/metrics/traces 和 SLO。供应链产物由 `P1-SUPPLY-001` 跟踪。

## 依赖

- P1-API-HARDEN-001（已完成）。
- 测试 IdP、租户模型、Gateway 和可观测平台决策。

## 验收

Auth/Tenant/Observability 子门禁有目标环境证据；无鉴权绕过、跨租户、Secret 泄露和未处置 Critical/High 漏洞。

当前环境可以实现并本地验证低基数 Metrics、结构化 Request/Error 日志、健康/就绪状态和遥测脱敏；OIDC、Tenant、Gateway rate limit、OTel exporter、Dashboard/SLO 仍依赖目标平台。

## 当前证据

- `/metrics`：Prometheus counter/histogram/gauge，标签仅 method、route template、status code、normalized error code。
- 遥测不包含 requestId、Cell、坐标、Polygon 或原始错误；测试覆盖敏感 Cell 不回显。
- Fastify JSON logger 使用 requestId，并对 Authorization、Cookie、API Key 配置 redaction。
- `METRICS_ENABLED`、`LOG_LEVEL` 启动校验和禁用行为有自动测试。
- 未完成：OIDC/mTLS、Tenant、Gateway rate/quota、OTel exporter、Dashboard、Alert、SLO 和目标环境安全测试。
