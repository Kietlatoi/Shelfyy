export const suggestTopNavData = {
  searchPlaceholder: "Tìm kiếm trang phục...",
  avatar: "/suggest/avatar.png",
};

export const suggestHeroData = {
  eyebrow: "Cá nhân hóa cho bạn",
  title: "Gợi ý cho bạn dựa trên phong cách và thời tiết",
  weather: {
    icon: "light_mode",
    location: "Hồ Chí Minh, 36°C",
    condition: "Trời nhiều mây",
  },
};

const outfitImage = "/suggest/outfit.jpg";

export const outfitSuggestionsData = {
  title: "Outfit của ngày",
  action: "Bận thử",
  items: [
    {
      title: "Minimalist Office Look",
      tags: ["Smart Casual", "Work Day"],
      metaIcon: "thermostat",
      meta: "24°C - 30°C Suitability",
      favorite: true,
      image: outfitImage,
    },
    {
      title: "Urban Explorer Set",
      tags: ["Smart Casual", "Work Day"],
      metaIcon: "umbrella",
      meta: "Light Rain Ready",
      image: outfitImage,
    },
    {
      title: "Midnight Velvet Mood",
      tags: ["Smart Casual", "Work Day"],
      metaIcon: "bedtime",
      meta: "Evening Occasion",
      image: outfitImage,
    },
    {
      title: "Weekend Coffee Run",
      tags: ["Smart Casual", "Work Day"],
      metaIcon: "sunny",
      meta: "High UV Protection",
      image: outfitImage,
    },
  ],
};

export const aiInsightData = {
  title: "Lời khuyên từ AI Stylist",
  text: '"Hôm nay dự báo có mưa nhẹ vào buổi chiều. Hãy ưu tiên các chất liệu vải chống thấm nhẹ hoặc mang theo một chiếc blazer có lót mỏng để giữ ấm khi nhiệt độ giảm."',
  chips: [
    { icon: "palette", label: "Tông màu: Trầm" },
    { icon: "layers", label: "Layering: Cần thiết" },
  ],
};

export const trendData = {
  title: "Xu hướng hôm nay",
  action: "Xem tất cả xu hướng",
  items: [
    {
      icon: "shopping_bag",
      title: "Eco-Leather",
      description: "+12% Tăng trưởng",
    },
    {
      icon: "styler",
      title: "Oversized Blazer",
      description: "Đang thịnh hành",
    },
  ],
};
