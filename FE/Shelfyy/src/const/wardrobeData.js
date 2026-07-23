const wardrobeAiUploadImage = new URL("../../image/wardrobe-ai-upload.png", import.meta.url).href;
const wardrobeTeeImage = new URL("../../image/wardrobe-tee.png", import.meta.url).href;
const wardrobePantsImage = new URL("../../image/wardrobe-pants.png", import.meta.url).href;
const wardrobeBagImage = new URL("../../image/wardrobe-bag.png", import.meta.url).href;
const wardrobeShoesImage = new URL("../../image/wardrobe-shoes.png", import.meta.url).href;
const pairingLoaferImage = new URL("../../image/pairing-loafer.webp", import.meta.url).href;
const pairingJeansImage = new URL("../../image/pairing-jeans.jpg", import.meta.url).href;

export const wardrobeTopNavData = {
  searchPlaceholder: "Tìm kiếm trang phục...",
  userName: "Thanh Hằng",
};

export const wardrobeIntroData = {
  title: "Thêm đồ mới",
  description: "Tải ảnh lên để AI tự động phân loại tủ đồ của bạn",
  actions: [{ label: "Tải ảnh lên", icon: "upload", tone: "primary" }],
};

export const aiUploadData = {
  image: wardrobeAiUploadImage,
  status: "AI đang phân tích...",
  results: [
    {
      label: "Phân loại",
      icon: "category",
      value: "Áo khoác Blazer",
    },
    {
      label: "Màu sắc",
      swatch: "#f5f5f5",
      value: "Xám nhạt (Light Gray)",
    },
    {
      label: "Mùa",
      icon: "ac_unit",
      value: "Thu - Đông",
    },
    {
      label: "Họa tiết",
      icon: "texture",
      value: "Trơn (Minimalist)",
    },
  ],
};

export const pairingSuggestions = [
  {
    title: "Quần Jeans Xanh",
    description: "Phối cùng Blazer vừa tải lên",
    image: pairingLoaferImage,
  },
  {
    title: "Giày Loafer Đen",
    description: "Cho vẻ ngoài thanh lịch",
    image: pairingJeansImage,
  },
];

export const wardrobeStorageData = {
  eyebrow: "Bộ nhớ tủ đồ",
  used: "142",
  limit: "món đồ / 500",
  percent: 28,
};

export const wardrobeFilters = [
  { label: "Tất cả", active: true },
  { label: "Áo" },
  { label: "Quần" },
  { label: "Váy" },
  { label: "Phụ kiện" },
];

export const wardrobeItems = [
  {
    brand: "ZARA",
    name: "White Basic Tee",
    meta: "Size: M | Cotton",
    category: "Áo",
    image: wardrobeTeeImage,
  },
  {
    brand: "MANGO",
    name: "Camel Wide-Leg Pants",
    meta: "Size: S | Wool Blend",
    category: "Quần",
    image: wardrobePantsImage,
  },
  {
    brand: "CHARLES & KEITH",
    name: "Black Leather Box Bag",
    meta: "Size: One Size | Leather",
    category: "Phụ kiện",
    image: wardrobeBagImage,
  },
  {
    brand: "ADIDAS",
    name: "Stan Smith Primegreen",
    meta: "Size: 38 | Recycled",
    category: "Phụ kiện",
    image: wardrobeShoesImage,
  },
];
