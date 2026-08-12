# Changelog

本项目遵循 SemVer；Breaking Change 需 ADR、Major/新契约版本和迁移说明。

## [Unreleased]

### Added

- API 统一成功/错误 Envelope、请求 ID、资源限额和稳定语义校验。
- `/ready` 与低基数 Prometheus `/metrics`，并对日志认证头做脱敏。
- Web Deck.gl 动态拆包与可执行 Bundle Budget。
- 版本/Changelog/Gate 汇总和可复现 Release Summary 自动检查。
- 可再生的 h3-js 跨引擎 Golden 数据集和已接线的 PostGIS 对照测试。
- CycloneDX 1.6 源码 SBOM、完整传递生产依赖许可清单和修正后的依赖遍历。
- 数据库认证脚本自动保存扩展版本、Golden、EXPLAIN、Backup/Restore 证据。
- Bash 语法/严格模式门禁和可验证的 API graceful shutdown。
- 工程治理、测试策略、发布规范、运维、安全隐私、环境矩阵和未完成工作登记册。
- Format、Lint、文档、仓库卫生、OpenAPI/JSON Schema、License、环境探测和可复现发布门禁。
- PR/Issue/依赖更新治理模板和机器可读 Gate 证据目录。

### Changed

- 软件版本维持 `0.2.0`，Codex 模板版本升级到 `1.3.0`。
- 本地验收聚合更多静态、契约和供应链检查。
- Docker build context 排除宿主依赖与临时产物，构建阶段显式使用非交互 CI 模式。
- 数据库认证 runner 兼容 Windows Git Bash，并将认证 PostgreSQL 安全绑定到 `127.0.0.1:55432`。

### Fixed

- 修复宿主 `node_modules` 进入 Docker context 导致镜像内 `pnpm install` 中止。
- 修复 Git Bash 将容器 `/dev/stdin` 路径重写为 Windows 路径，以及 runner 误连宿主 PostgreSQL 5432 的问题。

### Known limitations

- 数据库仅完成 10K/Golden/基础恢复的 PARTIAL 认证；真实浏览器矩阵、OIDC/租户、负载/Soak、HA/恢复、完整跨平台、外部 CI 和签名仍未认证。

## [0.2.0] - 2026-08-12

- 固化本轮 API、语义校验、指标、Web 拆包与 Release Metadata 基线。

## [0.1.0] - 2026-08-11

- 初始 H3 Toolkit MVP、API、CLI、Web Demo、PostGIS Adapter、测试、Benchmark 和 Codex 开发模板。
