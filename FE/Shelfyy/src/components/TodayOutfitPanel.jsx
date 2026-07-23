import { MaterialIcon } from "./MaterialIcon";
import { TODAY_OUTFIT_SLOTS } from "../const/todayOutfitData";

function SelectedSlot({ item, slot, onRemove }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/15 bg-white p-2 shadow-sm">
      <img
        alt={item.name}
        className="h-16 w-14 flex-none rounded-md bg-surface-container object-cover"
        src={item.image}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
          {slot.label}
        </p>
        <h4 className="mt-1 truncate text-sm font-extrabold text-primary">
          {item.name}
        </h4>
        <p className="mt-0.5 truncate text-xs text-on-surface-variant">
          {item.brand || "Khác"}
        </p>
      </div>
      <button
        aria-label={`Bỏ ${item.name} khỏi ${slot.label}`}
        className="flex h-8 w-8 flex-none items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-secondary"
        onClick={() => onRemove(slot.key)}
        type="button"
      >
        <MaterialIcon name="close" className="text-[18px]" />
      </button>
    </div>
  );
}

function EmptySlot({ slot }) {
  return (
    <div className="flex min-h-[82px] items-center gap-3 rounded-lg border border-dashed border-border-subtle bg-surface-container-low p-3">
      <div className="flex h-11 w-11 flex-none items-center justify-center rounded-md bg-white text-on-surface-variant">
        <MaterialIcon name={slot.icon} className="text-[20px]" />
      </div>
      <div>
        <p className="text-sm font-extrabold text-primary">{slot.label}</p>
        <p className="mt-0.5 text-xs text-on-surface-variant">{slot.hint}</p>
      </div>
    </div>
  );
}

export function TodayOutfitPanel({
  outfit,
  isSaving = false,
  onClear,
  onRemoveSlot,
  onSave,
}) {
  const selectedCount = Object.values(outfit).filter(Boolean).length;

  return (
    <aside className="rounded-lg border border-border-subtle bg-white p-5 shadow-sm shadow-primary/5 xl:sticky xl:top-24">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-secondary">
            Tự phối
          </p>
          <h2 className="mt-2 text-xl font-extrabold text-primary">
            Đồ mặc hôm nay
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Chọn món trong tủ rồi xác nhận bộ sẽ mặc trong ngày.
          </p>
        </div>
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-primary text-white">
          <MaterialIcon name="event_available" className="text-[22px]" />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {TODAY_OUTFIT_SLOTS.map((slot) => {
          const item = outfit[slot.key];
          return item ? (
            <SelectedSlot
              item={item}
              key={slot.key}
              onRemove={onRemoveSlot}
              slot={slot}
            />
          ) : (
            <EmptySlot key={slot.key} slot={slot} />
          );
        })}
      </div>

      <div className="mt-5 rounded-lg bg-surface-container-low p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-on-surface-variant">Đã chọn</span>
          <span className="font-extrabold text-primary">
            {selectedCount} / {TODAY_OUTFIT_SLOTS.length}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-secondary transition-all"
            style={{ width: `${(selectedCount / TODAY_OUTFIT_SLOTS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <button
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/15 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          disabled={selectedCount === 0 || isSaving}
          onClick={onSave}
          type="button"
        >
          <MaterialIcon name="save" className="text-[18px]" />
          {isSaving ? "Đang xác nhận..." : "Xác nhận mặc hôm nay"}
        </button>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-subtle bg-white px-4 py-3 text-sm font-bold text-on-surface-variant transition-colors hover:border-secondary hover:text-secondary disabled:cursor-not-allowed disabled:opacity-50"
          disabled={selectedCount === 0 || isSaving}
          onClick={onClear}
          type="button"
        >
          <MaterialIcon name="delete_sweep" className="text-[18px]" />
          Xóa lựa chọn
        </button>
      </div>
    </aside>
  );
}
