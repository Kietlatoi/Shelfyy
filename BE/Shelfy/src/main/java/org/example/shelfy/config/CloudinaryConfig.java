package org.example.shelfy.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
public class CloudinaryConfig {
    @Bean
    public Cloudinary cloudinary(@Value("${cloudinary.cloud-name}") String cloudName,
                                 @Value("${cloudinary.api-key}") String apiKey,
                                 @Value("${cloudinary.api-secret}") String apiSecret) {
        // FIX: Trước đây không có cảnh báo gì khi thiếu key — lỗi chỉ xuất hiện
        // (khó hiểu, dạng "Invalid Signature"/401 từ Cloudinary) khi người dùng
        // thực sự bấm upload ảnh. Log WARN ngay lúc khởi động để dev biết sớm.
        if (cloudName == null || cloudName.isBlank() || apiKey == null || apiKey.isBlank()
                || apiSecret == null || apiSecret.isBlank()) {
            log.warn("=====================================================================");
            log.warn(" CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET");
            log.warn(" đang trống trong .env — tính năng upload ảnh (tủ đồ, avatar) SẼ LỖI.");
            log.warn(" Đăng ký miễn phí tại https://cloudinary.com/users/register/free,");
            log.warn(" lấy 3 giá trị này ở Dashboard rồi điền vào file .env.");
            log.warn("=====================================================================");
        }
        return new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret,
                "secure", true
        ));
    }
}
