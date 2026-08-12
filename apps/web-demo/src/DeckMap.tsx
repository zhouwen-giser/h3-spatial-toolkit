import { PolygonLayer } from "@deck.gl/layers";
import DeckGL from "@deck.gl/react";
import { cellsToGeoJSON } from "@h3-toolkit/geometry";

export interface DeckMapProps {
  cells: string[];
  onFailure: () => void;
}

export function DeckMap({ cells, onFailure }: DeckMapProps) {
  const data = cellsToGeoJSON(cells).features;
  const layer = new PolygonLayer<(typeof data)[number]>({
    id: "h3-cells",
    data,
    getPolygon: (feature) => feature.geometry.coordinates,
    getFillColor: [50, 205, 164, 125],
    getLineColor: [116, 255, 215, 230],
    lineWidthMinPixels: 1,
    stroked: true,
    filled: true,
    pickable: true
  });

  return (
    <DeckGL
      layers={[layer]}
      controller
      initialViewState={{ longitude: 139.76, latitude: 35.68, zoom: 11, pitch: 35, bearing: -12 }}
      getTooltip={({ object }) => (object ? object.properties.cell : null)}
      onError={onFailure}
    />
  );
}
