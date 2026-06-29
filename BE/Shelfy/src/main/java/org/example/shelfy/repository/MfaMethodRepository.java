package org.example.shelfy.repository;

import org.example.shelfy.entity.MfaMethod;
import org.example.shelfy.enums.MfaMethodType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MfaMethodRepository extends JpaRepository<MfaMethod, Long> {

    List<MfaMethod> findByUserUserId(Long userId);

    Optional<MfaMethod> findByUserUserIdAndMethodType(Long userId, MfaMethodType type);

    List<MfaMethod> findByUserUserIdAndIsEnabledTrue(Long userId);

    @Modifying
    @Query("UPDATE MfaMethod m SET m.isEnabled = :enabled " +
           "WHERE m.user.userId = :userId AND m.methodType = :type")
    int setEnabled(@Param("userId") Long userId,
                   @Param("type") MfaMethodType type,
                   @Param("enabled") boolean enabled);
}
