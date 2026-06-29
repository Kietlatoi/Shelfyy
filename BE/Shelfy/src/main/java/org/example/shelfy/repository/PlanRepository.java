package org.example.shelfy.repository;

import org.example.shelfy.entity.Plan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlanRepository extends JpaRepository<Plan, Long> {

    Optional<Plan> findByPlanName(String planName);

    List<Plan> findByIsActiveTrueOrderByPriceAsc();

    boolean existsByPlanName(String planName);
}
