package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.user.Role;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

class TopicPdfEndpointTest extends TestBase {

    private static final Path ROOT = Path.of("target/topic-pdf-endpoint-test").toAbsolutePath();
    private static final Path SOURCE = ROOT.resolve("source");
    private static final Path CATALOG = ROOT.resolve("catalog");
    private static final byte[] PDF = "%PDF-1.4\nendpoint fixture\n".getBytes(StandardCharsets.UTF_8);

    static {
        try {
            Files.createDirectories(SOURCE);
            Files.createDirectories(CATALOG);
            Files.write(SOURCE.resolve("lesson.pdf"), PDF);
            String sha = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(PDF));
            Files.writeString(CATALOG.resolve("17.json"), """
                    {"result":{"catalog_id":17,"title":"Sözcükte Anlam","exam":"TYT",
                    "subject":"turkce","kind":"topic_summary","grade":9,"page_count":1,
                    "status":"available","relative_path":"lesson.pdf","source_sha256":"%s"}}
                    """.formatted(sha));
        } catch (Exception ex) {
            throw new ExceptionInInitializerError(ex);
        }
    }

    @DynamicPropertySource
    static void topicPdfPaths(DynamicPropertyRegistry registry) {
        registry.add("app.topic-pdfs.catalog-dir", () -> CATALOG.toString());
        registry.add("app.topic-pdfs.source-dir", () -> SOURCE.toString());
    }

    @Test
    void studentCanOpenInlinePdfWithoutSeeingLocalPath() throws Exception {
        user("studentpdf", Role.USER);
        var student = login("studentpdf", "Sifre1234");
        String list = send(student, get("/api/topic-pdfs?exam=TYT&subject=turkce&q=Sözcük"), null)
                .andExpect(status().isOk())
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andReturn().getResponse().getContentAsString();
        assertThat(list).contains("Sözcükte Anlam").doesNotContain("lesson.pdf", "source_sha256");

        byte[] body = send(student, get("/api/topic-pdfs/17/file"), null)
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"))
                .andExpect(header().string("X-Frame-Options", "SAMEORIGIN"))
                .andExpect(header().string("Content-Disposition", "inline; filename=ogm-17.pdf"))
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(body).isEqualTo(PDF);
    }
}
