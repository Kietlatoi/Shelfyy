package org.example.shelfy.service;

import org.example.shelfy.dto.request.UpdateUserRequest;
import org.example.shelfy.dto.response.UserProfileResponse;

public interface UserService {
    UserProfileResponse me();
    UserProfileResponse updateMe(UpdateUserRequest request);
}
