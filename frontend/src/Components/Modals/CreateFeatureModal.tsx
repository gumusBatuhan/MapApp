import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Modal from "../Common/Modal";
import type { FeatureDto } from "../../api/featureApi";
import styles from "../../Styles/Modules/CreateFeature.module.css";

type Geometry = { type: "Point" | "LineString" | "Polygon"; coordinates: any };

const WtkExample = (t: "Point" | "LineString" | "Polygon") => {
  switch (t) {
    case "Point": return "[29.0, 41.0]";
    case "LineString": return "[[29.0,41.0],[29.1,41.05]]";
    case "Polygon": return "[[[29.0,41.0],[29.1,41.0],[29.1,41.1],[29.0,41.1],[29.0,41.0]]]";
  }
};

export default function CreateFeatureModal({
  show,
  onClose,
  onCreate,
  initialGeom, // haritadan gelen geometri varsa tür + koordinat kilitli
}: {
  show: boolean;
  onClose: () => void;
  onCreate: (dto: FeatureDto) => Promise<{ message?: string } | void>;
  initialGeom?: Geometry | null;
}) {
  const [name, setName] = useState("");
  const [geomType, setGeomType] = useState<"Point"|"LineString"|"Polygon">("Point");
  const [coords, setCoords] = useState<string>(WtkExample("Point"));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const isLocked = !!initialGeom; // haritadan geldiyse kilit

  useEffect(() => {
    if (show && initialGeom) {
      setGeomType(initialGeom.type);
      try { setCoords(JSON.stringify(initialGeom.coordinates)); }
      catch {
        setCoords(Array.isArray((initialGeom as any).coordinates) ? JSON.stringify((initialGeom as any).coordinates) : "");
      }
      if (!name) setName(`${initialGeom.type} feature`);
    } else if (show && !initialGeom) {
      setCoords(WtkExample(geomType));
      if (!name) setName(`${geomType} feature`);
    }
    if (!show) { setMsg(null); setErr(null); }
  }, [show, initialGeom]);

  useEffect(() => {
    if (!isLocked && show) setCoords(WtkExample(geomType));
  }, [geomType, isLocked, show]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null); setErr(null);
    try {
      const parsed = JSON.parse(coords);
      const geometry: any = geomType === "Point"
        ? { type: "Point", coordinates: parsed }
        : { type: geomType, coordinates: parsed };

      const dto: FeatureDto = { name: name || `${geomType} item`, geom: geometry };
      const res = await onCreate(dto);

      setMsg((res as any)?.message || "Kayıt eklendi.");
      setName("");
      if (!isLocked) setCoords(WtkExample(geomType));
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Kayıt eklenemedi.");
      console.error(e?.response ?? e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show={show}
      title="Yeni Kayıt"
      onClose={onClose}
      size="lg"
      classes={{
        content: styles.modalContent,
        header: styles.modalHeader,
        title: styles.modalTitle,   // << belirgin başlık (alt çizgi yok)
        close: styles.modalClose,
      }}
    >
      {msg && <div className="alert alert-success" role="alert">{msg}</div>}
      {err && <div className="alert alert-danger" role="alert">{err}</div>}

      <form className={`${styles.form} vstack gap-3`} onSubmit={submit}>
        <div className={styles.group}>
          <label className={styles.label}>Ad</label>
          <input
            className={`form-control ${styles.control} ${isLocked ? styles.locked : ""}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn: Test Feature"
          />
        </div>

        <div className={styles.group}>
          <label className={styles.label}>Geometri Türü</label>
          <select
            className={`form-select ${styles.control} ${styles.select} ${isLocked ? styles.locked : ""}`}
            value={geomType}
            onChange={(e) => setGeomType(e.target.value as any)}
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
            placeholder={WtkExample(geomType)}
          />
        </div>

        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>İptal</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
