# 安全策略

## 支持范围

当前 `0.1.x` 是源码模板/MVP 基线，不是生产认证版本。模板当前没有完成 OIDC、租户隔离、SBOM/镜像签名、目标平台渗透测试与 HA 演练；状态以 `PROJECT_STATUS.md` 为准。

## 报告漏洞

正式仓库建立后应配置私有安全报告渠道和 Security Owner。在此之前，不要在公开 Issue 中提交 Token、Secret、真实位置、轨迹、租户数据或可直接利用的细节。模板不虚构联系人；渠道建立由 `P1-GOV-OWNER-001` 跟踪。

报告应包含受影响版本、最小复现、影响、缓解建议和是否涉及真实数据。维护者应确认收到、分级、修复、回归并发布公告；响应时限由组织安全政策确定。

## 安全门禁

- 本地：Secret pattern、依赖 Audit、License、恶意输入单测和发行包内容检查。
- 目标环境：Auth/Tenant、DAST、Gateway 限流、容器/镜像扫描、签名和 provenance。
- 数据：位置数据分类、最小化、保留、删除、导出和事件通知需组织/法律审批。

完整控制和限制见 `docs/27_SECURITY_PRIVACY_COMPLIANCE.md`。
