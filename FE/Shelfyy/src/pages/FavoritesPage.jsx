import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pageContent } from "../api/apiClient";
import { toWardrobeCard } from "../api/adapters";
import { wardrobeApi } from "../api/wardrobeApi";
import { wardrobePreferenceApi } from "../api/wardrobePreferenceApi";
import { MaterialIcon } from "../components/MaterialIcon";
import { Sidebar } from "../components/Sidebar";
import { TopNav } from "../components/TopNav";
import { WardrobeItemDeleteDialog } from "../components/WardrobeItemDeleteDialog";
import { WardrobeItemDetailDrawer } from "../components/WardrobeItemDetailDrawer";
import { WardrobeItemEditModal } from "../components/WardrobeItemEditModal";
import { sidebarData, topNavData } from "../const/homeData";
import {
  ITEM_STATUS_OPTIONS,
  normalizeItemStatus,
  statusOptionFor,
} from "../const/wardrobeItemPreferences";
import { useTopNavUser } from "../hooks/useTopNavUser";

const pageSize = 100;
const maxPages = 10;
const fallbackImage = "/image/wardrobe-tee.png";

function mergePreferenceIntoItem(item, preference) {
  if (!item) return item;
  return {
    ...item,
    favorite: preference?.favorite ?? Boolean(item.favorite),
    itemStatus: normalizeItemStatus(preference?.status || item.itemStatus || item.status),
  };
}

async function fetchAllWardrobeItems() {
  const allItems = [];

  for (let page = 0; page < maxPages; page += 1) {
    const response = await wardrobeApi.getItems({ page, size: pageSize });
    const content = pageContent(response);
    allItems.push(...content);

    const totalPages = Number(response?.totalPages || 0);
    if (response?.last || content.length < pageSize || (totalPages && page + 1 >= totalPages)) {
      break;
    }
  }

  return allItems;
}

async function mergePreferences(items) {
  const itemIds = items.map((item) => Number(item.id)).filter(Boolean);
  if (!itemIds.length) return items;

  const preferenceByItemId = new Map();
  for (let index = 0; index < itemIds.length; index += pageSize) {
    const chunk = itemIds.slice(index, index + pageSize);
    const response = await wardrobePreferenceApi.getPreferences(chunk);
    (response?.items || []).forEach((preference) => {
      preferenceByItemId.set(Number(preference.itemId), preference);
    });
  }

  return items.map((item) => mergePreferenceIntoItem(item, preferenceByItemId.get(Number(item.id))));
}

function FavoriteSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5" aria-busy="true">
      {Array.from({ length: 8 }).map((_, index) => (
        <div className="h-[360px] animate-pulse rounded-lg bg-white" key={index} />
      ))}
    </div>
  );
}

function EmptyFavorites({ hasFilters }) {
  return (
    <section className="rounded-lg border border-dashed border-border-subtle bg-white p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-secondary-fixed text-secondary">
        <MaterialIcon name="favorite" filled size={26} />
      </div>
      <h2 className="mt-4 text-xl font-extrabold text-primary">
        {hasFilters ? "Không có món yêu thích phù hợp" : "Chưa có món đồ yêu thích"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-on-surface-variant">
        {hasFilters
          ? "Thử đổi từ khóa hoặc trạng thái để xem các món khác trong danh sách yêu thích."
          : "Bấm biểu tượng tim trên món đồ trong tủ để lưu lại những món bạn muốn dùng thường xuyên."}
      </p>
      <a
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-container"
        href="#/wardrobe"
      >
        <MaterialIcon name="checkroom" size={18} />
        Mở tủ đồ
      </a>
    </section>
  );
}

function FavoriteItemCard({ item, onOpen, onToggleFavorite }) {
  const raw = item.raw || {};
  const status = statusOptionFor(item.itemStatus || raw.itemStatus);
  const colorHex = raw.colorHex && /^#[0-9a-f]{6}$/i.test(raw.colorHex) ? raw.colorHex : null;
  const wearCount = Number(raw.wearCount || 0);

  const openDetail = () => onOpen(item);
  const handleKeyDown = (event) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail();
    }
  };

  const handleFavoriteClick = (event) => {
    event.stopPropagation();
    onToggleFavorite(item);
  };
  const handleDetailButtonClick = (event) => {
    event.stopPropagation();
    openDetail();
  };

  return (
    <article
      aria-label={`Xem chi tiết ${item.name}`}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-border-subtle bg-white shadow-sm shadow-primary/5 outline-none transition-all duration-300 hover:-translate-y-1 hover:border-secondary/30 hover:shadow-xl hover:shadow-primary/10 focus-visible:border-secondary focus-visible:ring-4 focus-visible:ring-secondary/10"
      onClick={openDetail}
      onKeyDown={handleKeyDown}
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
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/50 to-transparent" />
        <span className="absolute left-3 top-3 rounded-md border border-rose-100 bg-rose-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-rose-700 shadow-sm">
          {item.category}
        </span>
        <button
          aria-label={`Bỏ yêu thích ${item.name}`}
          aria-pressed="true"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-md border border-white/70 bg-white/90 text-secondary shadow-sm backdrop-blur transition hover:bg-secondary-fixed"
          onClick={handleFavoriteClick}
          type="button"
        >
          <MaterialIcon name="favorite" filled className="text-[18px]" />
        </button>
        <span className={`absolute bottom-3 left-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide shadow-sm ${status.tone}`}>
          <MaterialIcon name={status.icon} className="text-[14px]" />
          <span className="truncate">{status.label}</span>
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.16em] text-secondary">
              {item.brand}
            </p>
            <h3 className="mt-1 min-h-10 text-[15px] font-extrabold leading-5 text-primary">
              {item.name}
            </h3>
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

        <div className="mt-4 grid gap-2 border-t border-border-subtle pt-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-on-surface-variant">
              <MaterialIcon name="laundry" className="text-[16px]" />
              <span className="truncate">{wearCount > 0 ? `Đã mặc ${wearCount} lần` : "Chưa mặc"}</span>
            </span>
            <span className="max-w-24 truncate font-bold text-primary">{raw.color || "Chưa rõ màu"}</span>
          </div>
          <button
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border-subtle bg-white px-3 py-2.5 text-xs font-extrabold text-primary transition hover:border-secondary hover:text-secondary"
            onClick={handleDetailButtonClick}
            type="button"
          >
            <MaterialIcon name="open_in_full" className="text-[17px]" />
            Mở chi tiết
          </button>
        </div>
      </div>
    </article>
  );
}

export function FavoritesPage() {
  const nav = useTopNavUser();
  const detailRequestRef = useRef(0);
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeStatus, setActiveStatus] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [detailItem, setDetailItem] = useState(null);
  const [detailError, setDetailError] = useState("");
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  const loadFavorites = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const wardrobeItems = await fetchAllWardrobeItems();
      const withPreferences = await mergePreferences(wardrobeItems).catch(() => wardrobeItems);
      setItems(withPreferences.filter((item) => Boolean(item.favorite)));
    } catch (err) {
      setError(err.message || "Không tải được danh sách yêu thích.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) loadFavorites();
    });
    return () => {
      cancelled = true;
    };
  }, [loadFavorites]);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = window.setTimeout(() => setSuccessMessage(""), 3600);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus =
        activeStatus === "ALL" || normalizeItemStatus(item.itemStatus) === activeStatus;
      const matchesSearch =
        !keyword ||
        [item.name, item.brand, item.color, item.category, item.material, item.size]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      return matchesStatus && matchesSearch;
    });
  }, [activeStatus, items, searchTerm]);

  const cards = useMemo(() => filteredItems.map(toWardrobeCard), [filteredItems]);
  const inUseCount = items.filter((item) => normalizeItemStatus(item.itemStatus) === "IN_USE").length;

  const handleNotify = () => {
    window.alert(topNavData.notificationMessage);
  };

  const replaceItemInState = (updatedItem) => {
    setItems((current) =>
      current.map((item) => (Number(item.id) === Number(updatedItem.id) ? updatedItem : item))
    );
  };

  const removeItemFromState = (itemId) => {
    setItems((current) => current.filter((item) => Number(item.id) !== Number(itemId)));
  };

  const handleCloseItemDetail = () => {
    detailRequestRef.current += 1;
    setDetailItem(null);
    setDetailError("");
    setIsDetailLoading(false);
  };

  const handleOpenItemDetail = async (item) => {
    if (!item?.id) return;

    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    setDetailItem(item.raw || item);
    setDetailError("");
    setIsDetailLoading(true);

    try {
      const [fetched, preferences] = await Promise.all([
        wardrobeApi.getItem(item.id),
        wardrobePreferenceApi.getPreferences([item.id]).catch(() => ({ items: [] })),
      ]);
      if (detailRequestRef.current === requestId) {
        setDetailItem(mergePreferenceIntoItem(fetched, preferences?.items?.[0] || item.raw));
      }
    } catch (err) {
      if (detailRequestRef.current === requestId) {
        setDetailError(err.message || "Không tải được chi tiết món đồ.");
      }
    } finally {
      if (detailRequestRef.current === requestId) {
        setIsDetailLoading(false);
      }
    }
  };

  const handleToggleFavorite = async (item) => {
    const source = item?.raw || item;
    if (!source?.id) return;

    const nextFavorite = !source.favorite;
    try {
      const preference = await wardrobePreferenceApi.updatePreference(source.id, {
        favorite: nextFavorite,
        status: normalizeItemStatus(source.itemStatus),
      });
      const updatedItem = mergePreferenceIntoItem(source, preference);

      if (nextFavorite) {
        replaceItemInState(updatedItem);
      } else {
        removeItemFromState(source.id);
        if (Number(detailItem?.id) === Number(source.id)) {
          handleCloseItemDetail();
        }
      }

      setSuccessMessage(nextFavorite ? "Đã thêm vào yêu thích." : "Đã bỏ khỏi yêu thích.");
    } catch (err) {
      setError(err.message || "Không cập nhật được yêu thích.");
    }
  };

  const handleChangeDetailItemStatus = async (status) => {
    if (!detailItem?.id) return;

    try {
      const preference = await wardrobePreferenceApi.updatePreference(detailItem.id, {
        favorite: Boolean(detailItem.favorite),
        status,
      });
      const updatedItem = mergePreferenceIntoItem(detailItem, preference);
      replaceItemInState(updatedItem);
      setDetailItem(updatedItem);
      setSuccessMessage("Đã cập nhật trạng thái món đồ.");
    } catch (err) {
      setDetailError(err.message || "Không cập nhật được trạng thái món đồ.");
    }
  };

  const handleEditDetailItem = () => {
    if (!detailItem) return;
    setEditingItem(detailItem);
  };

  const handleUpdateItem = async (payload) => {
    if (!editingItem?.id) return;
    const updated = await wardrobeApi.updateItem(editingItem.id, payload);
    const mergedUpdated = mergePreferenceIntoItem(updated, editingItem);
    replaceItemInState(mergedUpdated);
    setDetailItem(mergedUpdated);
    setEditingItem(null);
    setSuccessMessage("Đã cập nhật món đồ.");
  };

  const handleAskDeleteItem = () => {
    if (!detailItem) return;
    setDeleteError("");
    setDeleteTarget(detailItem);
  };

  const handleCancelDeleteItem = () => {
    if (isDeletingItem) return;
    setDeleteTarget(null);
    setDeleteError("");
  };

  const handleConfirmDeleteItem = async () => {
    if (!deleteTarget?.id) return;
    setDeleteError("");
    setIsDeletingItem(true);
    try {
      await wardrobeApi.deleteItem(deleteTarget.id);
      removeItemFromState(deleteTarget.id);
      setDetailItem(null);
      setDeleteTarget(null);
      setSuccessMessage("Đã xóa món đồ khỏi tủ đồ.");
    } catch (err) {
      setDeleteError(err.message || "Không xóa được món đồ.");
    } finally {
      setIsDeletingItem(false);
    }
  };

  const hasFilters = Boolean(searchTerm.trim()) || activeStatus !== "ALL";

  return (
    <>
      <Sidebar activeKey="favorites" data={sidebarData} />
      <TopNav data={nav} onNotify={handleNotify} />

      <main className="ml-64 min-h-screen bg-surface-container-low px-10 pb-12 pt-24">
        {successMessage && (
          <div
            aria-live="polite"
            className="fixed right-6 top-24 z-50 flex w-[min(360px,calc(100vw-2rem))] items-start gap-3 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-primary shadow-lg shadow-primary/10"
            role="status"
          >
            <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <MaterialIcon name="check_circle" filled size={20} />
            </span>
            <span className="min-w-0 flex-1 pt-1">{successMessage}</span>
            <button
              aria-label="Đóng thông báo"
              className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-container-low hover:text-primary"
              onClick={() => setSuccessMessage("")}
              type="button"
            >
              <MaterialIcon name="close" size={18} />
            </button>
          </div>
        )}

        <div className="mx-auto grid max-w-[1280px] gap-6">
          <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-secondary">Favorites</p>
              <h1 className="mt-2 text-4xl font-extrabold text-primary">Món đồ yêu thích</h1>
              <p className="mt-3 max-w-2xl text-sm text-on-surface-variant">
                Lưu lại các món bạn thường cân nhắc khi phối đồ. Danh sách này dùng dữ liệu wardrobe từ Java và preference từ Nodejs.
              </p>
            </div>
            <a
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-container"
              href="#/wardrobe"
            >
              <MaterialIcon name="checkroom" size={18} />
              Quản lý tủ đồ
            </a>
          </section>

          <section className="grid gap-4 rounded-lg border border-border-subtle bg-white p-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Tìm trong yêu thích
              </span>
              <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface px-3 py-2.5">
                <MaterialIcon name="search" className="text-[18px] text-on-surface-variant" />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-on-surface-variant"
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Tên, màu, thương hiệu, chất liệu..."
                  type="search"
                  value={searchTerm}
                />
                {searchTerm && (
                  <button
                    aria-label="Xóa tìm kiếm"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-white hover:text-primary"
                    onClick={() => setSearchTerm("")}
                    type="button"
                  >
                    <MaterialIcon name="close" size={18} />
                  </button>
                )}
              </div>
            </label>

            <div className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Trạng thái
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  aria-pressed={activeStatus === "ALL"}
                  className={`rounded-lg border px-3 py-2 text-xs font-extrabold transition ${
                    activeStatus === "ALL"
                      ? "border-primary bg-primary text-white"
                      : "border-border-subtle bg-white text-on-surface-variant hover:border-primary hover:text-primary"
                  }`}
                  onClick={() => setActiveStatus("ALL")}
                  type="button"
                >
                  Tất cả
                </button>
                {ITEM_STATUS_OPTIONS.map((option) => (
                  <button
                    aria-pressed={activeStatus === option.value}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-extrabold transition ${
                      activeStatus === option.value
                        ? "border-primary bg-primary text-white"
                        : "border-border-subtle bg-white text-on-surface-variant hover:border-primary hover:text-primary"
                    }`}
                    key={option.value}
                    onClick={() => setActiveStatus(option.value)}
                    type="button"
                  >
                    <MaterialIcon name={option.icon} size={16} />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:min-w-[260px]">
              <div className="rounded-lg bg-secondary-fixed px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Yêu thích</p>
                <p className="mt-1 text-2xl font-extrabold text-primary">{items.length}</p>
              </div>
              <div className="rounded-lg bg-surface-container-low px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Đang dùng</p>
                <p className="mt-1 text-2xl font-extrabold text-primary">{inUseCount}</p>
              </div>
            </div>
          </section>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600" role="alert">
              {error}
            </div>
          )}

          {isLoading ? (
            <FavoriteSkeleton />
          ) : cards.length ? (
            <section
              aria-label="Danh sách món đồ yêu thích"
              className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5"
            >
              {cards.map((item) => (
                <FavoriteItemCard
                  item={item}
                  key={item.id}
                  onOpen={handleOpenItemDetail}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </section>
          ) : (
            <EmptyFavorites hasFilters={hasFilters} />
          )}
        </div>
      </main>

      {detailItem && (
        <WardrobeItemDetailDrawer
          error={detailError}
          isDeleting={isDeletingItem}
          isLoading={isDetailLoading}
          item={detailItem}
          onClose={handleCloseItemDetail}
          onDelete={handleAskDeleteItem}
          onEdit={handleEditDetailItem}
          onSelectToday={() => {}}
          onStatusChange={handleChangeDetailItemStatus}
          onToggleFavorite={() => handleToggleFavorite(detailItem)}
          showTodayAction={false}
        />
      )}

      {editingItem && (
        <WardrobeItemEditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSubmit={handleUpdateItem}
        />
      )}

      {deleteTarget && (
        <WardrobeItemDeleteDialog
          error={deleteError}
          isDeleting={isDeletingItem}
          item={deleteTarget}
          onCancel={handleCancelDeleteItem}
          onConfirm={handleConfirmDeleteItem}
        />
      )}
    </>
  );
}
