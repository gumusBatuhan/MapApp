import styles from "../../Styles/Modules/Footer.module.css";

const Icon = {
  GitHub: () => (
    <svg width="16" height="16"  onClick={() => window.open("https://github.com/gumusBatuhan", "_blank")} viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M12 2a10 10 0 00-3.16 19.49c.5.09.68-.22.68-.48v-1.69c-2.78.6-3.37-1.19-3.37-1.19-.45-1.13-1.1-1.43-1.1-1.43-.9-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.64-1.33-2.22-.25-4.55-1.11-4.55-4.95 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .85-.27 2.78 1.02a9.66 9.66 0 015.06 0c1.93-1.29 2.78-1.02 2.78-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.85-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .26.18.58.69.48A10 10 0 0012 2z"/>
    </svg>
  )
};

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.wrap}>
      <div className="container-fluid px-3 px-md-4">
        <div className={styles.inner}>
          <div className={styles.cols}>
            <div className={styles.colBrand}>
              <div className={styles.brandLine}>
                <span className={styles.mark} />
                <span className={styles.brand}>Başar Maps</span>
              </div>
              <p className={styles.muted}>
                React + OpenLayers ile geometri düzenleme ve .NET Web API ile kalıcı kayıt.
              </p>
            </div>
          </div>

          <div className={styles.legal}>
            <span>© {year} Başar Maps</span>
            <div className={styles.socials}>
              <a className={styles.socialBtn} href="#" aria-label="GitHub">
                <Icon.GitHub />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
