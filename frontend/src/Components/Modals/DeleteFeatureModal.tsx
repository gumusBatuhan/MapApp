import Modal from "../Common/Modal";
import type { FeatureDto } from "../../api/featureApi";
import modalStyles from "../../Styles/Modules/CreateFeature.module.css";   // başlık/çerçeve
import styles from "../../Styles/Modules/DeleteFeature.module.css";        // uyarı kutusu

export default function DeleteFeatureModal({ show, onClose, item, onConfirm, busy = false }:{
  show: boolean; onClose: () => void; item: FeatureDto | null; onConfirm: (uid: string) => Promise<void>; busy?: boolean;
}) {
  const name = item?.name ?? "(isimsiz)";

  return (
    <Modal
      show={show}
      title="Kaydı Sil"
      onClose={onClose}
      size="sm"
      classes={{
        content: modalStyles.modalContent,
        header: modalStyles.modalHeader,
        title: modalStyles.modalTitle,
        close: modalStyles.modalClose,
      }}
    >
      <div className={styles.warnBox} role="note" aria-live="polite">
        <div className={styles.warnIcon} aria-hidden="true">
          <i className="ti ti-alert-triangle" />
        </div>
        <div className={styles.warnBody}>
          <div className={styles.warnTitle}>Silme onayı</div>
          <div className={styles.warnText}>
            <span className={styles.entityName}>"{name}"</span> kaydını silmek üzeresiniz.
            <br /><strong>Bu işlem geri alınamaz.</strong>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-outline-secondary" onClick={onClose} disabled={busy} aria-disabled={busy} autoFocus>
          İptal
        </button>
        <button
          className="btn btn-danger"
          disabled={!item?.uid || busy}
          aria-disabled={!item?.uid || busy}
          onClick={async () => { if (!item?.uid || busy) return; await onConfirm(item.uid); }}
          title={item?.uid ? "Kaydı sil" : "UID bulunamadı"}
        >
          {busy ? "Siliniyor…" : "Sil"}
        </button>
      </div>
    </Modal>
  );
}
