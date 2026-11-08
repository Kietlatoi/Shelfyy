# Google Calendar trên mobile

Mobile mở trang cấp quyền Google trong trình duyệt. Node.js nhận callback,
lưu token ở backend và hiển thị trang hoàn tất. Đóng trình duyệt để quay lại
Shelfy; app tải lại trạng thái kết nối và lịch hôm nay. Luồng này dùng được
trong Expo Go, không cần đăng ký scheme `shelfy://`.

## Cấu hình bắt buộc

1. Trong Google Cloud, bật **Google Calendar API**, cấu hình màn hình OAuth
   consent và thêm tài khoản thử nghiệm nếu ứng dụng đang ở chế độ Testing.
2. Tạo OAuth Client loại **Web application** (backend xử lý OAuth).
3. Điền vào `Nodejs/.env` nếu chạy `Nodejs/run-local.ps1` hoặc `npm start`:

   ```dotenv
   GOOGLE_CLIENT_ID=<client ID từ Google Cloud>
   GOOGLE_CLIENT_SECRET=<client secret từ Google Cloud>
   GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/calendar/google/callback
   ```

   Nếu chạy Docker Compose, đặt các biến trong `.env` ở thư mục gốc và tạo
   lại container Node bằng `docker compose up -d --force-recreate node`.
   Client Secret chỉ ở backend, không đặt trong `EXPO_PUBLIC_*`.
4. Thêm chính xác URL callback trên vào **Authorized redirect URIs** của
   OAuth Client. Khởi động lại Node.js sau khi thay `.env`.

## Android Emulator trên máy phát triển

API mobile dùng `http://10.0.2.2:3000/api`. Callback của Google có thể giữ
`http://localhost:3000/api/calendar/google/callback` nếu chạy:

```powershell
adb reverse tcp:3000 tcp:3000
```

Lệnh này giúp trình duyệt trong emulator truy cập cổng 3000 trên máy tính.
Chạy lại sau khi khởi động lại emulator nếu cần; nếu có nhiều thiết bị,
chọn đúng thiết bị bằng `adb -s <serial> reverse tcp:3000 tcp:3000`.
Không đổi OAuth redirect URI thành IP `10.0.2.2`: Google hạn chế redirect
URI dùng IP riêng. Với điện thoại thật hoặc môi trường triển khai, dùng URL
HTTPS của backend mà thiết bị truy cập được và đăng ký đúng URL đó ở Google.

## Kiểm tra

- Bấm **Kết nối Google Calendar**, đăng nhập và cấp quyền đọc lịch.
- Trang hoàn tất hiển thị “Đã kết nối Google Calendar”. Đóng trình duyệt.
- App hiển thị email và sự kiện hôm nay; thử cả tài khoản chưa có sự kiện.
- Nếu từ chối quyền, app vẫn chưa kết nối và có thể thử lại.
- **Ngắt kết nối** xóa trạng thái kết nối trên app và backend.

Kiểm thử backend (mock Google và database):

```powershell
node --test Nodejs/tests/calendar-oauth.test.js
```

Tài liệu: [Google OAuth web server](https://developers.google.com/identity/protocols/oauth2/web-server),
[Expo WebBrowser SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/webbrowser/).
