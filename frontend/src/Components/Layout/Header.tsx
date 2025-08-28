import type { FC } from "react";
import styles from "../../Styles/Modules/Header.module.css";

export type HeaderProps = {
  onOpenList: () => void;
  onOpenCreate: () => void;
  brand?: string;
};

const Icon = {
  List: () => (<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z"/></svg>),
  Plus: () => (<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z"/></svg>),
};

const Header: FC<HeaderProps> = ({ onOpenList, onOpenCreate, brand = "Başar Maps" }) => {
  return (
    <header className={styles.wrap}>
      {/* Kenar pad’leri SIFIR */}
      <div className="container-fluid px-0">
        <div className={styles.inner}>
          <a href="#" className={styles.brand} aria-label={brand}>
            <span className={styles.mark} />
            <span className={styles.brandText}>{brand}</span>
          </a>

          <div className={styles.spacer} />

          <div className={styles.actions}>
            <button className="btn btn-ghost btn-sm" onClick={onOpenList}>
              <Icon.List /><span className={styles.btnText}>Feature Listesi</span>
            </button>
            <button className="btn btn-primary btn-sm" onClick={onOpenCreate}>
              <Icon.Plus /><span className={styles.btnText}>Yeni Kayıt</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
