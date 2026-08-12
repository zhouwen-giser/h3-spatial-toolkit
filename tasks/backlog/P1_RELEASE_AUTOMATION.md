# P1-RELEASE-001 — Release 自动化

Work 状态：`IN_PROGRESS`。Gate 状态：`PARTIAL`（0.3.0/1.4.0 本地版本/Changelog/Gate metadata 已 PASS；外部 CI、Owner 批准和正式发布待办）。

## 目标

自动校验版本、Changelog、Gate 汇总、远端 commit/CI、Release Notes 和批准状态。可复现源码包仍是可选能力，不是本轮完成要求。

## 依赖

- P1-PUBLISH-001、P1-CI-CERT-001 和 P1-GOV-OWNER-001。
- 正式 Release 流程决策。

## 验收

候选版不能绕过 required Gate；失败可安全重跑；发布产物与源码 commit、版本和证据可追踪。

## 当前证据

- `check:release-metadata` 校验 Project/Template 版本、Changelog 和源码/生产必需 Gate。
- 4 个策略测试覆盖源码阻断、生产门禁绕过和候选分类。
- 用户明确要求本轮不生成新 ZIP、Manifest、Release Summary、SHA256SUMS，也不执行全新目录解压/frozen install/static/content audit；`G7_RELEASE_PACKAGE=NOT_RUN` 且不阻塞本轮完成。
- 历史 0.2.0/模板 1.3.0 包证据保留为历史，不认证当前 0.3.0/1.4.0。
- 未完成：仓库 commit/tag 绑定、托管 CI required check、Release Owner 批准、Registry/npm 发布和正式 Release Notes 发布。
