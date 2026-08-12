# P1-DEPLOY-DR-001 — 部署、HA 与灾备认证

Work 状态：`READY`。Gate 状态：`PARTIAL`（已认证实现提交 `cd3211f` 的 container runtime 与单实例恢复 PASS；目标 HA/DR 仍未执行）。

## 目标

验证多副本、滚动升级、优雅停机、回滚、数据库 HA、Backup/PITR、Failover 和目标 RTO/RPO。

## 依赖

- 部署平台、目标数据库服务、Secret/配置平台和业务批准的 RTO/RPO。

## 验收

部署、回滚、恢复和故障转移均有实操记录与数据校验；Runbook 文本不作为演练通过证据。

## 当前证据

- production-only API deploy 为 26,014,477 bytes，排除 Vitest/TypeScript 等开发依赖。
- Dockerfile 只复制 deploy 输出并使用 `USER node`；独立目录 readiness 与 SIGTERM clean exit PASS。
- 数据库认证脚本已包含单容器 custom-format backup/restore 流程。
- 已认证实现提交 `cd3211f` 的 API image readiness/non-root/runtime hygiene PASS；独立 PostgreSQL runtime image 在完整 G4 中 healthy。两次独立构建均通过 revision-label guard，不混用本地 manifest/image ID。
- 已认证实现提交 `cd3211f` 的数据库 run 中 custom-format backup SHA-256 与非空逻辑 restore parity PASS；Scanner 阈值由 P1-SUPPLY 跟踪。
- 未完成：双副本 rolling update、托管 HA、PITR、故障注入和 RTO/RPO 演练。
