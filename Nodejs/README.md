# Shelfy Nodejs Service

Nodejs service cho các tính năng được tách khỏi Core API Service Java. Hiện tại service này sở hữu weather, Google Calendar integration, xác nhận outfit mặc trong ngày, lịch sử outfit đã mặc, metadata mở rộng của wardrobe item như yêu thích/trạng thái và gợi ý stylist rule-based.

## Local

Service dùng chung PostgreSQL và `JWT_SECRET` với `BE/Shelfy`.

```powershell
.\run-local.ps1
```

Health check:

```text
http://localhost:3000/health
```

Chạy migration riêng của Nodejs:

```powershell
npm run migrate
```

## Weather API

`POST /api/weather/snapshots`

- Auth: `Authorization: Bearer <accessToken>` do Core API Service phát hành.
- Body:

```json
{
  "lat": 10.7769,
  "lon": 106.7009
}
```

Endpoint gọi Open-Meteo để lấy thời tiết, gọi Nominatim reverse geocoding để lấy nhãn địa điểm từ tọa độ, chuẩn hóa dữ liệu và lưu vào bảng `weather_snapshots`.

Các biến cấu hình reverse geocoding:

```text
REVERSE_GEOCODING_API_URL=https://nominatim.openstreetmap.org/reverse
REVERSE_GEOCODING_USER_AGENT=ShelfyWeatherService/0.1 (local-dev)
REVERSE_GEOCODING_LANGUAGE=vi,en
REVERSE_GEOCODING_ZOOM=10
REVERSE_GEOCODING_TIMEOUT_MS=5000
REVERSE_GEOCODING_MIN_INTERVAL_MS=1100
REVERSE_GEOCODING_CACHE_TTL_MS=86400000
```

Production nên đổi `REVERSE_GEOCODING_USER_AGENT` thành tên app kèm email/URL liên hệ của team.

`GET /api/weather/snapshots/latest`

Trả snapshot thời tiết gần nhất của user đang đăng nhập.

## Google Calendar API

Calendar dùng Google OAuth web flow. FE gọi Nodejs để lấy authorization URL, sau đó redirect user sang Google. Nodejs nhận callback, mã hóa Google token và lưu vào Postgres chung.

Các biến cần cấu hình:

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/calendar/google/callback
GOOGLE_CALENDAR_SCOPES=https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/userinfo.email
GOOGLE_OAUTH_PROMPT=consent
GOOGLE_OAUTH_STATE_TTL_MS=600000
GOOGLE_CALENDAR_TIMEOUT_MS=10000
CALENDAR_TOKEN_ENCRYPTION_KEY=
APP_TIME_ZONE=Asia/Ho_Chi_Minh
APP_TIME_ZONE_OFFSET=+07:00
```

Endpoints:

- `GET /api/calendar/status`
- `POST /api/calendar/google/connect`
- `GET /api/calendar/google/callback`
- `GET /api/calendar/today`
- `DELETE /api/calendar/google/disconnect`

Lưu ý Google Cloud OAuth Client phải khai báo đúng redirect URI:

```text
http://localhost:3000/api/calendar/google/callback
```

## Wardrobe Preference API

Core API Service Java vẫn sở hữu dữ liệu chính của `wardrobe_items`. Nodejs chỉ lưu metadata mở rộng theo user, hiện gồm yêu thích và trạng thái món đồ.

`GET /api/wardrobe/preferences?itemIds=1,2,3`

- Auth: `Authorization: Bearer <accessToken>` do Core API Service phát hành.
- Mục đích: lấy preference của các item thuộc user hiện tại để FE merge vào dữ liệu wardrobe từ Java.
- Tối đa 100 `itemIds` mỗi request.

Response:

```json
{
  "items": [
    {
      "itemId": 1,
      "favorite": true,
      "status": "IN_USE",
      "createdAt": "2026-07-22T08:00:00.000Z",
      "updatedAt": "2026-07-22T08:00:00.000Z"
    }
  ]
}
```

`PUT /api/wardrobe/items/{id}/preferences`

- Auth: `Authorization: Bearer <accessToken>`.
- Mục đích: cập nhật yêu thích hoặc trạng thái của một món đồ.
- Nodejs kiểm tra item phải thuộc user hiện tại trước khi ghi.

Body:

```json
{
  "favorite": true,
  "status": "TO_SELL"
}
```

`status` hợp lệ:

- `IN_USE`: đang dùng.
- `RARELY_USED`: ít mặc.
- `STORED`: cất kho.
- `TO_SELL`: muốn thanh lý.

## Daily Outfit API

`GET /api/daily-outfits`

- Auth: `Authorization: Bearer <accessToken>` do Core API Service phát hành.
- Mục đích: trả lịch sử outfit đã xác nhận mặc của user hiện tại, sắp xếp từ ngày mới nhất đến cũ nhất.
- Query params:
  - `page`: số trang bắt đầu từ `0`, mặc định `0`.
  - `size`: số bản ghi mỗi trang, mặc định `12`, tối đa `50`.
  - `from`: lọc từ ngày `YYYY-MM-DD`.
  - `to`: lọc đến ngày `YYYY-MM-DD`.

`POST /api/daily-outfits`

- Auth: `Authorization: Bearer <accessToken>` do Core API Service phát hành.
- Mục đích: lưu outfit người dùng xác nhận sẽ mặc trong ngày, tạo outfit nếu FE gửi `itemIds`, ghi vào bảng `daily_outfits` và cập nhật `wear_count` của các món được thêm/bỏ so với lần xác nhận trước trong cùng ngày.
- Một user chỉ có một daily outfit cho mỗi `wornDate`; gọi lại endpoint cùng ngày sẽ thay lựa chọn hiện tại thay vì tạo thêm bản ghi daily mới.

Body khi người dùng tự chọn từ tủ đồ:

```json
{
  "name": "Outfit hôm nay - 22/07/2026",
  "occasion": "Hôm nay",
  "description": "Người dùng tự chọn trong tủ đồ cá nhân.",
  "itemIds": [1, 2, 3],
  "wornDate": "2026-07-22"
}
```

Body khi đã có outfit:

```json
{
  "outfitId": 10,
  "wornDate": "2026-07-22"
}
```

`GET /api/daily-outfits/today`

Trả outfit đã xác nhận hôm nay. Có thể truyền `?date=YYYY-MM-DD` để xem ngày cụ thể.

## Suggestion API

Suggestion mặc định dùng rule-based stylist trong Nodejs, không gọi AI provider và không cần `GEMINI_API_KEY`. Engine đọc tủ đồ, trạng thái/yêu thích item, weather snapshot gần nhất, calendar events trong ngày và lịch sử mặc gần đây để chấm điểm rồi chọn outfit.

Các biến Gemini bên dưới chỉ còn là cấu hình tùy chọn nếu sau này bật lại provider AI cho bước viết lại lời gợi ý hoặc phân tích ảnh:

```text
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_TIMEOUT_MS=20000
GEMINI_MAX_OUTPUT_TOKENS=2500
GEMINI_INCLUDE_ITEM_IMAGES=false
GEMINI_IMAGE_ALLOWED_HOSTS=res.cloudinary.com
GEMINI_MAX_INLINE_IMAGES=8
GEMINI_MAX_IMAGE_BYTES=2500000
```

Mặc định flow hiện tại không gọi Gemini. Nếu dùng lại Gemini và bật `GEMINI_INCLUDE_ITEM_IMAGES=true`, chỉ allowlist host ảnh tin cậy như Cloudinary để tránh server fetch URL tùy ý từ DB.

Endpoints:

- `GET /api/suggestions/today/latest`: lấy gợi ý mới nhất trong ngày, kèm context weather/calendar/wardrobe count.
- `POST /api/suggestions/today`: tạo gợi ý mới bằng rule-based stylist từ tủ đồ, weather snapshot gần nhất, calendar events trong ngày và lịch sử mặc gần đây.
- `POST /api/suggestions/{id}/confirm`: đánh dấu suggestion đã được xác nhận, thường gọi sau khi FE lưu `daily_outfits`.

Các lỗi nghiệp vụ thường gặp:

- `WARDROBE_CONTEXT_EMPTY`: tủ đồ không có item hợp lệ để gợi ý.
