import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Modal from "../Common/Modal";
import type { FeatureDto } from "../../api/featureApi";
import GeometryFields from "../forms/GeometryFields";
import styles from "../../Styles/Modules/CreateFeature.module.css";
import { exampleCoords, ensureValidGeometry } from "../../utils/geometry";
import type { Geometry } from "../../utils/geometry";
import { msg } from "../../messages/Messages.tr";

// Point için seçenekler
const enumTypeOptions = [
  { value: 1, label: "Yol" },
  { value: 2, label: "Bina" },
] as const;

const NAME_MAX = 50;

export default function UpdateFeatureModal({
  show,
  onClose,
  item,
  onUpdate,
  // YENİ: Linestring başı/bitişi kısıtı
  forcePointEnum = null,
}: {
  show: boolean;
  onClose: () => void;
  item: FeatureDto | null;
  onUpdate: (
    uid: string,
    dto: { name: string; geom: Geometry; enumType: number }
  ) => Promise<{ message?: string } | void>;
  /** 1=Yol, 2=Bina, null=serbest */
  forcePointEnum?: 1 | 2 | null;
}) {
  const [name, setName] = useState("");
  const [geomType, setGeomType] = useState<Geometry["type"]>("Point");
  const [coords, setCoords] = useState<string>(exampleCoords("Point"));
  const [enumType, setEnumType] = useState<number>(0); // Point ise zorunlu
  const [saving, setSaving] = useState(false);

  // Alan bazlı hatalar
  const [nameErr, setNameErr] = useState<string | null>(null);
  const [enumErr, setEnumErr] = useState<string | null>(null);
  const [coordsErr, setCoordsErr] = useState<string | null>(null);
  const [uidErr, setUidErr] = useState<string | null>(null);

  const isPoint = geomType === "Point";

  useEffect(() => {
    if (show && item) {
      setName(item.name ?? "");
      const t = (item.geom?.type as Geometry["type"]) || "Point";
      setGeomType(t);
      try {
        setCoords(JSON.stringify(item.geom?.coordinates ?? ""));
      } catch {
        setCoords(exampleCoords(t));
      }
      setEnumType(item.enumType ?? 0);

      setNameErr(null); setEnumErr(null); setCoordsErr(null); setUidErr(null);
    }
    if (!show) {
      setNameErr(null); setEnumErr(null); setCoordsErr(null); setUidErr(null);
    }
  }, [show, item]);

  useEffect(() => {
    // Geometri tipi Point dışına çıkarsa enumType'ı 0 yap
    if (!isPoint) setEnumType(0);
    // Tür değiştiyse önceki koordinat hatasını temizle
    setCoordsErr(null);
  }, [geomType, isPoint]);

  // YENİ: Map'ten gelen kısıtı modala yansıt
  useEffect(() => {
    if (show && isPoint && (forcePointEnum === 1 || forcePointEnum === 2)) {
      setEnumType(forcePointEnum);
      setEnumErr(null);
    }
  }, [forcePointEnum, isPoint, show]);

  // GeoJSON hatalarını TR’ye map’le
  function toTurkishGeometryError(e: any, gType: Geometry["type"]): string {
    if (e?.name === "SyntaxError") return msg.validation.geom.jsonInvalid;
    if (gType === "Point") return msg.validation.geom.pointInvalid;
    if (gType === "LineString") return msg.validation.geom.lineStringInvalid;
    if (gType === "Polygon") return msg.validation.geom.polygonInvalid;
    return msg.common.unexpected;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    // temizle
    setNameErr(null); setEnumErr(null); setCoordsErr(null); setUidErr(null);

    if (!item?.uid) {
      setUidErr("Bu kayıt için UID bulunamadı.");
      return;
    }

    // İsim doğrulama
    const nameTrim = name.trim();
    if (!nameTrim) {
      setNameErr(msg.validation.nameRequired);
      return;
    }
    if (nameTrim.length > NAME_MAX) {
      setNameErr(msg.validation.nameMax(NAME_MAX));
      return;
    }

    // Tür doğrulama (Point)
    if (isPoint) {
      if (forcePointEnum === 1 || forcePointEnum === 2) {
        if (enumType !== forcePointEnum) {
          setEnumErr(msg.validation.onlyType(forcePointEnum === 1 ? "Yol" : "Bina"));
          return;
        }
      } else if (!enumType || enumType === 0) {
        setEnumErr(msg.validation.enumRequired);
        return;
      }
    }

    // Koordinatlar
    let parsed: any;
    try {
      parsed = JSON.parse(coords);
    } catch (jsonErr: any) {
      setCoordsErr(toTurkishGeometryError(jsonErr, geomType));
      return;
    }
    try {
      ensureValidGeometry(geomType, parsed);
    } catch (geoErr: any) {
      setCoordsErr(toTurkishGeometryError(geoErr, geomType));
      return;
    }

    // Sunucu
    setSaving(true);
    try {
      const dto = {
        name: nameTrim, // fallback yok
        geom: { type: geomType, coordinates: parsed } as Geometry,
        enumType: isPoint ? enumType : 0,
      };

      await onUpdate(item.uid, dto);

      // Başarılı → modalı kapat
      onClose();
    } catch (e: any) {
      // App.tsx zaten toast (error) gösteriyor; burada inline genel hata göstermiyoruz
      console.error(e?.response ?? e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show={show}
      title="Güncelle"
      onClose={onClose}
      size="lg"
      classes={{
        content: styles.modalContent,
        header: styles.modalHeader,
        title: styles.modalTitle,
        close: styles.modalClose,
      }}
    >
      <form className={`${styles.form} vstack gap-3`} onSubmit={submit} noValidate>
        {uidErr && <div className="invalid-feedback d-block">{uidErr}</div>}

        <div className={styles.group}>
          <label className={styles.label}>Ad</label>
          <input
            className={`form-control ${styles.control} ${nameErr ? "is-invalid" : ""}`}
            value={name}
            onChange={(e) => { setName(e.target.value); if (nameErr) setNameErr(null); }}
            placeholder="Örn: Güncellenmiş Ad"
            maxLength={NAME_MAX}
          />
          {nameErr && <div className="invalid-feedback d-block">{nameErr}</div>}
        </div>

        {/* Ortak geometri alanları */}
        <GeometryFields
          geomType={geomType}
          setGeomType={setGeomType}
          coords={coords}
          setCoords={(v) => { setCoords(v); if (coordsErr) setCoordsErr(null); }}
        />
        {coordsErr && <div className="invalid-feedback d-block">{coordsErr}</div>}

        {/* YALNIZCA Point için Tür seçimi */}
        {isPoint && (
          <div className={styles.group}>
            <label className={styles.label}>Tür</label>

            {(forcePointEnum === 1 || forcePointEnum === 2) ? (
              <>
                <select
                  className={`form-select ${styles.control}`}
                  value={enumType}
                  disabled
                >
                  <option value={forcePointEnum}>
                    {forcePointEnum === 1 ? "Yol" : "Bina"}
                  </option>
                </select>
                <small className="text-muted">
                  Bu nokta LineString {forcePointEnum === 1 ? "başlangıcına" : "bitişine"} yakın; tür değiştirilemez.
                </small>
              </>
            ) : (
              <>
                <select
                  className={`form-select ${styles.control} ${enumErr ? "is-invalid" : ""}`}
                  value={enumType || ""}
                  onChange={(e) => { setEnumType(Number(e.target.value)); if (enumErr) setEnumErr(null); }}
                >
                  <option value="" disabled>Seçiniz…</option>
                  {enumTypeOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {enumErr
                  ? <div className="invalid-feedback d-block">{enumErr}</div>
                  : <small className="text-muted">{msg.validation.enumRequired}</small>}
              </>
            )}
          </div>
        )}

        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
            İptal
          </button>
          <button type="submit" className="btn btn-warning" disabled={saving}>
            {saving ? "Güncelleniyor…" : "Güncelle"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
