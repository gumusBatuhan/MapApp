import Draw from "ol/interaction/Draw";
import GeoJSON from "ol/format/GeoJSON";
import Snap from "ol/interaction/Snap";
import Collection from "ol/Collection";
import LineString from "ol/geom/LineString";
import Polygon from "ol/geom/Polygon";
import type { Feature as OlFeature } from "ol";
import type { InteractionHandle, InteractionCtx, DrawGeomMode } from "./base";
import { NEAR_TOLERANCE_M } from "../config";


  // 3857 düzleminde iki nokta arasındaki karesel mesafeyi hesaplar.
  // Karesel mesafe, karekök maliyetinden kaçınarak yakınlık kıyaslamaları için kullanılır.
function dist2(a: [number, number], b: [number, number]) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

  // Yeni çizilecek Point için yakınlık kısıtını belirler.
  // Vektör kaynağındaki LineString’lerin başlangıç/bitiş noktalarına tolere mesafe içinde en yakın olanı bulur.
  // Başlangıca yakınsa 1, bitişe yakınsa 2, değilse null döndürür.

function computePointEnumRestriction(source: any, p3857: [number, number]): 1 | 2 | null {
  const tol2 = NEAR_TOLERANCE_M * NEAR_TOLERANCE_M;
  let which: 1 | 2 | null = null;
  let bestD2 = Number.POSITIVE_INFINITY;

  source.forEachFeature((f: OlFeature<any>) => {
    const g = f.getGeometry();
    if (!(g instanceof LineString)) return;
    const coords = g.getCoordinates();
    if (!coords?.length) return;

    const start = coords[0] as [number, number];
    const end = coords[coords.length - 1] as [number, number];

    const d2s = dist2(p3857, start);
    if (d2s <= tol2 && d2s < bestD2) {
      which = 1;
      bestD2 = d2s;
    }

    const d2e = dist2(p3857, end);
    if (d2e <= tol2 && d2e < bestD2) {
      which = 2;
      bestD2 = d2e;
    }
  });

  return which;
}


  // Çizim etkileşimi oluşturur ve yönetir (Point/LineString/Polygon).
  // Point modunda mevcut kayıttan “snap” hedefleri toplayıp kenar/verteks yakalamayı açar.
  // Çizim bittiğinde geometrinin GeoJSON’unu 4326’da üretir ve isteğe bağlı yakınlık kısıtını iletir.
export function createDraw(ctx: InteractionCtx, mode: DrawGeomMode): InteractionHandle {
  const draw = new Draw({
    source: ctx.vectorSource,
    type: mode,
  });

  // Point çizerken LineString/Polygon kenar & vertekslerine snap hedefleri
  const snapTargets = mode === "Point" ? new Collection<OlFeature<any>>() : null;

  // Snap hedeflerini kaynakla senkronlar.
  // Sadece kaydedilmiş ( _saved === true ) LineString/Polygon öğelerini hedef olarak tutar.
  const syncSnapTargets = () => {
    if (!snapTargets) return;
    while (snapTargets.getLength()) snapTargets.pop();
    ctx.vectorSource.forEachFeature((f: OlFeature<any>) => {
      const g = f.getGeometry?.();
      if ((g instanceof LineString || g instanceof Polygon) && f.get("_saved") === true) {
        snapTargets.push(f);
      }
    });
  };

  // Kaynağa öğe eklendiğinde snap hedeflerini yeniler.
  const onAdd = () => syncSnapTargets();

  // Kaynaktan öğe çıkarıldığında snap hedeflerini yeniler.
  const onRemove = () => syncSnapTargets();

  const snap =
    mode === "Point"
      ? new Snap({
          features: snapTargets!,
          pixelTolerance: 10,
          edge: true,
          vertex: true,
        })
      : null;

  const geojson = new GeoJSON();

  /* 
    - Çizim tamamlandığında çalışır.
    - Geometriyi 4326’da GeoJSON’a çevirir; Point ise yakınlık kısıtını hesaplar.
    - Çizim izini kaynaktan kaldırır ve üst bileşene sonucu bildirir.
  */
  const onEnd = (e: any) => {
    const feature = e.feature as OlFeature<any>;
    const geom = feature.getGeometry();
    if (!geom) return;

    // GeoJSON geometry’yi 4326 olarak çıkar
    const g = geojson.writeGeometryObject(geom, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
      decimals: 6,
    });

    let pointEnumRestriction: 1 | 2 | null = null;
    if (mode === "Point") {
      const p = (geom as any).getCoordinates() as [number, number];
      pointEnumRestriction = computePointEnumRestriction(ctx.vectorSource, p);
    }

    // Çizimi temizle (UI’da kalmasın)
    ctx.vectorSource.removeFeature(feature);

    ctx.onDrawComplete?.(g as any, mode, { pointEnumRestriction });
  };

  draw.on("drawend", onEnd);

  return {

    // Etkileşimi aktif eder.
    // Point modundaysa snap hedeflerini bağlar ve draw/snap etkileşimlerini haritaya ekler.
    activate() {
      if (snapTargets) {
        syncSnapTargets();
        ctx.vectorSource.on("addfeature", onAdd);
        ctx.vectorSource.on("removefeature", onRemove);
      }
      ctx.map.addInteraction(draw);
      if (snap) ctx.map.addInteraction(snap);
    },


    // Etkileşimi pasifleştirir.
    // Bağlı olayları çözer, snap hedeflerini boşaltır, draw/snap etkileşimlerini kaldırır.
    deactivate() {
      if (snap) { try { ctx.map.removeInteraction(snap); } catch {} }
      try { ctx.map.removeInteraction(draw); } catch {}
      if (snapTargets) {
        ctx.vectorSource.un("addfeature", onAdd);
        ctx.vectorSource.un("removefeature", onRemove);
        while (snapTargets.getLength()) snapTargets.pop();
      }
    },
 
    // - Kaynakları tamamen temizler.
    dispose() {
      this.deactivate();
      draw.un("drawend", onEnd);
    },
  };
}
