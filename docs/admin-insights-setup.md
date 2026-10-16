# Thống kê admin, đánh giá và GA4

Admin: https://shelfy-web-d7d.pages.dev/admin

## Đã triển khai trong mã nguồn

- Tổng quan: doanh thu PAID theo ngày thanh toán, số đơn theo ngày tạo, tổng người dùng hiện tại và đăng ký trong kỳ (loại trừ admin), điểm trung bình và phân bố sao.
- Biểu đồ doanh thu và giao dịch dùng hai thang đo riêng. Kỳ 7/30/90 ngày bao gồm hôm nay, theo giờ Việt Nam. So sánh doanh thu với các ngày liền trước kỳ; hôm nay có thể chưa kết thúc nên đây không phải so sánh hai kỳ đầy đủ.
- Hoạt động: số bản ghi wardrobe, tryOns, suggestions, dailyOutfits tạo trong kỳ và còn lưu. Đây không phải DAU, số lần mở tính năng hoặc tổng lịch sử đã xóa. “—” nghĩa là truy vấn thất bại, không đồng nghĩa 0.
- Thống kê giao dịch theo trạng thái/kênh thanh toán và giao dịch gần đây. Giao dịch thử nghiệm Google Play đóng góp 0 đồng. Không coi PayOS/Google Play là nguồn thu hút khách.
- Các tổng tài chính dùng Firestore aggregation trên toàn bộ kỳ. Biểu đồ và phân tích chi tiết giới hạn 10.000 đơn gần nhất mỗi truy vấn; giao diện cảnh báo khi chạm giới hạn. Khi vượt quy mô này, cần tổng hợp theo ngày ở máy chủ.
- Đánh giá: người dùng gửi một lần 1–5 sao, góp ý tối đa 1.000 ký tự tại Hồ sơ → Đánh giá Shelfy. Mã ứng dụng mới cần được đưa vào bản mobile tiếp theo; bản 1.0.0 (2) đã cài không tự có màn hình này.
- Admin xem tổng, điểm trung bình, phân bố, lọc sao/kỳ và lịch sử 20 dòng/trang. Thống kê sao luôn áp dụng toàn bộ kỳ; bộ lọc sao chỉ áp dụng lịch sử. Tối đa 501 trang, cần thu hẹp kỳ nếu nhiều hơn.
- Đánh giá nằm trong `_appReviews/{uid}`, chỉ Worker đọc/ghi bằng service account. UID/email/thời gian do máy chủ xác định; admin không tham gia chấm sao. Tạo bằng precondition `exists:false` chống gửi trùng. Xóa tài khoản qua endpoint hiện có cũng xóa đánh giá. Firestore client không được truy cập collection này.

## GA4 cần chủ tài khoản hoàn tất

Hiện chưa có GA4, nên tab Đo lường hiển thị hướng dẫn kết nối, không dựng số liệu mẫu. Có thể hoàn tất độc lập với Google Play Billing và việc sửa OTP đang tạm dừng.

1. Trong Google Analytics, tạo property GA4 với múi giờ `Asia/Ho_Chi_Minh`, đơn vị VND và luồng **Web** cho `https://shelfy-web-d7d.pages.dev`.
2. Lấy **Measurement ID** dạng `G-…`. Đặt `VITE_GA_MEASUREMENT_ID` trong môi trường build Pages, rồi build/deploy lại website. Đây là mã công khai, không phải OAuth Client Secret.
3. Lấy **Property ID** dạng số trong Property details. Đặt `GA4_PROPERTY_ID` trong Worker (có thể dùng `npx wrangler secret put GA4_PROPERTY_ID` tại `edge-worker` để không ghi nhầm giá trị vào git).
4. Trong Google Cloud project `shelfy-acf38`, bật **Google Analytics Data API**. Trong **GA4 Property access management**, thêm `shelfy-worker@shelfy-acf38.iam.gserviceaccount.com` với quyền **Viewer**. Quyền Firebase/Cloud IAM không thay thế quyền GA4.
5. Kiểm tra cookie consent, GA4 Realtime và sự kiện `page_view`, `download_click` sau khi khách đồng ý. Nếu link tải chưa được cấu hình, website gửi `download_unavailable`, không tính lượt bấm tải thành công.
6. Tab Đo lường đọc số người, phiên, lượt xem, lượt bấm tải và `sessionSourceMedium` qua Data API bằng scope `analytics.readonly`. Access token/private key chỉ ở Worker. Báo cáo cache 5 phút và tối đa 100 nguồn có nhiều phiên nhất.

Website chỉ khởi tạo GA4 ở `/`, khi có Measurement ID hợp lệ và khách chọn đồng ý. Không khởi tạo trên admin, privacy hoặc account-deletion. URL đo lường bỏ path/query/fragment tùy ý, chỉ giữ UTM source/medium/campaign giới hạn ký tự; referrer chỉ giữ origin. Không gắn UID/email/tên người dùng vào GA4. Đổi ý tại “Tùy chọn đo lường” trên trang chủ.

Trong GA4 nên tắt Enhanced Measurement tự động nếu không cần, không bật thu thập dữ liệu người dùng do người dùng cung cấp, và không đưa thông tin cá nhân vào UTM. Kiểm tra cấu hình GA4 thực tế trước khi dùng báo cáo chính thức.

## Đo nguồn quảng bá

Ví dụ Facebook:
`https://shelfy-web-d7d.pages.dev/?utm_source=facebook&utm_medium=social&utm_campaign=ra_mat`

TikTok: đổi `utm_source=tiktok`. Đọc cột nguồn/phương tiện và phiên tương tác để so sánh. GA4 chỉ có dữ liệu kể từ lúc bật thu thập; không khôi phục lượt truy cập trước đó. Cookie bị từ chối, trình chặn quảng cáo và độ trễ xử lý có thể làm số liệu thiếu.

Bản này đo website và lượt bấm tải, chưa tích hợp Firebase Analytics trong mobile, attribution cài đặt hoặc doanh thu theo chiến dịch. Lượt bấm tải không chứng minh đã cài app hay đã thanh toán. Không lấy đánh giá từ CH Play theo lựa chọn của chủ dự án.

## Kiểm tra

- Worker: `npm test` tại `edge-worker` (review validation/ownership/duplicate, cửa sổ ngày VN, aggregation, GA4 auth/cache và chặn route chưa đăng nhập).
- Web: `node --test test/analytics.test.js`, `npm run lint`, `npm run build` tại `FE/Shelfyy`.
- Mobile: `npm run lint`, `npm test` tại `Mobile/Shelfy`; kiểm tra màn hình gửi sao trên thiết bị trong bản build kế tiếp.
- Deploy `firestore.indexes.json` trước Worker để tạo index cho rating/thời gian và collection-group activity. Đợi index READY trước kiểm tra báo cáo.

Tài liệu Data API: https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport

### Kết quả ngày 15/10/2026

- Worker 35/35, mobile 44/44, web analytics 3/3 kiểm thử đạt; lint web/mobile và production build web đạt. Expo export Android thành công (không phải APK/AAB, chưa kiểm tra trên điện thoại).
- Chạy các truy vấn tổng quan 7 ngày và toàn thời gian trên Firestore thật bằng tài khoản CLI đã đăng nhập: truy vấn đánh giá, SUM/COUNT giao dịch và bốn collection-group hoạt động đều trả kết quả; không ghi dữ liệu thử vào production. Các chỉ mục mới đã sẵn sàng.
- Worker version `1d5c3645-8f0d-43ff-8e39-533e0b1a31db`; Pages production deployment `5b10ff62`. Kiểm tra HTTP 200 và hash chunk admin trên domain chính trùng bản build cục bộ. Các endpoint mới trả 401 khi không có phiên đăng nhập.
- Pages production branch thực tế là `feature/mobile-firebase-migration`; deploy với `--branch main` chỉ tạo preview. Cần dùng đúng production branch cho các lần cập nhật tiếp theo.
- Chưa xác minh giao diện bằng ảnh/trình duyệt đăng nhập hoặc luồng gửi đánh giá trên thiết bị: trình duyệt tích hợp không khả dụng, lệnh chạy Chromium để chụp bản kiểm thử bị công cụ tự động chặn (`blocked by policy`).
- GA4 chưa được cấu hình, nên chưa có bằng chứng số liệu GA4 thật. Không thay đổi cấu hình OTP đang tạm dừng.
