package com.hedefyks.auth;

import com.hedefyks.user.Role;
import com.hedefyks.user.User;
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

            @NotBlank(message = "Cep telefonu gerekli.")
            @Size(max = 32, message = "Cep telefonu çok uzun.")
            String phone,

            @NotBlank(message = "Şifre gerekli.")
            @Size(min = 15, max = 72, message = "Şifre 15–72 karakter olmalı.")
            String password) {
        @Override public String toString() { return "RegisterRequest[redacted]"; }
    }

    public record LoginRequest(
            @NotBlank(message = "Kullanıcı adı veya e-posta gerekli.")
            @Size(max = 254, message = "Giriş bilgisi çok uzun.") String login,
            @NotBlank(message = "Şifre gerekli.")
            @Size(max = 1024, message = "Şifre çok uzun.") String password) {
        @Override public String toString() { return "LoginRequest[redacted]"; }
    }

    public record ChangePasswordRequest(
            @NotBlank(message = "Mevcut şifre gerekli.")
            @Size(max = 1024, message = "Şifre çok uzun.") String currentPassword,
            @NotBlank(message = "Yeni şifre gerekli.")
            @Size(min = 15, max = 72, message = "Yeni şifre 15–72 karakter olmalı.")
            String newPassword) {
        @Override public String toString() { return "ChangePasswordRequest[redacted]"; }
    }

    public record UpdateContactRequest(
            @NotBlank(message = "E-posta gerekli.")
            @Email(message = "Geçerli bir e-posta gir.")
            @Size(max = 254, message = "E-posta çok uzun.")
            String email,
            @NotBlank(message = "Cep telefonu gerekli.")
            @Size(max = 32, message = "Cep telefonu çok uzun.")
            String phone,
            @NotBlank(message = "Mevcut şifre gerekli.")
            @Size(max = 1024, message = "Şifre çok uzun.") String currentPassword) {
        @Override public String toString() { return "UpdateContactRequest[redacted]"; }
    }

    public record ContactDto(String email, String phone) {
        @Override public String toString() { return "ContactDto[redacted]"; }
    }

    public record UserDto(Long id, String username, String email, Role role, boolean contactComplete) {
        public static UserDto of(User u) {
            return new UserDto(u.getId(), u.getUsername(), u.getEmail(), u.getRole(),
                    u.getPhone() != null && !u.getPhone().isBlank());
        }

        @Override public String toString() {
            return "UserDto[id=" + id + ", role=" + role + ", contactComplete=" + contactComplete + "]";
        }
    }
}
