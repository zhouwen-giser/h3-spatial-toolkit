# P1-SUPPLY-001 — 软件供应链认证

状态：`PARTIAL`（源码 SBOM 与完整 npm 生产依赖 License Inventory 已完成；镜像/签名/Provenance 未执行）。

## 目标

生成 SBOM，扫描依赖、基础镜像和发行镜像，固定 digest，并建立签名、provenance 和 License Notice。

## 依赖

- Registry、Scanner、签名身份和密钥管理方案。
- 组织 License 与漏洞处置政策。

## 验收

SBOM/scan/sign/provenance 可验证；Critical/High 无未处置项；密钥不进入仓库、日志、镜像层或源码包。

## 当前证据

- `sbom/cyclonedx-bom.json`：可重复生成的 CycloneDX 1.6 JSON，145 components。
- `THIRD_PARTY_NOTICES.md`：134 个外部生产依赖 License Inventory，0 unresolved。
- 修正 License Gate 的传递依赖遍历；当前覆盖 146 个生产组件，而非只覆盖工作区根包。
- `pnpm check:supply-chain` 与 SBOM graph tests PASS。
- 未完成：基础/发行镜像 SBOM、镜像漏洞扫描、digest pin、签名、SLSA provenance、Registry 验证。
