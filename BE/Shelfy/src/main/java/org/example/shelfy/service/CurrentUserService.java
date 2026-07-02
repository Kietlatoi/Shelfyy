package org.example.shelfy.service;

import org.example.shelfy.entity.User;

public interface CurrentUserService {
    User getCurrentUser();
    Long getCurrentUserId();
}
