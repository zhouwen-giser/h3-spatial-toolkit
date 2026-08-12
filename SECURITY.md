# 安全策略

## 支持范围

当前支持的源码候选为 `0.3.x`，仍不是生产认证版本。已完成本地资源限额、脱敏、Source SBOM/License 和平台中立的 fail-closed 鉴权契约；具体 OIDC/JWKS、持久租户隔离、Gateway、达到漏洞阈值的镜像、签名/provenance、目标平台渗透测试与 HA/PITR 演练尚未完成。状态以 `PROJECT_STATUS.md` 为准。

## 报告漏洞

正式仓库建立后应配置私有安全报告渠道和 Security Owner。在此之前，不要在公开 Issue 中提交 Token、Secret、真实位置、轨迹、租户数据或可直接利用的细节。模板不虚构联系人；渠道建立由 `P1-GOV-OWNER-001` 跟踪。

报告应包含受影响版本、最小复现、影响、缓解建议和是否涉及真实数据。维护者应确认收到、分级、修复、回归并发布公告；响应时限由组织安全政策确定。

## 安全门禁

- 本地：Secret pattern、依赖 Audit、License、恶意输入、注入 Authenticator/Principal/Tenant/Scope 契约和镜像扫描。
- 目标环境：Auth/Tenant、DAST、Gateway 限流、容器/镜像扫描、签名和 provenance。
- 数据：位置数据分类、最小化、保留、删除、导出和事件通知需组织/法律审批。

当前镜像扫描仍未达到 Critical/High 策略阈值，不得把“已扫描”写成供应链 PASS。用户已将本轮新源码包内容审计从完成要求中移除；这不降低源码仓库、日志、镜像层和远端发布不得包含真实凭据或私钥的安全要求。

完整控制和限制见 `docs/27_SECURITY_PRIVACY_COMPLIANCE.md`。
