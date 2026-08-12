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

### Known limitations

- 数据库、真实浏览器、OIDC/租户、负载/Soak、HA/恢复、跨平台、外部 CI 和签名仍未认证。

## [0.2.0] - 2026-08-12

- 固化本轮 API、语义校验、指标、Web 拆包与 Release Metadata 基线。

## [0.1.0] - 2026-08-11

- 初始 H3 Toolkit MVP、API、CLI、Web Demo、PostGIS Adapter、测试、Benchmark 和 Codex 开发模板。
