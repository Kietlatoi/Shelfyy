package org.example.shelfy.exception;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ErrorResponse> handleAppException(AppException ex) {
        ErrorCode code = ex.getErrorCode();
        return ResponseEntity.status(code.getHttpStatus()).body(ErrorResponse.builder()
                .code(code.getCode())
                .message(ex.getMessage())
                .timestamp(Instant.now())
                .build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(err ->
                errors.put(err.getField(), err.getDefaultMessage()));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorResponse.builder()
                .code(ErrorCode.VALIDATION_ERROR.getCode())
                .message(ErrorCode.VALIDATION_ERROR.getMessage())
                .errors(errors)
                .timestamp(Instant.now())
                .build());
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraint(ConstraintViolationException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorResponse.builder()
                .code(ErrorCode.VALIDATION_ERROR.getCode())
                .message(ex.getMessage())
                .timestamp(Instant.now())
                .build());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadable(HttpMessageNotReadableException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorResponse.builder()
                .code(ErrorCode.VALIDATION_ERROR.getCode())
                .message("JSON không hợp lệ hoặc sai kiểu dữ liệu")
                .timestamp(Instant.now())
                .build());
    }

    @ExceptionHandler({BadCredentialsException.class, AccessDeniedException.class})
    public ResponseEntity<ErrorResponse> handleSecurity(Exception ex) {
        ErrorCode code = ex instanceof AccessDeniedException ? ErrorCode.AUTH_ACCESS_DENIED : ErrorCode.AUTH_INVALID_CREDENTIALS;
        return ResponseEntity.status(code.getHttpStatus()).body(ErrorResponse.builder()
                .code(code.getCode())
                .message(code.getMessage())
                .timestamp(Instant.now())
                .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleOther(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ErrorResponse.builder()
                .code(ErrorCode.INTERNAL_ERROR.getCode())
                .message(ex.getMessage())
                .timestamp(Instant.now())
                .build());
    }
}
