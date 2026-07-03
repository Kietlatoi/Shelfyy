const premiumTopAvatarImage = new URL("../../image/premium-top-avatar.png", import.meta.url).href;
const premiumUserAvatarImage = new URL("../../image/premium-user-avatar.png", import.meta.url).href;
const premiumAppStoreImage = new URL("../../image/premium-app-store.png", import.meta.url).href;
const premiumGooglePlayImage = new URL("../../image/premium-google-play.png", import.meta.url).href;

export const premiumTopNavData = {
  searchPlaceholder: "Tìm kiếm trang phục, xu hướng...",
  avatar: premiumTopAvatarImage,
};

export const premiumHeroData = {
  title: "Nâng Tầm Phong Cách Cùng Premium",
  description:
    "Trải nghiệm tủ đồ kỹ thuật số thông minh hơn với trợ lý AI và không giới hạn lưu trữ.",
};

export const premiumPlans = [
  {
    planType: "FREE",
    name: "Miễn phí",
    tier: "Cơ bản",
    price: "0đ",
    suffix: "/tháng",
    action: "Sử dụng ngay",
    featured: false,
    features: [
      { label: "Thử đồ ảo: 5 lượt/ngày", included: true },
      { label: "Lưu trữ tối đa 100 món đồ", included: true },
    ],
  },
  {
    planType: "PREMIUM",
    name: "Gói Premium",
    tier: "Tiết kiệm năm",
    price: "599.000đ",
    suffix: "/1 năm",
    action: "Nâng cấp Premium",
    featured: false,
    features: [
      { label: "Thử đồ ảo: 100 lượt/ tháng", included: true, premium: true },
      { label: "Lưu trữ tủ đồ không giới hạn", included: true, premium: true },
    ],
  },
  {
    planType: "PRO",
    name: "Gói Pro",
    tier: "Cá nhân",
    price: "59.000đ",
    suffix: "/tháng",
    action: "Bắt đầu dùng thử",
    badge: "Phổ biến nhất",
    featured: true,
    features: [
      { label: "Thử đồ ảo: 100 lượt/ tháng", included: true, premium: true },
      { label: "Lưu trữ tủ đồ không giới hạn", included: true, premium: true },
    ],
  },
];

export const premiumComparisonData = {
  title: "So sánh chi tiết tính năng",
  headers: ["Tính năng", "Miễn phí", "Premium", "Pro (Cá nhân)"],
  rows: [
    [
      "Lượt thử đồ ảo (AI Magic Mirror)",
      "5 lượt/ngày",
      "100 lượt/tháng",
      "100 lượt/tháng",
    ],
    ["Sức chứa tủ đồ kỹ thuật số", "100 items", "Không giới hạn", "Không giới hạn"],
    ["Xóa phông nền tự động (AI)", "Thủ công", "Tự động 100%", "Tự động 100%"],
  ],
};

export const premiumTrustData = {
  eyebrow: "Đánh giá người dùng",
  title: '"Gói Pro hoàn toàn thay đổi cách tôi chọn đồ mỗi sáng."',
  quote:
    '"Kể từ khi nâng cấp, trợ lý AI của Shelfy đã giúp tôi tiết kiệm hàng giờ đồng hồ chuẩn bị. Những gợi ý phối đồ cực kỳ tinh tế và hợp xu hướng."',
  user: {
    name: "Minh Anh",
    role: "Fashion Blogger, Hồ Chí Minh",
    avatar: premiumUserAvatarImage,
  },
  stats: [
    { value: "5M+", label: "Bộ trang phục đã được AI phối" },
    { value: "98%", label: "Người dùng hài lòng với AI Stylist" },
  ],
  trial: {
    title: "Dùng thử 7 ngày",
    description: "Không rủi ro, hủy bất cứ lúc nào.",
    icon: "verified_user",
  },
};

export const premiumFaqData = {
  title: "Câu hỏi thường gặp",
  items: [
    {
      question: "Tôi có thể hủy gói Premium bất cứ lúc nào không?",
      answer:
        "Có, bạn có thể hủy đăng ký của mình bất kỳ lúc nào trong phần cài đặt tài khoản. Bạn vẫn sẽ có quyền truy cập vào các tính năng Premium cho đến hết chu kỳ thanh toán hiện tại.",
    },
    {
      question: "Tính năng Thử đồ ảo hoạt động như thế nào?",
      answer:
        'Công nghệ AI của chúng tôi sẽ tạo ra một bản sao kỹ thuật số dựa trên số đo cơ thể bạn. Bạn có thể "mặc" thử bất kỳ món đồ nào trong tủ đồ để xem độ vừa vặn và thẩm mỹ trước khi phối thực tế.',
    },
  ],
};

export const premiumFooterData = {
  brand: "Shelfy",
  tagline: "Nâng tầm phong cách cá nhân của bạn mỗi ngày.",
  badges: [
    {
      alt: "Apple App Store download badge",
      src: premiumAppStoreImage,
    },
    {
      alt: "Google Play Store download badge",
      src: premiumGooglePlayImage,
    },
  ],
  links: ["Điều khoản", "Bảo mật", "Liên hệ"],
  copyright:
    "© 2024 Shelfy. All rights reserved. Designed for the fashion-forward.",
};
