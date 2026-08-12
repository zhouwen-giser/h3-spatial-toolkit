# Acceptance Report（历史 `0.1.0` 基线）

> 本文保留 2026-08-11 的初始验收记录；当前 `0.3.0` 结果以 `docs/22_TEMPLATE_ACCEPTANCE_REPORT.md` 和 `evidence/gates/` 为准。

执行日期：2026-08-11。

## 总结

**Status: CONDITIONAL PASS — SDK/Application/Web/Benchmark gates passed; Database runtime gate not run due environment.**

## 门禁

| Gate | Evidence | Status |
|---|---|---|
| Research | 19 primary sources、版本/许可/仓库迁移证据、矩阵 | PASS |
| Core | Point/Geometry/Parent/Children/Disk/Path/Polygon/Compact/Uncompact tests | PASS |
| Analysis | Aggregation/Coverage/Flow tests and API calls | PASS |
| Database | Dockerfile/migrations/SQL/Adapter/integration test | NOT RUN：无 Docker/Compose |
| API | 6 endpoints + OpenAPI；compiled server smoke on 127.0.0.1 | PASS |
| CLI | compiled point/polygon/CSV smoke | PASS |
| Visualization | Vite production build；deck.gl boundary polygons + SVG fallback source | PASS (build/function); current resumed workspace did not repeat cloud-browser preview |
| Performance | 10K/100K/1M/10M actual point benchmark + 1M/10M aggregation | PASS |

## 验证命令结果

- `pnpm typecheck`：PASS。
- `pnpm test`：42 passed，1 database suite skipped；lines 94.08%，Geometry 94.59%。
- `pnpm build`：8 libraries、API、CLI、Web Demo PASS；Web JS bundle 1,036.53KB（gzip 309.85KB）有 chunk warning，不阻塞 MVP，后续可动态加载 deck.gl。
- `pnpm audit --prod`：PASS，0 个已知生产依赖漏洞。
- Compiled CLI：Point JSON 与 Polygon CSV PASS。
- Compiled API：health、index、OpenAPI 6 paths PASS。绑定 `0.0.0.0` 时当前 sandbox 的 `uv_interface_addresses` 被系统权限阻断；绑定 `127.0.0.1` 通过，属于 sandbox 网络枚举限制。
- `pnpm benchmark`：四档结果已写入 `benchmark/results/latest.json`。

## Production Readiness Gate

| Item | Status |
|---|---|
| API stability/version lock/error handling | Pass for MVP |
| Geometry validation/coordinate correctness | Pass for structural and range validation；exact topology uses PostGIS gate |
| Memory/batch/timeout | Pass baseline；production tune pending |
| Logging/health/graceful shutdown | Pass baseline |
| Metrics/tracing/auth/rate limit | Pending deployment hardening |
| Docker healthcheck | Defined, not executed |
| Dependency vulnerabilities/SBOM | `pnpm audit --prod` passed；SBOM pending |
| License | Apache-2.0 project；dependencies reviewed at architecture level |

## Acceptance action

在有 Docker 的目标机执行：

```bash
docker compose up -d --build
./scripts/verify-database.sh
pnpm acceptance
```

只有数据库脚本、EXPLAIN/性能、backup/restore 和安全基线完成后，状态才能从 CONDITIONAL PASS 升级为 Production-Ready。
