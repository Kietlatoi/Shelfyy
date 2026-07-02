package org.example.shelfy.controller;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.shelfy.dto.request.ChangePasswordRequest;
import org.example.shelfy.dto.request.UpdateUserRequest;
import org.example.shelfy.dto.response.UserProfileResponse;
import org.example.shelfy.service.AuthService;
import org.example.shelfy.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    private final AuthService authService;

    @Operation(summary = "Get current user profile")
    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> me() {
        return ResponseEntity.ok(userService.me());
    }

    @Operation(summary = "Update current user profile")
    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateMe(@Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(userService.updateMe(request));
    }

    @Operation(summary = "Change password")
    @PutMapping("/me/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(request);
        return ResponseEntity.noContent().build();
    }
}
