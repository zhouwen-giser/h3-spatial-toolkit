# 发布与交付规范

## 1. 发布输入

- 版本化源码、lockfile、OpenAPI、JSON Schema、Migration。
- 设计、开发计划、门禁、追踪、未完成工作和验收报告。
- 测试、覆盖率、Benchmark、Security、DB/Browser/Deployment 证据。
- CHANGELOG、升级/回滚说明、License、CycloneDX 源码 SBOM、镜像信息。

## 2. 本地源码包门禁

`pnpm check:release`：

1. 用固定 `SOURCE_DATE_EPOCH` 生成 Manifest。
2. 校验 Manifest 中每个文件大小和 SHA-256。
3. 两次独立构建 ZIP 并验证二进制哈希一致。
4. 执行 `unzip -t`。
5. 确认所有 Manifest 文件均在 ZIP。
6. 拒绝 `node_modules`、`dist`、根 `coverage/output/release`、`.env` 和密钥文件。
7. 校验 Project/Template 版本、Changelog 和源码/生产 Gate 分类。
8. 输出 ZIP、`RELEASE-SUMMARY.json` 和覆盖二者的 `SHA256SUMS` 到 `release/`。

该 Gate 证明源码包内容和可复现性，不证明容器、数据库或生产运行已通过。

## 3. 版本和兼容

- Project 使用 SemVer；Template 独立使用 `templateVersion`。
- `/v1` OpenAPI 与 JSON Schema 有冻结基线。
- Database Migration 只前向追加，不允许修改已发布 Migration 的含义。
- H3/h3-js/h3-pg 版本变化需 Cross-engine Golden 和 Benchmark。

## 4. 尚未完成的发布能力

| 项目 | 状态 | Work Item |
|---|---|---|
| npm 包发布策略/exports/API Extractor | BLOCKED_BY_DECISION | P1-PUBLISH-001 |
| Source SBOM/Third-party Notice | LOCAL_PASS | P1-SUPPLY-001 |
| Container SBOM | NOT_RUN | P1-SUPPLY-001 |
| Container digest/scan/sign | NOT_RUN | P1-SUPPLY-001 |
| Release Owner/CODEOWNERS | BLOCKED | P1-GOV-OWNER-001 |
| Changelog/Gate/Release Summary 自动校验 | LOCAL_PASS；外部批准待办 | P1-RELEASE-001 |
| 数据库升级/回滚包 | NOT_RUN | P1-DB-MIGRATION-001 |
| 正式部署和回滚 | NOT_RUN | P1-DEPLOY-DR-001 |

## 5. 发布判定

- `SOURCE_TEMPLATE_READY`：本地模板和源码包门禁通过。
- `INTERNAL_CANDIDATE`：G4 数据库和基础 Security 通过，可进入受控环境。
- `RELEASE_CANDIDATE`：全部生产必需子门禁通过但尚待 Release Owner 批准。
- `PRODUCTION_READY`：所有 Gate、Owner 和批准齐备。

当前模板最多只能判定为 `SOURCE_TEMPLATE_READY`，不能标为 `PRODUCTION_READY`。
