import { useEffect, useRef, useState } from "react";
import { pageContent } from "../api/apiClient";
import { toWardrobeCard } from "../api/adapters";
import { dailyOutfitApi } from "../api/dailyOutfitApi";
import { uploadApi } from "../api/uploadApi";
import { wardrobeApi } from "../api/wardrobeApi";
import { wardrobePreferenceApi } from "../api/wardrobePreferenceApi";
import { MaterialIcon } from "../components/MaterialIcon";
import { Sidebar } from "../components/Sidebar";
import { TodayOutfitPanel } from "../components/TodayOutfitPanel";
import { TopNav } from "../components/TopNav";
import { WardrobeGrid } from "../components/WardrobeGrid";
import { WardrobeItemDeleteDialog } from "../components/WardrobeItemDeleteDialog";
import { WardrobeItemDetailDrawer } from "../components/WardrobeItemDetailDrawer";
import { WardrobeItemEditModal } from "../components/WardrobeItemEditModal";
import { WardrobeSummary } from "../components/WardrobeSummary";
import { WardrobeUploadModal } from "../components/WardrobeUploadModal";
import { sidebarData, topNavData } from "../const/homeData";
import { useTopNavUser } from "../hooks/useTopNavUser";
import { createEmptyTodayOutfit } from "../const/todayOutfitData";
import {
  wardrobeFilters,
} from "../const/wardrobeData";
import { normalizeItemStatus } from "../const/wardrobeItemPreferences";

const defaultStats = {
  totalItems: 0,
  storageUsed: 0,
  storageLimit: 100,
  storagePercent: 0,
  forgottenCount: 0,
  totalOutfits: 0,
  mostWornCategory: null,
};

const filterCategoryMap = {
  Áo: ["TOP", "OUTERWEAR"],
  Quần: ["BOTTOM"],
  Váy: ["DRESS"],
  "Phụ kiện": ["ACCESSORY", "SHOES", "BAG"],
};

const todaySlotByCategory = {
  TOP: "top",
  OUTERWEAR: "outerwear",
  BOTTOM: "bottom",
  DRESS: "bottom",
  SHOES: "shoes",
  BAG: "accessory",
  ACCESSORY: "accessory",
  OTHER: "accessory",
};

function filterCardsByLabel(cards, label) {
  if (!label || label === "Tất cả") return cards;
  return cards.filter((card) => card.category === label);
}

function todaySlotForItem(item) {
  const category = String(item?.raw?.category || item?.category || "").toUpperCase();
  if (todaySlotByCategory[category]) return todaySlotByCategory[category];
  if (item?.category === "Áo") return "top";
  if (item?.category === "Quần" || item?.category === "Váy") return "bottom";
  return "accessory";
}

function sortCardsByCreatedAt(cards) {
  return [...cards].sort((a, b) => {
    const left = new Date(a.raw?.createdAt || 0).getTime();
    const right = new Date(b.raw?.createdAt || 0).getTime();
    return right - left;
  });
}

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeIdList(value) {
  return Array.isArray(value) ? value.map(Number).filter(Boolean) : [];
}

function mergePreferenceIntoItem(item, preference) {
  if (!item) return item;
  return {
    ...item,
    favorite: preference?.favorite ?? Boolean(item.favorite),
    itemStatus: normalizeItemStatus(preference?.status || item.itemStatus || item.status),
  };
}

function mergePreferenceIntoCard(card, preference) {
  return toWardrobeCard(mergePreferenceIntoItem(card.raw || card, preference));
}

async function applyPreferencesToCards(cards) {
  const itemIds = cards.map((card) => Number(card.id)).filter(Boolean);
  if (!itemIds.length) return cards;

  const response = await wardrobePreferenceApi.getPreferences(itemIds);
  const preferenceByItemId = new Map(
    (response?.items || []).map((preference) => [Number(preference.itemId), preference])
  );

  return cards.map((card) => mergePreferenceIntoCard(card, preferenceByItemId.get(Number(card.id))));
}

export function WardrobePage() {
  const nav = useTopNavUser();
  const detailRequestRef = useRef(0);
  const [items, setItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState(defaultStats);
  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [todayOutfit, setTodayOutfit] = useState(() => createEmptyTodayOutfit());
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTodayOutfit, setIsSavingTodayOutfit] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [detailItem, setDetailItem] = useState(null);
  const [detailError, setDetailError] = useState("");
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  const fetchWardrobeCards = async (category, keyword = "") => {
    const cleanKeyword = keyword.trim();
    const backendCategories = filterCategoryMap[category] || [];

    if (cleanKeyword || backendCategories.length === 0) {
      const itemsPage = await wardrobeApi.getItems({
        q: cleanKeyword || undefined,
        page: 0,
        size: 100,
      });
      return filterCardsByLabel(pageContent(itemsPage).map(toWardrobeCard), category);
    }

    const pages = await Promise.all(
      backendCategories.map((backendCategory) =>
        wardrobeApi.getItems({
          category: backendCategory,
          page: 0,
          size: 50,
        })
      )
    );

    return sortCardsByCreatedAt(
      pages.flatMap((itemsPage) => pageContent(itemsPage).map(toWardrobeCard))
    );
  };

  const loadWardrobe = async (category, keyword = "") => {
    const [wardrobeCards, nextStats] = await Promise.all([
      fetchWardrobeCards(category, keyword),
      wardrobeApi.getStats().catch(() => defaultStats),
    ]);
    const cardsWithPreferences = await applyPreferencesToCards(wardrobeCards).catch(() => wardrobeCards);
    setItems(cardsWithPreferences);
    setStats(nextStats || defaultStats);
  };

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      setIsLoading(true);
      loadWardrobe(activeFilter, appliedSearch)
        .catch((err) => {
          if (!cancelled) setError(err.message || "Không tải được tủ đồ");
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = window.setTimeout(() => {
      setSuccessMessage("");
    }, 3600);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const handleFilterChange = async (label) => {
    setActiveFilter(label);
    setIsLoading(true);
    setError("");
    try {
      await loadWardrobe(label, appliedSearch);
    } catch (err) {
      setError(err.message || "Không lọc được tủ đồ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    const keyword = searchTerm.trim();
    setAppliedSearch(keyword);
    setIsLoading(true);
    setError("");
    try {
      await loadWardrobe(activeFilter, keyword);
    } catch (err) {
      setError(err.message || "Không tìm được món đồ phù hợp");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchClear = async () => {
    setSearchTerm("");
    setAppliedSearch("");
    setIsLoading(true);
    setError("");
    try {
      await loadWardrobe(activeFilter, "");
    } catch (err) {
      setError(err.message || "Không tải được tủ đồ");
    } finally {
      setIsLoading(false);
    }
  };

  const filters = wardrobeFilters.map((filter) => ({
    ...filter,
    active: filter.label === activeFilter,
  }));

  const handleNotify = () => {
    window.alert(topNavData.notificationMessage);
  };

  const selectedTodayItems = Object.values(todayOutfit).filter(Boolean);
  const selectedTodayItemIds = selectedTodayItems.map((item) => item.id).filter(Boolean);

  const handleSelectTodayItem = (item) => {
    const slotKey = todaySlotForItem(item);
    setSuccessMessage("");
    setTodayOutfit((current) => ({
      ...current,
      [slotKey]: current[slotKey]?.id === item.id ? null : item,
    }));
  };

  const handleRemoveTodaySlot = (slotKey) => {
    setSuccessMessage("");
    setTodayOutfit((current) => ({
      ...current,
      [slotKey]: null,
    }));
  };

  const handleClearTodayOutfit = () => {
    setSuccessMessage("");
    setTodayOutfit(createEmptyTodayOutfit());
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
        setDetailError(err.message || "Không tải được chi tiết món đồ");
      }
    } finally {
      if (detailRequestRef.current === requestId) {
        setIsDetailLoading(false);
      }
    }
  };

  const handleSelectDetailItemToday = () => {
    if (!detailItem) return;
    handleSelectTodayItem(toWardrobeCard(detailItem));
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
      replaceItemInState(updatedItem);
      setDetailItem((current) =>
        Number(current?.id) === Number(source.id)
          ? mergePreferenceIntoItem(current, preference)
          : current
      );
      setSuccessMessage(nextFavorite ? "Đã thêm vào yêu thích." : "Đã bỏ khỏi yêu thích.");
    } catch (err) {
      setError(err.message || "Không cập nhật được trạng thái yêu thích.");
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

  const matchesCurrentView = (card) => {
    const keyword = appliedSearch.trim().toLowerCase();
    const matchesFilter = activeFilter === "Tất cả" || card.category === activeFilter;
    const matchesSearch =
      !keyword ||
      [card.raw?.name, card.raw?.brand, card.raw?.color, card.raw?.category, card.name, card.brand]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    return matchesFilter && matchesSearch;
  };

  const replaceItemInState = (updatedItem) => {
    const nextCard = toWardrobeCard(updatedItem);

    setItems((currentItems) => {
      const exists = currentItems.some((item) => Number(item.id) === Number(updatedItem.id));
      if (!matchesCurrentView(nextCard)) {
        return currentItems.filter((item) => Number(item.id) !== Number(updatedItem.id));
      }
      if (!exists) return [nextCard, ...currentItems];
      return currentItems.map((item) => Number(item.id) === Number(updatedItem.id) ? nextCard : item);
    });

    setTodayOutfit((current) => {
      const nextSelectedCard = toWardrobeCard(updatedItem);
      return Object.fromEntries(
        Object.entries(current).map(([slotKey, selectedItem]) => [
          slotKey,
          Number(selectedItem?.id) === Number(updatedItem.id) ? nextSelectedCard : selectedItem,
        ])
      );
    });
  };

  const removeItemFromTodayOutfit = (itemId) => {
    setTodayOutfit((current) =>
      Object.fromEntries(
        Object.entries(current).map(([slotKey, selectedItem]) => [
          slotKey,
          Number(selectedItem?.id) === Number(itemId) ? null : selectedItem,
        ])
      )
    );
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
    wardrobeApi.getStats().then((nextStats) => setStats(nextStats || defaultStats)).catch(() => {});
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
      setItems((currentItems) =>
        currentItems.filter((item) => Number(item.id) !== Number(deleteTarget.id))
      );
      removeItemFromTodayOutfit(deleteTarget.id);
      setDetailItem(null);
      setDeleteTarget(null);
      setSuccessMessage("Đã xóa món đồ khỏi tủ đồ.");
      wardrobeApi.getStats().then((nextStats) => setStats(nextStats || defaultStats)).catch(() => {});
    } catch (err) {
      setDeleteError(err.message || "Không xóa được món đồ.");
    } finally {
      setIsDeletingItem(false);
    }
  };

  const handleSaveTodayOutfit = async () => {
    const itemIds = selectedTodayItemIds.map(Number).filter(Boolean);
    if (!itemIds.length) {
      setError("Chọn ít nhất một món đồ trước khi lưu outfit hôm nay.");
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsSavingTodayOutfit(true);
    try {
      const now = new Date();
      const todayLabel = now.toLocaleDateString("vi-VN");
      const result = await dailyOutfitApi.confirmToday({
        name: `Outfit hôm nay - ${todayLabel}`,
        occasion: "Hôm nay",
        description: "Người dùng tự chọn trong tủ đồ cá nhân.",
        itemIds,
        wornDate: localDateValue(now),
      });

      const addedIds = normalizeIdList(result?.wearCountUpdated?.addedItemIds);
      const removedIds = normalizeIdList(result?.wearCountUpdated?.removedItemIds);

      if (addedIds.length || removedIds.length) {
        setItems((currentItems) =>
          currentItems.map((item) => {
            const isAdded = addedIds.includes(Number(item.id));
            const isRemoved = removedIds.includes(Number(item.id));
            if (!isAdded && !isRemoved) return item;
            const currentWearCount = Number(item.raw?.wearCount || 0);
            return {
              ...item,
              raw: {
                ...item.raw,
                wearCount: Math.max(0, currentWearCount + (isAdded ? 1 : 0) - (isRemoved ? 1 : 0)),
              },
            };
          })
        );
      }

      wardrobeApi.getStats().then((nextStats) => setStats(nextStats || defaultStats)).catch(() => {});
      setSuccessMessage("Đã xác nhận outfit sẽ mặc hôm nay.");
    } catch (err) {
      setError(err.message || "Không lưu được outfit hôm nay");
    } finally {
      setIsSavingTodayOutfit(false);
    }
  };

  const handleUploadSuccess = async (preset) => {
    if (!preset?.file) {
      throw new Error("Vui lòng chọn ảnh trước khi lưu trang phục.");
    }

    setError("");
    const uploadResult = await uploadApi.uploadClothing(preset.file);
    const created = await wardrobeApi.createItem({
      name: preset.name || "Trang phục chưa đặt tên",
      brand: preset.brand || "Khác",
      category: preset.category,
      color: preset.color,
      colorHex: preset.colorHex,
      season: preset.season,
      pattern: preset.pattern,
      size: preset.size,
      material: preset.material,
      imageUrl: uploadResult?.originalUrl,
      thumbnailUrl: uploadResult?.thumbnailUrl,
      backgroundRemovedUrl: uploadResult?.backgroundRemovedUrl,
    });

    // Chỉ chèn item mới vào danh sách hiện tại nếu nó khớp filter đang chọn
    // (server-side filter nghĩa là danh sách trong state luôn khớp filter).
    const createdCard = toWardrobeCard(created);
    const keyword = appliedSearch.trim().toLowerCase();
    const matchesSearch =
      !keyword ||
      [created.name, created.brand, created.color, created.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));

    if ((activeFilter === "Tất cả" || createdCard.category === activeFilter) && matchesSearch) {
      setItems((currentItems) => [createdCard, ...currentItems]);
    }
    wardrobeApi.getStats().then((nextStats) => setStats(nextStats || defaultStats)).catch(() => {});
  };

  return (
    <>
      <Sidebar activeKey="wardrobe" data={sidebarData} />
      <TopNav data={nav} onNotify={handleNotify} />

      <main className="ml-64 pt-24 pb-12 px-10 max-w-[1400px] mx-auto">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}
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
        <WardrobeSummary
          stats={stats}
          visibleCount={items.length}
          onUploadClick={() => setIsModalOpen(true)}
        />

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <TodayOutfitPanel
            isSaving={isSavingTodayOutfit}
            outfit={todayOutfit}
            onClear={handleClearTodayOutfit}
            onRemoveSlot={handleRemoveTodaySlot}
            onSave={handleSaveTodayOutfit}
          />

          <WardrobeGrid
            filters={filters}
            isLoading={isLoading}
            items={items}
            onAddClick={() => setIsModalOpen(true)}
            onFilterChange={handleFilterChange}
            onOpenItemDetail={handleOpenItemDetail}
            onSearchChange={setSearchTerm}
            onSearchClear={handleSearchClear}
            onSearchSubmit={handleSearchSubmit}
            onSelectTodayItem={handleSelectTodayItem}
            onToggleFavorite={handleToggleFavorite}
            searchTerm={searchTerm}
            selectedItemIds={selectedTodayItemIds}
          />
        </div>
      </main>

      {isModalOpen && (
        <WardrobeUploadModal
          onClose={() => setIsModalOpen(false)}
          onUploadSuccess={handleUploadSuccess}
        />
      )}

      {detailItem && (
        <WardrobeItemDetailDrawer
          error={detailError}
          isDeleting={isDeletingItem}
          isLoading={isDetailLoading}
          isSelectedToday={selectedTodayItemIds.includes(Number(detailItem.id))}
          item={detailItem}
          onClose={handleCloseItemDetail}
          onDelete={handleAskDeleteItem}
          onEdit={handleEditDetailItem}
          onSelectToday={handleSelectDetailItemToday}
          onStatusChange={handleChangeDetailItemStatus}
          onToggleFavorite={() => handleToggleFavorite(detailItem)}
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
