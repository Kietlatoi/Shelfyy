package org.example.shelfy.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ChangePasswordRequest {
    @NotBlank
    private String oldPassword;
    @NotBlank @Size(min = 6, max = 100)
    private String newPassword;
}
