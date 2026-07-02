package org.example.shelfy.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.shelfy.exception.AppException;
import org.example.shelfy.exception.ErrorCode;
import org.example.shelfy.service.EmailService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${app.mail.fail-open:true}")
    private boolean failOpen;

    @Override
    public void sendPasswordResetEmail(String toEmail, String resetLink) {
        if (mailUsername == null || mailUsername.isBlank()) {
            handleMailNotSent("Chưa cấu hình MAIL_USERNAME", resetLink, null);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Đặt lại mật khẩu Shelfy");
        message.setText("""
                Xin chào,

                Shelfy nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.

                Vui lòng bấm vào đường dẫn dưới đây để tạo mật khẩu mới:
                %s

                Đường dẫn này sẽ hết hạn sau 30 phút.

                Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

                Đội ngũ Shelfy
                """.formatted(resetLink));

        try {
            mailSender.send(message);
        } catch (MailException ex) {
            handleMailNotSent("Không gửi được email đặt lại mật khẩu. Kiểm tra MAIL_USERNAME và Gmail App Password", resetLink, ex);
        }
    }

    private void handleMailNotSent(String message, String resetLink, Exception ex) {
        if (failOpen) {
            log.warn("{}; dev reset link: {}", message, resetLink, ex);
            return;
        }
        throw new AppException(ErrorCode.INTERNAL_ERROR, message);
    }
}
