package org.example.shelfy.repository;

import org.example.shelfy.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    Page<AuditLog> findByActorUserIdOrderByCreatedAtDesc(Long actorUserId, Pageable pageable);

    Page<AuditLog> findByActionOrderByCreatedAtDesc(String action, Pageable pageable);

    @Query("SELECT a FROM AuditLog a " +
           "WHERE a.entityName = :entity AND a.entityId = :entityId " +
           "ORDER BY a.createdAt DESC")
    List<AuditLog> findByEntity(@Param("entity") String entityName,
                                @Param("entityId") Long entityId);

    /** Xoá log cũ hơn N ngày — chạy bởi scheduler dọn dẹp định kỳ */
    @Modifying
    @Query("DELETE FROM AuditLog a WHERE a.createdAt < :before")
    int deleteOlderThan(@Param("before") LocalDateTime before);
}
