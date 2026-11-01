package com.hedefyks.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/** No student email, phone, username or password is sent to the provider. */
@Component
public class BrevoRegistrationMail {
    public record Result(boolean accepted, boolean retryable, String code, String messageId) {}
    private final ObjectMapper mapper;
    private final RegistrationMailSettings settings;
    private final HttpClient client;
    private final URI endpoint;

    @org.springframework.beans.factory.annotation.Autowired
    public BrevoRegistrationMail(ObjectMapper mapper, RegistrationMailSettings settings) {
        this(mapper, settings, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build(),
                URI.create("https://api.brevo.com/v3/smtp/email"));
    }

    // Package-visible transport seam for a local fake provider; production endpoint is fixed HTTPS.
    BrevoRegistrationMail(ObjectMapper mapper, RegistrationMailSettings settings, HttpClient client, URI endpoint) {
        this.mapper = mapper; this.settings = settings; this.client = client; this.endpoint = endpoint;
    }

    public Result send(RegistrationNotificationOutbox.Job job) {
        try {
            String body = mapper.writeValueAsString(Map.of(
                    "sender", Map.of("email", settings.getSender(), "name", "İvme"),
                    "to", List.of(Map.of("email", job.recipient())),
                    "subject", "İvme: yeni kayıt onay bekliyor",
                    "textContent", "Yeni bir hesap kaydı alındı ve yönetici onayı bekliyor.\n"
                            + "Kullanıcıları incelemek için yönetim ekranını açın:\n" + settings.getManagementUrl(),
                    "headers", Map.of("idempotencyKey", job.eventKey().toString())));
            HttpRequest request = HttpRequest.newBuilder(endpoint).timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json; charset=utf-8")
                    .header("Accept", "application/json").header("api-key", settings.getApiKey())
                    .POST(HttpRequest.BodyPublishers.ofString(body)).build();
            var response = client.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status == 201) {
                var payload = mapper.readTree(response.body());
                String id = payload == null ? "" : payload.path("messageId").asText("");
                if (id.isBlank() || id.length() > 500) return new Result(false, true, "INVALID_RESPONSE", null);
                return new Result(true, false, null, id);
            }
            // Brevo's UUID deduplication window is 30 minutes; it is not a delivery receipt.
            if (status == 400) {
                try {
                    var payload = mapper.readTree(response.body());
                    if (payload != null && "duplicate_parameter".equals(payload.path("code").asText()))
                        return new Result(true, false, "PROVIDER_DUPLICATE", null);
                } catch (IOException ignored) { /* A malformed 400 is still a permanent rejection. */ }
            }
            return new Result(false, status == 408 || status == 429 || status >= 500, "HTTP_" + status, null);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            return new Result(false, true, "INTERRUPTED", null);
        } catch (IOException error) {
            return new Result(false, true, "NETWORK_OR_RESPONSE", null);
        } catch (IllegalArgumentException error) {
            return new Result(false, false, "INVALID_CONFIGURATION", null);
        }
    }
}
