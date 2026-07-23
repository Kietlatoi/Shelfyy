import { useEffect, useRef } from "react";
import { MaterialIcon } from "./MaterialIcon";
import { ITEM_STATUS_OPTIONS, statusOptionFor } from "../const/wardrobeItemPreferences";

const fallbackImage = "/image/wardrobe-tee.png";

const categoryLabels = {
  TOP: "Áo",
  OUTERWEAR: "Áo khoác",
  BOTTOM: "Quần",
  DRESS: "Váy",
  SHOES: "Giày",
  BAG: "Túi",
  ACCESSORY: "Phụ kiện",
  OTHER: "Khác",
};

function imageForItem(item) {
  return item?.imageUrl || item?.thumbnailUrl || item?.backgroundRemovedUrl || fallbackImage;
}

function categoryLabel(value) {
  const key = String(value || "").toUpperCase();
  return categoryLabels[key] || value || "Chưa phân loại";
}

function formatDateTime(value) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDate(value) {
  if (!value) return "Chưa có";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "Chưa có";
  const price = Number(value);
  if (Number.isNaN(price)) return "Chưa có";
  return `${price.toLocaleString("vi-VN")}đ`;
}

function tagsForItem(item) {
  if (Array.isArray(item?.tags)) return item.tags.filter(Boolean);
  return String(item?.tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-surface-container-low p-3">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white text-secondary">
        <MaterialIcon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</p>
        <p className="mt-1 break-words text-sm font-extrabold text-primary">{value || "Chưa có"}</p>
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="grid gap-3" aria-busy="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="h-[68px] animate-pulse rounded-lg bg-surface-container-low" key={index} />
      ))}
    </div>
  );
}

export function WardrobeItemDetailDrawer({
  error = "",
  isDeleting = false,
  isLoading = false,
  isSelectedToday = false,
  item,
  onClose,
  onDelete,
  onEdit,
  onSelectToday,
  onStatusChange = () => {},
  onToggleFavorite = () => {},
  showTodayAction = true,
}) {
  const closeButtonRef = useRef(null);
  const tags = tagsForItem(item);
  const favorite = Boolean(item?.favorite);
  const currentStatus = statusOptionFor(item?.itemStatus);
  const colorHex = item?.colorHex && /^#[0-9a-f]{6}$/i.test(item.colorHex) ? item.colorHex : null;

  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-black/45 backdrop-blur-sm" role="presentation">
      <button
        aria-label="Đóng chi tiết món đồ"
        className="hidden flex-1 cursor-default sm:block"
        onClick={onClose}
        type="button"
      />

      <aside
        aria-labelledby="wardrobe-detail-title"
        aria-modal="true"
        className="flex h-full w-full max-w-[560px] flex-col bg-white shadow-2xl shadow-black/20"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">Chi tiết món đồ</p>
            <h2 className="mt-1 truncate text-2xl font-extrabold text-primary" id="wardrobe-detail-title">
              {item.name || "Trang phục chưa đặt tên"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-on-surface-variant">
              {[item.brand || "Khác", categoryLabel(item.category)].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button
            aria-label="Đóng"
            className="flex h-10 w-10 flex-none items-center justify-center rounded-lg border border-border-subtle text-on-surface-variant transition hover:border-primary hover:text-primary"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <MaterialIcon name="close" size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-container-low">
            <div className="relative aspect-[4/5] max-h-[520px] bg-surface-container">
              <img
                alt={item.name || "Trang phục"}
                className="h-full w-full object-cover"
                src={imageForItem(item)}
              />
              {item.favorite && (
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-extrabold text-secondary shadow-sm">
                  <MaterialIcon name="favorite" filled size={16} />
                  Yêu thích
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600" role="alert">
              {error}
            </div>
          )}

          <section className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-primary px-4 py-3 text-white">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Số lần mặc</p>
              <p className="mt-1 text-2xl font-extrabold">{Number(item.wearCount || 0)}</p>
            </div>
            <div className="rounded-lg bg-secondary px-4 py-3 text-white">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Lần mặc gần nhất</p>
              <p className="mt-1 text-sm font-extrabold">{formatDateTime(item.lastWornAt)}</p>
            </div>
          </section>

          <section className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-primary">Trạng thái</h3>
              <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-extrabold ${currentStatus.tone}`}>
                <MaterialIcon name={currentStatus.icon} size={16} />
                {currentStatus.label}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {ITEM_STATUS_OPTIONS.map((option) => {
                const active = option.value === currentStatus.value;
                return (
                  <button
                    aria-pressed={active}
                    className={`rounded-lg border p-3 text-left transition ${
                      active
                        ? "border-primary bg-primary text-white"
                        : "border-border-subtle bg-white text-primary hover:border-primary"
                    }`}
                    disabled={isDeleting}
                    key={option.value}
                    onClick={() => onStatusChange(option.value)}
                    type="button"
                  >
                    <span className="flex items-center gap-2 text-sm font-extrabold">
                      <MaterialIcon name={option.icon} size={18} />
                      {option.label}
                    </span>
                    <span className={`mt-1 block text-xs font-semibold ${active ? "text-white/75" : "text-on-surface-variant"}`}>
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-5">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-primary">Thông tin cơ bản</h3>
            {isLoading ? (
              <div className="mt-3">
                <SkeletonRows />
              </div>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <DetailRow icon="category" label="Phân loại" value={categoryLabel(item.category)} />
                <DetailRow icon="checkroom" label="Loại phụ" value={item.subCategory} />
                <DetailRow icon="straighten" label="Size" value={item.size} />
                <DetailRow icon="texture" label="Chất liệu" value={item.material} />
                <DetailRow icon="wb_sunny" label="Mùa" value={item.season} />
                <DetailRow icon="line_style" label="Họa tiết" value={item.pattern} />
              </div>
            )}
          </section>

          <section className="mt-5">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-primary">Màu sắc</h3>
            <div className="mt-3 flex items-center gap-3 rounded-lg bg-surface-container-low p-3">
              <span
                aria-label={item.color || "Màu chưa có"}
                className="h-12 w-12 flex-none rounded-lg border border-border-subtle shadow-inner"
                style={{ backgroundColor: colorHex || "#ffffff" }}
              />
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-primary">{item.color || "Chưa có màu"}</p>
                <p className="mt-1 text-xs font-semibold text-on-surface-variant">{colorHex || "Chưa có mã màu"}</p>
              </div>
            </div>
          </section>

          <section className="mt-5">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-primary">Mua sắm</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <DetailRow icon="payments" label="Giá mua" value={formatPrice(item.purchasePrice)} />
              <DetailRow icon="event" label="Ngày mua" value={formatDate(item.purchaseDate)} />
            </div>
            {item.sourceUrl && (
              <a
                className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-sm font-bold text-primary transition hover:border-primary"
                href={item.sourceUrl}
                rel="noreferrer"
                target="_blank"
              >
                <MaterialIcon name="open_in_new" size={18} />
                <span className="truncate">Mở link nguồn</span>
              </a>
            )}
          </section>

          <section className="mt-5">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-primary">Tags</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.length ? tags.map((tag) => (
                <span
                  className="rounded-lg bg-secondary-fixed px-3 py-1.5 text-xs font-bold text-secondary"
                  key={tag}
                >
                  {tag}
                </span>
              )) : (
                <span className="text-sm font-semibold text-on-surface-variant">Chưa có tag</span>
              )}
            </div>
          </section>

          <section className="mt-5 grid gap-3 sm:grid-cols-2">
            <DetailRow icon="add_circle" label="Ngày thêm" value={formatDateTime(item.createdAt)} />
            <DetailRow icon="update" label="Cập nhật" value={formatDateTime(item.updatedAt)} />
          </section>
        </div>

        <footer className="grid gap-3 border-t border-border-subtle bg-white px-5 py-4">
          <div className="grid grid-cols-3 gap-3">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-subtle px-4 py-2.5 text-sm font-extrabold text-primary transition hover:border-primary"
              disabled={isDeleting}
              onClick={onEdit}
              type="button"
            >
              <MaterialIcon name="edit" size={18} />
              Sửa
            </button>
            <button
              aria-pressed={favorite}
              className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-extrabold transition ${
                favorite
                  ? "border-secondary bg-secondary-fixed text-secondary"
                  : "border-border-subtle text-primary hover:border-secondary hover:text-secondary"
              }`}
              disabled={isDeleting}
              onClick={onToggleFavorite}
              type="button"
            >
              <MaterialIcon name="favorite" filled={favorite} size={18} />
              {favorite ? "Đã thích" : "Thích"}
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-600 transition hover:border-red-300 hover:bg-red-100"
              disabled={isDeleting}
              onClick={onDelete}
              type="button"
            >
              <MaterialIcon name="delete" size={18} />
              Xóa
            </button>
          </div>
          {showTodayAction && (
            <button
              className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-extrabold transition ${
                isSelectedToday
                  ? "bg-secondary text-white hover:bg-secondary/90"
                  : "bg-primary text-white hover:bg-primary/90"
              }`}
              disabled={isDeleting}
              onClick={onSelectToday}
              type="button"
            >
              <MaterialIcon name={isSelectedToday ? "check_circle" : "add_task"} size={18} />
              {isSelectedToday ? "Đã chọn cho hôm nay" : "Chọn cho outfit hôm nay"}
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}
