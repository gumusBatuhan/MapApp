// src/Components/Forms/GeometryFields.tsx
import { exampleCoords } from "../../utils/geometry";
import type { Geometry } from "../../utils/geometry";
import styles from "../../Styles/Modules/CreateFeature.module.css";

type Props = {
  geomType: Geometry["type"];
  setGeomType: (t: Geometry["type"]) => void;
  coords: string;
  setCoords: (v: string) => void;
  isLocked?: boolean;
};

export default function GeometryFields({
  geomType, setGeomType, coords, setCoords, isLocked = false,
}: Props) {
  return (
    <>
      <div className={styles.group}>
        <label className={styles.label}>Geometri Türü</label>
        <select
          className={`form-select ${styles.control} ${styles.select} ${isLocked ? styles.locked : ""}`}
          value={geomType}
          onChange={(e) => setGeomType(e.target.value as Geometry["type"])}
          disabled={isLocked}
        >
          <option>Point</option>
          <option>LineString</option>
          <option>Polygon</option>
        </select>
      </div>

      <div className={styles.group}>
        <label className={styles.label}>Koordinatlar</label>
        <textarea
          className={`form-control ${styles.control} ${styles.textarea} ${isLocked ? styles.locked : ""}`}
          rows={geomType === "Point" ? 2 : 4}
          value={coords}
          onChange={(e) => setCoords(e.target.value)}
          readOnly={isLocked}
          placeholder={exampleCoords(geomType)}
        />
      </div>
    </>
  );
}
