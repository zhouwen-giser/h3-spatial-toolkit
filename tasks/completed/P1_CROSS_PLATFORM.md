# P1-CROSS-PLATFORM-001 — 跨平台运行矩阵

Work 状态：`COMPLETE`（2026-08-13）。Gate 状态：`PASS`。

## 目标

认证 Node 22/24、Linux/macOS/Windows 和 x64/arm64 的安装、构建、测试、CLI 与浏览器适用矩阵。

## 依赖

- 对应 GitHub-hosted Runner。
- 仓库定义的支持矩阵。

## 验收

每个声明支持的组合有 frozen install、源码/契约/测试/构建/API/CLI 证据；托管 Linux 浏览器矩阵真实执行。容器多架构发布由独立供应链/部署任务跟踪。

## 完成证据

- certified implementation revision：`cd3211f956c5c77c06fd52c79c3cb86b8f92e2d3`。
- GitHub Actions run [`31642176184`](https://github.com/zhouwen-giser/h3-spatial-toolkit/actions/runs/31642176184)：9/9 jobs SUCCESS。
- Ubuntu x64 quality：Node 22 与 Node 24，均执行 frozen install、`acceptance:local` 和 `acceptance:api`；Node 24 另执行 diagnostic Benchmark。
- Portable：Windows x64、macOS arm64、Linux arm64 各执行 Node 22/24，共 6/6；覆盖环境报告、Contract/Docs/Repository/Release、Format/Lint、Golden、Source SBOM、Type/Test/Build、OpenAPI、License/Audit 和 API/CLI。
- Browser：Ubuntu x64 Node 24 的 Chromium/Firefox/WebKit WebGL/SVG/Axe 矩阵 PASS。
- 版本化摘要：`evidence/gates/G6_CROSS_PLATFORM.json`。
- required-check policy、branch protection、容器多架构发布和生产批准不属于本项 PASS，由 `P1-CI-CERT-001`、`P1-SUPPLY-001` 与发布治理任务继续跟踪。
