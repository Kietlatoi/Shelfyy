package org.example.shelfy.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.shelfy.entity.User;
import org.example.shelfy.exception.AppException;
import org.example.shelfy.exception.ErrorCode;
import org.example.shelfy.repository.UserRepository;
import org.example.shelfy.security.UserDetailsImpl;
import org.example.shelfy.service.CurrentUserService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CurrentUserServiceImpl implements CurrentUserService {
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public User getCurrentUser() {
        return userRepository.findByUserIdAndDeletedAtIsNull(getCurrentUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    @Override
    public Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserDetailsImpl userDetails)) {
            throw new AppException(ErrorCode.AUTH_TOKEN_INVALID);
        }
        return userDetails.getUserId();
    }
}
