package com.hedefyks.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;
    private String email;

    @Column(length = 16)
    private String phone;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "password_change_required", nullable = false)
    private boolean passwordChangeRequired;

    @Enumerated(EnumType.STRING)
    private Role role = Role.USER;

    private boolean enabled = true;

    @Column(nullable = false)
    private boolean approved = true;

    @Enumerated(EnumType.STRING)
    private AccountCategory category;
    @Column(name="site_manager")
    private boolean siteManager;
    @Column(name="archived_at")
    private Instant archivedAt;
    @Column(name="pause_reason")
    private String pauseReason;
    @Column(name="last_login_at")
    private Instant lastLoginAt;
    @Column(name="last_seen_at")
    private Instant lastSeenAt;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();
}
