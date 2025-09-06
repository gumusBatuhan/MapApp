// src/Components/Modals/CreateFeatureModal.tsx
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Modal from "../Common/Modal";
import type { FeatureDto } from "../../api/featureApi";
import GeometryFields from "../forms/GeometryFields";
import styles from "../../Styles/Modules/CreateFeature.module.css";
import { exampleCoords, ensureValidGeometry } from "../../utils/geometry";
import type { Geometry } from "../../utils/geometry";

import { msg } from "../../messages/Messages.tr";

const enumTypeOptions = [
  { value: 1, label: "Yol" },
  { value: 2, label: "Bina" },
] as const;

const NAME_MAX = 50;

export default function CreateFeatureModal({
  show,
  onClose,
  onCreate,                     // App.tsx bu callback'i çalıştırır ve toast'ı orada gösterir
  initialGeom,
  forcePointEnum = null,
}: {
  show: boolean;
  onClose: () => void;
  onCreate: (dto: FeatureDto) => Promise<{ ok: boolean; message?: string } | void>;
  initialGeom?: Geometry | null;
  /** Harita çiziminden gelen kısıt: 1=Yol, 2=Bina, null=serbest */
  forcePointEnum?: 1 | 2 | null;
}) {
  const [name, setName] = useState("");
  const [geomType, setGeomType] = useState<Geometry["type"]>("Point");
  const [coords, setCoords] = useState<string>(exampleCoords("Point"));
  const [enumType, setEnumType] = useState<number>(0); // Point için zorunlu; diğerlerinde 0
  const [saving, setSaving] = useState(false);

  // Alan bazlı hata mesajları (inline)
  const [nameErr, setNameErr] = useState<string | null>(null);
  const [enumErr, setEnumErr] = useState<string | null>(null);
  const [coordsErr, setCoordsErr] = useState<string | null>(null);

  const isLocked = !!initialGeom;
  const isPoint = geomType === "Point";

  // Modal açılışında/initialGeom değişiminde state'i hazırla
  useEffect(() => {
    if (show && initialGeom) {
      setGeomType(initialGeom.type);
      try {
        setCoords(JSON.stringify(initialGeom.coordinates));
      } catch {
        setCoords(
          Array.isArray((initialGeom as any).coordinates)
            ? JSON.stringify((initialGeom as any).coordinates)
            : ""
        );
      }
      if (initialGeom.type !== "Point") setEnumType(0);
      if (initialGeom.type === "Point" && (forcePointEnum === 1 || forcePointEnum === 2)) {
        setEnumType(forcePointEnum);
      }
    } else if (show && !initialGeom) {
      setCoords(exampleCoords(geomType));
      if (geomType !== "Point") setEnumType(0);
      if (geomType === "Point" && (forcePointEnum === 1 || forcePointEnum === 2)) {
        setEnumType(forcePointEnum);
      }
    }
    if (!show) {
      setNameErr(null);
      setEnumErr(null);
      setCoordsErr(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, initialGeom]);

  // Geometri tipi değişince koordinat örneğini ve enumType'ı güncelle
  useEffect(() => {
    if (!isLocked && show) {
      setCoords(exampleCoords(geomType));
      if (geomType !== "Point") setEnumType(0);
      if (geomType === "Point" && (forcePointEnum === 1 || forcePointEnum === 2)) {
        setEnumType(forcePointEnum);
      }
      setCoordsErr(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geomType, isLocked, show]);

  // Kısıt değişirse (ör. kullanıcı yeni bir çizim yaptı)
  useEffect(() => {
    if (show && isPoint && (forcePointEnum === 1 || forcePointEnum === 2)) {
      setEnumType(forcePointEnum);
      setEnumErr(null);
    }
  }, [forcePointEnum, isPoint, show]);

  // GeoJSON hatalarını TR'ye map'le (toast yok; sadece inline)
  function toTurkishGeometryError(e: any, gType: Geometry["type"]): string {
    if (e?.name === "SyntaxError") {
      return msg.validation.geom.jsonInvalid;
    }
    if (gType === "Point") return msg.validation.geom.pointInvalid;
    if (gType === "LineString") return msg.validation.geom.lineStringInvalid;
    if (gType === "Polygon") return msg.validation.geom.polygonInvalid;
    return msg.common.unexpected;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    // Hataları temizle
    setNameErr(null);
    setEnumErr(null);
    setCoordsErr(null);

    // FE doğrulama — İSİM
    const nameTrim = name.trim();
    if (!nameTrim) {
      setNameErr(msg.validation.nameRequired);
      return;
    }
    if (nameTrim.length > NAME_MAX) {
      setNameErr(msg.validation.nameMax(NAME_MAX));
      return;
    }

    // FE doğrulama — TÜR (Point ise)
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

    // FE doğrulama — KOORDİNATLAR
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

    // Sunucu işlemi — toast'lar App.tsx'te, burada yok
    setSaving(true);
    try {
      const geometry: Geometry = { type: geomType, coordinates: parsed };
      const dto: FeatureDto = {
        name: nameTrim,                // backend validasyonuyla uyumlu
        geom: geometry,
        enumType: isPoint ? enumType : 0,
      };

      const res = await onCreate(dto); // App.tsx burada toast gösterir
      const ok = (res as any)?.ok === true;

      if (ok) {
        // Başarılı → modalı kapat
        onClose();

        // (Opsiyonel) form reset — bir sonraki açılışa temiz gelsin
        setName("");
        if (!isLocked) {
          setCoords(exampleCoords(geomType));
          if (!isPoint) setEnumType(0);
        }
      }
    } catch (e: any) {
      // App.tsx hatayı toast ile gösterdi; burada tekrar etmiyoruz
      console.error(e?.response ?? e);
    } finally {
      setSaving(false);
    }
  };

  const lockHelp =
    forcePointEnum === 1
      ? "Bu konum LineString başlangıcına yakın; sadece 'Yol' pointi eklenebilir."
      : forcePointEnum === 2
      ? "Bu konum LineString bitişine yakın; sadece 'Bina' pointi eklenebilir."
      : null;

  return (
    <Modal
      show={show}
      title="Yeni Kayıt"
      onClose={onClose}
      size="lg"
      classes={{
        content: styles.modalContent,
        header: styles.modalHeader,
        title: styles.modalTitle,
        close: styles.modalClose,
      }}
    >
      {/* Native doğrulamayı kapatıyoruz; tüm mesajlar bizden */}
      <form className={`${styles.form} vstack gap-3`} onSubmit={submit} noValidate>
        <div className={styles.group}>
          <label className={styles.label}>Ad</label>
          <input
            className={`form-control ${styles.control} ${nameErr ? "is-invalid" : ""}`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameErr) setNameErr(null);
            }}
            placeholder="Örn: Test Feature"
            maxLength={NAME_MAX}
          />
        </div>
        {nameErr && <div className="invalid-feedback d-block">{nameErr}</div>}

        {/* Ortak geometri alanları */}
        <GeometryFields
          geomType={geomType}
          setGeomType={setGeomType}
          coords={coords}
          setCoords={(v) => {
            setCoords(v);
            if (coordsErr) setCoordsErr(null);
          }}
          isLocked={isLocked}
        />
        {coordsErr && <div className="invalid-feedback d-block">{coordsErr}</div>}

        {/* YALNIZCA Point için Tür seçimi */}
        {isPoint && (
          <div className={styles.group}>
            <label className={styles.label}>Tür</label>

            {forcePointEnum === 1 || forcePointEnum === 2 ? (
              <>
                <select className={`form-select ${styles.control}`} value={enumType} disabled>
                  <option value={forcePointEnum}>
                    {forcePointEnum === 1 ? "Yol" : "Bina"}
                  </option>
                </select>
                <small className="text-muted">{lockHelp}</small>
              </>
            ) : (
              <>
                <select
                  className={`form-select ${styles.control} ${enumErr ? "is-invalid" : ""}`}
                  value={enumType || ""}
                  onChange={(e) => {
                    setEnumType(Number(e.target.value));
                    if (enumErr) setEnumErr(null);
                  }}
                >
                  <option value="" disabled>
                    Seçiniz…
                  </option>
                  {enumTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {enumErr ? (
                  <div className="invalid-feedback d-block">{enumErr}</div>
                ) : (
                  <small className="text-muted">{msg.validation.enumRequired}</small>
                )}
              </>
            )}
          </div>
        )}

        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
            İptal
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
