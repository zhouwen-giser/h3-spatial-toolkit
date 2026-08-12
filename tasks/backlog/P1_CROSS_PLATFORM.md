# P1-CROSS-PLATFORM-001 — 跨平台运行矩阵

Work 状态：`READY`。Gate 状态：`PARTIAL`。

## 目标

认证 Node 22/24、Linux/macOS/Windows 和 amd64/arm64 的安装、构建、测试、CLI 与源码包。

## 依赖

- 对应托管 Runner 或授权设备。
- 已批准的支持矩阵。

## 验收

每个支持组合有 frozen install、Local Gate 和 CLI 证据；不支持组合在文档和 package metadata 中明确。

## 当前证据

- CI 定义已覆盖 Node 22/24 及 Linux/Windows/macOS、x64/arm64 的适用组合，并执行 frozen install、环境报告和 portable acceptance subset。
- 当前 Work 已真实执行 Windows x64 Node 22 及 Playwright 三引擎；Workflow 文件存在不算其它 OS/arch PASS。
- 完整托管矩阵、支持决策和失败处置仍需远端运行证据。
