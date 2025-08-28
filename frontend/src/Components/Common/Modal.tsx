import type { ReactNode } from "react";

type ModalClasses = {
  root?: string;
  dialog?: string;
  content?: string;
  header?: string;
  title?: string;
  body?: string;
  footer?: string;
  close?: string;
};

export default function Modal({
  show,
  title,
  onClose,
  size = "lg",
  children,
  footer,
  classes,
}: {
  show: boolean;
  title: string;
  onClose: () => void;
  size?: "sm" | "lg" | "xl";
  children: ReactNode;
  footer?: ReactNode;
  classes?: ModalClasses;   // <<< her modal kendi class’ını geçebilir
}) {
  if (!show) return null;

  const sizeClass =
    size === "sm" ? "modal-sm" : size === "xl" ? "modal-xl" : "modal-lg";

  return (
    <div
      className={`modal fade show d-block ${classes?.root ?? ""}`}
      tabIndex={-1}
      role="dialog"
      style={{ backgroundColor: "rgba(0,0,0,.5)" }}
    >
      <div
        className={`modal-dialog ${sizeClass} modal-dialog-centered ${classes?.dialog ?? ""}`}
        role="document"
      >
        <div className={`modal-content ${classes?.content ?? ""}`}>
          <div className={`modal-header ${classes?.header ?? ""}`}>
            <h5 className={`modal-title m-0 ${classes?.title ?? ""}`}>{title}</h5>
            <button
              type="button"
              className={`btn-close ${classes?.close ?? ""}`}
              onClick={onClose}
            />
          </div>
          <div className={`modal-body ${classes?.body ?? ""}`}>{children}</div>
          {footer && (
            <div className={`modal-footer ${classes?.footer ?? ""}`}>{footer}</div>
          )}
        </div>
      </div>
    </div>
  );
}
