import type { InteractionHandle, InteractionCtx } from "./base";
import { toLonLat } from "ol/proj";
import type { FeatureLike } from "ol/Feature";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import {
  anchorForGeometry,
  safeLineStringVertexCount,
  safePolygonVertexCount,
} from "../geometryUtils";
import GeoJSON from "ol/format/GeoJSON";


/* 
  - Harita üzerinde tek tıklamayla feature seçimi etkileşimini oluşturur.
  - Singleclick olayında vurulan feature'ı bulur, geometriyi 4326'ya çevirir,
  - öznitelikleri ve hesaplanan bilgileri (vertex sayısı vb.) popup'a gönderir; uygun bir fit yapar.
*/
export function createSelect(ctx: InteractionCtx): InteractionHandle {
  let key: any = null;
  const geojson = new GeoJSON();

  // Tek tıklamada çalışır.
  // Pikseldeki feature'ı yakalar; yoksa popup'ı kapatır. Varsa, tür/ad/koordinat bilgilerini,
  // 4326 geometriyi ve konum/vertex bilgilerini üretip popup'a yollar; ardından view.fit ile yakınlaştırır.
  const onClick = (e: MapBrowserEvent<any>) => {
    let hitFeature: FeatureLike | undefined;

    ctx.map.forEachFeatureAtPixel(e.pixel, (f) => {
      hitFeature = f as any;
      return true;
    });

    if (!hitFeature) {
      ctx.onPopupData(null);
      return;
    }

    const g = (hitFeature as any).getGeometry?.();
    if (!g) {
      ctx.onPopupData(null);
      return;
    }

    const anchor = anchorForGeometry(g);
    const [lon, lat] = toLonLat(anchor as any);

    const type = g.getType?.() ?? "-";
    const pointEnumType = type === "Point" ? (hitFeature as any).get("enumType") ?? null : null;
    const vertices =
      type === "LineString"
        ? safeLineStringVertexCount(g)
        : type === "Polygon"
        ? safePolygonVertexCount(g)
        : undefined;

    const uid = (hitFeature as any).get("uid") ?? (hitFeature as any).getId?.() ?? null;
    const name = (hitFeature as any).get("name") ?? "-";

    // 4326 geometri
    const geom4326 = geojson.writeGeometryObject(g, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
      decimals: 6,
    });

    // Popup içeriği
    ctx.onPopupData({
      kind: "feature",
      uid,
      name,
      type,
      pointEnumType,
      vertices,
      lonlat: [lon, lat],
      anchor3857: anchor,
      item: {
        uid: uid ?? undefined,
        name,
        enumType: pointEnumType ?? 0,
        geom: geom4326 as any,
      },
    } as any);

    // Yumuşak zoom / kamera geçişi
    try {
      const view = ctx.map.getView();
      const extent = g.getExtent?.();
      if (Array.isArray(extent)) {
        view.fit(extent, {
          duration: 1500,
          padding: [24, 24, 24, 24],
          maxZoom: 16,
        });
      }
    } catch {
      
    }
  };

  return {
    // Etkileşimi etkinleştirir.
    // Singleclick dinleyicisini haritaya bağlar.
    activate() {
      if (!key) key = ctx.map.on("singleclick", onClick);
    },

    // Etkileşimi devre dışı bırakır.
    // Singleclick dinleyicisini kaldırır ve aktif popup'ı kapatır.
    deactivate() {
      if (key) {
        (key as any).target.un("singleclick", onClick);
        key = null;
      }
      ctx.onPopupData(null);
    },

    // Tam temizlik yapar.
    // Deactivate çağırarak tüm kaynakları serbest bırakır.
    dispose() {
      this.deactivate();
    },
  };
}
