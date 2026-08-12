# Changelog

本项目遵循 SemVer；Breaking Change 需 ADR、Major/新契约版本和迁移说明。

## [Unreleased]

## [0.3.0] - 2026-08-13

### Added

- 平台中立的 injected authenticator/Principal/Tenant/Scope 信任边界；`required` 模式 fail closed，六业务 Scope 与 Metrics Scope 同步 OpenAPI。
- Chromium 151、Firefox 153、WebKit 26.5 的 Playwright/Axe 矩阵，覆盖正常 WebGL、强制 SVG、键盘/Focus、200% 等效回流与关键交互。
- Benchmark correctness/performance gate、完整环境键、1 次预热 + 3 次记录、median 判定、p95 诊断、exact baseline 和 20% 回归阈值；无匹配环境时门禁明确 `NOT_COMPARABLE` 并非成功。
- append-only 数据库不变量、四列 Upsert 正反例、四类索引计划探针、10K–10M、逻辑恢复指纹、扩展升级和 DDL rollback 的 run-scoped runner。
- OpenAPI 具体成功响应 Schema、资源边界兼容检测与 v1 安全例外 ADR。
- API 统一成功/错误 Envelope、请求 ID、资源限额和稳定语义校验。
- `/ready` 与低基数 Prometheus `/metrics`，并对日志认证头做脱敏。
- Web Deck.gl 动态拆包与可执行 Bundle Budget。
- 版本/Changelog/Gate 汇总和 Release Metadata 自动检查。
- 可再生的 h3-js 跨引擎 Golden 数据集和已接线的 PostGIS 对照测试。
- CycloneDX 1.6 源码 SBOM、完整传递生产依赖许可清单和修正后的依赖遍历。
- 数据库认证脚本自动保存扩展版本、Golden、EXPLAIN、Backup/Restore 证据。
- Bash 语法/严格模式门禁和可验证的 API graceful shutdown。
- 工程治理、测试策略、发布规范、运维、安全隐私、环境矩阵和未完成工作登记册。
- Format、Lint、文档、仓库卫生、OpenAPI/JSON Schema、License、环境探测和可复现发布门禁。
- PR/Issue/依赖更新治理模板和机器可读 Gate 证据目录。

### Changed

- 软件版本升级到 `0.3.0`：新增向后兼容的鉴权契约、具体 API Schema、浏览器/性能/数据库认证能力；Codex 模板升级到 `1.4.0`：扩展接管状态、run-scoped 证据与跨平台 CI。
- 本地验收聚合更多静态、契约和供应链检查。
- 当前交付边界改为每轮 Git commit/push 和远端 PR；按用户明确要求，当前轮不生成/复验新的源码 ZIP、Manifest、Checksum 或 Release Summary，`G7_RELEASE_PACKAGE=NOT_RUN`。
- Docker build context 排除宿主依赖与临时产物，构建阶段显式使用非交互 CI 模式。
- 数据库认证 runner 兼容 Windows Git Bash，并将认证 PostgreSQL 安全绑定到 `127.0.0.1:55432`。

### Fixed

- 修复宿主 `node_modules` 进入 Docker context 导致镜像内 `pnpm install` 中止。
- 修复 Git Bash 将容器 `/dev/stdin` 路径重写为 Windows 路径，以及 runner 误连宿主 PostgreSQL 5432 的问题。
- 修复 Windows `pnpm`/IPC/浏览器路径和 ShellCheck 执行边界，以及 OpenAPI required/bounds/enum 兼容方向。

### Known limitations

- 完整 G4 run-scoped 认证正等待重建本地合成数据库的明确授权；具体 OIDC/JWKS/Gateway/持久租户、Load/Soak、HA/PITR、远端跨平台矩阵、镜像阈值处置、签名/provenance 和生产批准仍未完成。

## [0.2.0] - 2026-08-12

- 固化本轮 API、语义校验、指标、Web 拆包与 Release Metadata 基线。

## [0.1.0] - 2026-08-11

- 初始 H3 Toolkit MVP、API、CLI、Web Demo、PostGIS Adapter、测试、Benchmark 和 Codex 开发模板。
