package org.example.shelfy.service;

import jakarta.servlet.http.HttpServletRequest;
import org.example.shelfy.dto.request.*;
import org.example.shelfy.dto.response.AuthResponse;

public interface AuthService {
    AuthResponse register(RegisterRequest request, HttpServletRequest httpRequest);
    AuthResponse login(LoginRequest request, HttpServletRequest httpRequest);
    AuthResponse refresh(RefreshRequest request, HttpServletRequest httpRequest);
    void logout(RefreshRequest request);
    void changePassword(ChangePasswordRequest request);
    void forgotPassword(ForgotPasswordRequest request);
    void resetPassword(ResetPasswordRequest request);
}
