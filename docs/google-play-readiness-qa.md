# Shelfy: báo cáo kiểm thử trước Google Play

Cập nhật: 10/10/2026. Kiểm tra code trên nhánh `feature/mobile-firebase-migration`.

## Kết luận

Đã vá các lỗi tái hiện trong vòng kiểm tra và triển khai Worker/web hỗ trợ. Chưa thể coi là bản sẵn sàng phát hành Google Play: PayOS trong app, giấy phép dịch vụ, khai báo Play Console và kiểm tra bản AAB thực tế còn cần hoàn tất. Chưa build APK/AAB trong lần này theo yêu cầu của chủ dự án.

## Lỗi đã sửa

| Lỗi | Cách sửa / bằng chứng |
| --- | --- |
| Thời tiết chờ GPS vô hạn khi máy ảo không có vị trí | Giới hạn lấy GPS 8 giây rồi dùng TP.HCM. Test timeout/không có GPS/từ chối quyền đều đạt. |
| Trang chủ vẫn báo chưa chọn outfit sau khi xác nhận ở tab khác | Tải lại outfit khi màn hình được focus. Đã xác nhận trên máy ảo với dữ liệu thật. |
| Gói trả phí có tủ đồ không giới hạn nhưng thanh dung lượng màu đỏ | Chỉ báo vượt giới hạn khi có giới hạn hữu hạn. |
| Test cũ mock Firebase Functions dù app đã chuyển sang Worker/Firestore | Cập nhật các test upload, tủ đồ, gợi ý, outfit và Try-on theo API đang dùng. |
| Cảnh báo bảo mật critical từ shell-quote gián tiếp | Override phiên bản tương thích lên 1.12.0; npm audit không còn critical. |
| Quyền READ_MEDIA_IMAGES rộng hơn nhu cầu chọn từng ảnh | Bỏ quyền và chặn READ_MEDIA_IMAGES/VIDEO; các màn đã dùng system image picker, không yêu cầu quyền thư viện. |

## Bổ sung phục vụ phát hành

- Nút báo cáo kết quả AI trong màn Try-on. Worker xác minh chủ prediction và lưu `_aiContentReports` server-only. Các bài kiểm tra xác thực đầu vào và lưu một lần đều đạt. API production không có token trả 401.
- Trang quyền riêng tư: https://shelfy-web-d7d.pages.dev/privacy, có liên kết trong màn Cá nhân.
- Trang yêu cầu xóa tài khoản: https://shelfy-web-d7d.pages.dev/account-deletion. Yêu cầu gửi qua email hỗ trợ; phải xác minh trước khi xóa. Chủ dự án cần theo dõi hộp thư và xử lý các yêu cầu.
- Footer landing page dùng thông tin Shelfy và email hỗ trợ thay thông tin công ty mẫu.
- EAS production cấu hình AAB và tăng versionCode từ xa.
- Expo cập nhật các bản vá tương thích SDK 57.

## Kiểm tra đã đạt

| Kiểm tra | Kết quả |
| --- | --- |
| Mobile unit tests | 44/44 (cập nhật Billing 14/10) |
| Worker unit tests | 24/24 (cập nhật Billing 14/10) |
| Mobile lint | Đạt |
| Frontend lint và Vite build | Đạt |
| Expo Doctor | 21/21 |
| Android JS export với Hermes | Đạt, 1.839 modules; đây không phải APK/AAB |
| git diff --check | Đạt |
| Worker /health | HTTP 200 |
| Admin, billing và AI report không đăng nhập | HTTP 401 |
| URL privacy/account-deletion production | HTTP 200; Pages deploy chứa cả hai route |

Mobile hiện dùng JavaScript, không có tsconfig/typecheck project; lint và export không thay thế kiểm tra kiểu đầy đủ.

## Kiểm tra tương tác đã thực hiện trước khi phiên bị gián đoạn

Trên máy ảo Android, qua Expo Go/Metro, với tài khoản đang đăng nhập:

- Mở app và chuyển tab.
- Chọn/cắt ảnh bằng trình chọn ảnh Android, upload Cloudinary và thêm món đồ vào Firestore; món đồ xuất hiện trong tủ đồ.
- Lấy thời tiết qua fallback TP.HCM.
- Tạo gợi ý và xác nhận outfit hôm nay; quay về trang chủ hiển thị outfit đã xác nhận sau bản vá.
- Kiểm tra Try-on thiếu ảnh trả hướng dẫn thay vì chạy Replicate.

Vòng kiểm tra đã tạo một món đồ tên `Aos o Vy`, một gợi ý và một outfit trong tài khoản `toilakiet01@gmail.com`. Chưa xóa dữ liệu kiểm thử này: máy ảo không còn kết nối sau khi tiếp tục phiên, và máy không có Firebase service-account secret để dọn dữ liệu trực tiếp an toàn.

## Chưa xác nhận / việc còn lại trước khi mời tester

1. Đã tích hợp code Google Play Billing cho production và giữ PayOS cho preview. Chủ dự án đã tạo app Play/Firebase nhưng chưa có hồ sơ thanh toán. Cần cấu hình merchant, sản phẩm, quyền API và kiểm tra giao dịch native trên Play trước khi bật mở bán; xem `google-play-billing-setup.md`.
2. Xác minh giấy phép model IDM-VTON và gói Open-Meteo trước khi kinh doanh. Kế hoạch hiện tại xác định chúng cho demo phi thương mại.
3. Chạy một lượt Try-on thật và gửi báo cáo AI từ app đến Firestore; chưa chạy inference có phí trong vòng này. Có nút báo cáo không đồng nghĩa đã hoàn tất quy trình kiểm duyệt/chặn nội dung.
4. Kiểm tra OTP đăng ký/quên mật khẩu bằng email thật, đổi avatar, nhập tiếng Việt bằng bàn phím thật, và xóa một tài khoản thử riêng. Unit tests auth đạt nhưng chưa xác nhận toàn bộ chuỗi email thật trong vòng này.
5. Build AAB khi được yêu cầu, chạy độc lập trên Android và kiểm tra manifest/quyền, deep link và hoạt động không cần Metro. Expo Go không chứng minh bản release hoạt động hoàn toàn.
6. Hoàn thành Privacy/Data safety, App access (tài khoản reviewer), content rating, store listing và closed testing trong Play Console.
7. npm audit còn 33 cảnh báo (22 high, 11 moderate). Không dùng audit fix --force vì đề xuất có thể đổi SDK/React Native sang phiên bản không tương thích. Cần phân loại từng advisory và kiểm tra khả năng khai thác trước phát hành công khai.

## Triển khai

- Worker version: `a2640cac-e91e-45f5-a4e1-e1e8539e4e50`.
- Pages deployment: https://4c1b2ffc.shelfy-web-d7d.pages.dev.
- Chưa commit, chưa build hoặc submit lên Play.

## Tài liệu chính thức

- Google Play Payments: https://support.google.com/googleplay/android-developer/answer/9858738
- AI-generated content: https://support.google.com/googleplay/android-developer/answer/13985936
- Account deletion: https://support.google.com/googleplay/android-developer/answer/13327111
- Expo SDK 57 ImagePicker: https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/
