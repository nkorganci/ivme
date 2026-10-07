package com.hedefyks.common;

import java.util.Map;
import org.springframework.http.HttpStatus;

/** Kullanıcıya Türkçe mesajla dönen, beklenen hata (doğrulama, bulunamadı, çakışma...). */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final transient Map<String, String> fields;

    public ApiException(HttpStatus status, String message) {
        this(status, message, null);
    }

    public ApiException(HttpStatus status, String message, Map<String, String> fields) {
        super(message);
        this.status = status;
        this.fields = fields;
    }

    public static ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, message);
    }

    public static ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }

    public static ApiException conflict(String message) {
        return new ApiException(HttpStatus.CONFLICT, message);
    }

    public HttpStatus getStatus() {
        return status;
    }

    public Map<String, String> getFields() {
        return fields;
    }
}
