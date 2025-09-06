// src/Components/Map/types.ts
import type { Coordinate } from "ol/coordinate";
import type { FeatureDto } from "../../api/featureApi";

/** Çizim etkileşimi türleri (Draw) */
export type DrawKind = "None" | "Point" | "LineString" | "Polygon";

/** UI modu – yalnızca biri aktif olabilir */
export type UiMode = "Select" | "DrawPoint" | "DrawLine" | "DrawPolygon" | "AreaQuery" | "Move" | "Edit";

/** GeoJSON-uyumlu ayrıştırılmış geometri tipleri (discriminated union) */
export type PointGeom = {
  type: "Point";
  coordinates: [number, number]; // [lon, lat]
};

export type LineStringGeom = {
  type: "LineString";
  coordinates: [number, number][]; // [[lon, lat], ...]
};

export type PolygonGeom = {
  type: "Polygon";
  coordinates: [number, number][][]; // [[[lon, lat], ...], ...]
};

/** Uygulamada kullanılan geometri birleşimi */
export type Geometry = PointGeom | LineStringGeom | PolygonGeom;

/** Bazı yerlerde "Geometry" fallback’ı metin olarak gösteriliyor */
export type GeometryType = Geometry["type"] | "Geometry";

/** Move onayı için payload */
export type MovePayload = {
  uid: string;
  name: string;
  enumType: number;
  geomGeoJson: any;
  wkt: string;
  revert: () => void;
};

/** Popup içeriği */
export type PopupContent =
  | {
      kind: "feature";
      name?: string;
      type?: GeometryType;
      lonlat?: Coordinate | null;
      /** Yalnızca LineString/Polygon için doldurulur */
      vertices?: number;
      /** Yalnızca Point için; 1=Yol, 2=Bina */
      pointEnumType?: number;
    }
  | {
      kind: "aggregate";
      counts: { Point: number; LineString: number; Polygon: number };
      total: number;
    }
  | {
      kind: "confirm-move";
      name: string;
      payload: MovePayload;
    }
  |
    {
      kind: "validation";
      message: string;
      anchor3857?: [number, number];
    } | null;

/** Veri kaynağı sözleşmesi (backend’den feature listesi getirir) */
export interface IFeatureDataSource {
  fetchAll(): Promise<FeatureDto[]>;
}

/** Küçük yardımcı type guard'lar (opsiyonel ama faydalı) */
export const isPoint = (g: Geometry): g is PointGeom => g.type === "Point";
export const isLineString = (g: Geometry): g is LineStringGeom => g.type === "LineString";
export const isPolygon = (g: Geometry): g is PolygonGeom => g.type === "Polygon";
