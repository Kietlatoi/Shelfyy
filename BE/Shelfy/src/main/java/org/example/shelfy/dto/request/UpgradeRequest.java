package org.example.shelfy.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class UpgradeRequest {
    @NotBlank
    private String planType;
}
