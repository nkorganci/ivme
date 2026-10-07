package com.hedefyks.auth;

import com.hedefyks.user.AppUserDetails;
import com.hedefyks.user.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {}

    public record RegisterRequest(
            @NotBlank(message = "Kullanıcı adı gerekli.")
            @Size(min = 3, max = 30, message = "Kullanıcı adı 3–30 karakter olmalı.")
            @Pattern(regexp = "^[\\p{L}\\p{N}_.-]+$", message = "Kullanıcı adı yalnız harf, rakam, _ . - içerebilir.")
            String username,

            @NotBlank(message = "E-posta gerekli.")
            @Email(message = "Geçerli bir e-posta gir.")
            @Size(max = 254, message = "E-posta çok uzun.")
            String email,

            @NotBlank(message = "Şifre gerekli.")
            @Size(min = 8, max = 72, message = "Şifre 8–72 karakter olmalı.")
            String password) {}

    public record LoginRequest(
            @NotBlank(message = "Kullanıcı adı veya e-posta gerekli.") String login,
            @NotBlank(message = "Şifre gerekli.") String password) {}

    public record ChangePasswordRequest(
            @NotBlank(message = "Mevcut şifre gerekli.") String currentPassword,
            @NotBlank(message = "Yeni şifre gerekli.")
            @Size(min = 8, max = 72, message = "Yeni şifre 8–72 karakter olmalı.")
            String newPassword) {}

    public record UserDto(Long id, String username, String email, Role role) {
        public static UserDto of(AppUserDetails u) {
            return new UserDto(u.id(), u.username(), u.email(), u.role());
        }
    }
}
