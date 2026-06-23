export const premiumTopNavData = {
  searchPlaceholder: "Tìm kiếm trang phục, xu hướng...",
  avatar:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDYNPJaogo4LakJHNKP008AegQgq_VEworEAnG3tHMKyQpYcu7vQ8OtmTIg4z6Myt_xdalPq2Pv9pWLZ22_8x3Jdq8vXl0JVujYQ3RjwFuSuL9GmCYeIq1zLLA25jE1uR2fmzIQcQEGOYhbbQRqagkDjSYj9hAMXekSl9FcFuAEWgJ49a1C20h_ZDlrpCq7zCSi9S83Rge9fDytWpgIwJiJJqs5o1U9EN8CWmfnqGN5OBa-OAWcKVXpBAkJSlsxnZ8wvn7CqgcUsRak",
};

export const premiumHeroData = {
  title: "Nâng Tầm Phong Cách Cùng Premium",
  description:
    "Trải nghiệm tủ đồ kỹ thuật số thông minh hơn với trợ lý AI và không giới hạn lưu trữ.",
};

export const premiumPlans = [
  {
    name: "Miễn phí",
    tier: "Cơ bản",
    price: "0đ",
    suffix: "/tháng",
    action: "Sử dụng ngay",
    featured: false,
    features: [
      { label: "Thử đồ ảo: 5 lượt/ngày", included: true },
      { label: "Lưu trữ tối đa 100 món đồ", included: true },
      { label: "AI Stylist cao cấp", included: false },
    ],
  },
  {
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
      { label: "Hỗ trợ AI Stylist 24/7", included: true, premium: true },
    ],
  },
];

export const premiumComparisonData = {
  title: "So sánh chi tiết tính năng",
  headers: ["Tính năng", "Miễn phí", "Pro (Cá nhân)"],
  rows: [
    [
      "Lượt thử đồ ảo (AI Magic Mirror)",
      "5 lượt/ngày",
      "100 lượt/tháng",
  
    ],
    [
      "Sức chứa tủ đồ kỹ thuật số",
      "100 items",
      "Không giới hạn",
    ],
    ["Stylist AI cao cấp", "remove", "check_circle", "check_circle"],
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
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBN--USdSWspW1av4di_6jVyok8oM5wdNqe8kYECjV8hcm7pkD46818Yez9y97dghLTvza5aW3FFD6HbuCLzBfPxYJPKJK-Dk2_BOFhEpc0eGYaiaa_vr_IIpwfeN9-psAvNLRNcFD2MjHI-Gm5GWCAedmRYlmri2L9HwzWbsQt1dvOLCBFgDOMARAzCoLk60v0RJutAvwqarzZu9NrnJ-gpEGNoTaY3xJ58zWnhhVc54RHpjHYsqsNJdYPUdJ5rnr7Khdw0PBMBlfs",
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
      src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCXOjb1Xbd1pp5nVoCWfrN5JhHJvQSJ77AzF_qVnVztznhbI3iQABnF6pmiEG7-akV7oYpGitCcGHJ2Qo51VqzVyPrYtoOKPOMyDKUyvl-EVTVfxpzbgk4Ciy0quxsUxcFCV4R0yG0nqTFhTP_1XV-_fJmmZw1bFdmwXYYuTa5vuFhahPr4CM4PFmBTqaq0kP8LaFyuBDS60rFSdPt_sPsQoTfB4hO7agy1XYzIYzNUfHPu5zw4B0lQm8bfqZaNXMgGo6RRy4haG9M3",
    },
    {
      alt: "Google Play Store download badge",
      src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDHhDA-QTP0g4prqE6_mgJyegTZizoE0fv_wmrSkugOO79BTKq1KFA6ZDZ-T2kDDF07K1YjiJCy-9blUWHrAZV7aLqUr9Pvq9t-hu2LJw-EN0MgdfAaB-lG_1EuawSxz19CmtN5NAl6eHDwBmWpOYTb3FDixeXKRt6FEmBKwYu3hJNfTRh6qDO7nabGoom9YvbZ6yct_bhUQPpxSdYe1K9UP25ITyjcvZmbvbNaxE6bt0AC2vK6udvyaKNfLkcAH4Oy8suyagdIW6oa",
    },
  ],
  links: ["Điều khoản", "Bảo mật", "Liên hệ"],
  copyright:
    "© 2024 Shelfy. All rights reserved. Designed for the fashion-forward.",
};
