package com.hedefyks.config;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.hedefyks.user.Role;
import com.hedefyks.user.User;
import com.hedefyks.user.UserRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.ApplicationArguments;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;

class AdminSeederTest {

    @Test
    void uretimGeciciParolaliOperatorHesabiniReddeder() {
        UserRepository users = mock(UserRepository.class);
        Environment env = productionEnv();
        User operator = new User();
        operator.setRole(Role.OPERATOR);
        operator.setPasswordChangeRequired(true);
        when(users.findByRoleIn(anyCollection())).thenReturn(List.of(operator));

        AdminSeeder seeder = new AdminSeeder(new AppProperties("https://net.ivme.dev", null, null, null),
                users, mock(PasswordEncoder.class), env);
        assertThatThrownBy(() -> seeder.run(mock(ApplicationArguments.class)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Geçici parolalı");
    }

    @Test
    void uretimEskiYetkiliHesabinRootParolasiniReddeder() {
        UserRepository users = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        Environment env = productionEnv();
        User oldAdmin = new User();
        oldAdmin.setRole(Role.ADMIN);
        oldAdmin.setPasswordHash("stored-hash");
        when(users.findByRoleIn(anyCollection())).thenReturn(List.of(oldAdmin));
        when(encoder.matches("root", "stored-hash")).thenReturn(true);

        AdminSeeder seeder = new AdminSeeder(new AppProperties("https://net.ivme.dev", null, null, null), users, encoder, env);
        assertThatThrownBy(() -> seeder.run(mock(ApplicationArguments.class)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Varsayılan root parolası");
    }

    @Test
    void uretimdeYeniYoneticiSifresiEnAzOnBesKarakterOlur() {
        UserRepository users = mock(UserRepository.class);
        AdminSeeder seeder = new AdminSeeder(new AppProperties("https://net.ivme.dev", null,
                new AppProperties.Admin("yonetici", "yonetici@example.invalid", "kisa-parola"), null),
                users, mock(PasswordEncoder.class), productionEnv());

        assertThatThrownBy(() -> seeder.run(mock(ApplicationArguments.class)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("en az 15 karakter");
    }

    @Test
    void uretimGuvenliCerezVeHttpsSiteAdresiIster() {
        Environment env = mock(Environment.class);
        AdminSeeder seeder = new AdminSeeder(new AppProperties("http://localhost:5173", null, null, null),
                mock(UserRepository.class), mock(PasswordEncoder.class), env);
        assertThatThrownBy(() -> seeder.run(mock(ApplicationArguments.class)))
                .hasMessageContaining("güvenli oturum çerezi");

        when(env.getProperty("server.servlet.session.cookie.secure", Boolean.class)).thenReturn(true);
        assertThatThrownBy(() -> seeder.run(mock(ApplicationArguments.class)))
                .hasMessageContaining("HTTPS site adresi");
    }

    private static Environment productionEnv() {
        Environment env = mock(Environment.class);
        when(env.getProperty("server.servlet.session.cookie.secure", Boolean.class)).thenReturn(true);
        return env;
    }
}
