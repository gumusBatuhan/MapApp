import { useEffect, useMemo, useState } from "react";
import debounce from "lodash.debounce";
import Modal from "../Common/Modal";
import type { FeatureDto } from "../../api/featureApi";
import { enumTypeLabel } from "../../api/featureApi";
import styles from "../../Styles/Modules/FeatureList.module.css";

type GeomFilter = "ALL" | "Point" | "LineString" | "Polygon";

type Props = {
  show: boolean;
  onClose: () => void;
  items: FeatureDto[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onGoItem: (item: FeatureDto) => void;
  onEdit: (item: FeatureDto) => void;
  onDelete: (item: FeatureDto) => void;

  // Server-side pagination
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (nextPage: number) => void;

  // Server-side search (debounced)
  query: string;                 // kontrollü input için mevcut sorgu
  onSearch: (q: string) => void; // debounced olarak App.tsx'e bildir
};

export default function FeatureListModal({
  show,
  onClose,
  items,
  loading,
  error,
  onRefresh,
  onGoItem,
  onEdit,
  onDelete,
  page,
  pageSize,
  totalCount,
  onPageChange,
  query,
  onSearch,
}: Props) {
  // 🔎 Arama input'u (kontrollü + debounce)
  const [localQ, setLocalQ] = useState(query);
  useEffect(() => { setLocalQ(query); }, [query]);

  const debouncedSearch = useMemo(
    () => debounce((val: string) => onSearch(val), 400),
    [onSearch]
  );
  useEffect(() => {
    return () => { debouncedSearch.cancel(); };
  }, [debouncedSearch]);

  // Geometri filtresi (client-side, sadece gelen sayfa üzerinde)
  const [geomFilter, setGeomFilter] = useState<GeomFilter>("ALL");

  // Emniyet için A→Z (TR) sırala
  const collator = useMemo(
    () => new Intl.Collator("tr", { sensitivity: "base", numeric: true }),
    []
  );

  // Server-side arama sonuçlarına ek, client-side geometri filtresi
  const pageFiltered = useMemo(() => {
    return items.filter((it) => {
      if (geomFilter === "ALL") return true;
      return (it?.geom?.type as string | undefined) === geomFilter;
    });
  }, [items, geomFilter]);

  const sortedItems = useMemo(
    () => [...pageFiltered].sort((a, b) => collator.compare(a?.name || "", b?.name || "")),
    [pageFiltered, collator]
  );

  // Pagination göstergeleri (server-side)
  const totalPages = Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize)));
  const baseIndex = Math.max(0, (page - 1) * Math.max(1, pageSize));
  const showingFrom = totalCount === 0 || items.length === 0 ? 0 : baseIndex + 1;
  const showingTo = Math.min(baseIndex + items.length, totalCount);

  return (
    <Modal
      show={show}
      title="Feature Listesi"
      onClose={onClose}
      size="xl"
      classes={{
        content: styles.modalContent,
        header: styles.modalHeader,
        title: styles.modalTitle,
        close: styles.modalClose,
      }}
    >
      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      {/* Üst bar: arama (server-side, debounce) + geometri filtresi (client-side) + yenile */}
      <div className="d-flex flex-wrap gap-2 align-items-end mb-2">
        <div className="flex-grow-1">
          <label className="form-label mb-1">Ara</label>
          <input
            className="form-control form-control-sm"
            type="search"
            placeholder="Örn: İstanbul"
            value={localQ}
            onChange={(e) => {
              const val = e.target.value;
              setLocalQ(val);
              debouncedSearch(val); // ← server'da aramayı 400ms debounce ile tetikle
            }}
          />
        </div>

        <div style={{ minWidth: 220 }}>
          <label className="form-label mb-1">Geometri türü</label>
          <select
            className="form-select form-select-sm"
            value={geomFilter}
            onChange={(e) => setGeomFilter(e.target.value as GeomFilter)}
          >
            <option value="ALL">Hepsi</option>
            <option value="Point">Point</option>
            <option value="LineString">LineString</option>
            <option value="Polygon">Polygon</option>
          </select>
        </div>

        <div className="ms-auto d-flex align-items-end gap-2">
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={onRefresh}
            disabled={loading}
            title="Listeyi yenile"
          >
            {loading ? "Yenileniyor…" : "Yenile"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-secondary">Yükleniyor…</div>
      ) : sortedItems.length === 0 ? (
        <div className="text-secondary">Sonuç bulunamadı.</div>
      ) : (
        <>
          <div className={`table-responsive ${styles.tableWrap}`}>
            <table className={`table table-sm align-middle ${styles.table}`}>
              <thead className={styles.thead}>
                <tr>
                  <th className={styles.thId}><span className={styles.thLabel}>NO</span></th>
                  <th className={styles.thName}><span className={styles.thLabel}>AD</span></th>
                  <th className={styles.thType}><span className={styles.thLabel}>GEOMETRİ</span></th>
                  <th className={styles.thType}><span className={styles.thLabel}>POINT TÜRÜ</span></th>
                  <th style={{ width: 220, textAlign: "right" }}>
                    <span className={styles.thLabel}>İŞLEM</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((f, i) => (
                  <tr key={f.uid || `${f.name}-${baseIndex + i}`} className={styles.row}>
                    <td className={styles.idCell}>{baseIndex + i + 1}</td>
                    <td className={`${styles.nameCell} text-wrap`}>{f.name}</td>
                    <td className={styles.typeCell}>
                      <span className={styles.typePill}>{f.geom?.type ?? "—"}</span>
                    </td>
                    <td className={styles.typeCell}>
                      <span className={styles.typePill}>
                        {f.geom?.type === "Point" ? enumTypeLabel(f.enumType) : "—"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => { onGoItem(f); onClose(); }}
                          title="Haritada göster"
                        >
                          Git
                        </button>
                        <button
                          className="btn btn-outline-warning"
                          onClick={() => onEdit(f)}
                          title="Kaydı güncelle"
                        >
                          Güncelle
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => onDelete(f)}
                          title="Kaydı sil"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Alt bar: Sol altta toplam, ortada sayfalama */}
          <div className="position-relative mt-2" style={{ minHeight: 36 }}>
            <div className="position-absolute start-0 text-white small">
              {totalCount > 0
                ? `${showingFrom}–${showingTo} / ${totalCount} kayıt`
                : "0 kayıt"}
            </div>

            <div className="d-flex justify-content-center">
              <div className="btn-group">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                >
                  Önceki
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                >
                  Sonraki
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
