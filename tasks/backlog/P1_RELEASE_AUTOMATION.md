# P1-RELEASE-001 — Release 自动化

状态：`PARTIAL`（本地版本/Changelog/Gate 分类、可复现包和 Release Summary 已完成；外部 CI、Owner 批准和正式发布未执行）。

## 目标

自动校验版本、Changelog、Gate 汇总、Manifest、Checksum、Release Notes 和批准状态。

## 依赖

- P1-PUBLISH-001、P1-CI-CERT-001 和 P1-GOV-OWNER-001。
- 正式 Release 流程决策。

## 验收

候选版不能绕过 required Gate；失败可安全重跑；发布产物与源码 commit、版本和证据可追踪。

## 当前证据

- `check:release-metadata` 校验 Project/Template 版本、Changelog 和源码/生产必需 Gate。
- 4 个策略测试覆盖源码阻断、生产门禁绕过和候选分类。
- `check:release` 生成可复现 ZIP、Manifest、Release Summary 和覆盖两个产物的 SHA-256。
- 未完成：仓库 commit/tag 绑定、托管 CI required check、Release Owner 批准、Registry/npm 发布和正式 Release Notes 发布。
