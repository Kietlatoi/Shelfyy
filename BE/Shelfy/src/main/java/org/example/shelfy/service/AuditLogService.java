package org.example.shelfy.service;

import org.example.shelfy.entity.User;

public interface AuditLogService {
    void log(User actor, String action, String entityName, Long entityId, String oldValue, String newValue);
}
