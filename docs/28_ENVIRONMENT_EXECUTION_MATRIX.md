# 环境能力与可执行门禁矩阵

检查日期：2026-08-13。当前 Work 环境为 Windows x64、Node v22.14.0、16 CPUs；Docker Desktop 29.6.1 / Compose 5.2.0 可用。

## 1. 当前环境能力

| 能力 | 当前可用 | 可执行事项 |
|---|---:|---|
| Node/pnpm | 是 | Format/Lint/Type/Test/Build/Contract/Benchmark/API/CLI |
| 本地 loopback | 是 | 编译 API/CLI Smoke |
| zip/unzip | 可用但本轮不使用 | 用户排除新源码包生成、解压和内容复验；G7 package `NOT_RUN` |
| Git CLI/远端 | 是 | 用户已明确授权本轮每次 commit 后 push；最终远端状态需实际核验 |
| Docker/Compose | 是 | 镜像构建、数据库个别严格切片、Docker Scout；完整 G4 runner 仍需破坏性本地 DB 授权 |
| psql | 宿主非必需 | Docker 镜像内客户端用于 G4 |
| Chromium/Firefox/WebKit | 是（Playwright） | WebGL/SVG/Keyboard/Focus/Reflow/Axe 9/9 PASS |
| shellcheck | 是（native 或固定 Docker fallback） | ShellCheck 与 Bash syntax/strict-mode 本地 PASS |
| OIDC/Tenant/Gateway | 仅本地契约 | 注入 authenticator/Principal/Tenant/Scope fail closed；具体 IdP/JWKS/Gateway `PARTIAL` |
| HA/Backup/PITR 平台 | 否 | Recovery `NOT_RUN` |
| Container scanner | 是 | source-label 绑定前本地扫描：API 2C/2H、PostgreSQL 1C/17H，总计 3C/19H；阈值 FAIL 且不能绑定当前 commit，G5 image `PARTIAL` |
| Container registry/signing | 否 | 签名/provenance `NOT_RUN` |

`pnpm environment:report -- --write` 可生成当前机器的机器可读探测结果。工具不可用不等于能力失败，但绝不允许把静态定义写成运行通过。

## 2. 目标认证矩阵

| Matrix | 需要环境 | 状态 |
|---|---|---|
| Node 22 / 24 | Hosted Linux/Windows/macOS | Workflow defined；current Windows Node 22 only；PARTIAL |
| Linux/macOS/Windows + x64/arm64 | pnpm workspace/hosted runners | Workflow defined；remote execution pending；PARTIAL |
| Chromium/Firefox/WebKit | Windows local + hosted Linux, WebGL/no-WebGL | Windows 9/9 PASS；hosted repeat pending |
| PostgreSQL 14–18 candidate matrix | PostGIS/H3 native extension | PostgreSQL 17 local slices only；matrix NOT_RUN |
| Docker amd64/arm64 | BuildKit/registry | local amd64 candidate only；PARTIAL |
| OIDC normal/expired/revoked/JWKS rotation | Test IdP | platform-neutral boundary PASS；concrete IdP cases BLOCKED |
| Load/Soak/Chaos | Target cluster | NOT_RUN |
| Backup/PITR/Failover/Upgrade | Target DB platform | NOT_RUN |

## 3. 状态升级规则

- `NOT_RUN→PASS`：实际执行、证据入库、Owner 审核。
- `BLOCKED→PARTIAL`：可独立证明的本地切片已有证据，但目标决策/平台仍未齐备；不得跳到 `PASS`。
- 当前 Work 输出可以作为本地 Gate 证据，但不能替代目标平台证据。
