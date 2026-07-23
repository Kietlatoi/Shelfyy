import { useEffect, useRef } from "react";
import { LoadingButton } from "./LoadingButton";
import { MaterialIcon } from "./MaterialIcon";

export function WardrobeItemDeleteDialog({
  error = "",
  isDeleting = false,
  item,
  onCancel,
  onConfirm,
}) {
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isDeleting) onCancel();
    };

    const previousOverflow = document.body.style.overflow;
    if (previousOverflow !== "hidden") document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (previousOverflow !== "hidden") document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDeleting, onCancel]);

  return (
    <div
      aria-labelledby="wardrobe-delete-title"
      aria-modal="true"
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-lg border border-border-subtle bg-white p-5 shadow-2xl shadow-black/20">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-red-50 text-red-600">
            <MaterialIcon name="delete" size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-primary" id="wardrobe-delete-title">
              Xóa món đồ này?
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-on-surface-variant">
              <span className="font-extrabold text-primary">{item?.name || "Món đồ"}</span> sẽ bị xóa khỏi tủ đồ của bạn. Hành động này không thể hoàn tác từ giao diện hiện tại.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600" role="alert">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-lg border border-border-subtle px-4 py-2.5 text-sm font-bold text-on-surface-variant transition hover:border-primary hover:text-primary"
            disabled={isDeleting}
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button"
          >
            Hủy
          </button>
          <LoadingButton
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
            disabled={isDeleting}
            isLoading={isDeleting}
            onClick={onConfirm}
            type="button"
          >
            {isDeleting ? "Đang xóa..." : "Xóa món đồ"}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
