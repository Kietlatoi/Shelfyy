# Cấu hình AI Try-on miễn phí hạ tầng

Kiến trúc này giữ Firebase Authentication và Firestore trên gói Spark. Cloudflare
Worker chỉ xác thực người dùng, ký upload Cloudinary và gọi Replicate. Token
Replicate cùng Cloudinary API Secret không nằm trong ứng dụng mobile.

## 1. Tạo Replicate API token

1. Đăng nhập Replicate và mở trang **API tokens**.
2. Tạo token riêng cho Shelfy.
3. Đặt giới hạn chi tiêu trong phần Billing của Replicate để tránh phát sinh ngoài ý muốn.

Không đặt token này vào file `.env` của Expo.

Model đang cấu hình là `cuuupid/idm-vton`. Model này phù hợp để phát triển,
học tập và demo, nhưng giấy phép CC BY-NC-SA 4.0 không cho phép dùng thương mại.
Nếu Shelfy được bán hoặc kiếm tiền, cần đổi sang model có giấy phép thương mại và
cập nhật phần ánh xạ input trong Worker trước khi phát hành.

## 2. Tạo và cấu hình Cloudflare Worker

Từ thư mục gốc dự án:

```powershell
cd edge-worker
npm install
npx wrangler login
npx wrangler kv namespace create RATE_LIMITS
```

Lệnh cuối trả về một `id`. Mở `edge-worker/wrangler.jsonc` và thay mảng
`kv_namespaces` rỗng bằng binding được Wrangler cung cấp, có dạng:

```json
"kv_namespaces": [
  {
    "binding": "RATE_LIMITS",
    "id": "id-vua-duoc-tao"
  }
]
```

KV được dùng để giới hạn số lượt Replicate theo người dùng và chống tạo trùng
khi app gửi lại cùng một request.

Tiếp theo nhập các biến bằng Wrangler. Mỗi lệnh sẽ yêu cầu bạn dán một giá trị:

```powershell
npx wrangler secret put FIREBASE_API_KEY
npx wrangler secret put FIREBASE_PROJECT_ID
npx wrangler secret put CLOUDINARY_CLOUD_NAME
npx wrangler secret put CLOUDINARY_API_KEY
npx wrangler secret put CLOUDINARY_API_SECRET
npx wrangler secret put REPLICATE_API_TOKEN
npx wrangler secret put REPLICATE_MODEL_VERSION
npx wrangler secret put TRY_ON_LIMIT_PER_DAY
```

Giá trị cần dùng:

- `FIREBASE_API_KEY`: cùng giá trị `EXPO_PUBLIC_FIREBASE_API_KEY` trong `Mobile/Shelfy/.env`.
- `FIREBASE_PROJECT_ID`: `shelfy-acf38`.
- Ba biến Cloudinary: lấy từ Product environment của Shelfy.
- `REPLICATE_API_TOKEN`: token tạo ở bước 1.
- `REPLICATE_MODEL_VERSION`: mặc định hiện có trong `edge-worker/.dev.vars.example`.
- `TRY_ON_LIMIT_PER_DAY`: nên bắt đầu bằng `5`.

Triển khai Worker:

```powershell
npx wrangler deploy
```

Wrangler sẽ trả về URL dạng `https://shelfy-edge.<subdomain>.workers.dev`.

## 3. Cấu hình app mobile

Thêm URL vừa nhận vào `Mobile/Shelfy/.env`:

```dotenv
EXPO_PUBLIC_EDGE_API_URL=https://shelfy-edge.<subdomain>.workers.dev
```

Khởi động lại Expo sau khi đổi biến môi trường.

## 4. Deploy Firestore Rules

Việc deploy Rules dùng được trên Firebase Spark và không yêu cầu Blaze:

```powershell
firebase deploy --only firestore:rules,firestore:indexes
```

Rules mới cho phép người dùng tự quản lý tủ đồ và lịch sử Try-on của chính họ.
Khóa Cloudinary và Replicate vẫn chỉ tồn tại trong Worker.

## 5. Luồng hoạt động

1. App lấy Firebase ID token của người đang đăng nhập.
2. Worker kiểm tra token trực tiếp với Firebase Authentication.
3. Worker cấp chữ ký upload; app gửi ảnh thẳng lên Cloudinary.
4. Worker tạo prediction bất đồng bộ trên Replicate.
5. App hỏi trạng thái định kỳ. Khi hoàn tất, Worker chép ảnh kết quả về Cloudinary.
6. App lưu trạng thái và đường dẫn ảnh vào Firestore.

Bạn không cần deploy thư mục `functions/` cho luồng tủ đồ và AI Try-on này.
