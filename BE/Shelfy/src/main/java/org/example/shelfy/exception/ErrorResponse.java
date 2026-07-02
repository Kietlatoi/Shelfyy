package org.example.shelfy.exception;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.Map;

@Getter
@Builder
public class ErrorResponse {
    private String code;
    private String message;
    private Instant timestamp;
    private Map<String, String> errors;
}
