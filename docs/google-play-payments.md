# Kênh thanh toán Shelfy

Cập nhật 14/10/2026. Đã tạo Shelfy trong Play Console với package `com.duongminhkiet.shelfy` và đăng ký Android app tương ứng trong Firebase `shelfy-acf38`.

## Đã thực hiện

| Profile EAS | Kênh | Thanh toán |
| --- | --- | --- |
| preview | DIRECT | PayOS hiện tại, APK phát trực tiếp (`com.shelfy.app`) |
| production | GOOGLE_PLAY | Google Play Billing (`com.duongminhkiet.shelfy`); chờ cấu hình sản phẩm và merchant |

Biến `EXPO_PUBLIC_DISTRIBUTION_CHANNEL` được profile EAS đặt lúc build; không chọn bằng đuôi APK/AAB, không đổi từ màn hình người dùng. Cấu hình build từ chối profile production nếu đặt DIRECT hoặc thiếu kênh hợp lệ. EAS profile env ghi đè giá trị từ .env local.

Bản Play không lấy catalog bật PayOS từ Worker, không mở checkout/tiếp tục đơn chờ, chặn các hàm tạo/kiểm tra/hủy đơn PayOS và không xử lý return URL PayOS. Lịch sử giao dịch và entitlement của chính tài khoản vẫn đọc được; các gói đã mua hợp lệ không bị xóa. Worker vẫn phục vụ PayOS cho bản phát trực tiếp.

Đã tích hợp code Google Play Billing bằng expo-iap, xác minh trên Worker và ghi sổ tài chính chung. Chủ dự án xác nhận chưa thiết lập hồ sơ thanh toán, nên cấu hình máy chủ vẫn chưa bật mở bán. Hướng dẫn và giới hạn chi tiết: [google-play-billing-setup.md](google-play-billing-setup.md). Chưa build APK/AAB; APK cũ không tự cập nhật code.

## Cần chủ dự án chuẩn bị cho Google Play Billing

1. Đã tạo ứng dụng Shelfy với package `com.duongminhkiet.shelfy`. Firebase Android app ID: `1:1030430129801:android:02e161f4656b34ab4e9058`. Bản Play dùng `Mobile/Shelfy/google-services.play.json`; bản phát trực tiếp giữ file cũ. Hai bản dùng chung project Firebase và dữ liệu sau khi đăng nhập.
2. Hoàn thành thiết lập tài khoản thanh toán/merchant khi bán sản phẩm.
3. Code giữ mua từng kỳ, không tự gia hạn: sản phẩm in-app mua một lần, consume sau cấp quyền lợi để mua lại. Product ID dự kiến: shelfy_pro_30_days và shelfy_premium_365_days. Không cấu hình subscription tự gia hạn, rental, preorder hoặc multi-quantity.
4. Tạo sản phẩm PRO/PREMIUM, giá và khả năng bán theo vùng. App phải lấy giá hiển thị từ Google thay vì coi giá PayOS là giá checkout Play.
5. Cấp quyền Android Publisher cần thiết cho service account của Worker qua Play Console; credential chỉ lưu trong Worker.
6. Đã tích hợp expo-iap 6.0.2, callback/recovery, kiểm tra token/Orders API trên Worker và consume server sau commit. Cần kiểm tra native/giao dịch thật trên Play; không cấp quyền lợi chỉ dựa vào callback mobile.
7. Bổ sung provider Google Play vào sổ tài chính: order ID, product ID, token được bảo vệ, giá/tiền tệ, UID liên kết, thời điểm và trạng thái. Dashboard phải phân biệt doanh thu PayOS/Google, không coi giá catalog là tiền thực nhận của Google.
8. Kiểm tra giao dịch Google bằng tài khoản license tester và bản cài từ track internal/closed. Cấu hình xử lý hoàn tiền/thu hồi quyền lợi và thông báo server theo loại sản phẩm trước khi bán thật.

Không đặt PayOS secret hoặc private key Google trong app. Worker tái dùng service account hiện có, với scope androidpublisher và quyền riêng trong Play Console. Biến GOOGLE_PLAY_* đã được khai báo trong wrangler.jsonc và .dev.vars.example.

## Tài liệu

- Chính sách thanh toán: https://support.google.com/googleplay/android-developer/answer/9858738
- Expo IAP và yêu cầu development build: https://docs.expo.dev/guides/in-app-purchases/

PayOS trong APK phát trực tiếp không đồng nghĩa bản đó đủ điều kiện phân phối qua Google Play. Ngoại lệ thanh toán phải được xác nhận và tham gia chương trình Google thích hợp; hiện Shelfy không dùng ngoại lệ.
