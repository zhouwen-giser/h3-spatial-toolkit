# P1-CROSS-PLATFORM-001 — 跨平台运行矩阵

状态：`PARTIAL`。

## 目标

认证 Node 22/24、Linux/macOS/Windows 和 amd64/arm64 的安装、构建、测试、CLI 与源码包。

## 依赖

- 对应托管 Runner 或授权设备。
- 已批准的支持矩阵。

## 验收

每个支持组合有 frozen install、Local Gate 和 CLI 证据；不支持组合在文档和 package metadata 中明确。

## 当前证据

- CI 定义已覆盖 Linux x64 Node 22/24，并为两个版本执行 Local/API/production layout 门禁。
- 当前 Work 仅真实执行 Linux x64 Node 24；CI 文件存在不算 Node 22 PASS。
- macOS、Windows 和 arm64 仍缺 Runner/设备与支持决策。
