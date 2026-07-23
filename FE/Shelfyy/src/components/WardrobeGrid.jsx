import { MaterialIcon } from "./MaterialIcon";
import { statusOptionFor } from "../const/wardrobeItemPreferences";

const fallbackImage = "/image/wardrobe-tee.png";

const CATEGORY_TONES = {
  Áo: "border-sky-100 bg-sky-50 text-sky-700",
  Quần: "border-emerald-100 bg-emerald-50 text-emerald-700",
  Váy: "border-rose-100 bg-rose-50 text-rose-700",
  "Phụ kiện": "border-amber-100 bg-amber-50 text-amber-700",
};

function itemDetails(item) {
  const raw = item.raw || {};
  return [
    raw.size ? { icon: "straighten", value: raw.size } : null,
    raw.material ? { icon: "texture", value: raw.material } : null,
    raw.season ? { icon: "wb_sunny", value: raw.season } : null,
  ].filter(Boolean).slice(0, 3);
}

function WardrobeItemCard({
  isSelected = false,
  item,
  onOpenDetail,
  onSelectToday,
  onToggleFavorite,
}) {
  const raw = item.raw || {};
  const categoryTone = CATEGORY_TONES[item.category] || "border-border-subtle bg-surface-container text-primary";
  const details = itemDetails(item).slice(0, 2);
  const wearCount = Number(raw.wearCount || 0);
  const favorite = Boolean(item.favorite || raw.favorite);
  const status = statusOptionFor(item.itemStatus || raw.itemStatus);
  const colorHex = raw.colorHex && /^#[0-9a-f]{6}$/i.test(raw.colorHex)
    ? raw.colorHex
    : null;
  const openDetail = () => onOpenDetail(item);
  const handleCardKeyDown = (event) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail();
    }
  };
  const handleSelectTodayClick = (event) => {
    event.stopPropagation();
    onSelectToday(item);
  };
  const handleFavoriteClick = (event) => {
    event.stopPropagation();
    onToggleFavorite(item);
  };

  return (
    <article
      aria-label={`Xem chi tiết ${item.name}`}
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-white shadow-sm shadow-primary/5 outline-none transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 ${
        isSelected
          ? "border-secondary ring-2 ring-secondary/15"
          : "border-border-subtle hover:border-primary/20"
      }`}
      onClick={openDetail}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-container">
        <img
          alt={item.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          onError={(event) => {
            if (event.currentTarget.src.includes(fallbackImage)) return;
            event.currentTarget.src = fallbackImage;
          }}
          src={item.image}
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent opacity-80" />
        <span
          className={`absolute left-3 top-3 rounded-md border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide shadow-sm ${categoryTone}`}
        >
          {item.category}
        </span>
        <button
          aria-label={favorite ? `Bỏ yêu thích ${item.name}` : `Đánh dấu yêu thích ${item.name}`}
          aria-pressed={favorite}
          className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-md border border-white/70 bg-white/90 shadow-sm backdrop-blur transition-colors hover:text-secondary ${
            favorite ? "text-secondary" : "text-on-surface-variant"
          }`}
          onClick={handleFavoriteClick}
          type="button"
        >
          <MaterialIcon name="favorite" filled={favorite} className="text-[18px]" />
        </button>
        <span
          className={`absolute bottom-3 right-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide shadow-sm ${status.tone}`}
        >
          <MaterialIcon name={status.icon} className="text-[14px]" />
          <span className="truncate">{status.label}</span>
        </span>
        {isSelected && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
            <MaterialIcon name="check_circle" className="text-[14px]" />
            Đã chọn
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.16em] text-secondary">
              {item.brand}
            </p>
            <h4 className="mt-1 min-h-10 text-[15px] font-extrabold leading-5 text-primary">
              {item.name}
            </h4>
          </div>

          {colorHex && (
            <span
              aria-label={raw.color || "Màu trang phục"}
              className="mt-1 h-5 w-5 flex-none rounded-full border border-border-subtle shadow-inner"
              style={{ backgroundColor: colorHex }}
              title={raw.color || colorHex}
            />
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {details.length ? details.map((detail) => (
            <span
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-surface-container-low px-2 py-1 text-[11px] font-bold text-on-surface-variant"
              key={`${detail.icon}-${detail.value}`}
            >
              <MaterialIcon name={detail.icon} className="text-[14px]" />
              <span className="truncate">{detail.value}</span>
            </span>
          )) : (
            <span className="text-xs text-on-surface-variant">{item.meta}</span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border-subtle pt-3 text-xs text-on-surface-variant">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MaterialIcon name="laundry" className="text-[16px]" />
            <span className="truncate">{wearCount > 0 ? `Đã mặc ${wearCount} lần` : "Chưa mặc"}</span>
          </span>
          {raw.color && (
            <span className="max-w-20 truncate font-bold text-primary">
              {raw.color}
            </span>
          )}
        </div>

        <button
          className={`mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-extrabold transition-colors ${
            isSelected
              ? "bg-secondary text-white hover:bg-secondary/90"
              : "bg-primary text-white hover:bg-primary/90"
          }`}
          onClick={handleSelectTodayClick}
          type="button"
        >
          <MaterialIcon
            name={isSelected ? "check_circle" : "add_task"}
            className="text-[17px]"
          />
          {isSelected ? "Đã chọn hôm nay" : "Chọn hôm nay"}
        </button>
      </div>
    </article>
  );
}

export function WardrobeGrid({
  filters,
  isLoading = false,
  items,
  onAddClick,
  onFilterChange,
  onOpenItemDetail = () => {},
  onSearchChange,
  onSearchClear,
  onSearchSubmit,
  onSelectTodayItem = () => {},
  onToggleFavorite = () => {},
  selectedItemIds = [],
  searchTerm = "",
}) {
  const selectedIds = new Set(selectedItemIds);

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-5">
          {filters.map((filter) => (
            <button
              aria-pressed={filter.active}
              className={
                filter.active
                  ? "font-label-md text-primary border-b-2 border-primary pb-2"
                  : "font-label-md text-on-surface-variant hover:text-primary pb-2 transition-colors"
              }
              key={filter.label}
              onClick={() => onFilterChange(filter.label)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        <form
          className="flex w-full items-center gap-2 rounded-xl border border-border-subtle bg-white px-3 py-2 lg:max-w-sm"
          onSubmit={onSearchSubmit}
        >
          <MaterialIcon name="search" className="text-lg text-on-surface-variant" />
          <input
            aria-label="Tìm kiếm trong tủ đồ"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-on-surface-variant"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm theo tên, màu, thương hiệu..."
            type="search"
            value={searchTerm}
          />
          {searchTerm && (
            <button
              aria-label="Xóa tìm kiếm"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary"
              onClick={onSearchClear}
              type="button"
            >
              <MaterialIcon name="close" className="text-[18px]" />
            </button>
          )}
          <button
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
            type="submit"
          >
            Tìm
          </button>
        </form>
      </div>

      {isLoading ? (
        <div
          aria-busy="true"
          className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5"
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              className="aspect-[4/5] animate-pulse rounded-lg bg-surface-container"
              key={index}
            />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
          {items.map((item) => (
            <WardrobeItemCard
              isSelected={selectedIds.has(item.id)}
              item={item}
              key={item.id || item.name}
              onOpenDetail={onOpenItemDetail}
              onSelectToday={onSelectTodayItem}
              onToggleFavorite={onToggleFavorite}
            />
          ))}

          <button
            onClick={onAddClick}
            className="group flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border-subtle bg-white/70 p-6 text-on-surface-variant transition-all hover:-translate-y-1 hover:border-secondary hover:bg-white hover:text-secondary hover:shadow-lg hover:shadow-primary/5"
            type="button"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-surface-container transition-colors group-hover:bg-secondary-fixed">
              <MaterialIcon name="add_photo_alternate" />
            </div>
            <div className="text-center">
              <p className="text-sm font-extrabold text-primary">Thêm món đồ</p>
              <p className="mt-1 text-xs text-on-surface-variant">Upload ảnh và lưu metadata</p>
            </div>
          </button>
        </div>
      ) : null}

      {!isLoading && items.length === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-border-subtle bg-white p-10 text-center">
          <MaterialIcon name="checkroom" className="text-4xl text-on-surface-variant" />
          <h2 className="mt-3 text-lg font-bold text-primary">
            Chưa có món đồ phù hợp
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Thử đổi bộ lọc hoặc thêm món đồ đầu tiên vào tủ đồ của bạn.
          </p>
          <button
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white"
            onClick={onAddClick}
            type="button"
          >
            <MaterialIcon name="add" className="text-[18px]" />
            Thêm món đồ
          </button>
        </div>
      )}
    </section>
  );
}
