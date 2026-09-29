# Shelfy mobile feature parity

Checklist thực hiện khi thay hai backend bằng Firebase. Đây là bảng kiểm tính năng, không phải xác nhận rằng mọi provider production đã cấu hình. Nguồn kiểm kê: `Mobile/Shelfy/app`, `Mobile/Shelfy/src`, `BE/Shelfy/src/main/java`, `Nodejs/routes` và các migration SQL đang có.

| Nhóm / màn hình | Hành vi mobile hiện có | API hiện tại | Đích dự kiến | Cách nghiệm thu |
|---|---|---|---|---|
| Auth / register | Tạo tài khoản email, tên đầy đủ, vào Home sau thành công | Core `/auth/register` | Firebase Auth + tạo profile theo UID | Tài khoản tạo được một lần; hồ sơ sẵn sàng; retry không tạo profile trùng |
| Auth / login | Email/mật khẩu, checkbox nhớ đăng nhập, lưu user/token | Core `/auth/login` | Firebase Auth | Phiên được khôi phục sau restart; lỗi credential hiển thị đúng; không dùng JWT cũ |
| Auth / logout | Thu hồi refresh token server, xóa local session | Core `/auth/logout` | Firebase sign-out + dọn cache user | Logout luôn xóa phiên local kể cả offline; user kế tiếp không thấy cache user trước |
| Auth / forgot password | Gửi email khôi phục | Core `/auth/forgot-password` | Firebase Auth email reset | Hiển thị phản hồi không làm lộ việc email tồn tại; link hết hạn được xử lý |
| Auth / reset password | Mở link/token đặt lại mật khẩu | Core `/auth/reset-password` | Firebase Auth action code | Deep link mở đúng app/màn hình; code sai/hết hạn/đã dùng báo rõ |
| Auth / profile | Tên, avatar, giới tính và thông tin hồ sơ; đổi mật khẩu | Core `/users/me*`, `/upload/avatar` | `users/{uid}` + Firebase Auth + upload Cloudinary | Profile đọc/ghi theo UID; trường đặc quyền không sửa được; đổi mật khẩu xác thực lại khi cần |
| Home / tủ đồ | Tải số liệu thống kê và outfit hôm nay | Core wardrobe stats; Node daily outfits | Firestore wardrobe + daily outfit | Số liệu phản ánh item còn hoạt động và trạng thái đã chọn |
| Home / weather | Xin vị trí; lấy thời tiết và snapshot gần nhất | Node `/weather/snapshots*`; Open-Meteo/Nominatim | Function provider/cache + Firestore snapshots | Cho phép/từ chối vị trí; lỗi provider và snapshot cũ không làm crash app |
| Home / Calendar | Xem trạng thái, sự kiện hôm nay, kết nối/ngắt Google | Node `/calendar/*` | Function OAuth/sync + Firestore cache | OAuth callback mới HTTPS, token ở server; kết nối lại và revoke chạy được |
| Wardrobe / list | Danh sách, category/season/color/query, trang tiếp theo | Core `/wardrobe/items` + preference Node | `users/{uid}/wardrobe` | Filter kết hợp đúng, phân trang liên tục, kết quả tìm kiếm theo contract |
| Wardrobe / add | Upload ảnh, nhập metadata, tạo item | Core `/upload/clothing`, `/wardrobe/items` | Cloudinary upload flow + Firestore | Asset được xác minh thuộc UID trước khi lưu item |
| Wardrobe / detail/edit | Xem/chỉnh sửa item, yêu thích, trạng thái, đánh dấu mặc, xóa | Core item CRUD/wear + Node preference + daily outfits | Item document + Function nơi cần giao dịch | Bản cập nhật đúng; delete giữ snapshot lịch sử; thao tác lặp an toàn |
| Wardrobe / stats/pairing | Mobile hiển thị tổng số món, đã mặc và giới hạn lưu trữ; không có màn hình phối đồ theo item | Core `/wardrobe/stats`, `/wardrobe/items/{id}/pairings` | Firestore aggregation cho ba thống kê mobile; không port pairing chỉ được web sử dụng | Emulator kiểm tra số liệu/quota; pairing API stub đã gỡ khỏi mobile |
| Favorites | Hiển thị item yêu thích và đổi yêu thích | Core items + Node `/wardrobe/preferences` | Canonical favorite field trên mỗi item; chỉ lưu một nguồn trạng thái | Danh sách đồng bộ với wardrobe; trang rỗng và thao tác liên tiếp đúng |
| Suggest | Lấy gợi ý hôm nay, yêu cầu tạo mới, hiển thị context, xác nhận mặc | Node `/suggestions/today/*`, weather/calendar, daily outfit | Function rule-based stylist; Firestore result | Giữ cấu trúc kết quả/thứ tự/lý do; context vắng vẫn fallback hợp lệ; xác nhận một lần |
| Wear history | Phân trang lịch sử outfit đã xác nhận | Node `/daily-outfits` | `users/{uid}/dailyOutfits` | Thứ tự/ngày/filter giữ nguyên; item đã xóa vẫn có snapshot hiển thị |
| Virtual try-on | Chọn garment/person image, tạo job, poll status, xem kết quả, save history | Node `/trial/*`; Replicate; Node try-on sessions | Functions + Replicate + Cloudinary + Firestore | Pending/completed/failed, retry, quota và history chạy khi app đóng/mở lại |
| Trial history | Danh sách job, đồng bộ pending, lưu/bỏ lưu/xóa và phân trang | `src/hooks/useTrialHistory.js`, `/trial/history`, `/:jobId/saved` | `users/{uid}/tryOns` + Function provider reconciliation | Job cũ/đang chạy được xử lý; save/delete không tác động job user khác |
| Subscription / Premium | Xem gói, quyền hiện tại, bắt đầu checkout | Firebase callables; VNPay sandbox qua Functions (đang tắt mặc định) | Code-owned server catalog + `users/{uid}/entitlements/current`; signed VNPay callback | Unit/Emulator kiểm tra catalog/quota/auth; cần merchant credentials để smoke sandbox thật |
| Admin (web only) | Overview, analytics, users, items, payments, subscriptions, audit | Node `/admin/*`, web AdminPage | Công cụ quản trị không client-editable, phạm vi task 05/24 | Bảo đảm vẫn có cách khóa user, kiểm tra giao dịch/job và audit sau khi gỡ admin UI |
| Landing page | Nội dung marketing, nút login và thông báo tải app | Web login hiện gọi Core API | Giữ landing; CTA sang app; bỏ auth web và route nghiệp vụ | Build/deploy độc lập, không gọi backend/JWT cũ |

## Kiểm kê module API mobile

| Module | Backend hiện tại | Màn hình tiêu thụ | Lưu ý hợp đồng |
|---|---|---|---|
| `authApi.js`, `tokenStore.js`, `apiClient.js` | Core JWT | auth group, AuthContext, nhiều màn hình dùng helper page content | Dọn refresh-token flow; helper pagination nên thay bằng adapter Firestore mà không buộc đổi UI mọi nơi |
| `userApi.js`, `uploadApi.js` | Core profile/upload | profile, avatar, edit wardrobe | Giữ shape field UI hoặc chuyển có kiểm soát |
| `wardrobeApi.js` | Core wardrobe | wardrobe list/detail/add/edit, trial garment picker, profile stats | SQL ID hiện là số; Firestore ID là string |
| `wardrobePreferenceApi.js` | Node preference table | list/detail/favorites | Xem conflict với cột favorite/status trong Core item |
| `weatherApi.js` | Node + Open-Meteo | Home, Suggest | Client truyền lat/lon; provider secret/signature không gửi từ app |
| `calendarApi.js` | Node + Google OAuth | CalendarCard | Token và OAuth client secret server-only |
| `dailyOutfitApi.js` | Node + PostgreSQL | Home, Suggest, item detail, wear history | Idempotency, timezone VN, snapshot item/weather/event |
| `suggestionApi.js` | Node rule-based | Suggest | Hiện API unwrap `suggestion`; giữ shape mà UI đang tiêu thụ |
| `trialApi.js` | Node + Replicate | Trial, useTrialHistory | Poll/status/history có thể chạy khi app đang background |
| `subscriptionApi.js`, `paymentApi.js` | Firebase Functions callable | Premium | Giá, checkout và entitlement được quyết định server-side; VNPay sandbox bật riêng sau cấu hình secret |
| `adapters.js` | Client mapping | wardrobe/weather UI | Thêm adapter Firestore timestamp/field thay vì lưu format phụ thuộc server |

## Ngoài phạm vi parity mobile

- Web dashboards/CRUD khác landing page sẽ bị gỡ; không chuyển tất cả màn web thành màn mobile mới.
- Các bảng MFA, nhiều loại OTP, sessions, email verification và permissions trong SQL phải kiểm kê; chuyển/giữ/xóa theo tính năng thực tế đang bật, không tự giả định chỉ vì có bảng.
- Tích hợp AI Gemini trong Node hiện không phải luồng mặc định của rule-based suggestions; không bật lại khi chuyển.
- Không chuyển secret/API key, refresh JWT, OAuth state dùng xong hay bản ghi telemetry cá nhân sang document đọc được từ client.

## Cổng parity trước khi gỡ legacy

Mỗi dòng ở trên phải có một trong các trạng thái `PASS`, `BLOCKED` (ghi rõ phụ thuộc/cần quyền), `OUT OF SCOPE` (phạm vi được chủ dự án chấp thuận). Với `PASS`, đính kèm test tự động hoặc bước smoke tái lập trên emulator/thiết bị và project staging. Không xóa backend/frontend nghiệp vụ trước khi không còn màn mobile gọi host cũ.
