# Codex 从这里开始

这是 H3 Spatial Toolkit 的可运行开发模板。它已经包含 TypeScript Monorepo、SDK、REST API、CLI、Web Demo、PostGIS/H3 Adapter、测试、Benchmark、完整系统设计、开发计划和验收门禁。

## 1. 首次进入

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm check:contract
pnpm acceptance:local
```

如果当前机器没有 Docker/Compose，不要执行或伪造数据库门禁；在状态文件保留 `G4_DATABASE=NOT_RUN`。数据库脚本使用认证镜像内的 `psql/pg_dump/pg_restore`，本地安装 psql 不是硬依赖。

## 2. 必读顺序

| 顺序 | 文件 | 用途 |
|---:|---|---|
| 1 | `AGENTS.md` | 仓库工作规则和安全边界 |
| 2 | `PROJECT_STATUS.md` | 当前基线、进行中工作和门禁状态 |
| 3 | `docs/17_SYSTEM_DETAILED_DESIGN.md` | 完整系统设计与当前/目标边界 |
| 4 | `docs/18_DEVELOPMENT_PLAN.md` | 阶段、Work Item、依赖和退出条件 |
| 5 | `docs/19_ACCEPTANCE_GATES.md` | 必须执行的门禁及证据格式 |
| 6 | `docs/20_REQUIREMENTS_TRACEABILITY.md` | 需求→代码→测试→门禁映射 |
| 7 | `docs/21_TRUSTED_ACCESS_POLICY.md` | 可信访问与外部操作约束 |
| 8 | `docs/23_ENGINEERING_GOVERNANCE.md` | Ready/Done、评审和责任规则 |
| 9 | `docs/24_TEST_STRATEGY.md` | 测试层次和环境矩阵 |
| 10 | `docs/29_UNFINISHED_WORK_REGISTER.md` | 未完成项、阻塞和不可替代关系 |
| 11 | `tasks/current/*` | 当前允许推进的具体任务 |

已有开源证据、能力矩阵和架构比较位于 `docs/01`–`docs/16` 与 `research/evidence/`。除非版本或决策发生变化，不要重新开展同一轮基础调研。

## 3. 选择工作项

1. 优先处理 `tasks/current/`。
2. 当前任务完成且门禁通过后，从 `tasks/backlog/` 选择依赖已满足的最高优先级任务。
3. 把选中的 Work Item 写入 `PROJECT_STATUS.md` 的“当前工作”。
4. 更新 `.codex/project-state.json` 的 `activeWorkItem` 和状态。
5. 实现、测试、记录证据，再移动/更新任务状态。

## 4. 常用命令

```bash
pnpm check:contract       # 模板、文档、任务和关键契约静态检查
pnpm check:static         # Contract/Docs/Repository/Format/Lint
pnpm check:golden         # 验证冻结的 h3-js 跨引擎期望值未漂移
pnpm check:supply-chain   # 验证 CycloneDX SBOM 与第三方许可清单
pnpm acceptance:local     # 类型、测试、构建、生产依赖审计
pnpm acceptance:api       # 编译 API/CLI 冒烟
pnpm benchmark            # 10K–10M 实测
pnpm check:release        # 可复现源码包、Manifest、SHA-256
pnpm environment:report -- --write # 探测本机可执行/不可执行能力
pnpm acceptance:database  # Docker/PostGIS/H3/Golden/EXPLAIN/Backup-Restore 门禁
pnpm acceptance:full      # 完整门禁；需要 Docker
pnpm dev                  # API，默认 127.0.0.1:3000
pnpm dev:web              # Web Demo
```

## 5. 变更交付

每轮完成后至少更新：

- `PROJECT_STATUS.md`
- `.codex/project-state.json`
- 对应 `tasks/` Work Item
- `docs/20_REQUIREMENTS_TRACEABILITY.md`
- 受影响的设计/API/Schema 文档
- 验收报告和 Benchmark 结果（若相关）
- `docs/29_UNFINISHED_WORK_REGISTER.md`（新增、完成或重新阻塞的事项）
- `evidence/gates/` 中对应的可复验摘要；没有执行不得生成 PASS 证据

最终交付不得包含 `node_modules`、`dist`、`coverage`、真实 `.env` 或凭据。
