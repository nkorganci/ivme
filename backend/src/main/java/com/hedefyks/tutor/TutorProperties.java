package com.hedefyks.tutor;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * application.yml "app.tutor" bölümü. Model adresleri ve anahtarları yalnız sunucu ortamından
 * okunur; hiçbir yanıt ya da ön yüz dosyası bu değerleri taşımaz.
 */
@ConfigurationProperties(prefix = "app.tutor")
public record TutorProperties(
        @DefaultValue("VERIFIED_OR_APPROVED") Visibility studentVisibility,
        @DefaultValue Models models) {

    /** Öğrencinin görebileceği içerik: pilotta otomatik doğrulanmış ya da öğretmen onaylı. */
    public enum Visibility { VERIFIED_OR_APPROVED, APPROVED_ONLY }

    public record Models(@DefaultValue("true") boolean enabled,
                         @DefaultValue("20") int timeoutSeconds,
                         @DefaultValue Tier economic,
                         @DefaultValue Tier strong) {}

    /** provider: "ollama" ya da "openai-compatible" (/v1/chat/completions). */
    public record Tier(@DefaultValue("ollama") String provider,
                       @DefaultValue("http://127.0.0.1:11434") String baseUrl,
                       @DefaultValue("") String model,
                       @DefaultValue("") String apiKey) {
        public boolean configured() {
            return model != null && !model.isBlank() && baseUrl != null && !baseUrl.isBlank();
        }
    }
}
