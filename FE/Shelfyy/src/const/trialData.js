const outfitMainImage = new URL("../../image/outfit-main.png", import.meta.url).href;
const trialBaseImage = new URL("../../image/trial-base.png", import.meta.url).href;
const trialAiResultImage = new URL("../../image/trial-ai-result.png", import.meta.url).href;
const trialLookImage = new URL("../../image/trial-look.png", import.meta.url).href;

export const trialTopNavData = {
  brand: "Shelfy",
  badge: "AI Try-On",
};

export const selectedOutfitData = {
  header: "Món chính đang thử",
  image: outfitMainImage,
  title: "Chưa chọn món chính",
  description: "Chọn áo, áo khoác, quần hoặc váy trong tủ đồ",
};

export const uploadData = {
  defaultTitle: "Tải ảnh toàn thân của bạn",
  uploadedTitle: "Ảnh toàn thân đã sẵn sàng",
  helper: "Định dạng JPG, PNG (Tối đa 10MB)",
  buttonLabel: "Chọn ảnh",
};

export const trialTipData = {
  icon: "lightbulb",
  text: "Kết quả tốt nhất khi ảnh người là ảnh toàn thân, ánh sáng rõ, dáng đứng thẳng và ít vật che người.",
};

export const trialActionData = {
  label: "Thử món này với AI",
  alert: "Vui lòng tải lên ảnh của bạn trước khi thử đồ.",
};

export const trialShowcaseData = {
  placeholder: {
    image: trialBaseImage,
    title: "Sẵn sàng thử món chính",
    description:
      "Sau mỗi kết quả, Shelfy sẽ dùng ảnh mới nhất để thử món tiếp theo trong cùng phiên.",
  },
  processing: {
    image: trialAiResultImage,
    title: "Đang xử lý...",
  },
  result: {
    image: trialLookImage,
    badge: "AI Generation Complete",
    saveLabel: "Lưu kết quả",
  },
};

export const trialMetricsData = {
  metrics: [
    { label: "Món AI xử lý", value: "1 món chính" },
    { label: "Thời gian tạo", value: "-" },
  ],
  historyLabel: "Xem lịch sử thử đồ",
};
