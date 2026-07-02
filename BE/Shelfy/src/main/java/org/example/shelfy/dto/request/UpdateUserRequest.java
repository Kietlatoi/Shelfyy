package org.example.shelfy.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class UpdateUserRequest {

    @Size(min = 2, max = 100)
    private String fullName;
    private Long avatarFileId;
    private String avatarUrl;
}
