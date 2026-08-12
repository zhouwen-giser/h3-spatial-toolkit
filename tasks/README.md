# Work Item 管理

目录约定：

- `current/`：当前允许推进的任务，通常保持 1 个。
- `backlog/`：依赖未满足或下一阶段任务。
- `completed/`：完成并已有 Gate 证据的任务。

每个任务必须包含：ID、目标、范围、不做事项、依赖、实施步骤、测试、验收、证据和状态。开始/完成任务时同步更新 `PROJECT_STATUS.md` 与 `.codex/project-state.json`。

