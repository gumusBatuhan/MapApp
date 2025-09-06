import Translate from "ol/interaction/Translate";
import WKT from "ol/format/WKT";
import GeoJSON from "ol/format/GeoJSON";
import Snap from "ol/interaction/Snap";
import Collection from "ol/Collection";
import LineString from "ol/geom/LineString";
import Polygon from "ol/geom/Polygon";
import Point from "ol/geom/Point";
import type { Feature as OlFeature } from "ol";
import type { InteractionHandle, InteractionCtx } from "./base";
import { anchorForGeometry } from "../geometryUtils";
import { NEAR_TOLERANCE_M } from "../config";

/** 3857 karesel mesafe */
function dist2(a: [number, number], b: [number, number]) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

/** Modify.ts'teki ile aynı mantık: LS uçlarında yanlış türde Point varsa çakışma */
function hasConflictAt(source: any, coord3857: [number, number], expectedEnumType: 1 | 2): boolean {
  const tol2 = NEAR_TOLERANCE_M * NEAR_TOLERANCE_M;
  let conflict = false;
  source.forEachFeature((f: OlFeature<any>) => {
    if (conflict) return;
    const g = f.getGeometry?.();
    if (!(g instanceof Point)) return;

    const c = g.getCoordinates() as [number, number];
    if (dist2(c, coord3857) <= tol2) {
      const et = (f as any).get("enumType") ?? 0;
      if (et !== 0 && et !== expectedEnumType) conflict = true;
    }
  });
  return conflict;
}

/** YENİ: Point taşınırken, LS uçlarına yaklaşımda enumType uyumsuzluğu var mı? */
function pointVsLineEndsConflictMessage(
  source: any,
  p3857: [number, number],
  pointEnumType: number
): string | null {
  const tol2 = NEAR_TOLERANCE_M * NEAR_TOLERANCE_M;
  let bestMsg: string | null = null;
  let bestD2 = Number.POSITIVE_INFINITY;

  source.forEachFeature((f: OlFeature<any>) => {
    const g = f.getGeometry?.();
    if (!(g instanceof LineString)) return;

    const coords = g.getCoordinates();
    if (!coords?.length) return;

    const start = coords[0] as [number, number];
    const end = coords[coords.length - 1] as [number, number];

    const d2start = dist2(p3857, start);
    if (d2start <= tol2) {
      // LineString BAŞLANGIÇ → yalnız enumType=1 (Yol) kabul
      if (pointEnumType !== 1) {
        if (d2start < bestD2) {
          bestD2 = d2start;
          bestMsg =
            "Point türü yakındaki LineString türüyle çakışıyor. Lütfen başka bir konum seçiniz.";
        }
      }
    }

    const d2end = dist2(p3857, end);
    if (d2end <= tol2) {
      // LineString BİTİŞ → yalnız enumType=2 (Bina) kabul
      if (pointEnumType !== 2) {
        if (d2end < bestD2) {
          bestD2 = d2end;
          bestMsg =
            "Point türü yakındaki LineString türüyle çakışıyor. Lütfen başka bir konum seçiniz.";
        }
      }
    }
  });

  return bestMsg;
}

export function createTranslate(ctx: InteractionCtx): InteractionHandle {
  const translate = new Translate({
    layers: [ctx.vectorLayer],
    filter: (f) => f.get("_saved") === true, // sadece kayıtlı ögeler
  });

  // Point taşırken LS/Polygon kenar & vertekslerine snap
  const snapTargets = new Collection<OlFeature<any>>();
  const syncSnapTargets = () => {
    while (snapTargets.getLength()) snapTargets.pop();
    ctx.vectorSource.forEachFeature((f: OlFeature<any>) => {
      const g = f.getGeometry?.();
      if ((g instanceof LineString || g instanceof Polygon) && f.get("_saved") === true) {
        snapTargets.push(f);
      }
    });
  };
  const onAdd = () => syncSnapTargets();
  const onRemove = () => syncSnapTargets();

  const snap = new Snap({
    features: snapTargets,
    pixelTolerance: 10,
    edge: true,
    vertex: true,
  });
  snap.setActive(false); // yalnız Point taşırken aktif edeceğiz

  let preGeomWkt: string | null = null;
  const wkt = new WKT();
  const geojson = new GeoJSON();

  const onStart = (e: any) => {
    const f = e.features.item(0) as OlFeature<any>;
    if (!f) return;

    const g = f.getGeometry?.();
    if (g) preGeomWkt = wkt.writeGeometry(g);

    // sadece Point taşınıyorsa snap aktif
    if (g instanceof Point) snap.setActive(true);
    else snap.setActive(false);
  };

  const onEnd = (e: any) => {
    const f = e.features.item(0) as OlFeature<any>;
    if (!f) return;

    const name = f.get("name") ?? "-";
    const uid = f.get("uid") ?? f.getId() ?? "-";
    const enumType = f.get("enumType") ?? 0;

    const geom = f.getGeometry?.();
    if (!geom) return;

    // ——— YENİ: POINT taşınıyorsa LineString uç kuralını burada da uygula ———
    if (geom instanceof Point) {
      const p = geom.getCoordinates() as [number, number];
      const msg = pointVsLineEndsConflictMessage(ctx.vectorSource, p, enumType);
      if (msg) {
        // geri al + uyarı popup
        if (preGeomWkt) f.setGeometry(wkt.readGeometry(preGeomWkt));
        const anchor = e.mapBrowserEvent?.coordinate ?? p;
        ctx.onPopupData({
          kind: "validation",
          anchor3857: anchor,
          message: msg,
        } as any);

        snap.setActive(false);
        preGeomWkt = null;
        return;
      }
    }

    // ——— LineString taşınıyorsa: uçların yakınındaki yanlış türde Point var mı? ———
    if (geom instanceof LineString) {
      const coords = geom.getCoordinates();
      if (coords?.length >= 2) {
        const startNew: [number, number] = [coords[0][0], coords[0][1]];
        const endNew: [number, number]   = [coords[coords.length - 1][0], coords[coords.length - 1][1]];

        // Başlangıç yakınında enumType=1 dışı point var mı?
        if (hasConflictAt(ctx.vectorSource, startNew, 1)) {
          if (preGeomWkt) f.setGeometry(wkt.readGeometry(preGeomWkt));
          const anchor = e.mapBrowserEvent?.coordinate ?? startNew;
          ctx.onPopupData({
            kind: "validation",
            anchor3857: anchor,
            message:
              "LineString başlangıcı yakındaki Point türüyle çakışıyor. Lütfen başka bir konum seçiniz.",
          } as any);
          snap.setActive(false);
          preGeomWkt = null;
          return;
        }

        // Bitiş yakınında enumType=2 dışı point var mı?
        if (hasConflictAt(ctx.vectorSource, endNew, 2)) {
          if (preGeomWkt) f.setGeometry(wkt.readGeometry(preGeomWkt));
          const anchor = e.mapBrowserEvent?.coordinate ?? endNew;
          ctx.onPopupData({
            kind: "validation",
            anchor3857: anchor,
            message:
              "LineString bitişi yakındaki Point türüyle çakışıyor. Lütfen başka bir konum seçiniz.",
          } as any);
          snap.setActive(false);
          preGeomWkt = null;
          return;
        }
      }
    }

    // ——— kural ihlali yok → normal confirm akışı ———
    const geomGeoJson = geojson.writeGeometryObject(geom, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
      decimals: 6,
    });

    const currentWkt = wkt.writeGeometry(geom);
    const revert = () => {
      if (!preGeomWkt) return;
      const old = wkt.readGeometry(preGeomWkt);
      f.setGeometry(old);
    };

    const anchor = anchorForGeometry(geom as any);

    ctx.onPopupData({
      kind: "confirm-move",
      name,
      anchor3857: anchor,
      payload: { uid, name, enumType, geomGeoJson, wkt: currentWkt, revert },
    } as any);

    snap.setActive(false);
    preGeomWkt = null;
  };

  return {
    activate() {
      // snap hedeflerini hazırla + dinle
      syncSnapTargets();
      ctx.vectorSource.on("addfeature", onAdd);
      ctx.vectorSource.on("removefeature", onRemove);

      ctx.map.addInteraction(translate);
      ctx.map.addInteraction(snap);

      translate.on("translatestart", onStart);
      translate.on("translateend", onEnd);
    },
    deactivate() {
      translate.un("translatestart", onStart);
      translate.un("translateend", onEnd);

      try { ctx.map.removeInteraction(snap); } catch {}
      try { ctx.map.removeInteraction(translate); } catch {}

      ctx.vectorSource.un("addfeature", onAdd);
      ctx.vectorSource.un("removefeature", onRemove);

      while (snapTargets.getLength()) snapTargets.pop();
      preGeomWkt = null;
      snap.setActive(false);
    },
    dispose() {
      this.deactivate();
    },
  };
}
