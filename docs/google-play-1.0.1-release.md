# Shelfy 1.0.1 — cải thiện màn hình tủ đồ

## Ghi chú phát hành để dán vào Play Console

```text
<vi>
- Phân biệt tủ đồ trống với tìm kiếm không có kết quả.
- Thêm nút xóa bộ lọc để xem lại toàn bộ tủ đồ.
- Hiển thị lỗi kết nối và thêm nút thử tải lại.
- Giữ các món đồ đang hiển thị khi tải lại bị lỗi mạng.
</vi>
```

## Kiểm thử bản cập nhật

1. Cập nhật từ Google Play trong kênh thử nghiệm khép kín hiện tại; không gỡ app trước khi cập nhật.
2. Tìm từ khóa không có kết quả, chọn “Xóa bộ lọc” và kiểm tra danh sách được khôi phục.
3. Chọn một danh mục không có đồ và kiểm tra thông báo không có kết quả.
4. Tắt mạng khi tải tủ đồ lần đầu; kiểm tra nút “Thử lại”, bật mạng và tải lại.
5. Khi đã có danh sách, tắt mạng rồi kéo tải lại; kiểm tra danh sách vẫn còn và có thông báo lỗi.
6. Ghi lại lỗi, thiết bị và phiên bản app; thu thập phản hồi thực tế của người thử nghiệm.

Chọn bản AAB profile `production`, package `com.duongminhkiet.shelfy`, kênh `GOOGLE_PLAY`. Không dùng APK kênh DIRECT/APKPURE để cập nhật Google Play.

Đợt này không thay đổi backend, dữ liệu hoặc quyền Android. Bản cập nhật không thay thế điều kiện thử nghiệm với ít nhất 12 người tham gia liên tục trong 14 ngày.
