package com.hedefyks.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** application.yml içindeki "app" bölümü. */
@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        @NotBlank String publicBaseUrl,
        Images images,
        Admin admin,
        String sampleData) {

    public record Images(@NotBlank String dir) {}

    public record Admin(String username, String email, String password) {}
}
