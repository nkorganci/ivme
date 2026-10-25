package com.hedefyks.topicpdf;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class TopicPdfServiceTest {

    @TempDir Path temp;

    @Test
    void catalogIdOpensOnlyMatchingFileInsideSourceRoot() throws Exception {
        Path source = Files.createDirectory(temp.resolve("source"));
        Path catalog = Files.createDirectory(temp.resolve("catalog"));
        byte[] content = "%PDF-1.4\nlocal fixture\n".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        Path pdf = source.resolve("lesson.pdf");
        Files.write(pdf, content);
        String sha = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        Files.writeString(catalog.resolve("17.json"), """
                {"result":{"catalog_id":17,"title":"Sözcükte Anlam","exam":"TYT",
                "subject":"turkce","kind":"topic_summary","grade":9,"page_count":1,
                "status":"available","relative_path":"lesson.pdf","source_sha256":"%s"}}
                """.formatted(sha));
        TopicPdfService service = new TopicPdfService(new ObjectMapper(), catalog.toString(), source.toString());

        assertThat(service.list("TYT", "turkce", "topic_summary", 9, "sözcük", 0, 20).totalElements()).isEqualTo(1);
        assertThat(service.list("TYT", "turkce", "topic_summary", 10, "sözcük", 0, 20).totalElements()).isZero();
        assertThat(service.filters().grades()).containsExactly(9);
        assertThat(service.filters().facets()).containsExactly(
                new TopicPdfService.Facet("TYT", "turkce", 9, "topic_summary", 1));
        assertThat(service.file(17).getInputStream().readAllBytes()).isEqualTo(content);
        assertThat(service.detail(17).title()).isEqualTo("Sözcükte Anlam");
        Files.writeString(pdf, "changed");
        assertThatThrownBy(() -> service.file(17)).isInstanceOf(ApiException.class);
        assertThat(service.detail(17).status()).isEqualTo("changed_file");
        Files.delete(pdf);
        assertThat(service.detail(17).status()).isEqualTo("missing_file");
        assertThatThrownBy(() -> service.file(18)).isInstanceOf(ApiException.class);
    }

    @Test
    void catalogCannotEscapeSourceRoot() throws Exception {
        Path source = Files.createDirectory(temp.resolve("source"));
        Path catalog = Files.createDirectory(temp.resolve("catalog"));
        Files.writeString(temp.resolve("outside.pdf"), "%PDF-1.4\n");
        Files.writeString(catalog.resolve("18.json"), """
                {"result":{"catalog_id":18,"title":"Outside","exam":"TYT",
                "subject":"turkce","kind":"topic_summary","status":"available",
                "relative_path":"../outside.pdf",
                "source_sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}}
                """);
        TopicPdfService service = new TopicPdfService(new ObjectMapper(), catalog.toString(), source.toString());
        assertThatThrownBy(() -> service.file(18)).isInstanceOf(ApiException.class);
    }

    @Test
    void sharedPdfAppearsInBothExamFiltersWithoutDuplicatingCatalogCount() throws Exception {
        Path source = Files.createDirectory(temp.resolve("source"));
        Path catalog = Files.createDirectory(temp.resolve("catalog"));
        Files.writeString(catalog.resolve("19.json"), """
                {"result":{"catalog_id":19,"title":"Üslü Sayılar","exam":"TYT-AYT",
                "subject":"matematik","kind":"topic_summary","grade":9,
                "status":"available","relative_path":"shared.pdf",
                "source_sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}}
                """);
        TopicPdfService service = new TopicPdfService(new ObjectMapper(), catalog.toString(), source.toString());

        assertThat(service.list("TYT", "matematik", null, 9, null, 0, 20).totalElements()).isEqualTo(1);
        assertThat(service.list("AYT", "matematik", null, 9, null, 0, 20).totalElements()).isEqualTo(1);
        assertThat(service.list("TYT-AYT", "matematik", null, 9, null, 0, 20).totalElements()).isEqualTo(1);
        assertThat(service.filters().facets()).containsExactly(
                new TopicPdfService.Facet("TYT-AYT", "matematik", 9, "topic_summary", 1));
    }
}
