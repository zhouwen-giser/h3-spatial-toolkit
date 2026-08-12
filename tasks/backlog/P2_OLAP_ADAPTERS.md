# P2-OLAP-001 — 可选 OLAP Adapter

Work 状态：`DEFERRED`。Gate 状态：`NOT_RUN`。

## 目标

仅在真实负载证明需要时评估 DuckDB、ClickHouse 或分布式引擎 Adapter，并保持标准 Schema/坐标语义。

## 依赖

- 容量证据、业务查询模型和选型 ADR。
- Cross-engine Golden Dataset。

## 验收

候选引擎在正确性、成本、运维和性能上有实测；所有外部 Contract 与 Golden 测试一致。
