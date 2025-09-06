import Map from "ol/Map";
import View from "ol/View";
import Overlay from "ol/Overlay";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import OSM from "ol/source/OSM";
import GeoJSON from "ol/format/GeoJSON";
import Point from "ol/geom/Point";
import LineString from "ol/geom/LineString";
import { fromLonLat, toLonLat } from "ol/proj";
import type { Geometry as OlGeometry } from "ol/geom";
import type Feature from "ol/Feature";


import { NEAR_TOLERANCE_M } from "./config";
import {
  safeLineStringVertexCount,
  safePolygonVertexCount,
  dist2,
  anchorForGeometry,
} from "./geometryUtils";

import { createSelect } from "./interactions/select";
import { createDraw } from "./interactions/draw";
import { createTranslate } from "./interactions/translate";
import { createAreaQuery } from "./interactions/areaQuery";
import { createVertexEdit } from "./interactions/modify";
import type {
  InteractionHandle,
  InteractionCtx,
  DrawGeomMode,
} from "./interactions/base";

import type { UiMode, PopupContent, Geometry } from "./types";
import type { FeatureDto } from "../../api/featureApi";
import type { FeatureApiDataSource } from "./FeatureApiDataSource";

type FacadeOptions = {
  target: HTMLElement;
  popupElement: HTMLElement;
  dataSource: FeatureApiDataSource;
  onPopupData?: (d: PopupContent) => void;
  onDrawComplete?: (
    geom: Geometry,
    mode: DrawGeomMode,
    ctx?: { pointEnumRestriction?: 1 | 2 | null }
  ) => void;
};

export class MapFacade {
  private _map!: Map;
  private _view!: View;
  private _baseLayer!: TileLayer<OSM>;
  private _vectorSource!: VectorSource<any>;
  private _vectorLayer!: VectorLayer<any>;
  private _overlay!: Overlay;

  private _overlayEl!: HTMLElement;
  private _dataSource!: FeatureApiDataSource;

  private _onPopupData?: (d: PopupContent) => void;
  private _onDrawComplete?: (
    geom: Geometry,
    mode: DrawGeomMode,
    ctx?: { pointEnumRestriction?: 1 | 2 | null }
  ) => void;

  private _currentHandle: InteractionHandle | null = null;

  private _geojson = new GeoJSON();

  constructor(opts: FacadeOptions) {
    this._overlayEl = opts.popupElement;
    this._dataSource = opts.dataSource;
    this._onPopupData = opts.onPopupData;
    this._onDrawComplete = opts.onDrawComplete;

    this._vectorSource = new VectorSource();
    this._vectorLayer = new VectorLayer({ source: this._vectorSource });
    this._baseLayer = new TileLayer({ source: new OSM() });

    // 🇹🇷 İlk açılış Türkiye odaklı
    this._view = new View({
      center: fromLonLat([35, 39]), // Türkiye ortalama merkezi (lon, lat)
      zoom: 6.5,
    });

    this._map = new Map({
      target: opts.target,
      layers: [this._baseLayer, this._vectorLayer],
      view: this._view,
    });

    this._overlay = new Overlay({
      element: this._overlayEl,
      positioning: "bottom-center",
      offset: [0, -8],
      stopEvent: true,
      autoPan: { animation: { duration: 200 } },
    });
    this._map.addOverlay(this._overlay);
  }

  private _ctx(): InteractionCtx {
    return {
      map: this._map,
      vectorLayer: this._vectorLayer,
      vectorSource: this._vectorSource,
      overlayEl: this._overlayEl,
      dataSource: this._dataSource,
      onPopupData: (d) => {
        const anyD: any = d as any;
        if (!d) {
          this._overlay.setPosition(undefined);
        } else if (anyD.anchor3857 && Array.isArray(anyD.anchor3857)) {
          this._overlay.setPosition(anyD.anchor3857);
        }
        this._onPopupData?.(d);
      },
      onDrawComplete: (g, m, ctx) => this._onDrawComplete?.(g, m, ctx),
    };
  }

  public setUiMode(mode: UiMode) {
    if (this._currentHandle) {
      this._currentHandle.deactivate();
      this._currentHandle.dispose();
      this._currentHandle = null;
    }

    const ctx = this._ctx();

    switch (mode) {
      case "Select":
        this._currentHandle = createSelect(ctx);
        break;
      case "DrawPoint":
        this._currentHandle = createDraw(ctx, "Point");
        break;
      case "DrawLine":
        this._currentHandle = createDraw(ctx, "LineString");
        break;
      case "DrawPolygon":
        this._currentHandle = createDraw(ctx, "Polygon");
        break;
      case "Move":
        this._currentHandle = createTranslate(ctx);
        break;
      case "AreaQuery":
        this._currentHandle = createAreaQuery(ctx);
        break;
      case "Edit":
        this._currentHandle = createVertexEdit(ctx);
        break;
      default:
        this._currentHandle = null;
        break;
    }

    this._currentHandle?.activate();
  }

  public async loadExisting() {
    this._vectorSource.clear();

    const data = await (this._dataSource as any).fetchAll?.();

    if (data && data.type === "FeatureCollection") {
      const features = this._geojson.readFeatures(data, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });
      features.forEach((f) => {
        f.set("_saved", true);
        this._vectorSource.addFeature(f);
      });
    } else if (Array.isArray(data)) {
      for (const dto of data as FeatureDto[]) {
        const feature = this._dtoToFeature(dto);
        feature.set("_saved", true);
        this._vectorSource.addFeature(feature);
      }
    }

    const extent = this._vectorSource.getExtent();
    if (extent && isFinite(extent[0]) && isFinite(extent[2])) {
      try {
        this._view.fit(extent, { duration: 300, padding: [24, 24, 24, 24], maxZoom: 6.2 });
      } catch {
        /* ignore */
      }
    }
  }

  public revealFeature(item: FeatureDto) {
    if (!item) return;

    const feature = this._dtoToFeature(item);
    const geom = feature.getGeometry();
    if (!geom) return;

    try {
      const ex = geom.getExtent();
      this._view.fit(ex, { duration: 1500, padding: [24, 24, 24, 24], maxZoom: 18 });
    } catch {}

    const anchor = anchorForGeometry(geom) as [number, number];
    const [lon, lat] = toLonLat(anchor);

    const type = geom.getType?.() ?? "-";
    const vertices =
      type === "LineString"
        ? safeLineStringVertexCount(geom as any)
        : type === "Polygon"
        ? safePolygonVertexCount(geom as any)
        : undefined;

    const pointEnumType = type === "Point" ? (item as any).enumType ?? null : null;

    const payload: PopupContent = {
      kind: "feature",
      uid: (item as any).uid ?? (item as any).id ?? null,
      name: (item as any).name ?? "-",
      type,
      pointEnumType,
      vertices,
      lonlat: [lon, lat],
      anchor3857: anchor,
      item,
    } as any;

    this._overlay.setPosition(anchor);
    this._onPopupData?.(payload);
  }

  public closePopups() {
    this._overlay.setPosition(undefined);
    this._onPopupData?.(null as any);
  }

  public clearAllFromMap() {
    this._vectorSource.clear();
    this.closePopups();
  }

  private _dtoToFeature(dto: FeatureDto): Feature<OlGeometry> {
    const featureObj = {
      type: "Feature",
      geometry: (dto as any).geom,
      properties: {
        uid: (dto as any).uid ?? (dto as any).id ?? undefined,
        name: (dto as any).name ?? "-",
        enumType: (dto as any).enumType ?? null,
        _saved: true,
      },
    };
    const f = this._geojson.readFeature(featureObj as any, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    }) as Feature<OlGeometry>;

    const uid = (dto as any).uid ?? (dto as any).id;
    if (uid != null) f.setId(uid);
    return f;
  }

  public getPointEnumRestrictionFor(item: FeatureDto): 1 | 2 | null {
    try {
      const geom = this._geojson.readGeometry((item as any).geom, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });
      if (!(geom instanceof Point)) return null;

      const p = geom.getCoordinates() as [number, number];
      const tol2 = NEAR_TOLERANCE_M * NEAR_TOLERANCE_M;

      let which: 1 | 2 | null = null;
      let bestD2 = Number.POSITIVE_INFINITY;

      this._vectorSource.forEachFeature((f) => {
        const g = (f as any).getGeometry?.();
        if (!(g instanceof LineString)) return;

        const coords = g.getCoordinates();
        if (!coords?.length) return;

        const start = coords[0] as [number, number];
        const end = coords[coords.length - 1] as [number, number];

        const d2s = dist2(p, start);
        if (d2s <= tol2 && d2s < bestD2) {
          which = 1;
          bestD2 = d2s;
        }

        const d2e = dist2(p, end);
        if (d2e <= tol2 && d2e < bestD2) {
          which = 2;
          bestD2 = d2e;
        }
      });

      return which;
    } catch {
      return null;
    }
  }

  public dispose() {
    try {
      this._currentHandle?.deactivate();
      this._currentHandle?.dispose();
      this._currentHandle = null;
    } catch {}
    try {
      this._map.removeOverlay(this._overlay);
    } catch {}
    try {
      this._vectorSource.clear();
    } catch {}
    try {
      this._map.setTarget(undefined as any);
    } catch {}
  }
}
