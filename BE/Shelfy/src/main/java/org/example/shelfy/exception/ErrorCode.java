package org.example.shelfy.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    AUTH_INVALID_CREDENTIALS("AUTH_001", "Email hoặc mật khẩu không đúng", HttpStatus.UNAUTHORIZED),
    AUTH_ACCOUNT_LOCKED("AUTH_002", "Tài khoản đang bị khóa tạm thời", HttpStatus.LOCKED),
    AUTH_TOKEN_INVALID("AUTH_003", "Token không hợp lệ hoặc đã hết hạn", HttpStatus.UNAUTHORIZED),
    AUTH_REFRESH_TOKEN_INVALID("AUTH_004", "Refresh token không hợp lệ", HttpStatus.UNAUTHORIZED),
    AUTH_ACCESS_DENIED("AUTH_005", "Bạn không có quyền thực hiện thao tác này", HttpStatus.FORBIDDEN),
    AUTH_PASSWORD_NOT_MATCH("AUTH_006", "Mật khẩu cũ không đúng", HttpStatus.BAD_REQUEST),

    USER_EMAIL_EXISTS("USER_001", "Email đã được sử dụng", HttpStatus.CONFLICT),
    USER_NOT_FOUND("USER_002", "Không tìm thấy người dùng", HttpStatus.NOT_FOUND),
    USER_INACTIVE("USER_003", "Tài khoản không hoạt động", HttpStatus.FORBIDDEN),
    AVATAR_NOT_FOUND("USER_004","Không tìm thấy avatar của user",HttpStatus.NOT_FOUND),

    WARDROBE_ITEM_NOT_FOUND("WARDROBE_001", "Không tìm thấy món đồ trong tủ", HttpStatus.NOT_FOUND),
    WARDROBE_STORAGE_FULL("WARDROBE_002", "Tủ đồ đã đạt giới hạn lưu trữ của gói hiện tại", HttpStatus.BAD_REQUEST),
    WARDROBE_INVALID_CATEGORY("WARDROBE_003", "Danh mục món đồ không hợp lệ", HttpStatus.BAD_REQUEST),
    OUTFIT_NOT_FOUND("WARDROBE_004", "Không tìm thấy outfit", HttpStatus.NOT_FOUND),

    TRYON_LIMIT_EXCEEDED("TRYON_001", "Bạn đã hết lượt thử đồ ảo", HttpStatus.BAD_REQUEST),
    TRYON_JOB_NOT_FOUND("TRYON_002", "Không tìm thấy lịch sử thử đồ", HttpStatus.NOT_FOUND),
    TRYON_PROVIDER_ERROR("TRYON_003", "AI Try-On service đang gặp lỗi", HttpStatus.BAD_GATEWAY),

    IMAGE_INVALID_FORMAT("IMAGE_001", "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP", HttpStatus.BAD_REQUEST),
    IMAGE_TOO_LARGE("IMAGE_002", "Dung lượng ảnh vượt quá giới hạn", HttpStatus.BAD_REQUEST),
    IMAGE_UPLOAD_LIMIT_EXCEEDED("IMAGE_003", "Bạn đã vượt quá giới hạn upload trong ngày", HttpStatus.TOO_MANY_REQUESTS),
    IMAGE_UPLOAD_FAILED("IMAGE_004", "Upload ảnh thất bại", HttpStatus.BAD_GATEWAY),

    SUBSCRIPTION_INVALID_PLAN("SUBSCRIPTION_001", "Gói đăng ký không hợp lệ", HttpStatus.BAD_REQUEST),
    SUBSCRIPTION_CANCEL_STORAGE_EXCEEDED("SUBSCRIPTION_002", "Không thể hủy gói vì số món đồ đang vượt giới hạn FREE", HttpStatus.BAD_REQUEST),
    SUBSCRIPTION_DOWNGRADE_NOT_ALLOWED("SUBSCRIPTION_003","Không thể chuyển từ gói cao về gói thấp hơn khi đang còn hạn",HttpStatus.BAD_REQUEST),
    EVENT_NOT_FOUND("EVENT_001", "Không tìm thấy sự kiện", HttpStatus.NOT_FOUND),

    VALIDATION_ERROR("COMMON_001", "Dữ liệu không hợp lệ", HttpStatus.BAD_REQUEST),
    INTERNAL_ERROR("COMMON_999", "Lỗi hệ thống", HttpStatus.INTERNAL_SERVER_ERROR);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;

    ErrorCode(String code, String message, HttpStatus httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }
}
