import type Map from "ol/Map";
import type VectorSource from "ol/source/Vector";
import type VectorLayer from "ol/layer/Vector";
import type { PopupContent, Geometry } from "../types";
import type { FeatureApiDataSource } from "../FeatureApiDataSource";

export type DrawGeomMode = "Point" | "LineString" | "Polygon";

export type InteractionCtx = {
  map: Map;
  vectorLayer: VectorLayer<any>;
  vectorSource: VectorSource<any>;
  overlayEl: HTMLElement;
  dataSource: FeatureApiDataSource;
  onPopupData: (d: PopupContent) => void;
  onDrawComplete?: (
    geom: Geometry,
    mode: DrawGeomMode,
    ctx?: { pointEnumRestriction?: 1 | 2 | null }
  ) => void;
};

export interface InteractionHandle {
  activate(): void;
  deactivate(): void;
  dispose(): void;
}
