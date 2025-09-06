import { useEffect, useRef } from "react";
import { MapFacade } from "./MapFacade";
import { FeatureApiDataSource } from "./FeatureApiDataSource";
import type { UiMode, Geometry, PopupContent } from "./types";
import type { FeatureDto } from "../../api/featureApi";

type DrawGeomMode = "Point" | "LineString" | "Polygon";

type Args = {
  uiMode: UiMode;
  onPopupData: (d: PopupContent) => void;
  onDrawComplete?: (
    geom: Geometry,
    mode: DrawGeomMode,
    ctx?: { pointEnumRestriction?: 1 | 2 | null }
  ) => void;
  /** Mevcut veri sağlayıcı anahtarları */
  providerKey?: "ef" | "ado";
};

// sadece geçerli çizim modları
function isDrawGeomMode(m: unknown): m is DrawGeomMode {
  return m === "Point" || m === "LineString" || m === "Polygon";
}

export function useMapFacade({
  uiMode,
  onPopupData,
  onDrawComplete,
  providerKey = "ef",
}: Args) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const popupElRef = useRef<HTMLDivElement | null>(null);
  const facadeRef = useRef<MapFacade | null>(null);

  // Callback’leri ref’e bağla (render’da referans değişse bile kurulum yeniden yapılmaz)
  const popupCbRef = useRef(onPopupData);
  useEffect(() => { popupCbRef.current = onPopupData; }, [onPopupData]);

  const drawCbRef = useRef<typeof onDrawComplete | null>(onDrawComplete ?? null);
  useEffect(() => { drawCbRef.current = onDrawComplete ?? null; }, [onDrawComplete]);

  // Kurulum / yıkım — yalnızca providerKey değişirse yeniden kur
  useEffect(() => {
    if (!mapDivRef.current || !popupElRef.current) return;

    const facade = new MapFacade({
      target: mapDivRef.current,
      popupElement: popupElRef.current,
      dataSource: new FeatureApiDataSource(providerKey),
      onPopupData: (d) => popupCbRef.current(d),
      onDrawComplete: (g, m, ctx) => {
        const cb = drawCbRef.current;
        if (cb && isDrawGeomMode(m)) cb(g, m, ctx);
      },
    });
    facadeRef.current = facade;

    void facade.loadExisting();

    return () => {
      facade.dispose();
      facadeRef.current = null;
    };
  }, [providerKey]); // buradan onPopupData/onDrawComplete kaldırıldı

  // UiMode değişimini doğrudan MapFacade’e ilet
  useEffect(() => {
    facadeRef.current?.setUiMode(uiMode);
  }, [uiMode]);

  // Dış API
  const revealFeature = (item: FeatureDto) => facadeRef.current?.revealFeature(item);
  const reload = () => facadeRef.current?.loadExisting();
  const closePopups = () => facadeRef.current?.closePopups();
  const clearAllFromMap = () => facadeRef.current?.clearAllFromMap();
  const getPointRestriction = (item: FeatureDto) =>
    facadeRef.current?.getPointEnumRestrictionFor(item) ?? null;

  return {
    mapDivRef,
    popupElRef,
    revealFeature,
    reload,
    closePopups,
    clearAllFromMap,
    getPointRestriction,
  };
}
