# 工程治理规范

## 1. 目的

本规范覆盖系统功能之外的研发活动：需求进入、任务拆分、变更评审、代码质量、兼容性、证据、版本和发布责任。Codex 与人工开发者执行同一套规则。

## 2. 工作项生命周期

```text
PROPOSED → READY → IN_PROGRESS → REVIEW → VERIFIED → COMPLETED
                    ↘ BLOCKED
```

- `READY`：目标、范围、依赖、验收和回滚已明确。
- `IN_PROGRESS`：只能有一个 `tasks/current/` 主工作项；并行辅助任务必须记录归属。
- `REVIEW`：实现完成但尚未满足所有 Gate。
- `VERIFIED`：相关自动和目标环境门禁均有证据。
- `COMPLETED`：状态、追踪、文档和发布材料同步完成。
- `BLOCKED`：写明缺少的环境、授权、决策或上游依赖。

## 3. Definition of Ready

开始编码前必须具备：

1. 稳定 Work Item ID。
2. 业务目标、非目标和影响范围。
3. 依赖和目标环境。
4. API/Schema/数据迁移影响。
5. 测试、验收证据和回滚方案。
6. 安全、隐私、性能和兼容性影响判断。

缺少真实数据库、浏览器、身份系统或部署环境时，可以完成本地设计和静态检查，但对应 Gate 保持 `NOT_RUN/BLOCKED`。

## 4. Definition of Done

- 源码、类型、测试、文档和 Contract 同步。
- `pnpm acceptance:local` 和相关专项 Gate 通过。
- Breaking Change 已有 ADR、版本策略和迁移说明。
- 新依赖完成用途、版本、License、漏洞和替代方案评审。
- Work Item、`PROJECT_STATUS.md`、`.codex/project-state.json` 和追踪矩阵同步。
- 外部环境门禁有真实证据；未执行项明确保留。
- Release 包内容审计、Manifest 和 SHA-256 通过。

## 5. 变更分类

| 类型 | 示例 | 最小评审 |
|---|---|---|
| Patch | 内部缺陷、文档修订 | Local Quality |
| Additive | 新可选端点/字段/命令 | Contract + Local + API/CLI |
| Breaking | 字段移除、语义/坐标/Policy 变化 | ADR + Major/新版本 + 迁移 |
| Database | DDL、索引、Extension | Migration + G4 + Backup/rollback |
| Security | Auth、tenant、Secret、依赖 | Threat model + G5 |
| Runtime | Docker、HA、资源、网络 | G6 + Runbook |
| Performance | 算法、序列化、批量 | Benchmark + Load evidence |

## 6. Review Checklist

- 是否把 H3 Cell 当作精确 Geometry。
- 是否破坏 `[longitude, latitude]` 契约。
- 是否引入 Analysis→HTTP/DB 的反向依赖。
- 是否新增无上限的数组、Cell、distinct、radius 或输出。
- 是否记录 engine/schema/toolkit version。
- 是否遗漏错误、取消、超时、幂等和重试语义。
- 是否需要数据迁移或旧客户端兼容。
- 是否泄露位置、租户、Secret 或内部错误。
- 是否把 `NOT_RUN` 误写为 `PASS`。

## 7. 所有权和批准

模板不虚构具体人员。正式仓库建立后必须完成 `P1-GOV-OWNER-001`：确定 Toolkit、API、Database、Security、SRE、Docs 的 Owner，创建 CODEOWNERS/批准规则，并指定 Release Approver。在此之前所有生产发布保持 `BLOCKED`。

