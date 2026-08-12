# 测试策略与环境矩阵

## 1. 测试目标

测试不仅证明算法正向输出，还要证明坐标、尺度、边界、兼容性、资源约束、安全、迁移、恢复和发布元数据的行为。每个 `PASS` 必须能定位到命令和证据。本轮用户明确排除了新源码包生成与解压复验，因此包门禁记为 `NOT_RUN`，不以历史包证据替代。

## 2. 测试层次

| 层 | 执行位置 | 当前 Work 可执行 | 状态 |
|---|---|---:|---|
| Project Contract/Docs/Repository | Node 本地 | 是 | PASS |
| Format/Lint/Type | Node 本地 | 是 | PASS |
| Unit/Geometry/Analysis/API/Auth/Golden/SBOM/Release Policy | Vitest | 是 | 当前相关 suites PASS；最终总数由聚合门禁固化 |
| JSON Schema/OpenAPI Compatibility | Node/Ajv/Swagger Parser | 是 | PASS |
| API/CLI compiled smoke | 本地 loopback | 是 | PASS |
| Web bundle budget | Vite/Node | 是 | PASS |
| Real Browser/WebGL/SVG/A11y | Playwright/Axe | 是 | Chromium 151、Firefox 153、WebKit 26.5：9/9 PASS |
| Local telemetry controls | Fastify inject/loopback | 是 | PASS；平台 OTel/SLO 另行认证 |
| Golden fixture generation | h3-js/Node/PostGIS | 是 | Node 再生 PASS；本地 DB 对照 11/11 PASS |
| SBOM/License graph | pnpm/CycloneDX | 是 | PASS；镜像供应链待 Registry |
| Production API layout | pnpm deploy/loopback | 是 | PASS：26.0 MB、无 devDependencies；Docker runtime 待办 |
| Dependency/License/Secret | 本地 lock/install tree | 是 | PASS |
| Benchmark 10K–10M | 当前 Windows/Node 22 | 是 | 1 warmup + 3 recorded、median gate；静默 exact-environment 9/9 PASS；并发 FAIL 留档；历史 Linux NOT_COMPARABLE |
| Release metadata | Node | 是 | 当前 0.3.0/1.4.0 `acceptance:local` 检查 PASS |
| Release package/reproducibility/content | Node/zip/unzip | 用户排除 | `NOT_RUN`；历史 0.2.0/1.3.0 不适用 |
| PostgreSQL H3/PostGIS | Docker/Compose；镜像内 psql | 是（托管认证） | certified implementation revision `cd3211f956c5c77c06fd52c79c3cb86b8f92e2d3` 的完整 run-scoped runner PASS；G4 `PASS` |
| Auth/Tenant/Rate Limit | 注入边界 + 身份/Gateway | 部分 | 本地 fail-closed contract PASS；具体 OIDC/JWKS/Gateway `PARTIAL` |
| Load/Soak/Chaos | 目标集群 | 否 | `NOT_RUN` |
| HA/Backup/PITR/Upgrade | 目标数据库平台 | 否 | `NOT_RUN` |
| Cross-platform | Linux/macOS/Windows + Node 22/24 + x64/arm64 | Windows 本地 + GitHub-hosted runners | certified implementation revision `cd3211f956c5c77c06fd52c79c3cb86b8f92e2d3` 的 quality/portable/browser 9/9 jobs PASS；G6 Cross-platform `PASS` |

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
pnpm acceptance:browser
pnpm benchmark
pnpm check:release-metadata
```

`acceptance:local` 聚合第一组质量检查；数据库、具体 IdP/Gateway、跨平台和部署测试不能被其替代。`pnpm check:release` 仍可作为独立能力保留，但本轮按用户要求不执行，也不属于当前完成条件。

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

本地可执行依赖审计、License Policy、Secret Pattern、恶意输入和注入 authenticator/Principal/Scope/Tenant 契约测试。具体 OIDC/JWKS、持久跨租户、Gateway rate limit 和 Registry 签名仍必须在目标环境执行；镜像扫描虽可本地执行，但只有达到批准阈值或有正式处置才能通过。

### 可访问性

当前矩阵覆盖键盘操作、Focus、语义标签、200% 等效缩放、正常 WebGL、强制 SVG fallback、Chromium/Firefox/WebKit，并用 Axe 阻断 critical/serious。Vite build 通过仍不等于浏览器或 WCAG 验收通过；本轮 PASS 来自真实 Playwright 9/9 运行。

### 数据库

必须真实执行 Migration、幂等、rollback/forward-fix、Golden、EXPLAIN、规模、备份恢复和扩展升级。个别切片通过不等于一份完整 run-scoped G4 证据；已认证实现提交 `cd3211f` 的托管严格 runner 已在一次性 Compose 数据库完整执行并通过。SQL 静态检查只能提前发现结构错误，未来数据库相关实现变更仍须以新 run-id 重新认证。

## 6. Flaky Test Policy

- 不允许通过无限重试掩盖失败。
- 首次隔离必须建立 Work Item、Owner、原因和到期时间。
- Flaky 测试仍计入 Gate 风险；关键安全/数据正确性测试不得隔离。
- 时间、随机和并发测试固定 Seed/Clock，并保存失败输入。

## 7. 证据与保留

执行中间日志写入 `output/acceptance/`，最终摘要写入版本化 `evidence/gates/`。证据至少包含环境、时间、命令、状态、关键计数、产物哈希和未执行项。敏感位置数据和凭据不得进入证据。
