# Benchmark Report

执行时间：2026-08-11；Node v24.14.0、Linux x64、运行时报告 9 CPUs。完整机器可读结果：`benchmark/results/latest.json`。

## Point → H3（Resolution 9）

| Records | Duration ms | Records/s | μs/record | RSS delta MiB |
|---:|---:|---:|---:|---:|
| 10K | 29.22 | 342,174 | 2.92 | 18.75 |
| 100K | 112.35 | 890,073 | 1.12 | 4.13 |
| 1M | 1,135.14 | 880,946 | 1.14 | 9.88 |
| 10M | 11,082.64 | 902,312 | 1.11 | 1.88 |

测试逐条调用 Toolkit `pointToCell`，未使用线性外推。RSS delta 受 GC/allocator 影响，只能用于同进程相对观察。

## 流式 Aggregation

| Records | Duration ms | Records/s | Groups | Total check | RSS delta MiB |
|---:|---:|---:|---:|---:|---:|
| 1M | 1,046.50 | 955,566 | 3,815 | 1,000,000 | 0.75 |
| 10M | 10,686.31 | 935,776 | 3,815 | 10,000,000 | 0.25 |

这是流式 Map 聚合，不构造 10M record array，说明“输入表示与响应体”常比 H3 计算更早成为内存瓶颈。

## Polygon → Cells（Resolution 9）

| Size | Cells | Duration ms |
|---|---:|---:|
| Small | 64 | 9.09 |
| Medium | 25,945 | 94.63 |
| Large | 647,905 | 1,570.71 |

## Node 内存计算边界

- ≤100K：适合同步 API，仍受序列化和 30s timeout 约束。
- 100K–1M：采用 chunk/stream/worker，避免大 JSON 一次驻留。
- ≥1M：不默认接收为同步 REST array；转文件流、异步作业或数据库下推。
- ≥10M、重复查询、跨用户共享：迁移 PostgreSQL/OLAP；不是因为单次 H3 必然慢，而是可恢复性、响应体、并发、查询复用和运维成本。

## 未完成对比

Node 已实测；PostgreSQL 与 ClickHouse 未在本环境执行，因此没有虚构对比数字。数据库 Benchmark SQL 和 Docker 环境已提供；ClickHouse 保留 Phase 2。
