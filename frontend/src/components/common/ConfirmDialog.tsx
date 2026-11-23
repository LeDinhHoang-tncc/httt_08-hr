import { useEffect, useRef } from "react";

import "./ConfirmDialog.css";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
  showCancel?: boolean; // false: chỉ còn 1 nút, dùng như hộp thông báo thay cho alert()
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Hộp xác nhận dùng chung, thay cho window.confirm() mặc định của trình duyệt.
 * - Esc hoặc bấm ra vùng tối bên ngoài: hủy
 * - Tự focus vào nút "Hủy" khi mở (nếu showCancel=false thì focus nút còn lại) (tránh bấm Enter nhầm vào hành động nguy hiểm)
 * - Tab chỉ xoay vòng giữa 2 nút trong hộp
 */
function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  variant = "default",
  showCancel = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Luôn giữ bản mới nhất của onCancel mà không làm effect bên dưới chạy lại
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    (cancelRef.current ?? confirmRef.current)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        onCancelRef.current();
        return;
      }

      if (event.key === "Tab") {
        const first = cancelRef.current ?? confirmRef.current;
        const last = confirmRef.current;

        if (!first || !last) return;

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, loading]);

  if (!open) return null;

  return (
    <div
      className="confirm-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      <div
        className={`confirm-box confirm-box--${variant}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmDialogTitle"
        aria-describedby="confirmDialogMessage"
      >
        <div className="confirm-icon" aria-hidden="true" />

        <h3 id="confirmDialogTitle">{title}</h3>
        <p id="confirmDialogMessage">{message}</p>

        <div className="confirm-actions">
          {showCancel && (
            <button
              ref={cancelRef}
              type="button"
              className="confirm-cancel"
              disabled={loading}
              onClick={onCancel}
            >
              {cancelText}
            </button>
          )}

          <button
            ref={confirmRef}
            type="button"
            className="confirm-ok"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Đang xử lý..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;