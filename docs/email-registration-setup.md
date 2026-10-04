# Cấu hình OTP email 5 chữ số

Luồng đăng ký và quên mật khẩu trên mobile gọi Cloudflare Worker để gửi mã qua
Resend. Mã chỉ tồn tại dưới dạng HMAC-SHA256 trong KV `RATE_LIMITS`, hết hạn sau
10 phút và bị khóa sau 5 lần nhập sai. Firebase Auth account chỉ được tạo sau
khi mã đăng ký đúng, với `emailVerified=true`. Mật khẩu chỉ được thay đổi sau khi
mã đặt lại mật khẩu đúng.

Firestore Rules và Worker yêu cầu email đã xác thực đối với tài khoản mới. Các
tài khoản cũ đã có hồ sơ `users/{uid}` được tiếp tục sử dụng để tránh khóa người
dùng hiện tại.

## 1. Cấu hình Resend

1. Tạo tài khoản tại Resend và thêm domain gửi email.
2. Thêm các bản ghi DNS mà Resend yêu cầu, rồi chờ domain chuyển sang trạng thái
   `Verified`.
3. Tạo API key chỉ dành cho Shelfy.
4. Chọn địa chỉ gửi thuộc domain đã xác minh, ví dụ
   `Shelfy <verify@shelfy.vn>`.

`onboarding@resend.dev` chỉ phù hợp để thử với email chủ tài khoản Resend. Muốn
gửi mã cho mọi người dùng, phải dùng domain đã xác minh.

## 2. Cấp quyền Firebase cho Worker

Service account đang dùng `FIREBASE_CLIENT_EMAIL` và `FIREBASE_PRIVATE_KEY` cần
hai quyền:

- đọc/ghi dữ liệu Firestore mà Worker đang quản lý;
- `Firebase Authentication Admin` (`roles/firebaseauth.admin`) để tạo tài khoản
  đã được xác thực email.

Có thể cấp quyền trong Google Cloud Console tại **IAM & Admin → IAM**, chọn service
account của Worker và thêm role **Firebase Authentication Admin**.

## 3. Nhập Worker secrets

Chạy trong thư mục `edge-worker`:

```powershell
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put EMAIL_OTP_PEPPER
npx wrangler secret put EMAIL_FROM
```

- `RESEND_API_KEY`: API key vừa tạo trên Resend.
- `EMAIL_OTP_PEPPER`: chuỗi ngẫu nhiên dài tối thiểu 32 byte, chỉ dùng để băm mã
  và email trong KV.
- `EMAIL_FROM`: địa chỉ gửi đầy đủ, ví dụ `Shelfy <verify@shelfy.vn>`.

Các cấu hình thời gian trong `edge-worker/wrangler.jsonc` đã có giá trị mặc định:

```dotenv
EMAIL_CODE_TTL_SECONDS=600
EMAIL_CODE_RESEND_SECONDS=60
EMAIL_CODE_MAX_ATTEMPTS=5
```

Không đặt ba secret trên vào `.env` của Expo hoặc biến `EXPO_PUBLIC_*`.

## 4. Deploy và kiểm tra

```powershell
cd edge-worker
npm test
npx wrangler deploy
```

Sau deploy, luồng cần kiểm tra trên app:

1. Nhập họ tên, email và mật khẩu rồi chọn **Gửi mã xác thực**.
2. Email nhận đúng mã 5 chữ số.
3. Mã sai bị từ chối; mã đúng tạo tài khoản và đăng nhập.
4. Trong Firebase Authentication, tài khoản mới có trạng thái email đã xác minh.
5. Nút gửi lại chỉ mở sau 60 giây và mã hết hạn sau 10 phút.
6. Luồng **Quên mật khẩu** gửi mã 5 chữ số, đổi được mật khẩu và không tiết lộ
   email chưa đăng ký.

Thay đổi mobile này cần một bản APK mới khi muốn phân phối. Việc deploy Worker
không cập nhật mã JavaScript đã đóng gói trong APK hiện tại.
