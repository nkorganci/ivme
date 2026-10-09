package com.hedefyks.topicpdf;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import com.hedefyks.common.PageResponse;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

/** Reads the reviewed source catalog; filesystem paths never enter API responses. */
@Service
public class TopicPdfService {

    public record Item(int id, String title, String exam, String subject, String kind,
                       Integer grade, Integer pageCount, String status) {}
    public record Filters(List<String> exams, List<String> subjects, List<String> kinds) {}
    private record Entry(Item item, String relativePath, String sha256) {}

    private final Path catalogDir;
    private final Path sourceRoot;
    private final Map<Integer, Entry> byId;
    private final List<Entry> ordered;

    public TopicPdfService(ObjectMapper mapper,
                           @Value("${app.topic-pdfs.catalog-dir:}") String catalogPath,
                           @Value("${app.topic-pdfs.source-dir:}") String sourcePath) {
        this.catalogDir = catalogPath.isBlank() ? null : Path.of(catalogPath).toAbsolutePath().normalize();
        this.sourceRoot = sourcePath.isBlank() ? null : Path.of(sourcePath).toAbsolutePath().normalize();
        this.byId = readCatalog(mapper);
        this.ordered = byId.values().stream()
                .sorted(Comparator.comparing((Entry e) -> e.item().title(), String.CASE_INSENSITIVE_ORDER)
                        .thenComparingInt(e -> e.item().id()))
                .toList();
    }

    private Map<Integer, Entry> readCatalog(ObjectMapper mapper) {
        Map<Integer, Entry> entries = new HashMap<>();
        if (catalogDir == null || !Files.isDirectory(catalogDir)) return entries;
        try (var files = Files.list(catalogDir)) {
            for (Path file : files.filter(p -> p.getFileName().toString().matches("[0-9]+\\.json")).toList()) {
                JsonNode node = mapper.readTree(file.toFile()).path("result");
                int id = node.path("catalog_id").asInt(-1);
                if (id < 0 || !file.getFileName().toString().equals(id + ".json")) continue;
                String status = node.path("status").asText("");
                if (!List.of("available", "missing_file", "video_only").contains(status)) continue;
                Item item = new Item(id, node.path("title").asText(""),
                        node.path("exam").asText(""), node.path("subject").asText(""),
                        node.path("kind").asText(""),
                        node.path("grade").isNumber() ? node.path("grade").asInt() : null,
                        node.path("page_count").isNumber() ? node.path("page_count").asInt() : null,
                        status);
                entries.put(id, new Entry(item, node.path("relative_path").asText(""),
                        node.path("source_sha256").asText("")));
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Konu PDF kataloğu okunamadı.", ex);
        }
        return entries;
    }

    public PageResponse<Item> list(String exam, String subject, String kind, String search, int page, int size) {
        int pageNumber = Math.max(0, page);
        int pageSize = Math.max(1, Math.min(size, 50));
        String term = search == null ? "" : search.trim().toLowerCase(Locale.forLanguageTag("tr-TR"));
        if (term.length() > 100) throw ApiException.badRequest("Arama en fazla 100 karakter olabilir.");
        List<Item> matched = ordered.stream().map(Entry::item)
                .filter(item -> exam == null || exam.isBlank() || exam.equals(item.exam()))
                .filter(item -> subject == null || subject.isBlank() || subject.equals(item.subject()))
                .filter(item -> kind == null || kind.isBlank() || kind.equals(item.kind()))
                .filter(item -> term.isEmpty() || item.title().toLowerCase(Locale.forLanguageTag("tr-TR")).contains(term))
                .toList();
        int start = (int) Math.min((long) pageNumber * pageSize, matched.size());
        int end = Math.min(start + pageSize, matched.size());
        return new PageResponse<>(matched.subList(start, end), pageNumber, pageSize,
                matched.size(), (matched.size() + pageSize - 1) / pageSize);
    }

    public Filters filters() {
        return new Filters(distinct(ordered.stream().map(e -> e.item().exam()).toList()),
                distinct(ordered.stream().map(e -> e.item().subject()).toList()),
                distinct(ordered.stream().map(e -> e.item().kind()).toList()));
    }

    private List<String> distinct(List<String> values) {
        return values.stream().filter(value -> !value.isBlank()).distinct().sorted().toList();
    }

    public Item detail(int id) {
        Entry entry = byId.get(id);
        if (entry == null) throw ApiException.notFound("Konu anlatımı bulunamadı.");
        if ("available".equals(entry.item().status())) {
            try {
                file(id);
            } catch (ApiException ex) {
                Item item = entry.item();
                return new Item(item.id(), item.title(), item.exam(), item.subject(), item.kind(),
                        item.grade(), item.pageCount(), "missing_file");
            }
        }
        return entry.item();
    }

    public Resource file(int id) {
        Entry entry = byId.get(id);
        if (entry == null || !"available".equals(entry.item().status()) || sourceRoot == null) {
            throw ApiException.notFound("PDF bulunamadı.");
        }
        String relative = entry.relativePath().replace('\\', '/');
        Path pathValue = Path.of(relative);
        if (pathValue.isAbsolute() || relative.contains("..") || !relative.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            throw ApiException.notFound("PDF bulunamadı.");
        }
        try {
            Path root = sourceRoot.toRealPath();
            Path file = root.resolve(pathValue).normalize();
            if (!file.startsWith(root) || !Files.isRegularFile(file, LinkOption.NOFOLLOW_LINKS)
                    || !file.toRealPath().startsWith(root)
                    || !entry.sha256().matches("[0-9a-f]{64}") || !sha256(file).equals(entry.sha256())) {
                throw ApiException.notFound("PDF bulunamadı.");
            }
            return new PathResource(file);
        } catch (IOException ex) {
            throw ApiException.notFound("PDF bulunamadı.");
        }
    }

    private String sha256(Path file) throws IOException {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream in = Files.newInputStream(file)) {
                byte[] buffer = new byte[1024 * 1024];
                int count;
                while ((count = in.read(buffer)) != -1) digest.update(buffer, 0, count);
            }
            return java.util.HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
