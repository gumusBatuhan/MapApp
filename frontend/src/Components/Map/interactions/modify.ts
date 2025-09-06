import Modify from "ol/interaction/Modify";
import Snap from "ol/interaction/Snap";
import Collection from "ol/Collection";
import WKT from "ol/format/WKT";
import GeoJSON from "ol/format/GeoJSON";
import LineString from "ol/geom/LineString";
import Polygon from "ol/geom/Polygon";
import Point from "ol/geom/Point";
import type { Feature as OlFeature } from "ol";
import type { InteractionHandle, InteractionCtx } from "./base";
import { anchorForGeometry, equals2D } from "../geometryUtils";
import { NEAR_TOLERANCE_M } from "../config";

type Ends = { start?: [number, number]; end?: [number, number] };

// karesel mesafe (EPSG:3857)
function dist2(a: [number, number], b: [number, number]) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

/**
 - LineString / Polygon vertex düzenleme:
 - Sadece _saved=true ve geometri tipi LineString/Polygon olanlar düzenlenir
 - Bitişte kural kontrolü:
 - BAŞLANGIÇ → yalnız enumType=1 Point'e yakın olabilir,
 - BİTİŞ     → yalnız enumType=2 Point'e yakın olabilir.
 - Aksi halde revert + "validation" popup.
 - Kural yoksa normal akış.
 */
export function createVertexEdit(ctx: InteractionCtx): InteractionHandle {
  const modifiable = new Collection<OlFeature>();

  // _saved=true olan LineString/Polygon feature'ları takip listesine alır
  const syncFeatures = () => {
    modifiable.clear();
    ctx.vectorSource.getFeatures().forEach((f: OlFeature) => {
      if (f.get("_saved") === true) {
        const g = f.getGeometry?.();
        if (g instanceof LineString || g instanceof Polygon) {
          modifiable.push(f);
        }
      }
    });
  };
  syncFeatures();

  // Kaynak değiştikçe koleksiyonu eşitle
  const onAdd = (e: any) => {
    const f = e.feature as OlFeature | undefined;
    if (!f) return;
    if (f.get("_saved") === true) {
      const g = f.getGeometry?.();
      if (g instanceof LineString || g instanceof Polygon) {
        modifiable.push(f);
      }
    }
  };
  const onRemove = (e: any) => {
    try { modifiable.remove(e.feature as any); } catch {}
  };

  const modify = new Modify({
    features: modifiable,
    pixelTolerance: 8,
    insertVertexCondition: () => false, // yeni vertex ekleme kapalı
    deleteCondition: () => false,       // vertex silme kapalı
  });

  const snap = new Snap({
    source: ctx.vectorSource,
    pixelTolerance: 10,
    edge: true,
    vertex: true,
  });

  const wkt = new WKT();
  const geojson = new GeoJSON();

  // Düzenleme başlamadan önce WKT ve uç (start/end) bilgilerini saklar (revert için)
  const preWktById = new Map<string | number, string>();
  const preEndsById = new Map<string | number, Ends>();

  // Mevcut geometriyi WKT olarak ve (LineString ise) uç koordinatlarını kayıt altına alır
  const onStart = (e: any) => {
    e.features.forEach((f: OlFeature) => {
      const id = (f.get("uid") ?? f.getId()) as string | number | undefined;
      const g = f.getGeometry?.();
      if (id == null || !g) return;

      preWktById.set(id, wkt.writeGeometry(g));

      if (g instanceof LineString) {
        const coords = g.getCoordinates();
        if (coords?.length >= 2) {
          preEndsById.set(id, {
            start: [coords[0][0], coords[0][1]],
            end: [coords[coords.length - 1][0], coords[coords.length - 1][1]],
          });
        }
      } else {
        preEndsById.delete(id);
      }
    });
  };

  // Yeni uç konumu, beklenen point türüyle çakışıyor mu? (NEAR_TOLERANCE_M)
  function hasConflictAt(coord3857: [number, number], expectedEnumType: 1 | 2): boolean {
    const tol2 = NEAR_TOLERANCE_M * NEAR_TOLERANCE_M;
    let conflict = false;
    ctx.vectorSource.forEachFeature((f) => {
      if (conflict) return;
      const g = (f as OlFeature).getGeometry?.();
      if (!(g instanceof Point)) return;

      const c = g.getCoordinates() as [number, number];
      if (dist2(c, coord3857) <= tol2) {
        const et = (f as any).get("enumType") ?? 0;
        // Beklenen tür dışındaki türler (0 hariç) çakışma sayılır
        if (et !== 0 && et !== expectedEnumType) conflict = true;
      }
    });
    return conflict;
  }

  // Kural ihlali varsa revert + validation popup; yoksa confirm-move popup üretir
  const onEnd = (e: any) => {
    // Genelde tek öge düzenlenir; yine de güvenli alalım
    const f = e.features?.item?.(0) as OlFeature | undefined;
    if (!f) return;

    const name = f.get("name") ?? "-";
    const uid = (f.get("uid") ?? f.getId() ?? "-") as string | number;
    const enumType = f.get("enumType") ?? 0;

    const g = f.getGeometry?.();
    if (!g) return;

    // KURAL KONTROLÜ: yalnız LineString uçları
    if (g instanceof LineString) {
      const coords = g.getCoordinates();
      if (coords?.length >= 2) {
        const startNew: [number, number] = [coords[0][0], coords[0][1]];
        const endNew: [number, number] = [coords[coords.length - 1][0], coords[coords.length - 1][1]];

        const ends = preEndsById.get(uid) || {};
        const startChanged = ends.start ? !equals2D(ends.start, startNew) : true;
        const endChanged = ends.end ? !equals2D(ends.end, endNew) : true;

        // Başlangıç değiştiyse: yakınında enumType=1 dışı point var mı?
        if (startChanged && hasConflictAt(startNew, 1)) {
          const oldWkt = preWktById.get(uid);
          if (oldWkt) f.setGeometry(wkt.readGeometry(oldWkt));

          const anchor = e.mapBrowserEvent?.coordinate ?? startNew;
          ctx.onPopupData({
            kind: "validation",
            anchor3857: anchor,
            message:
              "LineString başlangıcı yakındaki Point türüyle çakışıyor. Lütfen başka bir konum seçiniz.",
          } as any);

          preWktById.delete(uid);
          preEndsById.delete(uid);
          return; // confirm akışı yok
        }

        // Bitiş değiştiyse: yakınında enumType=2 dışı point var mı?
        if (endChanged && hasConflictAt(endNew, 2)) {
          const oldWkt = preWktById.get(uid);
          if (oldWkt) f.setGeometry(wkt.readGeometry(oldWkt));

          const anchor = e.mapBrowserEvent?.coordinate ?? endNew;
          ctx.onPopupData({
            kind: "validation",
            anchor3857: anchor,
            message:
              "LineString bitişi yakındaki Point türüyle çakışıyor. Lütfen başka bir konum seçiniz.",
          } as any);

          preWktById.delete(uid);
          preEndsById.delete(uid);
          return; // confirm akışı yok
        }
      }
    }

    // Kural ihlali yok > normal confirm akışı
    const geomGeoJson = geojson.writeGeometryObject(g, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
      decimals: 6,
    });

    const revert = () => {
      const oldWkt = preWktById.get(uid);
      if (!oldWkt) return;
      f.setGeometry(wkt.readGeometry(oldWkt));
    };

    const anchor =
      e.mapBrowserEvent?.coordinate ??
      (Array.isArray((g as any).getExtent?.()) ? anchorForGeometry(g as any) : undefined);

    ctx.onPopupData({
      kind: "confirm-move",
      name,
      anchor3857: anchor,
      payload: {
        uid,
        name,
        enumType,
        geomGeoJson,
        wkt: wkt.writeGeometry(g),
        revert,
      },
    } as any);

    // temizlik
    preWktById.delete(uid);
    preEndsById.delete(uid);
  };

  return {
    // Etkileşimi aktif eder (dinleyicileri ve Modify/Snap etkileşimlerini bağlar)
    activate() {
      ctx.vectorSource.on("addfeature", onAdd);
      ctx.vectorSource.on("removefeature", onRemove);

      ctx.map.addInteraction(modify);
      ctx.map.addInteraction(snap);

      modify.on("modifystart", onStart);
      modify.on("modifyend", onEnd);
    },

    // Etkileşimi pasifleştirir (dinleyicileri ve etkileşimleri kaldırır, geçici durumları temizler)
    deactivate() {
      modify.un("modifystart", onStart);
      modify.un("modifyend", onEnd);
      try { ctx.map.removeInteraction(modify); } catch {}
      try { ctx.map.removeInteraction(snap); } catch {}

      ctx.vectorSource.un("addfeature", onAdd);
      ctx.vectorSource.un("removefeature", onRemove);

      preWktById.clear();
      preEndsById.clear();
    },

    // Tam temizlik
    dispose() {
      this.deactivate();
    },
  };
}
