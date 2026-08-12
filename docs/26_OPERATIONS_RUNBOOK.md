# 运维与故障处理基线

## 1. 当前可用操作

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm acceptance:local
pnpm dev
pnpm dev:web
```

API 默认监听 `127.0.0.1:3000`；容器显式设置 `0.0.0.0`。`/health` 只证明进程可响应，`/ready` 执行 H3 金标自检并明确声明当前 REST 路径的数据库检查为 `not-required`。`/metrics` 默认暴露低基数 HTTP counter/histogram/gauge，可用 `METRICS_ENABLED=false` 关闭。

API 收到 `SIGINT/SIGTERM` 后只执行一次 `app.close()`，停止接收请求并等待 Fastify 关闭；本地 compiled smoke 要求 3 秒内 exit code 0。目标容器仍必须配置足够的 termination grace period，并在真实负载下验证 drain。

生产容器使用 pnpm deploy 生成 production-only API 文件系统，不再复制工作区开发依赖；本地独立目录验证为 26,014,477 bytes、无 Vitest/TypeScript、non-root Dockerfile、readiness 与关停 PASS。由于当前无 Docker，该结论不包含实际镜像层大小、CVE、digest 或容器运行。

## 2. 启动前检查

- Node/pnpm 与 lockfile 版本。
- 配置类型、范围和 Secret 来源。
- H3 引擎版本。
- 数据库扩展/迁移状态（使用 DB 路径时）。
- Body、Batch、Timeout、Result limit。
- 日志、指标、Trace exporter 和磁盘容量。

结构化日志会脱敏 `Authorization`、`Cookie` 和 `x-api-key`；指标路由标签使用 Fastify route template，不包含 Cell、坐标、tenant 或 request ID。生产部署仍需平台级采集、保留、访问控制和告警。

## 3. 常见故障

| 症状 | 优先检查 | 安全处置 |
|---|---|---|
| API 无法启动 | PORT/HOST、配置类型、依赖 build | 不回退到硬编码生产凭据 |
| 422 坐标错误 | lng/lat、范围、Resolution | 不自动交换坐标 |
| Polygon 超时/OOM | 面积、Resolution、预计 Cells | 降 Resolution 或转异步，不解除限额 |
| Grid Path 失败 | Pentagon/距离/Cell 层级 | 返回结构化失败，不伪造连续路径 |
| DB 503 | Pool、网络、扩展、statement timeout | 有限重试；不无限阻塞请求 |
| Web 无图 | WebGL、bundle、SVG fallback | 验证 fallback，不隐藏错误 |
| 结果与历史不一致 | H3/Schema/Policy version | 运行 Golden，不覆盖基线 |

## 4. 目标环境待补 Runbook

- PostgreSQL backup/restore/PITR、主从切换、Extension upgrade/rollback。
- API/Worker rolling update、drain、rollback。
- Queue backlog、poison job、result store failure。
- OIDC/JWKS 失败、tenant quota、rate limit 误伤。
- SLO burn、容量扩展、依赖故障和安全事件。

这些流程需在目标平台实操并保存证据，当前文档仅是结构基线。

## 5. 值班和升级

正式上线前必须指定 Service Owner、Database Owner、Security Contact 和 Release Approver，定义 P1/P2/P3 事件等级、响应时限和外部沟通。模板不虚构组织联系人。
