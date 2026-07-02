package org.example.shelfy.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.shelfy.entity.AuditLog;
import org.example.shelfy.entity.User;
import org.example.shelfy.repository.AuditLogRepository;
import org.example.shelfy.service.AuditLogService;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {
    private final AuditLogRepository auditLogRepository;

    @Override
    public void log(User actor, String action, String entityName, Long entityId, String oldValue, String newValue) {
        auditLogRepository.save(AuditLog.builder()
                .actor(actor)
                .action(action)
                .entityName(entityName)
                .entityId(entityId)
                .oldValue(oldValue)
                .newValue(newValue)
                .build());
    }
}
