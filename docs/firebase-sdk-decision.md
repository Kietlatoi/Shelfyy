# Quyết định SDK Firebase cho Shelfy Mobile

Ngày: 26/09/2026. Trạng thái: chọn Firebase JS SDK; xác nhận lần cuối bằng Rules Emulator và APK nội bộ trước khi đóng task 03.

## Bối cảnh

- Mobile hiện dùng Expo SDK `~57.0.24`, React Native `0.86.3`, React `19.2.3` và Expo Router.
- Chủ dự án muốn trước mắt build APK/test nội bộ và chưa có Firebase project.
- Firebase config client gồm project/app identifiers công khai; không chứa service-account private key, Cloudinary API secret, Replicate token hay Google OAuth client secret.

## Quyết định

Thử Firebase JS SDK modular `firebase@12.19.0` với AsyncStorage `2.2.0` cho persistence Auth. Chọn hướng này để giữ tương thích với Expo Go và tránh thêm native Firebase modules ở giai đoạn đầu. Khởi tạo Firebase Auth một lần bằng `initializeAuth(..., { persistence: getReactNativePersistence(AsyncStorage) })`; cấu hình Firestore/Functions Emulator theo biến `EXPO_PUBLIC_USE_FIREBASE_EMULATOR`.

Expo SDK 57 yêu cầu React Native 0.86/React 19.2.3 và hỗ trợ React Native Web 0.21; vì mobile package thiếu React DOM trực tiếp nên npm từng chọn React DOM 19.3.0, không tương thích với React 19.2.3. Dependency được căn chỉnh sang React DOM 19.2.3 và Expo SDK patch mới nhất mà `expo install --fix` yêu cầu, vẫn giữ SDK major 57. `expo install --check` và Expo Doctor 21/21 kiểm tra môi trường đạt sau căn chỉnh.

## Kiểm chứng và phần còn lại

- [x] Firebase JS SDK/AsyncStorage đã cài theo Expo package manager.
- [x] Cấu hình emulator hỗ trợ host mặc định iOS/Android emulator và host override cho máy thật.
- [x] Pure config tests kiểm tra required IDs, domain và host routing.
- [x] Auth và Firestore chạy trong Emulator: đăng ký, đăng nhập tạo hồ sơ UID, đăng xuất; Rules deny cross-user và khóa field đặc quyền.
- [x] Callable Cloud Function chạy trong Emulator để tăng wearCount an toàn; tủ đồ Firestore CRUD/search/preference/statistics qua bài kiểm thử tích hợp.
- [x] `getReactNativePersistence(AsyncStorage)` được khởi tạo trong Firebase client; auth state do Firebase quản lý thay JWT/tokenStore cũ.
- [ ] Chạy APK và xác nhận Auth state sau khi restart thiết bị.
- [ ] Xác nhận upload Cloudinary với project/key thật và password reset action link trên APK.
- [ ] Xác nhận physical Android APK trên máy chủ dự án nếu người thử cần thiết bị thật.

Functions Emulator dùng tên cloud/API key `demo-*`; endpoint ký upload từ chối các giá trị placeholder. Cloudinary API secret chỉ lấy từ Firebase Secret Manager khi deploy, không nằm trong app hoặc Git. Upload callable giới hạn số chữ ký theo UID/ngày; upload thật chưa thể kiểm chứng đến khi có credentials.

Nếu JS SDK không đáp ứng hành vi Auth/network cần cho Android APK, đánh giá lại bằng một development build React Native Firebase ở task 03; không thêm hai SDK Auth đồng thời.

## Nguồn chính thức

- [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/): phiên bản React/React Native, runtime và hướng dẫn package theo SDK.
- [Expo: Using Firebase](https://docs.expo.dev/guides/using-firebase/): Firebase JS SDK dùng được với Expo Go cho Auth/Firestore/Functions; React Native Firebase cần custom native code/development build.
- [Firebase JS Auth API reference](https://firebase.google.com/docs/reference/js/auth): `initializeAuth`, `getReactNativePersistence` và AsyncStorage persistence.
- [Firebase JS SDK release notes](https://firebase.google.com/support/release-notes/js): persistence React Native cần khai báo rõ storage adapter.
