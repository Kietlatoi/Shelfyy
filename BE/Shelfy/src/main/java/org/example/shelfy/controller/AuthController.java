package org.example.shelfy.controller;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.shelfy.dto.request.*;
import org.example.shelfy.dto.response.AuthResponse;
import org.example.shelfy.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @Operation(summary = "Register new user")
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.register(request, httpRequest));
    }

    @Operation(summary = "Login")
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.login(request, httpRequest));
    }

    @Operation(summary = "Refresh access token")
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.refresh(request, httpRequest));
    }

    @Operation(summary = "Logout and revoke refresh token")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody RefreshRequest request) {
        authService.logout(request);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Forgot password - demo stores reset token hash")
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);

        return ResponseEntity.ok(Map.of(
                "message", "If the email exists, reset instructions have been sent."
        ));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);

        return ResponseEntity.ok(Map.of(
                "message", "Password has been reset successfully."
        ));
    }
}
