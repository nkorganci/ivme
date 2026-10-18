package com.hedefyks.review;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.ByteArrayResource;

class PdfReviewLabelsTest {
    @TempDir Path workspace;

    private PdfReviewLabels labels(String scope, String relative, byte[] bytes) throws Exception {
        var item = new LinkedHashMap<String,Object>();
        item.put("catalogId", 1);item.put("availability", "available");item.put("relativePath", relative);
        item.put("sourceScope", scope);item.put("sourceSha256", HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)));
        byte[] manifest = new ObjectMapper().writeValueAsBytes(Map.of("version",1,"categories",List.of(),"items",List.of(item)));
        return new PdfReviewLabels(new ObjectMapper(), workspace.resolve("Kaynaklar/ogm-materyal").toString(), new ByteArrayResource(manifest));
    }

    @Test void readsSupplementaryPdfAndRechecksItsBytesWithoutExposingFilesystemPaths() throws Exception {
        Path ogm = Files.createDirectories(workspace.resolve("Kaynaklar/ogm-materyal"));
        Path directory = Files.createDirectories(ogm.getParent().resolve("islenmemis"));
        byte[] bytes = "%PDF-source".getBytes();
        Path pdf = Files.write(directory.resolve("fonksiyonlar.pdf"), bytes);
        var store = labels("RESOURCES", "islenmemis/fonksiyonlar.pdf", bytes);
        assertThat(store.file(1).getContentAsByteArray()).isEqualTo(bytes);
        assertThat(store.items().getFirst()).doesNotContainKeys("relativePath", "sourceScope");
        Files.writeString(pdf, "%PDF-changed");
        assertThatThrownBy(() -> store.file(1)).isInstanceOf(ApiException.class);
    }

    @Test void existingOgmPathsKeepTheirOriginalRoot() throws Exception {
        Path directory = Files.createDirectories(workspace.resolve("Kaynaklar/ogm-materyal/Fizik"));
        byte[] bytes = "%PDF-ogm".getBytes();
        Files.write(directory.resolve("test.pdf"), bytes);
        assertThat(labels("OGM", "Fizik/test.pdf", bytes).file(1).getContentAsByteArray()).isEqualTo(bytes);
    }

    @Test void supplementalScopeRejectsTraversalAbsolutePathsAndOtherExtensions() throws Exception {
        Files.createDirectories(workspace.resolve("Kaynaklar/ogm-materyal"));
        byte[] bytes = "private".getBytes();
        Path outside = Files.write(workspace.resolve("outside.pdf"), bytes);
        for (String path : List.of("../outside.pdf", outside.toString(), "islenmemis/private.txt"))
            assertThatThrownBy(() -> labels("RESOURCES", path, bytes).file(1)).isInstanceOf(ApiException.class);
    }
}
