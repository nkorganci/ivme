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
    void uretimEskiYetkiliHesabinRootParolasiniReddeder() {
        UserRepository users = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        Environment env = mock(Environment.class);
        User oldAdmin = new User();
        oldAdmin.setRole(Role.ADMIN);
        oldAdmin.setPasswordHash("stored-hash");
        when(users.findByRoleIn(anyCollection())).thenReturn(List.of(oldAdmin));
        when(encoder.matches("root", "stored-hash")).thenReturn(true);

        AdminSeeder seeder = new AdminSeeder(new AppProperties(null, null, null, null), users, encoder, env);
        assertThatThrownBy(() -> seeder.run(mock(ApplicationArguments.class)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Varsayılan root parolası");
    }

    @Test
    void uretimdeYeniYoneticiSifresiEnAzOnBesKarakterOlur() {
        UserRepository users = mock(UserRepository.class);
        AdminSeeder seeder = new AdminSeeder(new AppProperties(null, null,
                new AppProperties.Admin("yonetici", "yonetici@example.invalid", "kisa-parola"), null),
                users, mock(PasswordEncoder.class), mock(Environment.class));

        assertThatThrownBy(() -> seeder.run(mock(ApplicationArguments.class)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("en az 15 karakter");
    }
}
