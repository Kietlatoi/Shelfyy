# Shelfy Google Play AAB 1.0.0 (2)

- Build EAS: `51095ae5-d737-4fe9-8a1c-c84c4c8b9a85`, trạng thái FINISHED.
- URL: https://expo.dev/accounts/duongminhkiet/projects/Shelfy/builds/51095ae5-d737-4fe9-8a1c-c84c4c8b9a85
- Profile/environment: production / GOOGLE_PLAY.
- Package trong manifest: `com.duongminhkiet.shelfy`.
- Version name/code: `1.0.0` / `2`.
- File local: `artifacts/Shelfy-GooglePlay-1.0.0-v2.aab` (76.521.910 bytes).
- SHA256: `0BC2421F805F61B8C27BBA2CC1809DBE77A44EB414C68E768E4ED4D7AD903B06`.
- Đã validate bằng Google bundletool 1.18.3 và đọc manifest từ chính artifact.
- Có quyền `com.android.vending.BILLING`; không có READ_MEDIA_IMAGES/READ_MEDIA_VIDEO.

Đây là build cloud trên EAS. Chưa upload/rollout lên Play Console, chưa kiểm tra app được cài từ Play hoặc thực hiện giao dịch Google thực tế. Cấu hình mở bán Worker vẫn cần hoàn tất sản phẩm và xác minh quyền API theo `docs/google-play-billing-setup.md`.

Bước tiếp theo: Play Console → Shelfy → Kiểm thử và phát hành → Thử nghiệm nội bộ → Tạo bản phát hành → upload AAB. Sau khi Google xử lý và nhận Billing permission, quay lại Sản phẩm tính phí một lần để tạo SKU PRO/PREMIUM.
