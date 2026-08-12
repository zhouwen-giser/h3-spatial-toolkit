# P1-PUBLISH-001 — 包分发与发布策略

Work 状态：`BLOCKED`。Gate 状态：`BLOCKED`（原因：分发模式与 Registry 决策未完成）。

## 目标

决定 npm 公共包、私有 Registry 或仅源码分发，并补齐 exports、API 抽取、provenance、弃用和回滚策略。

## 依赖

- 分发模式、Registry、命名空间和发布权限决策。
- P1-SUPPLY-001 与 P1-GOV-OWNER-001。

## 验收

干净消费者项目可安装和使用；发布、弃用、回滚与权限经过演练；版本和变更记录一致。
