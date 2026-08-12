# 环境能力与可执行门禁矩阵

检查日期：2026-08-12。当前 Work 环境为 Linux x64、Node v24.14.0、9 CPUs。

## 1. 当前环境能力

| 能力 | 当前可用 | 可执行事项 |
|---|---:|---|
| Node/pnpm | 是 | Format/Lint/Type/Test/Build/Contract/Benchmark |
| 本地 loopback | 是 | 编译 API/CLI Smoke |
| zip/unzip | 是 | Release 完整性和可复现性 |
| Git CLI | 是 | 只读检查；未授权外部 push |
| Docker/Compose | 否 | G4/G6 `NOT_RUN` |
| psql | 否 | 本地 psql 不再是硬依赖；Docker 镜像内客户端随 G4 使用 |
| Chromium/Chrome/Firefox | 否 | Browser/WebGL/A11y `NOT_RUN` |
| shellcheck | 否 | Shell 专项静态检查 `NOT_RUN`；仅执行脚本运行路径检查 |
| OIDC/Tenant/Gateway | 否 | Auth/Tenant `BLOCKED` |
| HA/Backup/PITR 平台 | 否 | Recovery `NOT_RUN` |
| Container registry/signing | 否 | Source SBOM PASS；image scan/sign `NOT_RUN` |

`pnpm environment:report -- --write` 可生成当前机器的机器可读探测结果。工具不可用不等于能力失败，但绝不允许把静态定义写成运行通过。

## 2. 目标认证矩阵

| Matrix | 需要环境 | 状态 |
|---|---|---|
| Node 22 / 24 | Linux | Node 24 only |
| Linux/macOS/Windows | pnpm workspace | Linux only |
| Chromium/Firefox/WebKit | Desktop + WebGL/no-WebGL | NOT_RUN |
| PostgreSQL 14–18 candidate matrix | PostGIS/H3 native extension | NOT_RUN |
| Docker amd64/arm64 | BuildKit/registry | NOT_RUN |
| OIDC normal/expired/revoked/JWKS rotation | Test IdP | BLOCKED |
| Load/Soak/Chaos | Target cluster | NOT_RUN |
| Backup/PITR/Failover/Upgrade | Target DB platform | NOT_RUN |

## 3. 状态升级规则

- `NOT_RUN→PASS`：实际执行、证据入库、Owner 审核。
- `BLOCKED→READY`：所需决策、授权和环境齐备。
- 当前 Work 输出可以作为本地 Gate 证据，但不能替代目标平台证据。
