package com.hedefyks.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class BrevoRegistrationMailTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final AtomicReference<String> requestBody = new AtomicReference<>();
    private final AtomicReference<String> requestKey = new AtomicReference<>();
    private HttpServer server;
    private BrevoRegistrationMail mail;
    private int status = 201;
    private String response = "{\"messageId\":\"provider-accepted-id\"}";
    private final RegistrationNotificationOutbox.Job job = new RegistrationNotificationOutbox.Job(
            1, UUID.randomUUID(), "manager@example.com", 1, UUID.randomUUID());

    @BeforeEach void startProvider() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/smtp/email", exchange -> {
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8));
            requestKey.set(exchange.getRequestHeaders().getFirst("api-key"));
            byte[] bytes = response.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(status, bytes.length);
            try (var output = exchange.getResponseBody()) { output.write(bytes); }
        });
        server.start();
        var settings = new RegistrationMailSettings();
        settings.setSender("verified@example.com"); settings.setApiKey("local-fake-key");
        settings.setManagementUrl("https://example.com/yonetim");
        mail = new BrevoRegistrationMail(mapper, settings, HttpClient.newHttpClient(),
                URI.create("http://127.0.0.1:"+server.getAddress().getPort()+"/smtp/email"));
    }

    @AfterEach void stopProvider() { server.stop(0); }

    @Test void sendsToConfiguredRecipientWithStableUuidAndMinimalContent() throws Exception {
        assertThat(mail.send(job).messageId()).isEqualTo("provider-accepted-id");
        var body = mapper.readTree(requestBody.get());
        assertThat(requestKey.get()).isEqualTo("local-fake-key");
        assertThat(body.path("to").get(0).path("email").asText()).isEqualTo(job.recipient());
        assertThat(body.path("sender").path("email").asText()).isEqualTo("verified@example.com");
        assertThat(body.path("headers").path("idempotencyKey").asText()).isEqualTo(job.eventKey().toString());
        assertThat(body.path("textContent").asText()).contains("yönetici onayı", "https://example.com/yonetim");
        assertThat(requestBody.get()).doesNotContain("password", "phone", "username", "local-fake-key");
        mail.send(job);
        assertThat(mapper.readTree(requestBody.get()).path("headers").path("idempotencyKey").asText()).isEqualTo(job.eventKey().toString());
    }

    @Test void providerOutageAndQuotaRetryButCredentialsAndBadRequestsFail() {
        for (int code : new int[]{408, 429, 500, 503}) {
            status = code;
            assertThat(mail.send(job).retryable()).isTrue();
            assertThat(mail.send(job).accepted()).isFalse();
        }
        for (int code : new int[]{400, 401, 403, 422}) {
            status = code;
            assertThat(mail.send(job).retryable()).isFalse();
            assertThat(mail.send(job).code()).isEqualTo("HTTP_"+code);
        }
    }

    @Test void duplicateAcknowledgementIsAcceptedWithoutClaimingDelivery() {
        status = 400; response = "{\"code\":\"duplicate_parameter\"}";
        var result = mail.send(job);
        assertThat(result.accepted()).isTrue();
        assertThat(result.messageId()).isNull();
        assertThat(result.code()).isEqualTo("PROVIDER_DUPLICATE");
    }

    @Test void malformedSuccessAndNetworkLossRemainRetryable() {
        response = "{}";
        assertThat(mail.send(job).retryable()).isTrue();
        response = "broken json";
        assertThat(mail.send(job).retryable()).isTrue();
        server.stop(0);
        assertThat(mail.send(job).retryable()).isTrue();
    }
}
