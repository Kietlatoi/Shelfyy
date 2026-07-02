const t_Shelfy = new URL("../../image/landing-wardrobe.png", import.meta.url).href;
const g_i_h_m_nay_Shelfy = new URL("../../image/landing-ai-stylist.png", import.meta.url).href;
const th_o_Shelfy = new URL("../../image/landing-add-smart.png", import.meta.url).href;
const screenImg = new URL("../../image/app-screen.png", import.meta.url).href;
const landingLogo = new URL("../../image/landing-logo.png", import.meta.url).href;
const landingFooterLogo = new URL("../../image/landing-footer-logo.png", import.meta.url).href;
const landingAppStoreBadge = new URL("../../image/landing-app-store.png", import.meta.url).href;
const landingGooglePlayBadge = new URL("../../image/landing-google-play.png", import.meta.url).href;

export const landingHeaderData = {
  logo: landingLogo,
  nav: ["Tính năng", "Tạp chí", "Giới thiệu", "FAQ", "Thông báo"],
  actions: ["Tải ứng dụng", "Đăng nhập"],
};

export const landingHeroData = {
  badge: "⭐ Thay đổi gu ăn mặc hôm nay",
  title: "Bộ đồ hôm nay — do AI chọn cho bạn",
  description:
    "AI sắp xếp tủ quần áo, gợi ý outfit và quản lý phong cách của bạn. 7 triệu người dùng tin tưởng ứng dụng tủ quần áo AI số 1.",
};

export const landingProblems = [
  {
    title: "Có đầy quần áo mà không biết mặc gì",
    description:
      "80% tủ đồ của bạn đang ngủ. Không biết mình có gì, tủ đồ đầy ắp cũng cảm thấy trống rỗng.",
    className: "bg-[#F0F4FF] hover:border-blue-200",
  },
  {
    title: '"Hôm nay mặc gì nhỉ?"',
    description:
      "Mỗi sáng, 10 phút phân vân. Năng lượng đó có thể dùng cho việc khác hay hơn.",
    className: "bg-[#FFF9EB] hover:border-yellow-200",
  },
  {
    title: "Cứ mua mãi những đồ giống nhau",
    description:
      "30% đồ mới mua là bản sao của thứ đã có. Nếu biết rõ tủ đồ, bạn sẽ dừng lại.",
    className: "bg-[#C7EBF0] hover:border-green-200",
  },
  {
    title: "Xếp đồ đi du lịch luôn phiền phức",
    description:
      "Thời tiết, dịp đi, đồ đa năng trong trang phục — lên kế hoạch mang gì cũng khó hơn bạn nghĩ.",
    className: "bg-[#F6F4FF] hover:border-purple-200",
  },
];

export const landingFeatures = [
  {
    title: "Tủ Đồ Số Của Bạn",
    description:
      "AI sắp xếp quần áo từ một bức ảnh. Nhập từ Amazon, Zara, Shein và hơn thế — toàn bộ tủ đồ luôn bên bạn.",
    images: [t_Shelfy],
  },
  {
    title: "Thêm đồ thông minh",
    description:
      "AI nhận diện từng món đồ từ selfie trước gương và biến ảnh thường thành ảnh sản phẩm sạch sẽ. Xây dựng tủ đồ chưa bao giờ dễ đến thế.",
    images: [th_o_Shelfy],
    reverse: true,
    stacked: true,
  },
  {
    title: "Stylist AI",
    description:
      "AI chọn outfit phù hợp lịch trình, thời tiết và tâm trạng — từ chính quần áo của bạn. Còn phân tích màu sắc và dáng người để bạn luôn biết gì hợp nhất.",
    images: [g_i_h_m_nay_Shelfy],
  },
  {
    title: "Lên Kế Hoạch Ngày & Chuyến Đi",
    description:
      "Ghi lại mỗi ngày mặc gì và chuẩn bị hành lý theo thời tiết thực tế. Không còn mang quá nhiều hay thiếu phân vân mỗi sáng.",
    images: [screenImg],
    reverse: true,
  },
];

export const landingExtensionData = {
  title: "Khám phá Shelfy ngay trên trình duyệt máy tính của bạn",
  description:
    "Nhập một cái là lưu. Tủ quần áo và danh sách yêu thích của bạn luôn chờ sẵn ngay trên trình duyệt, dù đang mua sắm hay lướt web.",
  cards: [
    {
      icons: ["🌥️", "📅"],
      title:
        "Tích hợp dữ liệu thời tiết realtime và lịch trình Calendar của bạn",
      description:
        "Dễ dàng đưa ra gợi ý phù hợp với thời tiết và lịch trình của bạn.",
    },
    {
      icons: ["🪄"],
      title: "AI tự động sắp xếp gọn gàng",
      description:
        "AI tự điền danh mục, màu sắc, mùa và họa tiết cho từng món đồ mà không cần bạn nhập tay.",
    },
    {
      icons: ["👕"],
      title: "Cho phép bạn thấy mình trong trang phục",
      description:
        "Có thể thử trang phục trực tiếp trên cơ thể bạn, giúp bạn hình dung rõ hơn về outfit.",
    },
  ],
  action: "Đăng nhập ngay",
};

export const landingSteps = [
  {
    title: "Chụp hoặc tải lên quần áo của bạn",
    description: "Chụp ảnh, nhập từ cửa hàng hoặc dùng Smart Detector",
    image: t_Shelfy,
    badgeClass: "bg-blue-500",
  },
  {
    title: "AI sắp xếp và làm đẹp",
    description: "Nhận gợi ý và mãn nhãn dựa trên thời tiết và lịch trình",
    image: th_o_Shelfy,
    badgeClass: "bg-purple-500",
  },
  {
    title: "Nhận gợi ý trang phục hàng ngày từ AI",
    description:
      "Ghi lại phong cách hàng ngày và khám phá thói quen mặc thực sự",
    image: g_i_h_m_nay_Shelfy,
    badgeClass: "bg-green-500",
  },
];

export const landingFooterData = {
  logo: landingFooterLogo,
  description:
    "Tủ đồ thông minh của AI. Số hóa tủ quần áo, nhận gợi ý trang phục thực tế và mặc đẹp hơn mỗi ngày.",
  badges: [
    { alt: "App Store", src: landingAppStoreBadge },
    { alt: "Google Play", src: landingGooglePlayBadge },
  ],
  columns: [
    {
      title: "PAGES",
      links: [
        "Tính năng",
        "Tiện ích Chrome",
        "Tạp chí",
        "Giới thiệu",
        "FAQ",
        "Thông báo",
      ],
    },
    {
      title: "SOCIAL",
      links: ["Facebook", "TikTok", "YouTube"],
    },
  ],
  contact: {
    title: "LIÊN HỆ",
    email: "support@Shelfy.app",
    address:
      "Looko Inc. 10F, 506 Teheran-ro, Gangnam-gu, Seoul, Republic of Korea",
  },
  legal: ["Chính sách bảo mật", "Điều khoản dịch vụ"],
  copyright: "© 2024 Looko Inc. Mọi quyền được bảo lưu.",
};
