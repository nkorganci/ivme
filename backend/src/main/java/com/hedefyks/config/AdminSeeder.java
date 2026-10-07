package com.hedefyks.config;

import com.hedefyks.user.Role;
import com.hedefyks.user.User;
import com.hedefyks.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Yönetici hesabını açılışta, şifre YALNIZ yapılandırmadan (ortam değişkeni) gelirse oluşturur.
 * Hesap zaten varsa dokunmaz (arayüzden değiştirilen şifre ezilmez).
 * Kaynak kodda gerçek şifre yoktur; root/root yalnız application-dev.yml içindeki geliştirme değeridir.
 */
@Component
class AdminSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final AppProperties props;
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final Environment env;

    AdminSeeder(AppProperties props, UserRepository users, PasswordEncoder encoder, Environment env) {
        this.props = props;
        this.users = users;
        this.encoder = encoder;
        this.env = env;
    }

    @Override
    public void run(ApplicationArguments args) {
        AppProperties.Admin admin = props.admin();
        if (admin == null || admin.password() == null || admin.password().isBlank()) {
            log.info("YKS_ADMIN_SIFRE tanımlı değil; yönetici hesabı oluşturulmadı.");
            return;
        }
        if (users.existsByUsername(admin.username())) {
            return;
        }
        boolean dev = env.acceptsProfiles(Profiles.of("dev", "test"));
        if (!dev && admin.password().length() < 10) {
            throw new IllegalStateException("Üretimde yönetici şifresi en az 10 karakter olmalı (YKS_ADMIN_SIFRE).");
        }
        User u = new User();
        u.setUsername(admin.username());
        u.setEmail(admin.email());
        u.setPasswordHash(encoder.encode(admin.password()));
        u.setRole(Role.ADMIN);
        users.save(u);
        log.info("Yönetici hesabı oluşturuldu: {}", admin.username());
    }
}
