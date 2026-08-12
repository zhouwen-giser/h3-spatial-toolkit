# P1-SUPPLY-001 — 软件供应链认证

Work 状态：`IN_PROGRESS`。Gate 状态：`PARTIAL`（源码 SBOM/License、镜像源码绑定和实际运行已完成；镜像漏洞阈值仍 FAIL，签名/Provenance 未执行）。

## 目标

生成 SBOM，扫描依赖、基础镜像和发行镜像，固定 digest，并建立签名、provenance 和 License Notice。

## 依赖

- Registry、Scanner、签名身份和密钥管理方案。
- 组织 License 与漏洞处置政策。

## 验收

SBOM/scan/sign/provenance 可验证；Critical/High 无未处置项；密钥不进入仓库、日志、镜像层或源码包。

## 当前证据

- `sbom/cyclonedx-bom.json`：可重复生成的 CycloneDX 1.6 JSON，145 components。
- `THIRD_PARTY_NOTICES.md`：134 个外部生产依赖 License Inventory，0 unresolved；License Gate 覆盖 146 个生产组件。
- `pnpm check:supply-chain`、SBOM graph tests 和生产依赖 audit PASS。
- 基础镜像、API/PostgreSQL 候选使用 digest pin，并绑定已认证实现提交 `cd3211f956c5c77c06fd52c79c3cb86b8f92e2d3`。
- 该实现提交的 API image `sha256:3255ba1...a3406ee` readiness、non-root、runtime package-manager absence PASS；本地 Scout PostgreSQL build 为 `sha256:5fc63f7...9c74d3e`，独立的托管 G4 runtime build 为 `sha256:5f8df28...9394b2b`。二者均通过 `cd3211f` revision-label guard；独立构建 ID 不混用。
- Docker Scout v1.22.0 重扫：API 2 Critical + 2 High（均无修复版本），PostgreSQL 1 Critical + 17 High（17 可修复、1 无修复），合计 3 Critical + 19 High；无 suppression，策略阈值 **FAIL**。
- 版本化摘要：`evidence/gates/G5_SBOM_IMAGE_SIGNING.json` 与 `evidence/gates/G6_CONTAINER_RUNTIME.json`。

## 下一步

1. 升级或重建 PostgreSQL 基础镜像以处置 17 个可修复 High 和 1 个可修复 Critical，并重新执行 current-source 扫描。
2. 对暂无修复版本的 API/数据库发现取得正式风险处置；未获批准前不得降低阈值或添加 suppression。
3. 在批准的 Registry 固化不可变发布 digest，执行签名和 registry-backed provenance verification。
4. 只在 Critical/High 全部消除或完成正式处置，且签名/provenance 验证通过后，将 `G5_SBOM_IMAGE_SIGNING` 升为 PASS。
