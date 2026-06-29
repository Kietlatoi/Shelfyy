package org.example.shelfy.repository;

import org.example.shelfy.entity.FileAsset;
import org.example.shelfy.enums.FileType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface FileAssetRepository extends JpaRepository<FileAsset, Long> {

    List<FileAsset> findByOwnerUserIdAndFileTypeAndDeletedAtIsNull(Long userId, FileType type);

    Optional<FileAsset> findByObjectKey(String objectKey);

    /** Soft-delete file (đánh dấu xoá, job riêng sẽ xoá trên Cloudinary) */
    @Modifying
    @Query("UPDATE FileAsset f SET f.deletedAt = :now WHERE f.fileId = :id")
    int softDelete(@Param("id") Long id, @Param("now") LocalDateTime now);

    /** Lấy các file đã bị xoá mềm nhưng chưa xoá trên Cloudinary */
    @Query("SELECT f FROM FileAsset f WHERE f.deletedAt IS NOT NULL AND f.deletedAt < :before")
    List<FileAsset> findSoftDeletedBefore(@Param("before") LocalDateTime before);
}
