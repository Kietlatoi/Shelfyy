package org.example.shelfy.service.impl;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.example.shelfy.dto.request.*;
import org.example.shelfy.dto.response.AuthResponse;
import org.example.shelfy.entity.*;
import org.example.shelfy.enums.PasswordAlgo;
import org.example.shelfy.enums.UserStatus;
import org.example.shelfy.exception.AppException;
import org.example.shelfy.exception.ErrorCode;
import org.example.shelfy.mapper.EntityMapper;
import org.example.shelfy.repository.*;
import org.example.shelfy.security.JwtService;
import org.example.shelfy.security.TokenHashService;
import org.example.shelfy.security.UserDetailsImpl;
import org.example.shelfy.security.UserDetailsServiceImpl;
import org.example.shelfy.service.AuthService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.example.shelfy.service.EmailService;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private final UserRepository userRepository;
    private final AuthCredentialRepository authCredentialRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final LoginAttemptRepository loginAttemptRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TokenHashService tokenHashService;
    private final UserDetailsServiceImpl userDetailsService;
    private final EmailService emailService;
    private final EntityMapper mapper;

    @Value("${jwt.refresh-expiry}")
    private long refreshExpiry;
    @Value("${jwt.remember-me-refresh-expiry}")
    private long rememberMeRefreshExpiry;
    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request, HttpServletRequest httpRequest) {
        String email = normalizeEmail(request.getEmail());
        if (userRepository.existsByEmail(email)) {
            throw new AppException(ErrorCode.USER_EMAIL_EXISTS);
        }
        User user = User.builder()
                .email(email)
                .fullName(request.getFullName().trim())
                .status(UserStatus.ACTIVE)
                .emailVerified(false)
                .plan("FREE")
                .storageLimit(100)
                .storageUsed(0)
                .tryOnLimit(5)
                .tryOnCountToday(0)
                .build();
        user = userRepository.save(user);
        authCredentialRepository.save(AuthCredential.builder()
                .user(user)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .passwordAlgo(PasswordAlgo.BCRYPT)
                .build());
        assignDefaultRole(user);
        return buildAuthResponse(user, false, httpRequest);
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        String email = normalizeEmail(request.getEmail());
        User user = userRepository.findByEmail(email).orElse(null);
        try {
            if (user != null) {
                AuthCredential credential = authCredentialRepository.findByUserUserId(user.getUserId())
                        .orElseThrow(() -> new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS));
                if (credential.getLockedUntil() != null && credential.getLockedUntil().isAfter(LocalDateTime.now())) {
                    saveLoginAttempt(user, email, false, "ACCOUNT_LOCKED", httpRequest);
                    throw new AppException(ErrorCode.AUTH_ACCOUNT_LOCKED);
                }
            }
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.getPassword()));
            authCredentialRepository.resetFailedCountAndUpdateLastLogin(user.getUserId(), LocalDateTime.now());
            saveLoginAttempt(user, email, true, null, httpRequest);
            return buildAuthResponse(user, request.isRememberMe(), httpRequest);
        } catch (AppException ex) {
            throw ex;
        } catch (AuthenticationException ex) {
            if (user != null) {
                // FIX #10: Dùng auth_credentials.failed_login_count làm NGUỒN DUY NHẤT
                // để quyết định khoá tài khoản, thay vì đếm từ bảng login_attempts.
                // Trước đây: incrementFailedCount() tăng failed_login_count, nhưng
                // quyết định khoá lại dựa vào countFailedByEmailAfter() (đếm từ
                // login_attempts) — 2 nguồn dữ liệu độc lập, có thể lệch nhau nếu
                // 1 trong 2 bảng bị xoá/restart không đồng bộ. Load entity, tăng
                // trực tiếp trên entity rồi kiểm tra ngay giá trị vừa tăng —
                // đảm bảo quyết định khoá luôn dựa trên đúng 1 nguồn nhất quán.
                authCredentialRepository.findByUserUserId(user.getUserId()).ifPresent(credential -> {
                    int newFailedCount = nullSafe(credential.getFailedLoginCount()) + 1;
                    credential.setFailedLoginCount(newFailedCount);
                    if (newFailedCount >= 4) {
                        credential.setLockedUntil(LocalDateTime.now().plusMinutes(15));
                    }
                    authCredentialRepository.save(credential);
                });
                saveLoginAttempt(user, email, false, "BAD_CREDENTIALS", httpRequest);
            } else {
                saveLoginAttempt(null, email, false, "USER_NOT_FOUND", httpRequest);
            }
            throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS);
        }
    }

    @Override
    @Transactional
    public AuthResponse refresh(RefreshRequest request, HttpServletRequest httpRequest) {
        String oldHash = tokenHashService.sha256(request.getRefreshToken());
        RefreshToken token = refreshTokenRepository.findByTokenHash(oldHash)
                .filter(RefreshToken::isActive)
                .orElseThrow(() -> new AppException(ErrorCode.AUTH_REFRESH_TOKEN_INVALID));
        User user = token.getUser();
        String newRaw = newSecureToken();
        String newHash = tokenHashService.sha256(newRaw);
        token.setRevokedAt(LocalDateTime.now());
        token.setReplacedByTokenHash(newHash);
        refreshTokenRepository.save(token);
        RefreshToken newToken = createRefreshToken(user, newRaw, refreshExpiry, httpRequest);
        UserDetailsImpl userDetails = (UserDetailsImpl) userDetailsService.loadUserByUsername(user.getEmail());
        return AuthResponse.builder()
                .accessToken(jwtService.generateAccessToken(userDetails))
                .refreshToken(newRaw)
                .expiresIn(jwtService.getAccessExpiry())
                .user(mapper.toUserProfile(user))
                .build();
    }

    @Override
    @Transactional
    public void logout(RefreshRequest request) {
        refreshTokenRepository.revokeByTokenHash(tokenHashService.sha256(request.getRefreshToken()), LocalDateTime.now());
    }

    @Override
    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        UserDetailsImpl current = getCurrentPrincipal();
        AuthCredential credential = authCredentialRepository.findByUserUserId(current.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        if (!passwordEncoder.matches(request.getOldPassword(), credential.getPasswordHash())) {
            throw new AppException(ErrorCode.AUTH_PASSWORD_NOT_MATCH);
        }
        authCredentialRepository.updatePassword(current.getUserId(), passwordEncoder.encode(request.getNewPassword()), LocalDateTime.now());
        refreshTokenRepository.revokeAllByUserId(current.getUserId(), LocalDateTime.now());
    }

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmail(normalizeEmail(request.getEmail())).ifPresent(user -> {
            passwordResetTokenRepository.deleteByUserId(user.getUserId());

            String raw = newSecureToken();
            String resetLink = frontendUrl + "/reset-password?token=" + raw;

            passwordResetTokenRepository.save(
                    PasswordResetToken.builder()
                            .user(user)
                            .tokenHash(tokenHashService.sha256(raw))
                            .expiresAt(LocalDateTime.now().plusMinutes(30))
                            .build()
            );

            emailService.sendPasswordResetEmail(user.getEmail(), resetLink);
        });
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String tokenHash = tokenHashService.sha256(request.getToken());

        PasswordResetToken resetToken = passwordResetTokenRepository
                .findValidToken(tokenHash, LocalDateTime.now())
                .orElseThrow(() -> new AppException(ErrorCode.AUTH_TOKEN_INVALID));

        User user = resetToken.getUser();

        AuthCredential credential = authCredentialRepository.findByUserUserId(user.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        credential.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        credential.setPasswordAlgo(PasswordAlgo.BCRYPT);
        credential.setPasswordChangedAt(LocalDateTime.now());
        credential.setMustChangePassword(false);
        credential.setFailedLoginCount(0);

        authCredentialRepository.save(credential);

        resetToken.setUsedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(resetToken);

        refreshTokenRepository.revokeAllByUserId(user.getUserId(), LocalDateTime.now());
    }

    private AuthResponse buildAuthResponse(User user, boolean rememberMe, HttpServletRequest request) {
        UserDetailsImpl userDetails = (UserDetailsImpl) userDetailsService.loadUserByUsername(user.getEmail());
        String refreshRaw = newSecureToken();
        long ttl = rememberMe ? rememberMeRefreshExpiry : refreshExpiry;
        createRefreshToken(user, refreshRaw, ttl, request);
        return AuthResponse.builder()
                .accessToken(jwtService.generateAccessToken(userDetails))
                .refreshToken(refreshRaw)
                .expiresIn(jwtService.getAccessExpiry())
                .user(mapper.toUserProfile(user))
                .build();
    }

    private RefreshToken createRefreshToken(User user, String rawToken, long ttlMs, HttpServletRequest request) {
        return refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(tokenHashService.sha256(rawToken))
                .ipAddress(clientIp(request))
                .userAgent(request == null ? null : request.getHeader("User-Agent"))
                .expiresAt(LocalDateTime.now().plusSeconds(ttlMs / 1000))
                .build());
    }

    private void assignDefaultRole(User user) {
        Role role = roleRepository.findByRoleName("USER")
                .orElseGet(() -> roleRepository.save(Role.builder().roleName("USER").description("Default user").build()));
        if (!userRoleRepository.existsByUserUserIdAndRoleRoleId(user.getUserId(), role.getRoleId())) {
            userRoleRepository.save(UserRole.builder().user(user).role(role).build());
        }
    }

    private void saveLoginAttempt(User user, String email, boolean success, String reason, HttpServletRequest request) {
        loginAttemptRepository.save(LoginAttempt.builder()
                .user(user)
                .email(email)
                .success(success)
                .failureReason(reason)
                .ipAddress(clientIp(request))
                .userAgent(request == null ? null : request.getHeader("User-Agent"))
                .build());
    }

    private String newSecureToken() {
        byte[] bytes = new byte[64];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private int nullSafe(Integer v) { return v == null ? 0 : v; }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    private String clientIp(HttpServletRequest request) {
        if (request == null) return null;
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) return forwarded.split(",")[0].trim();
        return request.getRemoteAddr();
    }

    private UserDetailsImpl getCurrentPrincipal() {
        Object principal = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetailsImpl userDetails) return userDetails;
        throw new AppException(ErrorCode.AUTH_TOKEN_INVALID);
    }
}