package com.hedefyks.auth;

import com.hedefyks.common.ApiException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.http.HttpStatus;

/** BCrypt'nin 72 bayt sınırında şifrenin sessizce kırpılmasını önler. */
final class PasswordRules {

    private PasswordRules() {}

    static void checkBytes(String password, String field) {
        if (password != null && password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Şifre çok uzun.",
                    Map.of(field, "Şifre UTF-8 olarak en fazla 72 bayt olmalı."));
        }
    }
}
