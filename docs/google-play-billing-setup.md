# Thiết lập Google Play Billing Shelfy

Cập nhật 15/10/2026. AAB production 1.0.0 (2) đã build thành công, có quyền BILLING và đã được tải lên Play Console. Service account của Worker đã gọi được Android Publisher API; hai sản phẩm ACTIVE, chỉ Việt Nam/VND, đúng giá 69.000đ và 599.000đ. Google Play Billing được bật trong cấu hình Worker; chưa xác nhận giao dịch mua thử trên thiết bị.

Worker đã deploy với billing enabled, version `ef242cf5-6eff-494f-bf56-75b422cb5953`. `/health` trả 200; context/verify không đăng nhập trả 401; 24/24 Worker tests đạt. Chứng từ cấu hình: `artifacts/google-play-billing-activation-2026-10-15.json`. Các probe token/mã đơn giả trả 400/404, không phải 401/403; đây chưa phải bằng chứng xác minh hoặc consume một giao dịch thật.

## Các bước cần làm

1. Hoàn thành hồ sơ thanh toán để bán sản phẩm trong Play Console.
2. Bật Google Play Android Developer API ở Google Cloud project shelfy-acf38.
3. Play Console → Users and permissions → mời service account `shelfy-worker@shelfy-acf38.iam.gserviceaccount.com`, cấp cho Shelfy: **View financial data, orders, and cancellation survey responses** và **Manage orders and subscriptions**. Firebase IAM không thay thế quyền này. Worker tái dùng FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY hiện có; không gửi key vào chat/mobile.
4. Tạo sản phẩm **mua một lần / in-app**:

   | Product ID | Tên | Giá VN dự kiến | Quyền lợi |
   | --- | --- | --- | --- |
   | shelfy_pro_30_days | Shelfy PRO 30 ngày | 69.000đ | 30 ngày |
   | shelfy_premium_365_days | Shelfy PREMIUM 365 ngày | 599.000đ | 365 ngày |

   Purchase option dạng Buy, chỉ mở Việt Nam/VND; không subscription tự gia hạn, rental, preorder hoặc multi-quantity. Đã xác minh qua API ngày 15/10/2026: `pro-30-days` và `premium-365-days` đều ACTIVE, không có khu vực khác AVAILABLE. AAB nằm tại `artifacts/Shelfy-GooglePlay-1.0.0-v2.aab`.
5. Sau khi sản phẩm kích hoạt và API sẵn sàng, đổi GOOGLE_PLAY_BILLING_ENABLED thành true trong wrangler.jsonc rồi deploy Worker. Các product ID đã có trong cấu hình; nếu thay ID trong Console phải đồng bộ Worker.
6. Thêm tài khoản License testing và tester internal track. Cài app từ Google Play bằng đúng tài khoản tester.
7. Kiểm tra mua, gia hạn, upgrade, hủy/pending, mất mạng, mở lại app, callback lặp và refund. Entitlement chỉ tăng một lần; tiền test không tăng doanh thu.

## Luồng và dữ liệu đã có

- Profile preview: PayOS / com.shelfy.app. Production: Google Play Billing / com.duongminhkiet.shelfy. Hai bản dùng chung Firebase, quyền lợi và lịch sử.
- Native expo-iap 6.0.2, plugin pin store play. Listener ở root app; recovery khi mở lại; nút Kiểm tra giao dịch. Giá/offer hiển thị lấy từ Google.
- GET /v1/billing/google-play/context trả SKU, account ID đã băm và readiness. POST /v1/billing/google-play/verify chỉ nhận productId/purchaseToken. Số tiền, package và trạng thái không do client quyết định.
- Worker xác minh purchase qua ProductsV2, kiểm tra owner/SKU/quantity/trạng thái; Orders API cung cấp tổng tiền thật. Chỉ hỗ trợ VND để dashboard không cộng nhầm nhiều tiền tệ.
- Transaction ghi payment, quyền lợi và record recovery đồng thời. PENDING không cấp gói; callback lặp không gia hạn hai lần. Consume ở server sau commit, không consume trước cấp gói.
- `_googlePlayPurchases/{hash}` giữ token server-only; token không được trả trong mobile history/admin API. Firestore catch-all deny đã bảo vệ collection này.
- `_billingPayments/gp_{hash}` là sổ chung, giữ Google order ID/product ID/provider/giá/số tiền/thời điểm/isTest. Mirror dưới users chỉ chứa dữ liệu tóm tắt. Xóa tài khoản ẩn danh sổ chung và không cho token cũ cấp lại quyền lợi.
- Giao dịch test: amountPaid=0; providerAmount ghi giá test để tham khảo. CSV/admin có provider và cờ test. Phí Google/netAmount chưa biết được giữ null, cần báo cáo đối soát sau.
- Cron chọn tối đa 30 token đến hạn mỗi 15 phút. Giao dịch đã trả được kiểm tra lại khoảng 24 giờ; consume lỗi retry khoảng 15 phút. Đây là polling, chưa RTDN realtime.

## Giới hạn cần biết

- Refund giao dịch mới nhất khôi phục snapshot quyền lợi trước nếu giao dịch trước còn PAID. Refund một khoản cũ trong chuỗi gia hạn được đánh dấu entitlementReviewRequired để xử lý thủ công, tránh thu hồi nhầm quyền lợi mua sau. Cần theo dõi REVIEW và cờ này trước khi mở bán lớn.
- Native build và manifest AAB đã được xác minh. Google checkout, consume và cấp quyền lợi với purchase token thật chưa được kiểm chứng trên thiết bị. IAP không chạy trong Expo Go; cần cài bản internal testing từ Google Play và dùng tài khoản License testing.
- Trước kinh doanh cần xác minh giấy phép model Replicate và dịch vụ thời tiết như báo cáo QA đã nêu.

## Tài liệu

- [Google API và quyền service account](https://developers.google.com/android-publisher/getting_started)
- [Xác minh purchase](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.productsv2/getproductpurchasev2)
- [Consume server](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products/consume)
- [Số tiền đơn Google](https://developers.google.com/android-publisher/api-ref/rest/v3/orders/get)
- [Expo IAP](https://docs.expo.dev/guides/in-app-purchases/)
- [OpenIAP Expo SDK 57](https://www.openiap.dev/docs/setup/expo)
