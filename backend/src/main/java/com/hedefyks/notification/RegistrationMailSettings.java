package com.hedefyks.notification;

import java.net.URI;
import jakarta.validation.constraints.Email;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Component
@ConfigurationProperties(prefix = "app.registration-mail")
@Validated
@Getter
@Setter
public class RegistrationMailSettings {
    private boolean enabled = true;
    @Email private String recipient = "";
    @Email private String sender = "";
    private String apiKey = "";
    private String managementUrl = "";

    public boolean ready() {
        if (!enabled || recipient.isBlank() || sender.isBlank() || apiKey.isBlank()) return false;
        try {
            URI uri = URI.create(managementUrl);
            return uri.getHost() != null && uri.getUserInfo() == null &&
                    ("https".equals(uri.getScheme()) || ("http".equals(uri.getScheme()) &&
                            ("localhost".equals(uri.getHost()) || "127.0.0.1".equals(uri.getHost()))));
        } catch (IllegalArgumentException error) { return false; }
    }
}
