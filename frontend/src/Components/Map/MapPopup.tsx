import { forwardRef } from "react";
import styles from "../../Styles/Modules/MapShell.module.css";
import type { PopupContent, MovePayload } from "./types";
import { enumTypeLabel } from "../../api/featureApi";

type Props = {
  data: PopupContent;
  moveBusy?: boolean;
  onClose: () => void;
  onConfirmMove: (payload: MovePayload) => Promise<boolean | void> | boolean | void;
  onCancelMove: (payload: MovePayload) => void;
  // Popup içinden direkt işlemler
  onRequestEdit?: (uid: string, item?: any) => void;
  onRequestDelete?: (uid: string, item?: any) => void;
};

const MapPopup = forwardRef<HTMLDivElement, Props>(function MapPopup(
  { data, moveBusy = false, onClose, onConfirmMove, onCancelMove, onRequestEdit, onRequestDelete },
  ref
) {
  const title =
    data?.kind === "feature"
      ? (data as any)?.name ?? "-"
      : data?.kind === "confirm-move"
      ? "Konumu güncelle?"
      : data?.kind === "aggregate"
      ? "Alan Özeti"
      : data?.kind === "validation"
      ? "Uyarı"
      : "";

  return (
    <div
      ref={ref}
      className={styles.popup}
      data-map-ui="1"
      style={{ display: data ? "block" : "none" }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.popupHeader}>
        <div className={styles.popupTitle}>
          <h2>{title}</h2>
        </div>
        <button className={styles.popupClose} onClick={onClose} aria-label="Kapat">✕</button>
      </div>

      {/* Kural ihlali uyarısı */}
      {data?.kind === "validation" ? (
        <>
          <div className={styles.popupRow}>
            <div className={styles.popupValue} role="alert" aria-live="assertive">
              {(data as any).message ?? "Geçersiz konum. Lütfen başka bir konum seçiniz."}
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2 mt-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={onClose}>
              Kapat
            </button>
          </div>
        </>
      ) : data?.kind === "confirm-move" ? (
        <>
          <div className={styles.popupRow}>
            <div className={styles.popupValue}>
              <strong>{(data as any).name}</strong> konumunu güncellemek istediğinizden emin misiniz?
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-2">
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => onCancelMove((data as any).payload as MovePayload)}
              disabled={moveBusy}
            >
              İptal
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onConfirmMove((data as any).payload as MovePayload)}
              disabled={moveBusy}
            >
              {moveBusy ? "Güncelleniyor…" : "Güncelle"}
            </button>
          </div>
        </>
      ) : data?.kind === "feature" ? (
        <>
          <div className={styles.popupRow}>
            <div className={styles.popupLabel}><h3>Tür</h3></div>
            <br />
            <div className={styles.popupValue}>{(data as any)?.type ?? "-"}</div>
          </div>

          {(data as any)?.type === "Point" && (
            <div className={styles.popupRow}>
              <div className={styles.popupLabel}><h3>Point Türü</h3></div>
              <br />
              <div className={styles.popupValue}>{enumTypeLabel((data as any)?.pointEnumType)}</div>
            </div>
          )}

          {typeof (data as any)?.vertices === "number" && (
            <div className={styles.popupRow}>
              <div className={styles.popupLabel}><h3>Nokta sayısı</h3></div>
              <br />
              <div className={styles.popupValue}>{(data as any).vertices}</div>
            </div>
          )}

          <div className={styles.popupRow}>
            <div className={styles.popupLabel}><h3>Koordinatlar</h3></div>
            <br />
            <div className={styles.popupValue}>
              {Array.isArray((data as any)?.lonlat) && (data as any).lonlat!.length >= 2
                ? `${((data as any).lonlat![0] as number).toFixed(6)}, ${((data as any).lonlat![1] as number).toFixed(6)}`
                : "-"}
            </div>
          </div>

          {(data as any)?.uid && (
            <div className="d-flex justify-content-end gap-2 mt-2">
              <button
                className="btn btn-warning btn-sm"
                onClick={() => onRequestEdit?.((data as any).uid as string, (data as any).item)}
              >
                Güncelle
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => onRequestDelete?.((data as any).uid as string, (data as any).item)}
              >
                Sil
              </button>
            </div>
          )}
        </>
      ) : data?.kind === "aggregate" ? (
        <>
          <div className={styles.popupRow}>
            <div className={styles.popupLabel}><h3>Toplam</h3></div>
            <br />
            <div className={styles.popupValue}>{(data as any).total}</div>
          </div>
          <div className={styles.popupRow}>
            <div className={styles.popupLabel}><h3>Point</h3></div>
            <br />
            <div className={styles.popupValue}>{(data as any).counts.Point}</div>
          </div>
          <div className={styles.popupRow}>
            <div className={styles.popupLabel}><h3>LineString</h3></div>
            <br />
            <div className={styles.popupValue}>{(data as any).counts.LineString}</div>
          </div>
          <div className={styles.popupRow}>
            <div className={styles.popupLabel}><h3>Polygon</h3></div>
            <br />
            <div className={styles.popupValue}>{(data as any).counts.Polygon}</div>
          </div>
        </>
      ) : null}
    </div>
  );
});

export default MapPopup;
