import styles from "../../Styles/Modules/MapShell.module.css";
import Icon from "../Common/Icon"; // dikkat: Map/ -> Common/ için ../
import type { UiMode } from "./types";

type Props = {
  uiMode: UiMode;
  onChangeMode: (m: UiMode) => void;
  onRefresh: () => void;
  onClear: () => void;
};

export default function MapToolbar({
  uiMode,
  onChangeMode,
  onRefresh,
  onClear,
}: Props) {
  return (
    <div
      className={styles.toolsBar}
      data-map-ui="1"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.groupBox}>
        <button
          type="button"
          className={`${styles.tool} ${uiMode === "Select" ? styles.toolActive : ""}`}
          onClick={() => onChangeMode("Select")}
          title="Seçim"
        >
          <Icon name="select" className={styles.toolIcon} /> Gez
        </button>

        <button
          type="button"
          className={`${styles.tool} ${uiMode === "DrawPoint" ? styles.toolActive : ""}`}
          onClick={() => onChangeMode("DrawPoint")}
          title="Point çiz"
        >
          <Icon name="point" className={styles.toolIcon} /> Point
        </button>

        <button
          type="button"
          className={`${styles.tool} ${uiMode === "DrawLine" ? styles.toolActive : ""}`}
          onClick={() => onChangeMode("DrawLine")}
          title="LineString çiz"
        >
          <Icon name="line" className={styles.toolIcon} /> Line
        </button>

        <button
          type="button"
          className={`${styles.tool} ${uiMode === "DrawPolygon" ? styles.toolActive : ""}`}
          onClick={() => onChangeMode("DrawPolygon")}
          title="Polygon çiz"
        >
          <Icon name="polygon" className={styles.toolIcon} /> Polygon
        </button>

        <span className={styles.split} />

        <button
          type="button"
          className={`${styles.tool} ${uiMode === "Move" ? styles.toolActive : ""}`}
          onClick={() => onChangeMode("Move")}
          title="Kayıtlı ögeyi sürükleyerek taşı"
        >
          <Icon name="move" className={styles.toolIcon} /> Taşı
        </button>

        <button
          type="button"
          className={`${styles.tool} ${uiMode === "Edit" ? styles.toolActive : ""}`}
          onClick={() => onChangeMode("Edit")}
          title="Vertex düzenle (noktayı sürükle)"
        >
          <Icon name="line" className={styles.toolIcon} /> Düzenle
        </button>

        <button
          type="button"
          className={`${styles.tool} ${uiMode === "AreaQuery" ? styles.toolActive : ""}`}
          onClick={() => onChangeMode("AreaQuery")}
          title="Dikdörtgen çiz ve içindekileri say"
        >
          <Icon name="select" className={styles.toolIcon} /> Alan Sorgu
        </button>

        <span className={styles.split} />

        <button
          type="button"
          className={`${styles.tool} ${styles.toolWarn}`}
          onClick={onRefresh}
          title="Veriyi yenile"
        >
          <Icon name="refresh" className={styles.toolIcon} /> Yenile
        </button>

        <button
          type="button"
          className={`${styles.tool} ${styles.toolDanger}`}
          onClick={onClear}
          title="Haritadaki tüm görsel verileri temizle"
        >
          <Icon name="clear" className={styles.toolIcon} /> Temizle
        </button>
      </div>
    </div>
  );
}
