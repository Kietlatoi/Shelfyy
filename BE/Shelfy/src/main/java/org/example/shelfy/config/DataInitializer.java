package org.example.shelfy.config;

import lombok.RequiredArgsConstructor;
import org.example.shelfy.entity.*;
import org.example.shelfy.enums.PasswordAlgo;
import org.example.shelfy.enums.UserStatus;
import org.example.shelfy.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class DataInitializer {
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final UserRepository userRepository;
    private final AuthCredentialRepository authCredentialRepository;
    private final UserRoleRepository userRoleRepository;
    private final PlanRepository planRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    CommandLineRunner seedData() {
        return args -> seed();
    }

    @Transactional
    public void seed() {
        Role userRole = roleRepository.findByRoleName("USER").orElseGet(() -> roleRepository.save(Role.builder().roleName("USER").description("Regular user").build()));
        Role adminRole = roleRepository.findByRoleName("ADMIN").orElseGet(() -> roleRepository.save(Role.builder().roleName("ADMIN").description("Administrator").build()));
        List<String> perms = List.of("WARDROBE_READ", "WARDROBE_CREATE", "WARDROBE_UPDATE", "WARDROBE_DELETE", "OUTFIT_CREATE", "TRY_ON_USE", "SUBSCRIPTION_MANAGE", "AUDIT_READ", "USER_MANAGE");
        for (String code : perms) {
            Permission p = permissionRepository.findByPermissionCode(code).orElseGet(() -> permissionRepository.save(Permission.builder().permissionCode(code).description(code).build()));
            if (!rolePermissionRepository.existsByRoleRoleIdAndPermissionPermissionId(userRole.getRoleId(), p.getPermissionId()) && !code.startsWith("AUDIT") && !code.startsWith("USER_MANAGE")) {
                rolePermissionRepository.save(RolePermission.builder().role(userRole).permission(p).build());
            }
            if (!rolePermissionRepository.existsByRoleRoleIdAndPermissionPermissionId(adminRole.getRoleId(), p.getPermissionId())) {
                rolePermissionRepository.save(RolePermission.builder().role(adminRole).permission(p).build());
            }
        }
        createPlan("FREE", "Miễn phí", BigDecimal.ZERO, 30, 5, 100, "Free plan");
        createPlan("PRO", "Gói Pro", BigDecimal.valueOf(59000), 30, 100, null, "Pro monthly plan");
        createPlan("PREMIUM", "Gói Premium", BigDecimal.valueOf(590000), 365, 100, null, "Premium yearly plan");
    }

    private void createPlan(String name, String display, BigDecimal price, int days, int tryOn, Integer wardrobeLimit, String features) {
        if (!planRepository.existsByPlanName(name)) {
            planRepository.save(Plan.builder().planName(name).displayName(display).price(price).currency("VND").durationDays(days)
                    .tryOnLimitPerMonth(tryOn).wardrobeLimit(wardrobeLimit).features(features).isActive(true).build());
        }
    }

    
}
