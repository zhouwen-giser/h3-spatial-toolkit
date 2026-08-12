# 测试策略与环境矩阵

## 1. 测试目标

测试不仅证明算法正向输出，还要证明坐标、尺度、边界、兼容性、资源约束、安全、迁移、恢复和发布包的行为。每个 `PASS` 必须能定位到命令和证据。

## 2. 测试层次

| 层 | 执行位置 | 当前 Work 可执行 | 状态 |
|---|---|---:|---|
| Project Contract/Docs/Repository | Node 本地 | 是 | PASS |
| Format/Lint/Type | Node 本地 | 是 | PASS |
| Unit/Geometry/Analysis/API/Golden/SBOM/Release Policy | Vitest | 是 | PASS：84 tests |
| JSON Schema/OpenAPI Compatibility | Node/Ajv/Swagger Parser | 是 | PASS |
| API/CLI compiled smoke | 本地 loopback | 是 | PASS |
| Web bundle budget | Vite/Node | 是 | PASS；Browser 另行认证 |
| Local telemetry controls | Fastify inject/loopback | 是 | PASS；平台 OTel/SLO 另行认证 |
| Golden fixture generation | h3-js/Node | 是 | PASS；PostGIS 对照待 Docker |
| SBOM/License graph | pnpm/CycloneDX | 是 | PASS；镜像供应链待 Registry |
| Production API layout | pnpm deploy/loopback | 是 | PASS：26.0 MB、无 devDependencies；Docker runtime 待办 |
| Dependency/License/Secret | 本地 lock/install tree | 是 | PASS |
| Benchmark 10K–10M | 当前 Linux/Node | 是 | PASS |
| Release metadata/reproducibility/content | Node/zip/unzip | 是 | PASS |
| PostgreSQL H3/PostGIS | Docker/Compose；镜像内 psql | 否 | `NOT_RUN` |
| Real Browser/WebGL/A11y | Chromium/Firefox/WebKit | 否 | `NOT_RUN` |
| OIDC/Tenant/Rate Limit | 身份与 Gateway | 否 | `BLOCKED` |
| Load/Soak/Chaos | 目标集群 | 否 | `NOT_RUN` |
| HA/Backup/PITR/Upgrade | 目标数据库平台 | 否 | `NOT_RUN` |
| Cross-platform | Linux/macOS/Windows + Node 22/24 | 仅 Linux Node 24 | `PARTIAL` |

## 3. 本地自动门禁

```bash
pnpm check:static
pnpm typecheck
pnpm test
pnpm build
pnpm check:contracts
pnpm check:licenses
pnpm check:golden
pnpm check:supply-chain
pnpm audit --prod
pnpm acceptance:api
pnpm benchmark
pnpm check:release
```

`acceptance:local` 聚合第一组质量检查；数据库、浏览器、身份和部署测试不能被其替代。

## 4. Contract Tests

- OpenAPI 必须能被标准 Parser 校验。
- `/v1` 当前文档与 `contracts/openapi.v1.baseline.json` 比较。
- 禁止移除 Path/Method/Status、请求属性/枚举或收窄输入范围。
- 四个 JSON Schema 必须是合法 Draft 2020-12，并同时拒绝反例。
- OpenAPI、根包和所有 Workspace 版本必须一致。
- Breaking Change 只能通过 ADR + 新版本，而不能直接覆盖基线消除失败。

## 5. 非功能测试

### 性能

Benchmark 负责单机算法回归；Load/Soak 负责并发、GC、连接池、序列化和长时稳定性，二者不能相互替代。

### 安全

本地可执行依赖审计、License Policy、Secret Pattern 和恶意输入单测。OIDC、跨租户、Gateway rate limit、容器/基础镜像扫描必须在目标环境执行。

### 可访问性

目标至少覆盖键盘操作、Focus、语义标签、对比度、缩放、无 WebGL fallback、Chromium/Firefox/WebKit。Vite build 通过不等于浏览器或 WCAG 验收通过。

### 数据库

必须真实执行 Migration、幂等、rollback/forward-fix、Golden、EXPLAIN、备份恢复和扩展升级。SQL 静态检查只能提前发现结构错误。

## 6. Flaky Test Policy

- 不允许通过无限重试掩盖失败。
- 首次隔离必须建立 Work Item、Owner、原因和到期时间。
- Flaky 测试仍计入 Gate 风险；关键安全/数据正确性测试不得隔离。
- 时间、随机和并发测试固定 Seed/Clock，并保存失败输入。

## 7. 证据与保留

执行中间日志写入 `output/acceptance/`，最终摘要写入版本化 `evidence/gates/`。证据至少包含环境、时间、命令、状态、关键计数、产物哈希和未执行项。敏感位置数据和凭据不得进入证据。
