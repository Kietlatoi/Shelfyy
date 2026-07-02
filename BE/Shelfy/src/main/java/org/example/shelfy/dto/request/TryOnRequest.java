package org.example.shelfy.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.validator.constraints.URL;

@Getter
@Setter
public class TryOnRequest {
    @NotBlank(message = "Ảnh người mẫu không được để trống")
    @URL(message = "personImageUrl phải là URL hợp lệ")
    private String personImageUrl;

    @NotNull(message = "clothingItemId không được để trống")
    private Long clothingItemId;
}
