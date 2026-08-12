# P1-SHELL-QUALITY-001 — Shell 脚本专项检查

Work 状态：`REVIEW`。Gate 状态：`PARTIAL`（G0 本地 ShellCheck/Bash 子门禁 PASS；G6 目标 OS shell 仍由跨平台项跟踪）。

## 目标

用 shellcheck 和目标 Shell 矩阵检查数据库及验收脚本，覆盖引用、错误传播、平台差异和安全参数处理。

## 依赖

- shellcheck 可执行文件。
- Linux/macOS Shell 支持范围决策。

## 验收

所有版本化 Shell 脚本通过 shellcheck；关键路径在支持的 Shell 上执行；缺失工具时不能用 Node/ESLint 结果替代。

## 当前证据

- `pnpm check:shell` 对全部版本化 Shell 脚本执行 `bash -n`、shebang、`set -euo pipefail`、可执行位和危险动态执行检查。
- 数据库认证脚本已自动化证据目录、Migration 幂等、Smoke、Fixture、EXPLAIN、Golden、Backup/Restore。
- `pnpm check:shell` 在 Windows 使用可发现的 Git Bash，并通过 native 或固定 digest 的 ShellCheck 容器执行实际 ShellCheck；当前本地检查 PASS。
- Linux/macOS/Windows 托管 shell 行为仍由 `P1-CROSS-PLATFORM-001` 和远端 CI 认证，不能从本地 PASS 推断。
