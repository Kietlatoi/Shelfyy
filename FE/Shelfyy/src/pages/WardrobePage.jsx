import { useState } from "react";
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

function getFilterLabel(category) {
  if (category?.startsWith("Áo")) return "Áo";
  if (category?.startsWith("Quần")) return "Quần";
  if (category?.startsWith("Váy")) return "Váy";
  return "Phụ kiện";
}

export function WardrobePage() {
  const [items, setItems] = useState(wardrobeItems);
  const [aiUpload, setAiUpload] = useState(aiUploadData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [storage, setStorage] = useState(wardrobeStorageData);
  const [activeFilter, setActiveFilter] = useState("Tất cả");

  const filteredItems =
    activeFilter === "Tất cả"
      ? items
      : items.filter((item) => item.category === activeFilter);

  const filters = wardrobeFilters.map((filter) => ({
    ...filter,
    active: filter.label === activeFilter,
  }));

  const handleNotify = () => {
    window.alert(topNavData.notificationMessage);
  };

  const handleUploadSuccess = (preset) => {
    // 1. Update AI Upload Results Panel
    setAiUpload({
      image: preset.url,
      status: "Phân tích AI hoàn tất",
      results: [
        {
          label: "Phân loại",
          icon: "category",
          value: preset.category,
        },
        {
          label: "Màu sắc",
          swatch: preset.colorHex,
          value: preset.color,
        },
        {
          label: "Mùa",
          icon: "ac_unit",
          value: preset.season,
        },
        {
          label: "Họa tiết",
          icon: "texture",
          value: preset.pattern,
        },
      ]
    });

    // 2. Add New Item to Wardrobe List (prepend)
    const newItem = {
      brand: preset.brand,
      name: preset.name,
      meta: preset.meta,
      category: getFilterLabel(preset.category),
      image: preset.url,
    };
    setItems((currentItems) => [newItem, ...currentItems]);

    // 3. Update Storage Used count
    const nextUsed = parseInt(storage.used, 10) + 1;
    setStorage({
      ...storage,
      used: nextUsed.toString(),
      percent: Math.round((nextUsed / 500) * 100)
    });
  };

  return (
    <>
      <Sidebar activeKey="wardrobe" data={sidebarData} />
      <TopNav data={topNavData} onNotify={handleNotify} />

      <main className="ml-64 pt-24 pb-12 px-10 max-w-[1400px] mx-auto">
        <LoadingComponent delay={500}>
          <WardrobeAddSection
            aiUpload={aiUpload}
            intro={wardrobeIntroData}
            pairings={pairingSuggestions}
            storage={storage}
            onUploadClick={() => setIsModalOpen(true)}
          />
        </LoadingComponent>
        
        <LoadingComponent delay={750}>
          <WardrobeGrid
            collection={featuredCollection}
            filters={filters}
            items={filteredItems}
            onAddClick={() => setIsModalOpen(true)}
            onFilterChange={setActiveFilter}
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
