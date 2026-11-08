# Build Shelfy Mobile với Firebase Spark

## Kiến trúc đang dùng

- Firebase Authentication: đăng ký, đăng nhập và quản lý tài khoản.
- Cloud Firestore: hồ sơ, tủ đồ, thời tiết cache, lịch trong ngày, gợi ý và lịch sử mặc.
- Cloudinary: ảnh trang phục, avatar, ảnh đầu vào và kết quả Try-on.
- Cloudflare Worker: xác thực Firebase ID token, ký upload Cloudinary và gọi Replicate.
- Mobile: Open-Meteo, lịch thiết bị và bộ luật gợi ý `rule-based-v1` chạy trực tiếp trong app.

Thư mục `functions/` chỉ còn là mã tham khảo. `firebase.json` không deploy Cloud Functions.

## Biến cho mobile và EAS preview

```dotenv
EXPO_PUBLIC_USE_FIREBASE_EMULATOR=false
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=shelfy-acf38
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_EDGE_API_URL=
EXPO_PUBLIC_WEATHER_API_BASE_URL=https://api.open-meteo.com/v1
```

Các biến `EXPO_PUBLIC_*` được nhúng vào APK nên không được chứa Cloudinary API Secret
hoặc Replicate token. Cấu hình EAS environment `preview` sau khi đăng nhập đúng tài khoản Expo.

## Hoàn tất Cloudflare Worker

Làm theo `docs/cloudflare-replicate-setup.md`. Worker chỉ deploy được sau khi:

1. `wrangler login` hoàn tất.
2. KV `RATE_LIMITS` đã được tạo và binding được thêm vào `edge-worker/wrangler.jsonc`.
3. Đã đặt Firebase API key, Cloudinary credentials và Replicate token bằng `wrangler secret put`.
4. URL Worker sau deploy được gán vào `EXPO_PUBLIC_EDGE_API_URL` ở local và EAS preview.

## Tạo APK

```powershell
cd Mobile/Shelfy
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest env:create --environment preview --name TEN_BIEN --value GIA_TRI --visibility plaintext --non-interactive
npx eas-cli@latest build -p android --profile preview
```

`preview` trong `eas.json` tạo file APK cài trực tiếp. Calendar là native module,
vì vậy cần APK/development build; Expo Go không hỗ trợ tính năng lịch này.

## Kiểm tra trước build

```powershell
npm run lint
npx expo-doctor
$env:EAS_BUILD_PROFILE='preview'; npx expo config --type public
```

Script cấu hình sẽ dừng build nếu Firebase vẫn dùng giá trị demo hoặc Worker URL chưa phải HTTPS thật.
