import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import styles from "../../Styles/Modules/MapShell.module.css";
import MapToolbar from "./MapToolbar";
import MapPopup from "./MapPopup";
import "ol/ol.css";

import { useMapFacade } from "./useMapFacade";
import type { UiMode, Geometry, PopupContent, MovePayload } from "./types";
import type { FeatureDto } from "../../api/featureApi";

type Props = {
  onDrawComplete?: (
    geom: Geometry,
    mode: "Point" | "LineString" | "Polygon",
    ctx?: { pointEnumRestriction?: 1 | 2 | null }
  ) => void;
  onFeatureMoved?: (p: MovePayload) => Promise<boolean>;
  // Yeni: popup içinden doğrudan açılacak işlemler
  onOpenUpdateFromMap?: (item: FeatureDto) => void;
  onOpenDeleteFromMap?: (item: FeatureDto) => void;
};

export type MapHandle = {
  revealFeature: (item: FeatureDto) => void;
  reload: () => void;
  closePopups: () => void;
  getPointRestriction: (item: FeatureDto) => 1 | 2 | null;
};

const MapShell = forwardRef<MapHandle, Props>(function MapShell({ onDrawComplete, onFeatureMoved, onOpenUpdateFromMap, onOpenDeleteFromMap }, ref) {
  const [popupData, setPopupData] = useState<PopupContent>(null);
  const [uiMode, setUiMode] = useState<UiMode>("Select");
  const [moveBusy, setMoveBusy] = useState(false);

  const drawCbRef = useRef<
    ((geom: Geometry, mode: any, ctx?: { pointEnumRestriction?: 1 | 2 | null }) => void) | null
  >(null);
  useEffect(() => {
    drawCbRef.current = onDrawComplete ?? null;
  }, [onDrawComplete]);

  const movedCbRef = useRef<typeof onFeatureMoved | null>(null);
  useEffect(() => {
    movedCbRef.current = onFeatureMoved ?? null;
  }, [onFeatureMoved]);

  const {
    mapDivRef,
    popupElRef,
    revealFeature,
    reload,
    closePopups,
    clearAllFromMap,
    getPointRestriction,
  } = useMapFacade({
    uiMode,
    onPopupData: setPopupData,
    onDrawComplete: (g, m, ctx) => drawCbRef.current?.(g, m, ctx),
  });

  useImperativeHandle(ref, () => ({
    revealFeature: (item: FeatureDto) => revealFeature(item),
    reload: () => reload(),
    closePopups: () => closePopups(),
    getPointRestriction: (item: FeatureDto) => getPointRestriction(item),
  }));

  // Confirm Move
  const confirmMove = async (payload: MovePayload) => {
    if (!movedCbRef.current) return;
    setMoveBusy(true);
    try {
      const ok = await movedCbRef.current(payload);
      closePopups();
      setMoveBusy(false);
      return ok;
    } catch {
      setMoveBusy(false);
    }
  };

  const cancelMove = (payload: MovePayload) => {
    try {
      payload.revert();
    } catch {}
    closePopups();
  };

  // Popup'tan doğrudan güncelle/sil
const handleRequestEdit = (uid: string, item?: any) => {
    if (!uid) return; // uid'i okuyarak TS6133'ü çözüyoruz
    const dto = (item as FeatureDto) ?? null;
    if (dto && onOpenUpdateFromMap) onOpenUpdateFromMap(dto);
  };

  const handleRequestDelete = (uid: string, item?: any) => {
    if (!uid) return; // uid'i okuyarak TS6133'ü çözüyoruz
    const dto = (item as FeatureDto) ?? null;
    if (dto && onOpenDeleteFromMap) onOpenDeleteFromMap(dto);
  };

  return (
    <div className={`card ${styles.wrapper}`}>
      <MapToolbar
        uiMode={uiMode}
        onChangeMode={(m) => setUiMode(m)}
        onRefresh={() => reload()}
        onClear={() => clearAllFromMap()}
      />

      <div className="card-body p-0">
        <div className={styles.mapContainer}>
          <div ref={mapDivRef} className={styles.map} />

          <MapPopup
            ref={popupElRef}
            data={popupData}
            moveBusy={moveBusy}
            onClose={() => closePopups()}
            onConfirmMove={(p) => confirmMove(p)}
            onCancelMove={(p) => cancelMove(p)}
            onRequestEdit={handleRequestEdit}
            onRequestDelete={handleRequestDelete}
          />
        </div>
      </div>
    </div>
  );
});

export default MapShell;
