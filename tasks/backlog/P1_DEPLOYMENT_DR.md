# P1-DEPLOY-DR-001 — 部署、HA 与灾备认证

Work 状态：`READY`。Gate 状态：`NOT_RUN`（本地布局和单实例切片不替代目标 HA/DR）。

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
- 当前 API/PostgreSQL 候选已执行本地 Docker build/run/scan 切片；Scanner 阈值由 P1-SUPPLY 跟踪。
- 未完成：双副本 rolling update、托管 HA、PITR、故障注入和 RTO/RPO 演练。
