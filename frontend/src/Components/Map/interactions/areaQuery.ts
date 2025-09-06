
import Draw, { createBox } from "ol/interaction/Draw";
import { containsCoordinate, intersects } from "ol/extent";
import LineString from "ol/geom/LineString";
import Polygon from "ol/geom/Polygon";
import Point from "ol/geom/Point";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import type { InteractionHandle, InteractionCtx } from "./base";

/* Alan (kutu) çizerek vektör kaynaktaki geometri sayısını toplayan etkileşim yaratır. */

/* Etkileşim kurucu: geçici çizim katmanı ve draw etkileşimi kurar, etkinleştirme/temizleme yönetir. */
export function createAreaQuery(ctx: InteractionCtx): InteractionHandle {
  /* Geçici vektör kaynağı (yalnızca çizim skeci için) */
  const scratchSource = new VectorSource();

  /* Geçici vektör katmanı (haritaya eklenip/çıkarılır) */
  const scratchLayer = new VectorLayer({ source: scratchSource });

  /* Kutu (rectangle) çizimi için Draw; 'Circle' + createBox() hilesi ile alan seçimi */
  const draw = new Draw({
    source: scratchSource,
    type: "Circle",
    geometryFunction: createBox(),
  });

  /* Çizime başlarken: önceki skeci ve varsa popup verisini temizle */
  const onStart = () => {
    try {
      scratchSource.clear();
    } catch {}
    try {
      /* Mevcut popup verisini kapat/null'a çek */
      if (ctx.onPopupData) {
        ctx.onPopupData(null as any);
      }
    } catch {}
  };

  /* Çizim bittiğinde: extent al, geçici çizimi sil, kesişen geometri sayılarını hesapla ve popup gönder */
  const onEnd = (e: any) => {
    /* Çizilen geometrinin kendisi alınır */
    const geom = e.feature.getGeometry() as any;

    /* Geometrinin kapsama kutusu (extent) çıkarılır */
    const extent = geom.getExtent();

    /* Çizim skecini görünümden kaldır (temizlik) */
    try {
      scratchSource.removeFeature(e.feature);
      /* Alternatif temizlik: scratchSource.clear(); */
    } catch {}

    /* Tür bazında sayaçlar */
    let counts = { Point: 0, LineString: 0, Polygon: 0 };

    /* Haritadaki asıl vektör kaynağındaki tüm feature'ları dolaş */
    ctx.vectorSource.forEachFeature((f) => {
      const g = f.getGeometry();
      if (!g) return;

      /* Nokta: koordinat extent içinde mi? */
      if (g instanceof Point) {
        const c = g.getCoordinates() as [number, number];
        if (containsCoordinate(extent, c)) counts.Point += 1;

      /* Çizgi: extent'ler kesişiyor mu? */
      } else if (g instanceof LineString) {
        if (intersects(extent, g.getExtent())) counts.LineString += 1;

      /* Poligon: extent'ler kesişiyor mu? */
      } else if (g instanceof Polygon) {
        if (intersects(extent, g.getExtent())) counts.Polygon += 1;
      }
    });

    /* Sonuçları popup için bildir (toplam ve kutunun orta noktasına sabitle) */
    ctx.onPopupData({
      kind: "aggregate",
      counts,
      total: counts.Point + counts.LineString + counts.Polygon,
      anchor3857: [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2],
    } as any);
  };

  /* Çizim başlangıcı/bitişi olaylarını bağla */
  draw.on("drawstart", onStart);
  draw.on("drawend", onEnd);

  /* Etkileşim ömrü yönetimi (haritaya ekle/çıkar) */
  return {
    /* Etkinleştir: geçici katmanı ve draw etkileşimini haritaya ekle */
    activate() {
      ctx.map.addLayer(scratchLayer);
      ctx.map.addInteraction(draw);
    },

    /* Devre dışı bırak: etkileşimi/katmanı kaldır, geçici kaynak temizle */
    deactivate() {
      try {
        ctx.map.removeInteraction(draw);
      } catch {}
      try {
        scratchSource.clear();
        ctx.map.removeLayer(scratchLayer);
      } catch {}
    },

    /* Tamamen yok et: event bağlarını kopar ve devre dışı bırak */
    dispose() {
      this.deactivate();
      draw.un("drawstart", onStart);
      draw.un("drawend", onEnd);
    },
  };
}
