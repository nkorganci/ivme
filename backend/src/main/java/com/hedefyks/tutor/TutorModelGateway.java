package com.hedefyks.tutor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.springframework.stereotype.Component;

/**
 * Model sağlayıcısına tek bir sohbet isteği gönderir. Yalnız sunucuda çalışır; anahtar
 * yapılandırmadan okunur ve hiçbir yanıtta geri dönmez. Testler bu bileşeni değiştirebilir.
 */
@Component
public class TutorModelGateway {
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();

    public TutorModelGateway(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    /** Modelin JSON metnini döner; ulaşılamazsa ya da biçim bozuksa istisna fırlatır. */
    public String complete(TutorProperties.Tier tier, String system, String user, Duration timeout) throws Exception {
        boolean ollama = "ollama".equalsIgnoreCase(tier.provider());
        ObjectNode body = mapper.createObjectNode();
        body.put("model", tier.model());
        var messages = body.putArray("messages");
        messages.addObject().put("role", "system").put("content", system);
        messages.addObject().put("role", "user").put("content", user);
        String path;
        if (ollama) {
            body.put("stream", false);
            body.put("format", "json");
            // Düşünme kipi kısa sınıflandırmayı ~27 sn'ye uzatıp zaman aşımına düşürür; kapalıyken <1 sn.
            body.put("think", false);
            // Soğuk yükleme (~30 sn) zaman aşımını aşmasın diye model bellekte tutulur.
            body.put("keep_alive", "30m");
            body.putObject("options").put("temperature", 0);
            path = "/api/chat";
        } else {
            body.put("temperature", 0);
            body.putObject("response_format").put("type", "json_object");
            path = "/v1/chat/completions";
        }
        var request = HttpRequest.newBuilder(URI.create(tier.baseUrl().replaceAll("/+$", "") + path))
                .timeout(timeout)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body), StandardCharsets.UTF_8));
        if (tier.apiKey() != null && !tier.apiKey().isBlank()) request.header("Authorization", "Bearer " + tier.apiKey());
        HttpResponse<String> response = http.send(request.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() / 100 != 2) throw new IllegalStateException("Model yanıt kodu " + response.statusCode());
        JsonNode root = mapper.readTree(response.body());
        JsonNode content = ollama ? root.path("message").path("content") : root.path("choices").path(0).path("message").path("content");
        if (!content.isTextual()) throw new IllegalStateException("Model yanıtında içerik yok");
        return content.asText();
    }
}
