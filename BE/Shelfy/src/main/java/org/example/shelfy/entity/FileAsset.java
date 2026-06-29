package org.example.shelfy.entity;

import org.example.shelfy.enums.FileType;
import org.example.shelfy.enums.FileVisibility;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Lưu thông tin file đã upload lên Cloudinary.
 * Tất cả ảnh (avatar, tủ đồ, outfit, try-on) đều qua bảng này.
 *
 * DDL gốc: file_assets
 */
@Entity
@Table(
    name = "file_assets",
    indexes = {
        @Index(name = "IX_file_assets_owner", columnList = "owner_user_id"),
        @Index(name = "IX_file_assets_type",  columnList = "file_type")
    }
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class FileAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "file_id")
    private Long fileId;

    /** Chủ sở hữu file */
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id", nullable = false)
    private User owner;

    /** URL công khai / signed URL trả về từ Cloudinary */
    @NotBlank
    @Column(name = "file_url", nullable = false, length = 1000)
    private String fileUrl;

    /** Public-ID / object key trên Cloudinary (dùng để xoá / transform) */
    @Column(name = "object_key", length = 500)
    private String objectKey;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "file_type", nullable = false, length = 50)
    private FileType fileType;

    @NotBlank
    @Column(name = "mime_type", nullable = false, length = 100)
    private String mimeType;

    @Column(name = "file_size")
    private Long fileSize;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private FileVisibility visibility = FileVisibility.PRIVATE;

    @Column(length = 255)
    private String checksum;

    @CreationTimestamp
    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private LocalDateTime uploadedAt;

    /** Soft-delete: đánh dấu đã xoá trên Cloudinary */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
