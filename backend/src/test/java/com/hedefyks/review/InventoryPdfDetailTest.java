package com.hedefyks.review;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import com.hedefyks.topicpdf.PdfArchiveRegistry;
import com.hedefyks.topicpdf.TopicPdfService;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.ByteArrayResource;

/** PDFs that are in the inventory but not in the topic catalog open, or fail with their own reason. */
class InventoryPdfDetailTest {
    @TempDir Path workspace;
    private Path ogm;
    private TopicPdfService service;
    private PdfArchiveRegistry archive;

    private static String sha(byte[] bytes) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    }

    private Map<String, Object> item(int id, String availability, String relative, byte[] bytes) throws Exception {
        var item = new LinkedHashMap<String, Object>();
        item.put("catalogId", id); item.put("title", "Deneme " + id); item.put("exam", "TYT");
        item.put("subject", "Matematik"); item.put("kind", "PDF"); item.put("pageCount", 12);
        item.put("availability", availability); item.put("relativePath", relative);
        item.put("sourceSha256", sha(bytes));
        return item;
    }

    @BeforeEach
    void setUp() throws Exception {
        ogm = Files.createDirectories(workspace.resolve("Kaynaklar/ogm-materyal"));
        Path catalog = Files.createDirectories(workspace.resolve("catalog"));
        byte[] pdf = "%PDF-deneme".getBytes();
        Files.write(ogm.resolve("acik.pdf"), pdf);
        Files.write(ogm.resolve("degisecek.pdf"), pdf);
        var items = List.of(item(1, "available", "acik.pdf", pdf), item(2, "available", "yok.pdf", pdf),
                item(3, "available", "degisecek.pdf", pdf), item(4, "video_only", "video.pdf", pdf),
                item(5, "available", "arsiv.pdf", "baska".getBytes()));
        byte[] manifest = new ObjectMapper().writeValueAsBytes(Map.of("version", 1, "categories", List.of(), "items", items));
        var labels = new PdfReviewLabels(new ObjectMapper(), ogm.toString(), new ByteArrayResource(manifest));
        archive = mock(PdfArchiveRegistry.class);
        when(archive.contains(sha("baska".getBytes()))).thenReturn(true);
        labels.setArchive(archive);
        service = new TopicPdfService(new ObjectMapper(), catalog.toString(), ogm.toString());
        service.setArchive(archive);
        service.setLabels(labels);
        Files.writeString(ogm.resolve("degisecek.pdf"), "%PDF-baska icerik");
    }

    @Test
    void openablePdfOutsideTheTopicCatalogIsDescribedAsAvailable() throws Exception {
        var detail = service.detail(1);
        assertThat(detail.status()).isEqualTo("available");
        assertThat(detail.title()).isEqualTo("Deneme 1");
        assertThat(detail.pageCount()).isEqualTo(12);
        assertThat(service.annotationItem(1).id()).isEqualTo(1);
        assertThat(service.file(1).getContentAsByteArray()).isEqualTo("%PDF-deneme".getBytes());
        assertThatThrownBy(() -> service.file(5)).isInstanceOf(ApiException.class);
    }

    @Test
    void eachProblemIsReportedWithItsOwnStatus() {
        assertThat(service.detail(2).status()).isEqualTo("missing_file");
        assertThat(service.detail(3).status()).isEqualTo("changed_file");
        assertThat(service.detail(4).status()).isEqualTo("video_only");
        assertThatThrownBy(() -> service.annotationItem(4)).isInstanceOf(ApiException.class);
    }

    @Test
    void archivedAndUnknownPdfsExplainThemselves() {
        assertThatThrownBy(() -> service.detail(5)).isInstanceOf(ApiException.class).hasMessageContaining("arşive alındı");
        assertThatThrownBy(() -> service.annotationItem(5)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.detail(99)).isInstanceOf(ApiException.class).hasMessageContaining("PDF kaydı yok");
    }
}
