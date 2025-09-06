import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type Kind = "success" | "error" | "warning" | "info";
type Toast = { id: number; kind: Kind; title?: string; message: string; duration: number };

type Ctx = {
  show: (message: string, kind?: Kind, opts?: { title?: string; duration?: number }) => void;
  success: (m: string, opts?: { title?: string; duration?: number }) => void;
  error:   (m: string, opts?: { title?: string; duration?: number }) => void;
  warning: (m: string, opts?: { title?: string; duration?: number }) => void;
  info:    (m: string, opts?: { title?: string; duration?: number }) => void;
};

const NotifyCtx = createContext<Ctx | null>(null);

export const useNotify = () => {
  const ctx = useContext(NotifyCtx);
  if (!ctx) throw new Error("useNotify must be used within <NotifyProvider>");
  return ctx;
};

export default function NotifyProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);

  const remove = useCallback((id: number) => {
    setToasts((xs) => xs.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<Ctx["show"]>((message, kind = "info", opts) => {
    const id = idRef.current++;
    const t: Toast = {
      id,
      kind,
      message,
      title: opts?.title,
      duration: opts?.duration ?? 2200,
    };
    setToasts((xs) => [t, ...xs]);
    window.setTimeout(() => remove(id), t.duration);
  }, [remove]);

  const api: Ctx = useMemo(() => ({
    show,
    success: (m, o) => show(m, "success", o),
    error:   (m, o) => show(m, "error",   o),
    warning: (m, o) => show(m, "warning", o),
    info:    (m, o) => show(m, "info",    o),
  }), [show]);

  return (
    <NotifyCtx.Provider value={api}>
      {children}

      {/* Tabler/Bootstrap toast container — sol üst, istersen konumu değiştir */}
      <div
        className="position-fixed top-0 start-0 p-3"
        style={{ zIndex: 2050, pointerEvents: "none" }}
        aria-live="polite" aria-atomic="true"
      >
        <div className="toast-container">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="toast show mb-2 shadow"
              role="alert" aria-live="assertive" aria-atomic="true"
              style={{ minWidth: 280, pointerEvents: "auto", background: "rgba(20,24,44,.98)" }}
            >
              <div className="toast-header" style={{ background: "transparent", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                <span className={`badge me-2 ${badgeClass(t.kind)}`}>&nbsp;</span>
                <strong className="me-auto" style={{ color: "#fff" }}>
                  {t.title ?? titleFor(t.kind)}
                </strong>
                <button type="button" className="btn-close" aria-label="Kapat"
                        onClick={() => remove(t.id)} />
              </div>
              <div className="toast-body text-white" style={{ whiteSpace: "pre-line" }}>
                {t.message}
              </div>
            </div>
          ))}
        </div>
      </div>
    </NotifyCtx.Provider>
  );
}

function titleFor(k: Kind) {
  return k === "success" ? "Başarılı"
       : k === "error"   ? "Hata"
       : k === "warning" ? "Uyarı"
       : "Bilgi";
}

function badgeClass(k: Kind) {
  return k === "success" ? "bg-success"
       : k === "error"   ? "bg-danger"
       : k === "warning" ? "bg-warning"
       : "Bilgi";
}
