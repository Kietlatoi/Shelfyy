const outfitMainImage = new URL("../../image/outfit-main.png", import.meta.url).href;

export const sidebarData = {
  brand: {
    name: "Shelfy",
    tagline: "Quản lí tủ đồ",
  },
  navItems: [
    { key: "home", label: "Trang chủ", icon: "home", href: "#/home" },
    { key: "wardrobe", label: "Tủ đồ", icon: "checkroom", href: "#/wardrobe" },
    { key: "favorites", label: "Yêu thích", icon: "favorite", href: "#/favorites" },
    { key: "wearHistory", label: "Lịch sử mặc", icon: "history", href: "#/wear-history" },
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
    { label: "Settings", icon: "settings", href: "#/profile" },
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
  location: "Đang lấy vị trí",
  icon: "location_searching",
  temperature: "--",
  condition: "Chưa có dữ liệu thời tiết",
  feelsLike: "Cần cấp quyền vị trí",
  metrics: [
    { label: "Độ ẩm", value: "-" },
    { label: "Gió", value: "-", emphasis: true },
    { label: "Mây", value: "-" },
  ],
};

export const calendarData = {
  title: "Lịch trình hôm nay của bạn",
  sourceLabel: "Google Calendar",
  calendarUrl: "https://calendar.google.com/calendar/u/0/r",
  connected: false,
  statusTitle: "Chưa kết nối Google Calendar",
  statusDescription: "Kết nối Google Calendar để Shelfy hiển thị lịch trình hôm nay.",
  emptyTitle: "Hôm nay chưa có sự kiện",
  emptyDescription: "Lịch trình cá nhân đang trống.",
  actionLabel: "Kết nối Google Calendar",
  events: [],
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
