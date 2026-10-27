# Shelfy

Ứng dụng quản lý tủ đồ, gợi ý phối đồ và thử trang phục bằng AI.

## Kiến trúc hiện tại

- `Mobile/Shelfy`: ứng dụng React Native + Expo, dùng Firebase Auth, Firestore và Cloudflare Worker.
- `edge-worker`: API cho admin, xác thực email, tải ảnh có chữ ký, AI và thanh toán.
- `FE/Shelfyy`: landing page, admin, chính sách quyền riêng tư và hướng dẫn xóa tài khoản; triển khai bằng Cloudflare Pages.
- Cloudinary: lưu ảnh. Khóa bí mật của nhà cung cấp nằm ở phía máy chủ.
- `functions`: mã Firebase Functions được giữ riêng trong đợt dọn này.
- `docs`, `doc`, `artifacts`: tài liệu và sản phẩm build. Một số tài liệu cũ mô tả kiến trúc trước đây, không phải hướng dẫn chạy hiện tại.

Backend Java/Express, các trang web nghiệp vụ cũ và cấu hình Docker Compose đã được gỡ khỏi dự án. App mobile và admin hiện tại không sử dụng chúng.

## Chạy website

Dùng Node.js 22.12+ và npm. Chạy trong `FE/Shelfyy`:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Điền cấu hình Firebase và Worker theo `.env.example`. Trang admin cần tài khoản có quyền admin; tạo file môi trường không tự cấp quyền.

```powershell
npm run build
npm run lint
node --test test/*.test.js
```

Các đường dẫn: `/`, `/admin`, `/privacy`, `/account-deletion`.
Nút tải mặc định mở Shelfy trên APKPure; có thể thay bằng `VITE_ANDROID_DOWNLOAD_URL`.

## Chạy Worker

Trong `edge-worker`:

```powershell
npm ci
Copy-Item .dev.vars.example .dev.vars
npm run dev
```

Cấu hình giá trị thật theo file mẫu. Không commit `.dev.vars`, khóa dịch vụ hoặc token.
Kiểm tra bằng `npm test`; triển khai bằng `npm run deploy` sau khi đăng nhập Wrangler và cấu hình secrets/bindings trên Cloudflare.

## Chạy mobile

Trong `Mobile/Shelfy`:

```powershell
npm ci
Copy-Item .env.example .env
npm start
```

Dùng cấu hình Firebase/Worker thật hoặc emulator tương ứng. Module native có thể cần development build.
Kiểm tra bằng `npm test` và `npm run lint`.

Các profile Android trong `eas.json`:

- `preview`: APK kênh DIRECT.
- `production`: AAB kênh GOOGLE_PLAY.
- `apkpure`: APK kênh APKPURE, package `com.duongminhkiet.shelfy`.

Chi tiết phân phối ngoài Google Play: [docs/apkpure-release.md](docs/apkpure-release.md).

## Các dịch vụ đang triển khai

- Website: https://shelfy-web-d7d.pages.dev
- Admin: https://shelfy-web-d7d.pages.dev/admin
- Worker health: https://shelfy-edge.shelfy-edge-worker.workers.dev/health
- APKPure: https://apkpure.com/p/com.duongminhkiet.shelfy

Gỡ mã nguồn local không dừng dịch vụ cloud, xóa dữ liệu Firebase hoặc gỡ app đã phát hành.
