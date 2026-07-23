import { MaterialIcon } from "./MaterialIcon";

const CATEGORY_LABELS = {
  TOP: "Áo",
  OUTERWEAR: "Áo khoác",
  BOTTOM: "Quần",
  DRESS: "Váy",
  SHOES: "Giày",
  BAG: "Túi",
  ACCESSORY: "Phụ kiện",
  OTHER: "Khác",
};

function numberLabel(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

function categoryLabel(value) {
  if (!value) return "-";
  return CATEGORY_LABELS[String(value).toUpperCase()] || value;
}

function storageLabel(stats) {
  const used = stats?.storageUsed ?? stats?.totalItems ?? 0;
  const limit = stats?.storageLimit;
  if (limit == null) return `${numberLabel(used)} / -`;
  if (limit < 0) return `${numberLabel(used)} / không giới hạn`;
  return `${numberLabel(used)} / ${numberLabel(limit)}`;
}

export function WardrobeSummary({ stats, visibleCount, onUploadClick }) {
  const totalItems = stats?.totalItems ?? visibleCount ?? 0;
  const storagePercent = Math.max(0, Math.min(100, Number(stats?.storagePercent || 0)));
  const summaryCards = [
    {
      label: "Tổng món đồ",
      value: numberLabel(totalItems),
      detail: `${numberLabel(visibleCount)} đang hiển thị`,
      icon: "checkroom",
      accent: "bg-primary",
      iconTone: "bg-primary text-white",
    },
    {
      label: "Dung lượng",
      value: storageLabel(stats),
      detail: `${storagePercent}% đã dùng`,
      icon: "inventory_2",
      progress: storagePercent,
      accent: "bg-secondary",
      iconTone: "bg-secondary text-white",
    },
    {
      label: "Lâu chưa mặc",
      value: numberLabel(stats?.forgottenCount || 0),
      detail: "Trên 30 ngày",
      icon: "history",
      accent: "bg-amber-500",
      iconTone: "bg-amber-50 text-amber-700",
    },
    {
      label: "Danh mục nhiều nhất",
      value: categoryLabel(stats?.mostWornCategory),
      detail: "Theo số món đồ",
      icon: "category",
      accent: "bg-emerald-500",
      iconTone: "bg-emerald-50 text-emerald-700",
    },
  ];

  return (
    <section className="mb-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">
            Tủ đồ cá nhân
          </p>
          <h1 className="mt-2 font-headline-lg text-headline-lg text-primary">
            Tủ đồ của tôi
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Quản lý quần áo, phụ kiện và dữ liệu dùng cho gợi ý outfit.
          </p>
        </div>

        <button
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white shadow-sm shadow-primary/10 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/15"
          onClick={onUploadClick}
          type="button"
        >
          <MaterialIcon name="add_photo_alternate" className="text-[20px]" />
          Thêm món đồ
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article
            className="group relative overflow-hidden rounded-lg border border-border-subtle bg-white p-5 shadow-sm shadow-primary/5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/10"
            key={card.label}
          >
            <div className={`absolute inset-x-0 top-0 h-1 ${card.accent}`} />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {card.label}
                </p>
                <p className="mt-3 truncate text-2xl font-extrabold text-primary">
                  {card.value}
                </p>
              </div>
              <div className={`flex h-11 w-11 flex-none items-center justify-center rounded-lg ${card.iconTone}`}>
                <MaterialIcon name={card.icon} className="text-[20px]" />
              </div>
            </div>
            <p className="mt-3 text-xs font-medium text-on-surface-variant">{card.detail}</p>
            {card.progress != null && (
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-container">
                <div
                  className="h-full rounded-full bg-secondary transition-all"
                  style={{ width: `${card.progress}%` }}
                />
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
