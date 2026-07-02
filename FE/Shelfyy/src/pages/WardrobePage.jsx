import { useEffect, useState } from "react";
import { pageContent } from "../api/apiClient";
import { toAiUpload, toStorage, toWardrobeCard } from "../api/adapters";
import { uploadApi } from "../api/uploadApi";
import { wardrobeApi } from "../api/wardrobeApi";
import { Sidebar } from "../components/Sidebar";
import { TopNav } from "../components/TopNav";
import { WardrobeAddSection } from "../components/WardrobeAddSection";
import { WardrobeGrid } from "../components/WardrobeGrid";
import { LoadingComponent } from "../components/LoadingComponent";
import { WardrobeUploadModal } from "../components/WardrobeUploadModal";
import { sidebarData, topNavData } from "../const/homeData";
import {
  aiUploadData,
  featuredCollection,
  pairingSuggestions,
  wardrobeFilters,
  wardrobeIntroData,
  wardrobeItems,
  wardrobeStorageData,
} from "../const/wardrobeData";

export function WardrobePage() {
  const [items, setItems] = useState(wardrobeItems);
  const [aiUpload, setAiUpload] = useState(aiUploadData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [storage, setStorage] = useState(wardrobeStorageData);
  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const [pairings, setPairings] = useState(pairingSuggestions);
  const [error, setError] = useState("");
  const [isFiltering, setIsFiltering] = useState(false);

  // FIX #12: BE getItems() đã hỗ trợ ?category= (kể cả label tiếng Việt như
  // "Áo", "Quần"...). Trước đây FE load cứng 50 items rồi filter client-side
  // — không ổn khi user có > 50 items (item thuộc filter khác vẫn bị load
  // nhưng item của filter đang chọn có thể bị cắt mất ở trang sau). Giờ
  // truyền category thẳng vào API để DB tự lọc.
  const loadWardrobe = async (category) => {
    const [itemsPage, stats] = await Promise.all([
      wardrobeApi.getItems({
        category: category && category !== "Tất cả" ? category : undefined,
        page: 0,
        size: 50,
      }),
      wardrobeApi.getStats().catch(() => null),
    ]);
    const backendItems = pageContent(itemsPage);
    setItems(backendItems.map(toWardrobeCard));
    setStorage(toStorage(stats));
    if (backendItems[0]) {
      setAiUpload(toAiUpload(backendItems[0]));
      const firstItemId = backendItems[0].id || backendItems[0].itemId;
      if (!firstItemId) return;
      wardrobeApi.getPairings(firstItemId)
        .then((data) => {
          if (Array.isArray(data) && data.length) setPairings(data);
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    loadWardrobe(activeFilter).catch((err) => setError(err.message || "Không tải được tủ đồ"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = async (label) => {
    setActiveFilter(label);
    setIsFiltering(true);
    setError("");
    try {
      await loadWardrobe(label);
    } catch (err) {
      setError(err.message || "Không lọc được tủ đồ");
    } finally {
      setIsFiltering(false);
    }
  };

  const filters = wardrobeFilters.map((filter) => ({
    ...filter,
    active: filter.label === activeFilter,
  }));

  const handleNotify = () => {
    window.alert(topNavData.notificationMessage);
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
    if (activeFilter === "Tất cả" || createdCard.category === activeFilter) {
      setItems((currentItems) => [createdCard, ...currentItems]);
    }
    setAiUpload(toAiUpload(created));
    wardrobeApi.getStats().then((stats) => setStorage(toStorage(stats))).catch(() => {});
  };

  return (
    <>
      <Sidebar activeKey="wardrobe" data={sidebarData} />
      <TopNav data={topNavData} onNotify={handleNotify} />

      <main className="ml-64 pt-24 pb-12 px-10 max-w-[1400px] mx-auto">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}
        <LoadingComponent delay={500}>
          <WardrobeAddSection
            aiUpload={aiUpload}
            intro={wardrobeIntroData}
            pairings={pairings}
            storage={storage}
            onUploadClick={() => setIsModalOpen(true)}
          />
        </LoadingComponent>
        
        <LoadingComponent delay={750}>
          <WardrobeGrid
            collection={featuredCollection}
            filters={filters}
            items={items}
            isLoading={isFiltering}
            onAddClick={() => setIsModalOpen(true)}
            onFilterChange={handleFilterChange}
          />
        </LoadingComponent>
      </main>

      {isModalOpen && (
        <WardrobeUploadModal
          onClose={() => setIsModalOpen(false)}
          onUploadSuccess={handleUploadSuccess}
        />
      )}
    </>
  );
}