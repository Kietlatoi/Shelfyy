package org.example.shelfy.service;

public interface EmailService {
    void sendPasswordResetEmail(String toEmail, String resetLink);
}
