package com.hedefyks.review;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import java.nio.file.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.*;
import org.springframework.stereotype.Component;
import com.hedefyks.topicpdf.PdfArchiveRegistry;
import com.hedefyks.topicpdf.SourceFileResolver;

/** Persistent machine labels from PDF headings, independent of teacher verdicts. */
@Component
public class PdfReviewLabels {
    public final List<Map<String, Object>> categories;
    private final Map<Integer, Map<String, Object>> byId = new LinkedHashMap<>();
    private final Path sourceRoot;
    private PdfArchiveRegistry archive;
    private SourceFileResolver sourceFiles = new SourceFileResolver();

    @Autowired
    public void setSourceFiles(SourceFileResolver resolver) { this.sourceFiles = resolver; }

    @Autowired(required = false)
    public void setArchive(PdfArchiveRegistry archive) { this.archive = archive; }

    private boolean archived(Map<String, Object> item) {
        return archive != null && archive.contains(String.valueOf(item.get("sourceSha256")));
    }

    @Autowired
    public PdfReviewLabels(ObjectMapper json, @Value("${app.topic-pdfs.source-dir:}") String sourcePath) {
        this(json, sourcePath, new ClassPathResource("pdf-review-labels.json"));
    }

    PdfReviewLabels(ObjectMapper json, String sourcePath, Resource manifest) {
        sourceRoot = sourcePath.isBlank() ? null : Path.of(sourcePath).toAbsolutePath().normalize();
        try (var in = manifest.getInputStream()) {
            var root = json.readTree(in);
            if (root.path("version").asInt() != 1) throw new IllegalStateException("PDF etiket sürümü geçersiz.");
            categories = json.convertValue(root.get("categories"), new TypeReference<>() {});
            List<Map<String, Object>> items = json.convertValue(root.get("items"), new TypeReference<>() {});
            for (var item : items) {
                int id = ((Number)item.get("catalogId")).intValue();
                if (byId.putIfAbsent(id, item) != null) throw new IllegalStateException("Yinelenmiş PDF kimliği.");
            }
        } catch (Exception e) { throw new IllegalStateException("PDF başlık etiketleri okunamadı.", e); }
    }

    public List<Map<String, Object>> items() {
        return byId.values().stream().filter(item -> !archived(item)).map(this::publicItem).toList();
    }

    public boolean contains(int id) { return byId.containsKey(id) && !archived(byId.get(id)); }

    /** Inventory row of any labeled PDF, archived or not, so a caller can say why a file is not offered. */
    public Map<String, Object> inventoryRow(int id) {
        var item = byId.get(id);
        return item == null ? null : publicItem(item);
    }

    public boolean isArchived(int id) { return byId.containsKey(id) && archived(byId.get(id)); }

    private Map<String, Object> publicItem(Map<String, Object> source) {
        var item = new LinkedHashMap<>(source);
        item.remove("relativePath");
        item.remove("sourceScope");
        return item;
    }

    public Resource file(int id) {
        var item = byId.get(id);
        if (sourceRoot == null || item == null || archived(item) || !"available".equals(item.get("availability")))
            throw ApiException.notFound("PDF bulunamadı.");
        Path root = "RESOURCES".equals(item.get("sourceScope")) ? sourceRoot.getParent() : sourceRoot;
        return new PathResource(sourceFiles.resolve(root, item.get("relativePath").toString(),
                String.valueOf(item.get("sourceSha256"))));
    }

}
