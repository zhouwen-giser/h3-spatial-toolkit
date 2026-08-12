# P1-SHELL-QUALITY-001 — Shell 脚本专项检查

状态：`PARTIAL`（Bash syntax/strict mode/危险构造基线 PASS；ShellCheck 和目标 Shell 矩阵仍未执行）。

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
- 当前环境仍无 `shellcheck`，因此本任务保持 `PARTIAL`，不把自定义检查替代为 ShellCheck PASS。
