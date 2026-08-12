# P1-WEB-BUNDLE-001 — Web Demo 分包与预算

状态：`REVIEW`（构建与预算 PASS；真实浏览器回归 `NOT_RUN`）。

## 目标

降低当前约 1.04 MB 的主 JavaScript chunk，建立可解释的 bundle budget，并避免地图依赖阻塞首屏和 SVG fallback。

## 依赖

- P1-BROWSER-A11Y-001 的真实使用路径和支持矩阵。
- 产品批准的首屏、缓存和离线目标。

## 验收

构建不再出现未处置的大 chunk 警告；预算由自动门禁执行；WebGL 与 SVG fallback 在目标浏览器保持通过。

## 当前证据

- Entry：404,532 bytes / gzip 126,103 bytes，预算 450,000 / 150,000。
- Async DeckMap：632,091 bytes / gzip 181,874 bytes，预算 650,000 / 200,000。
- Total JavaScript：1,036,690 bytes，预算 1,100,000。
- `pnpm --filter @h3-toolkit/web-demo build`：PASS，无 Vite chunk warning。
- 未完成：Chromium/Firefox/WebKit 的 WebGL、SVG fallback 和交互回归；由 `P1-BROWSER-A11Y-001` 解锁。
