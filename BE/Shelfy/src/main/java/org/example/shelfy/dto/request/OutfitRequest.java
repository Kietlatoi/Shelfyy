package org.example.shelfy.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class OutfitRequest {
    @NotBlank(message = "Tên outfit không được để trống")
    @Size(max = 150, message = "Tên outfit tối đa 150 ký tự")
    private String name;

    @Size(max = 100, message = "Dịp sử dụng tối đa 100 ký tự")
    private String occasion;

    @Size(max = 500, message = "Mô tả tối đa 500 ký tự")
    private String description;

    @NotEmpty(message = "Outfit phải có ít nhất 1 món đồ")
    @Size(max = 20, message = "Outfit tối đa 20 món đồ")
    private List<Long> itemIds;
}
