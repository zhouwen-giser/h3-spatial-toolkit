# P2-JOB-001 — 异步空间分析任务

状态：`PLANNED`。

## 目标

实现 Job API、Queue、Worker、checkpoint、取消、幂等和大结果存储，使超同步阈值任务不会阻塞 API。

## 依赖

- P1-API-HARDEN-001。
- 结果存储和队列技术选型 ADR。

## 验收

5M+ Cell/record 任务、Worker restart、重复投递、取消和结果 checksum 测试通过。
