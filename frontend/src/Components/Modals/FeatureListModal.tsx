import Modal from "../Common/Modal";
import type { FeatureDto } from "../../api/featureApi";
import styles from "../../Styles/Modules/FeatureList.module.css";

export default function FeatureListModal({
  show,
  onClose,
  items,
  loading,
  error,
  onRefresh,
  onGoItem,                 // <<< yeni prop
}: {
  show: boolean;
  onClose: () => void;
  items: FeatureDto[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onGoItem: (item: FeatureDto) => void;  // <<< yeni prop
}) {
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

      <div className="d-flex justify-content-end mb-2">
        <button className="btn btn-outline-secondary btn-sm" onClick={onRefresh}>Yenile</button>
      </div>

      {loading ? (
        <div className="text-secondary">Yükleniyor…</div>
      ) : items.length === 0 ? (
        <div className="text-secondary">Henüz kayıt yok.</div>
      ) : (
        <div className={`table-responsive ${styles.tableWrap}`}>
          <table className={`table table-sm align-middle ${styles.table}`}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.thId}><span className={styles.thLabel}>ID</span></th>
                <th className={styles.thName}><span className={styles.thLabel}>AD</span></th>
                <th className={styles.thType}><span className={styles.thLabel}>TÜR</span></th>
                <th style={{ width: 80, textAlign: "right" }}><span className={styles.thLabel}>GİT</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((f, i) => (
                <tr key={i} className={styles.row}>
                  <td className={styles.idCell}>{i + 1}</td>
                  <td className={`${styles.nameCell} text-wrap`}>{f.name}</td>
                  <td className={styles.typeCell}>
                    <span className={styles.typePill}>
                      {f.geom?.type ?? "—"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => { onGoItem(f); onClose(); }}
                      title="Haritada göster"
                    >
                      Git
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
