# P1-BROWSER-A11Y-001 — 浏览器与可访问性认证

Work 状态：`COMPLETE_LOCAL`。Gate 状态：`PASS`（2026-08-13 Windows Playwright 本地矩阵）。

## 目标

验证 Chromium、Firefox、WebKit 的 WebGL 与无 WebGL fallback、键盘、Focus、语义、对比度和缩放。

## 依赖

- 真实浏览器运行时和可保存截图/测试报告的执行器。
- 可访问性目标和支持浏览器矩阵批准。

## 验收

支持矩阵全部有真实浏览器证据；关键流程无阻断级 WCAG 问题；Vite build 不作为替代证据。

## 2026-08-13 证据

- Playwright 1.62.1：Chromium 151.0.7922.34、Firefox 153.0、WebKit 26.5。
- 每个引擎覆盖正常 deck.gl/WebGL、强制 `?testRenderer=svg`、键盘/Focus、Resolution/Clear/Reset 和 200% 等效缩放回流。
- 9/9 passed；Axe 4.13.0 critical/serious violations 为 0。
- 版本化摘要：`evidence/gates/G2_BROWSER_ACCESSIBILITY.json`；详细 JSON/HTML/附件位于忽略提交的 `output/acceptance/browser/`。
- 本项完成只代表声明的 Windows 本地浏览器矩阵；远端/跨平台持续执行由 `P1-CI-CERT-001` 和 `P1-CROSS-PLATFORM-001` 跟踪。
