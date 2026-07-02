const outfitMainImage = new URL("../../image/outfit-main.png", import.meta.url).href;
const trialBaseImage = new URL("../../image/trial-base.png", import.meta.url).href;
const trialAiResultImage = new URL("../../image/trial-ai-result.png", import.meta.url).href;
const trialLookImage = new URL("../../image/trial-look.png", import.meta.url).href;

export const trialTopNavData = {
  brand: "Shelfy",
  badge: "AI Try-On",
};

export const selectedOutfitData = {
  header: "Trang phục đã chọn",
  image: outfitMainImage,
  title: "Minimal Urban Set",
  description: "Blazer, T-shirt, Trousers",
};

export const uploadData = {
  defaultTitle: "Tải ảnh gương mặt của bạn",
  uploadedTitle: "Ảnh đã được tải lên thành công!",
  helper: "Định dạng JPG, PNG (Tối đa 10MB)",
  buttonLabel: "Chọn ảnh",
};

export const trialTipData = {
  icon: "lightbulb",
  text: "Để có kết quả tốt nhất, hãy sử dụng ảnh chân dung rõ nét, ánh sáng tự nhiên và phông nền đơn giản.",
};

export const trialActionData = {
  label: "Thử đồ ngay với AI",
  alert: "Vui lòng tải lên ảnh của bạn trước khi thử đồ.",
};

export const trialShowcaseData = {
  placeholder: {
    image: trialBaseImage,
    title: "Sẵn sàng để biến đổi",
    description:
      "Kết quả thử đồ AI sẽ xuất hiện tại đây sau khi bạn tải ảnh và nhấn nút 'Thử đồ ngay'.",
  },
  processing: {
    image: trialAiResultImage,
    title: "Đang xử lý...",
  },
  result: {
    image: trialLookImage,
    badge: "AI Generation Complete",
    saveLabel: "Lưu vào Tủ đồ",
  },
};

export const trialMetricsData = {
  metrics: [
    { label: "Độ chính xác AI", value: "98.4%" },
    { label: "Thời gian tạo", value: "4.2s" },
  ],
  historyLabel: "Xem lịch sử thử đồ",
};
