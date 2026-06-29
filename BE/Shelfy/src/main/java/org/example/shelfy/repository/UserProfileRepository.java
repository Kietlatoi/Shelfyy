package org.example.shelfy.repository;

import org.example.shelfy.entity.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {

    Optional<UserProfile> findByUserUserId(Long userId);

    boolean existsByUserUserId(Long userId);
}
