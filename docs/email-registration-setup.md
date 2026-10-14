# Cấu hình OTP email 5 chữ số

Luồng đăng ký và quên mật khẩu trên mobile gọi Cloudflare Worker để gửi mã qua
Gmail API. Mã chỉ tồn tại dưới dạng HMAC-SHA256 trong KV `RATE_LIMITS`, hết hạn sau
10 phút và bị khóa sau 5 lần nhập sai. Firebase Auth account chỉ được tạo sau
khi mã đăng ký đúng, với `emailVerified=true`. Mật khẩu chỉ được thay đổi sau khi
mã đặt lại mật khẩu đúng.

Firestore Rules và Worker yêu cầu email đã xác thực đối với tài khoản mới. Các
tài khoản cũ đã có hồ sơ `users/{uid}` được tiếp tục sử dụng để tránh khóa người
dùng hiện tại.

## 1. Cấu hình Gmail API

1. Trong Google Cloud Console của project Shelfy, vào **APIs & Services →
   Library** và bật **Gmail API**.
2. Cấu hình **OAuth consent screen**. Khi còn ở trạng thái Testing, thêm tài
   khoản Gmail gửi thư vào danh sách Test users.
3. Vào **Credentials → Create credentials → OAuth client ID**, chọn **Web
   application** và thêm redirect URI:
   `https://developers.google.com/oauthplayground`.
4. Mở [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/),
   mở Settings, bật **Use your own OAuth credentials**, nhập Client ID và Client
   Secret vừa tạo.
5. Ở Step 1 nhập scope `https://www.googleapis.com/auth/gmail.send`, chọn
   **Authorize APIs** và đăng nhập đúng Gmail sẽ gửi OTP.
6. Ở Step 2 chọn **Exchange authorization code for tokens** và sao chép Refresh
   token.

OAuth app loại External ở trạng thái Testing cấp refresh token chỉ có hiệu lực
7 ngày. Trước khi phát hành, chuyển OAuth consent screen sang **In production**
rồi tạo lại refresh token.

### Khi Gmail từ chối refresh token

Sự cố xác nhận ngày 15/10/2026: `/v1/auth/password-reset-codes` trả HTTP 502,
`EMAIL_AUTH_FAILED`. Log Gmail OAuth trả HTTP 400, `invalid_grant`,
`Token has been expired or revoked.`. Đây là lỗi thông tin ủy quyền Gmail,
không phải bằng chứng lỗi Firebase hoặc lỗi bản cài Android. Chưa xác định
token hết hạn do Testing hay bị thu hồi cho đến khi kiểm tra OAuth Console.

1. Kiểm tra **Google Auth Platform → Audience → Publishing status** trong
   project `shelfy-acf38`. Nếu còn Testing, chuyển sang In production trước
   khi xin token mới; việc này không thay thế các yêu cầu xác minh OAuth của Google.
2. Làm lại bước OAuth Playground 4–6 bên trên bằng **đúng OAuth client** và
   Gmail gửi OTP. Không tái sử dụng token đã bị Google từ chối.
3. Trong `edge-worker`, chạy `npx wrangler secret put GMAIL_REFRESH_TOKEN`,
   nhập token trực tiếp ở terminal; không ghi vào Git, mobile hoặc gửi qua chat.
4. Thử gửi OTP một lần và kiểm tra email thực nhận. Không đổi mật khẩu khi
   chỉ kiểm tra bước gửi thư. Cả đăng ký và quên mật khẩu dùng chung token này.

Chuyển sang In production không tự làm token cũ hợp lệ trở lại. Không cần
build lại APK/AAB để cập nhật secret Gmail trên Worker.

Tham khảo: [Google refresh token expiration](https://developers.google.com/identity/protocols/oauth2#expiration).

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
npx wrangler secret put EMAIL_OTP_PEPPER
npx wrangler secret put GMAIL_CLIENT_ID
npx wrangler secret put GMAIL_CLIENT_SECRET
npx wrangler secret put GMAIL_REFRESH_TOKEN
npx wrangler secret put GMAIL_FROM
```

- `EMAIL_OTP_PEPPER`: chuỗi ngẫu nhiên dài tối thiểu 32 byte, chỉ dùng để băm mã
  và email trong KV.
- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`: OAuth Web client ở bước 3.
- `GMAIL_REFRESH_TOKEN`: refresh token ở bước 6.
- `GMAIL_FROM`: tài khoản Gmail đã cấp quyền, ví dụ `toilakiet24@gmail.com`.

Các cấu hình thời gian trong `edge-worker/wrangler.jsonc` đã có giá trị mặc định:

```dotenv
EMAIL_CODE_TTL_SECONDS=600
EMAIL_CODE_RESEND_SECONDS=60
EMAIL_CODE_MAX_ATTEMPTS=5
```

Không đặt các secret Gmail vào `.env` của Expo hoặc biến `EXPO_PUBLIC_*`.

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
