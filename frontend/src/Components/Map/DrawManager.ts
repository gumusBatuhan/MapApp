import Draw from "ol/interaction/Draw";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import type Map from "ol/Map";
import type { DrawKind, Geometry } from "./types";

export class DrawManager {
  private draw: Draw | null = null;
  private map: Map;
  private source: VectorSource;
  private onDrawComplete?: (geom: Geometry, mode: DrawKind) => void;

  constructor(map: Map, source: VectorSource, onDrawComplete?: (geom: Geometry, mode: DrawKind) => void) {
    this.map = map;
    this.source = source;
    this.onDrawComplete = onDrawComplete;
  }

  /** Etkileşimi kaldır */
  clear() {
    if (this.draw) {
      this.map.removeInteraction(this.draw);
      this.draw = null;
    }
  }

  setMode(mode: DrawKind) {
    this.clear();
    if (mode === "None") return;

    const draw = new Draw({ source: this.source, type: mode as Exclude<DrawKind, "None"> });
    draw.on("drawend", (evt) => {
      evt.feature.set("_saved", false);

      const clone = evt.feature.clone();
      clone.getGeometry()?.transform("EPSG:3857", "EPSG:4326");
      const format = new GeoJSON();
      const geom = format.writeGeometryObject(clone.getGeometry()!) as Geometry;

      this.onDrawComplete?.(geom, mode);
    });

    this.map.addInteraction(draw);
    this.draw = draw;
  }
}
