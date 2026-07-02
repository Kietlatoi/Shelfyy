package org.example.shelfy.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.shelfy.dto.request.UpdateUserRequest;
import org.example.shelfy.dto.response.UserProfileResponse;
import org.example.shelfy.entity.FileAsset;
import org.example.shelfy.entity.User;
import org.example.shelfy.exception.AppException;
import org.example.shelfy.exception.ErrorCode;
import org.example.shelfy.mapper.EntityMapper;
import org.example.shelfy.repository.FileAssetRepository;
import org.example.shelfy.repository.UserRepository;
import org.example.shelfy.service.CurrentUserService;
import org.example.shelfy.service.UserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;
    private final FileAssetRepository fileAssetRepository;
    private final EntityMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public UserProfileResponse me() {
        return mapper.toUserProfile(currentUserService.getCurrentUser());
    }

    @Override
    @Transactional
    public UserProfileResponse updateMe(UpdateUserRequest request) {
        User user = currentUserService.getCurrentUser();
        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getAvatarFileId() != null) {
            FileAsset avatar = fileAssetRepository.findById(request.getAvatarFileId())
                    .filter(file -> file.getOwner().getUserId().equals(user.getUserId()))
                    .orElseThrow(() -> new AppException(ErrorCode.AVATAR_NOT_FOUND));
            user.setAvatarFile(avatar);
        }
        return mapper.toUserProfile(userRepository.save(user));
    }
}
