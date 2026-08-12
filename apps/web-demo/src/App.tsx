import { cellsToGeoJSON, polygonToCells } from "@h3-toolkit/geometry";
import { lazy, Suspense, useMemo, useState } from "react";

const DeckMap = lazy(async () => ({ default: (await import("./DeckMap.js")).DeckMap }));

const TOKYO_RING: [number, number][] = [
  [139.735, 35.665],
  [139.785, 35.665],
  [139.785, 35.695],
  [139.735, 35.695],
  [139.735, 35.665]
];

const hasWebGL = (() => {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
})();

export function App() {
  const [resolution, setResolution] = useState(9);
  const [ring, setRing] = useState<[number, number][]>(TOKYO_RING);
  const [renderer, setRenderer] = useState<"deck.gl" | "SVG fallback">(hasWebGL ? "deck.gl" : "SVG fallback");
  const polygon = useMemo<GeoJSON.Polygon>(() => ({ type: "Polygon", coordinates: [ring] }), [ring]);
  const cells = useMemo(
    () => (ring.length >= 4 ? polygonToCells(polygon, resolution) : []),
    [polygon, resolution, ring.length]
  );

  const reset = () => setRing(TOKYO_RING);
  const clear = () => setRing([]);

  return (
    <main>
      <header>
        <div>
          <p className="eyebrow">H3 SPATIAL TOOLKIT · ACCEPTANCE WORKBENCH</p>
          <h1>把空间尺度变成可检验的产品决策</h1>
          <p className="lede">
            选择 Resolution，查看东京样例 Polygon 如何转换成 H3 Cells。WebGL 可用时使用 deck.gl；受限浏览器自动使用等价
            SVG 边界渲染。
          </p>
        </div>
        <div className="status">
          <span /> H3 4.5.0 · EPSG:4326
        </div>
      </header>

      <section className="controls" aria-label="H3 parameters">
        <label>
          Resolution <strong>{resolution}</strong>
          <input
            aria-label="Resolution"
            type="range"
            min="5"
            max="12"
            value={resolution}
            onChange={(event) => setResolution(Number(event.target.value))}
          />
        </label>
        <div className="buttons">
          <button onClick={reset}>恢复东京样例</button>
          <button className="secondary" onClick={clear}>
            清空
          </button>
        </div>
        <div className="metrics">
          <article>
            <span>Cells</span>
            <strong>{cells.length.toLocaleString()}</strong>
          </article>
          <article>
            <span>Renderer</span>
            <strong>{renderer}</strong>
          </article>
          <article>
            <span>Coordinate</span>
            <strong>lng, lat</strong>
          </article>
        </div>
      </section>

      <section className="workspace">
        <div className="map" aria-label="H3 cell map">
          {renderer === "deck.gl" && cells.length > 0 ? (
            <Suspense fallback={<div className="map-loading">正在加载 WebGL Renderer…</div>}>
              <DeckMap cells={cells} onFailure={() => setRenderer("SVG fallback")} />
            </Suspense>
          ) : (
            <SvgMap cells={cells} polygon={polygon} />
          )}
          {cells.length === 0 && <div className="empty">恢复样例后即可生成 H3 Cells</div>}
        </div>
        <aside>
          <p className="eyebrow">LIVE OUTPUT</p>
          <h2>标准 H3 Cell Dataset</h2>
          <pre>
            {JSON.stringify(
              cells.slice(0, 10).map((cell) => ({ cell, resolution })),
              null,
              2
            )}
            {cells.length > 10 ? "\n…" : ""}
          </pre>
          <p className="note">
            显示前 10 项。完整结果可通过 REST API、CLI 或 TypeScript SDK 导出为 JSON、CSV 与 GeoJSON。
          </p>
        </aside>
      </section>
    </main>
  );
}

function SvgMap({ cells, polygon }: { cells: string[]; polygon: GeoJSON.Polygon }) {
  const features = cellsToGeoJSON(cells).features;
  const ring = polygon.coordinates[0] ?? TOKYO_RING;
  const xs = ring.map((position) => position[0]!);
  const ys = ring.map((position) => position[1]!);
  const minX = Math.min(...xs, 139.72),
    maxX = Math.max(...xs, 139.8);
  const minY = Math.min(...ys, 35.65),
    maxY = Math.max(...ys, 35.71);
  const project = ([x, y]: GeoJSON.Position) => [
    ((x! - minX) / (maxX - minX)) * 900,
    520 - ((y! - minY) / (maxY - minY)) * 520
  ];
  return (
    <svg viewBox="0 0 900 520" role="img" aria-label={`${cells.length} H3 cells rendered as polygons`}>
      <defs>
        <radialGradient id="bg">
          <stop stopColor="#173f46" />
          <stop offset="1" stopColor="#071418" />
        </radialGradient>
      </defs>
      <rect width="900" height="520" fill="url(#bg)" />
      {features.map((feature) => (
        <polygon
          key={feature.properties.cell}
          points={feature.geometry.coordinates[0]!.map(project)
            .map((point) => point.join(","))
            .join(" ")}
          fill="#32cda4"
          fillOpacity=".28"
          stroke="#74ffd7"
          strokeWidth=".8"
        >
          <title>{feature.properties.cell}</title>
        </polygon>
      ))}
    </svg>
  );
}
