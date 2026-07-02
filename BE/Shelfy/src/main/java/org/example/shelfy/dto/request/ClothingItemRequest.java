package org.example.shelfy.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.validator.constraints.URL;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class ClothingItemRequest {
    @NotBlank(message = "Tên món đồ không được để trống")
    @Size(max = 255, message = "Tên món đồ tối đa 255 ký tự")
    private String name;

    @Size(max = 100, message = "Tên thương hiệu tối đa 100 ký tự")
    private String brand;

    @NotBlank(message = "Danh mục không được để trống")
    @Size(max = 50, message = "Danh mục tối đa 50 ký tự")
    private String category;

    @Size(max = 100, message = "Danh mục phụ tối đa 100 ký tự")
    private String subCategory;

    @Size(max = 50, message = "Màu sắc tối đa 50 ký tự")
    private String color;

    @Pattern(regexp = "^#([A-Fa-f0-9]{6})$", message = "colorHex must be #RRGGBB")
    private String colorHex;

    @Size(max = 50, message = "Mùa tối đa 50 ký tự")
    private String season;

    @Size(max = 100, message = "Họa tiết tối đa 100 ký tự")
    private String pattern;

    @Size(max = 30, message = "Size tối đa 30 ký tự")
    private String size;

    @Size(max = 100, message = "Chất liệu tối đa 100 ký tự")
    private String material;

    @URL(message = "imageUrl phải là URL hợp lệ")
    private String imageUrl;

    @URL(message = "thumbnailUrl phải là URL hợp lệ")
    private String thumbnailUrl;

    @URL(message = "backgroundRemovedUrl phải là URL hợp lệ")
    private String backgroundRemovedUrl;

    @Size(max = 20, message = "Tối đa 20 tag")
    private List<@Size(max = 50, message = "Mỗi tag tối đa 50 ký tự") String> tags;

    @DecimalMin(value = "0", inclusive = true, message = "Giá mua không được âm")
    private BigDecimal purchasePrice;

    private LocalDate purchaseDate;

    @URL(message = "sourceUrl phải là URL hợp lệ")
    private String sourceUrl;
}
