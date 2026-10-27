# Phát hành APKPure

- Build: `npx eas-cli@latest build --platform android --profile apkpure` trong `Mobile/Shelfy`.
- Package: `com.duongminhkiet.shelfy`, trùng mục ứng dụng đã tạo trên APKPure.
- Kênh build: `APKPURE`, dùng luồng PayOS ngoài Google Play; không bật plugin thanh toán Play.
- Firebase: dùng đăng ký Android trong `google-services.play.json` vì package trùng nhau.
- EAS environment: `production`; APK ký bằng credentials EAS của package này, versionCode tự tăng.
- Không tải APKPure lên Google Play. Profile `production` vẫn build AAB kênh `GOOGLE_PLAY`.

Tên gói trùng không bảo đảm cập nhật chéo giữa hai cửa hàng: Google Play có thể dùng app signing key khác khóa ký APK trên EAS. Nếu APKPure yêu cầu chữ ký giống bản Google Play, phải kiểm tra chứng chỉ trong Play Console trước; không thể giải quyết bằng đổi tên file. Không gỡ app đã cài để vượt lỗi chữ ký nếu chưa sao lưu dữ liệu cần giữ.

Sau build, kiểm tra package/version với `aapt dump badging` và chữ ký với `apksigner verify --print-certs`. Kiểm thử đăng nhập, tải ảnh và PayOS trên thiết bị trước khi phát hành rộng rãi; build thành công không bảo đảm APKPure phê duyệt.
