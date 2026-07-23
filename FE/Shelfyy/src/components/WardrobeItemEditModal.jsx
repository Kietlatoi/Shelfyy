import { useEffect, useMemo, useRef, useState } from "react";
import { LoadingButton } from "./LoadingButton";
import { MaterialIcon } from "./MaterialIcon";

const fallbackImage = "/image/wardrobe-tee.png";

const categoryOptions = [
  { value: "TOP", label: "Áo" },
  { value: "OUTERWEAR", label: "Áo khoác" },
  { value: "BOTTOM", label: "Quần" },
  { value: "DRESS", label: "Váy / Đầm" },
  { value: "SHOES", label: "Giày" },
  { value: "BAG", label: "Túi" },
  { value: "ACCESSORY", label: "Phụ kiện" },
  { value: "OTHER", label: "Khác" },
];

const seasonOptions = ["", "Xuân - Hè", "Thu - Đông", "Bốn mùa"];

function imageForItem(item) {
  return item?.imageUrl || item?.thumbnailUrl || item?.backgroundRemovedUrl || fallbackImage;
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function cleanText(value) {
  const text = String(value || "").trim();
  return text || null;
}

function formFromItem(item) {
  return {
    name: item?.name || "",
    brand: item?.brand || "",
    category: item?.category || "OTHER",
    subCategory: item?.subCategory || "",
    color: item?.color || "",
    colorHex: /^#[0-9a-f]{6}$/i.test(item?.colorHex || "") ? item.colorHex : "#ffffff",
    season: item?.season || "",
    pattern: item?.pattern || "",
    size: item?.size || "",
    material: item?.material || "",
    tags: Array.isArray(item?.tags) ? item.tags.join(", ") : String(item?.tags || ""),
    purchasePrice: item?.purchasePrice ?? "",
    purchaseDate: item?.purchaseDate || "",
    sourceUrl: item?.sourceUrl || "",
  };
}

function payloadFromForm(form, item) {
  const payload = {
    name: form.name.trim(),
    brand: cleanText(form.brand),
    category: form.category,
    subCategory: cleanText(form.subCategory),
    color: cleanText(form.color),
    colorHex: form.colorHex || null,
    season: cleanText(form.season),
    pattern: cleanText(form.pattern),
    size: cleanText(form.size),
    material: cleanText(form.material),
    tags: form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 20),
    purchasePrice: form.purchasePrice === "" ? null : Number(form.purchasePrice),
    purchaseDate: form.purchaseDate || null,
    sourceUrl: cleanText(form.sourceUrl),
  };

  if (isHttpUrl(item?.imageUrl)) payload.imageUrl = item.imageUrl;
  if (isHttpUrl(item?.thumbnailUrl)) payload.thumbnailUrl = item.thumbnailUrl;
  if (isHttpUrl(item?.backgroundRemovedUrl)) payload.backgroundRemovedUrl = item.backgroundRemovedUrl;

  return payload;
}

function Field({ children, label }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}

export function WardrobeItemEditModal({ item, onClose, onSubmit }) {
  const closeButtonRef = useRef(null);
  const [form, setForm] = useState(() => formFromItem(item));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const preview = useMemo(() => imageForItem(item), [item]);

  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };

    const previousOverflow = document.body.style.overflow;
    if (previousOverflow !== "hidden") document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (previousOverflow !== "hidden") document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, onClose]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Tên món đồ không được để trống.");
      return;
    }

    if (form.purchasePrice !== "" && Number.isNaN(Number(form.purchasePrice))) {
      setError("Giá mua phải là số hợp lệ.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(payloadFromForm(form, item));
      onClose();
    } catch (err) {
      setError(err.message || "Không cập nhật được món đồ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      aria-labelledby="wardrobe-edit-title"
      aria-modal="true"
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-lg border border-border-subtle bg-white shadow-2xl shadow-black/20">
        <header className="flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">Chỉnh sửa</p>
            <h2 className="mt-1 text-2xl font-extrabold text-primary" id="wardrobe-edit-title">
              Sửa thông tin món đồ
            </h2>
          </div>
          <button
            aria-label="Đóng"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-subtle text-on-surface-variant transition hover:border-primary hover:text-primary"
            disabled={isSubmitting}
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <MaterialIcon name="close" size={20} />
          </button>
        </header>

        <form className="flex-1 overflow-y-auto px-5 py-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
            <div>
              <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-container">
                <img
                  alt={item?.name || "Trang phục"}
                  className="aspect-[4/5] w-full object-cover"
                  src={preview}
                />
              </div>
              <p className="mt-3 text-xs font-semibold text-on-surface-variant">
                Sửa metadata trước. Đổi ảnh sẽ làm ở bước riêng để tránh upload lại ngoài ý muốn.
              </p>
            </div>

            <div className="grid gap-4">
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600" role="alert">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tên món đồ">
                  <input
                    className="rounded-lg border border-border-subtle px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    disabled={isSubmitting}
                    name="name"
                    onChange={handleChange}
                    required
                    value={form.name}
                  />
                </Field>
                <Field label="Thương hiệu">
                  <input
                    className="rounded-lg border border-border-subtle px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    disabled={isSubmitting}
                    name="brand"
                    onChange={handleChange}
                    value={form.brand}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phân loại">
                  <select
                    className="rounded-lg border border-border-subtle px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    disabled={isSubmitting}
                    name="category"
                    onChange={handleChange}
                    value={form.category}
                  >
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Loại phụ">
                  <input
                    className="rounded-lg border border-border-subtle px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    disabled={isSubmitting}
                    name="subCategory"
                    onChange={handleChange}
                    placeholder="VD: Áo sơ mi, sneaker..."
                    value={form.subCategory}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                <Field label="Màu sắc">
                  <input
                    className="rounded-lg border border-border-subtle px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    disabled={isSubmitting}
                    name="color"
                    onChange={handleChange}
                    value={form.color}
                  />
                </Field>
                <Field label="Mã màu">
                  <input
                    className="h-[42px] rounded-lg border border-border-subtle bg-white px-2 py-1"
                    disabled={isSubmitting}
                    name="colorHex"
                    onChange={handleChange}
                    type="color"
                    value={form.colorHex}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <Field label="Size">
                  <input
                    className="rounded-lg border border-border-subtle px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    disabled={isSubmitting}
                    name="size"
                    onChange={handleChange}
                    value={form.size}
                  />
                </Field>
                <Field label="Chất liệu">
                  <input
                    className="rounded-lg border border-border-subtle px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    disabled={isSubmitting}
                    name="material"
                    onChange={handleChange}
                    value={form.material}
                  />
                </Field>
                <Field label="Mùa">
                  <select
                    className="rounded-lg border border-border-subtle px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    disabled={isSubmitting}
                    name="season"
                    onChange={handleChange}
                    value={form.season}
                  >
                    {seasonOptions.map((option) => (
                      <option key={option || "empty"} value={option}>{option || "Chưa chọn"}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Họa tiết">
                  <input
                    className="rounded-lg border border-border-subtle px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    disabled={isSubmitting}
                    name="pattern"
                    onChange={handleChange}
                    value={form.pattern}
                  />
                </Field>
              </div>

              <Field label="Tags">
                <input
                  className="rounded-lg border border-border-subtle px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  disabled={isSubmitting}
                  name="tags"
                  onChange={handleChange}
                  placeholder="VD: đi làm, basic, mùa hè"
                  value={form.tags}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Giá mua">
                  <input
                    className="rounded-lg border border-border-subtle px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    disabled={isSubmitting}
                    min="0"
                    name="purchasePrice"
                    onChange={handleChange}
                    type="number"
                    value={form.purchasePrice}
                  />
                </Field>
                <Field label="Ngày mua">
                  <input
                    className="rounded-lg border border-border-subtle px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    disabled={isSubmitting}
                    name="purchaseDate"
                    onChange={handleChange}
                    type="date"
                    value={form.purchaseDate}
                  />
                </Field>
                <Field label="Link nguồn">
                  <input
                    className="rounded-lg border border-border-subtle px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    disabled={isSubmitting}
                    name="sourceUrl"
                    onChange={handleChange}
                    placeholder="https://..."
                    type="url"
                    value={form.sourceUrl}
                  />
                </Field>
              </div>
            </div>
          </div>

          <footer className="mt-6 flex justify-end gap-3 border-t border-border-subtle pt-5">
            <button
              className="rounded-lg border border-border-subtle px-5 py-2.5 text-sm font-bold text-on-surface-variant transition hover:border-primary hover:text-primary"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Hủy
            </button>
            <LoadingButton
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
            </LoadingButton>
          </footer>
        </form>
      </div>
    </div>
  );
}
