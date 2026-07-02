const calendarImage = new URL("../../image/calendar.webp", import.meta.url).href;
const outfitMainImage = new URL("../../image/outfit-main.png", import.meta.url).href;

export const sidebarData = {
  brand: {
    name: "Shelfy",
    tagline: "Quản lí tủ đồ",
    icon: "checkroom",
  },
  navItems: [
    { key: "home", label: "Trang chủ", icon: "home", href: "#/home" },
    { key: "wardrobe", label: "Tủ đồ", icon: "checkroom", href: "#/wardrobe" },
    {
      key: "suggestions",
      label: "Gợi ý hôm nay",
      icon: "auto_awesome",
      href: "#/suggest",
    },
  ],
  plan: {
    eyebrow: "Gói Pro",
    title: "Nâng gói trả phí",
    action: "Nâng cấp ngay",
  },
  utilityLinks: [
    { label: "Settings", icon: "settings", href: "#" },
    { label: "Help", icon: "help", href: "#" },
  ],
};

export const topNavData = {
  searchPlaceholder: "Tìm kiếm trang phục...",
  user: {
    name: "Duong Minh Kiet",
    membership: "Thành viên trả phí",
  },
  notificationMessage:
    "Thông báo: Bạn có 2 gợi ý trang phục mới cho sự kiện ngày mai!",
};

export const weatherData = {
  eyebrow: "Thời tiết hiện tại",
  location: "TP. Hồ Chí Minh",
  icon: "wb_sunny",
  temperature: "36°",
  condition: "Nắng ráo",
  feelsLike: "Cảm giác như 35°",
  metrics: [
    { label: "Độ ẩm", value: "65%" },
    { label: "UV", value: "Trung bình", emphasis: true },
    { label: "Dự đoán 5 giờ nữa", value: "Nắng ấm" },
  ],
};

export const calendarData = {
  title: "Lịch trình cá nhân",
  image: calendarImage,
  event: {
    month: "Oct",
    day: "24",
    title: "Tiệc tối cùng bạn bè",
    meta: "19:00 • District 1",
  },
  addLabel: "+ Thêm lịch trình mới",
};

export const outfitData = {
  eyebrow: "Gợi ý AI Stylist",
  title: "Outfit hoàn hảo cho ngày nắng đẹp",
  remaining: "Số lượt thử còn lại: 5",
  image: outfitMainImage,
  quote:
    "Sự kết hợp giữa nét cổ điển và hiện đại, phù hợp cho những buổi cafe cuối tuần.",
  items: [
    { category: "Áo sơ mi", name: "Silk White Blouse" },
    { category: "Quần", name: "Beige Tailored Trousers" },
    { category: "Phụ kiện", name: "Gold Hoops & Belt" },
  ],
  primaryAction: "Bận thử ngay",
  secondaryAction: "Đổi gợi ý khác",
};

export const statsData = [
  {
    label: "Tổng số món đồ",
    value: "128",
    icon: "inventory_2",
  },
];
