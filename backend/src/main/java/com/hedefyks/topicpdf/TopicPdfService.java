package com.hedefyks.topicpdf;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import com.hedefyks.common.PageResponse;
import com.hedefyks.review.PdfReviewLabels;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

/** Reads the reviewed source catalog; filesystem paths never enter API responses. */
@Service
public class TopicPdfService {

    public record Item(int id, String title, String exam, String subject, String kind,
                       Integer grade, Integer pageCount, String status, String verifiedTopic) {}
    public record Facet(String exam, String subject, Integer grade, String kind, long count) {}
    public record Filters(List<String> exams, List<String> subjects, List<String> kinds,
                          List<Integer> grades, List<Facet> facets) {}
    private record FacetKey(String exam, String subject, Integer grade, String kind) {}
    public record CurriculumPdf(String topicId, int id, String title, String kind) {}
    private record Entry(Item item, String relativePath, String sha256) {}
    private record ApprovedLink(String pdfSha256, String topic, List<String> questionCodes) {}
    private record ReviewedLink(int catalogId, String topicId, String pdfSha256) {}

    private final Path catalogDir;
    private final Path sourceRoot;
    private final Map<Integer, Entry> byId;
    private final List<Entry> ordered;
    private final Map<Integer, ApprovedLink> approvedLinks;
    private final List<ReviewedLink> curriculumLinks;
    private PdfArchiveRegistry archive;
    private PdfReviewLabels labels;

    @Autowired(required = false)
    public void setArchive(PdfArchiveRegistry archive) { this.archive = archive; }

    @Autowired(required = false)
    public void setLabels(PdfReviewLabels labels) { this.labels = labels; }

    private boolean archived(Entry entry) { return archive != null && archive.contains(entry.sha256()); }

    public TopicPdfService(ObjectMapper mapper,
                           @Value("${app.topic-pdfs.catalog-dir:}") String catalogPath,
                           @Value("${app.topic-pdfs.source-dir:}") String sourcePath) {
        this.catalogDir = catalogPath.isBlank() ? null : Path.of(catalogPath).toAbsolutePath().normalize();
        this.sourceRoot = sourcePath.isBlank() ? null : Path.of(sourcePath).toAbsolutePath().normalize();
        this.approvedLinks = readApprovedLinks(mapper);
        this.byId = readCatalog(mapper);
        this.curriculumLinks = readCurriculumLinks(mapper);
        this.ordered = byId.values().stream()
                .sorted(Comparator.comparing((Entry e) -> e.item().title(), String.CASE_INSENSITIVE_ORDER)
                        .thenComparingInt(e -> e.item().id()))
                .toList();
    }

    private List<ReviewedLink> readCurriculumLinks(ObjectMapper mapper) {
        try (InputStream in = new ClassPathResource("curriculum-pdf-links.json").getInputStream()) {
            JsonNode root = mapper.readTree(in);
            if (root.path("version").asInt() != 1) throw new IllegalStateException("Müfredat PDF bağı sürümü bilinmiyor.");
            var links = new java.util.ArrayList<ReviewedLink>();
            var seen = new HashSet<String>();
            for (JsonNode node : root.path("links")) {
                int id = node.path("catalogId").asInt(-1);
                String topicId = node.path("topicId").asText("");
                String sha = node.path("pdfSha256").asText("");
                if (id < 0 || !topicId.matches("(?:tyt|ayt)\\.[a-z]+\\.[a-z0-9-]+")
                        || !sha.matches("[0-9a-f]{64}") || !seen.add(topicId + ":" + id)) {
                    throw new IllegalStateException("Müfredat PDF bağı geçersiz.");
                }
                links.add(new ReviewedLink(id, topicId, sha));
            }
            return List.copyOf(links);
        } catch (IOException ex) {
            throw new IllegalStateException("Müfredat PDF bağları okunamadı.", ex);
        }
    }

    private Map<Integer, ApprovedLink> readApprovedLinks(ObjectMapper mapper) {
        Map<Integer, ApprovedLink> links = new HashMap<>();
        try (InputStream in = new ClassPathResource("topic-pdf-links.json").getInputStream()) {
            JsonNode root = mapper.readTree(in);
            if (root.path("version").asInt() != 1) throw new IllegalStateException("Konu PDF bağı sürümü bilinmiyor.");
            for (JsonNode node : root.path("links")) {
                int id = node.path("catalogId").asInt(-1);
                String sha = node.path("pdfSha256").asText("");
                String topic = node.path("topic").asText("");
                List<String> codes = new java.util.ArrayList<>();
                node.path("questionCodes").forEach(code -> codes.add(code.asText("")));
                if (id < 0 || !sha.matches("[0-9a-f]{64}") || topic.isBlank()
                        || codes.isEmpty() || codes.stream().anyMatch(String::isBlank)
                        || codes.size() != codes.stream().distinct().count()
                        || links.putIfAbsent(id, new ApprovedLink(sha, topic, List.copyOf(codes))) != null) {
                    throw new IllegalStateException("Onaylı konu PDF bağı geçersiz.");
                }
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Onaylı konu PDF bağları okunamadı.", ex);
        }
        return Map.copyOf(links);
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
                        status, null);
                entries.put(id, new Entry(item, node.path("relative_path").asText(""),
                        node.path("source_sha256").asText("")));
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Konu PDF kataloğu okunamadı.", ex);
        }
        return entries;
    }

    public PageResponse<Item> list(String exam, String subject, String kind, Integer grade,
                                   String search, int page, int size) {
        int pageNumber = Math.max(0, page);
        int pageSize = Math.max(1, Math.min(size, 50));
        String term = search == null ? "" : search.trim().toLowerCase(Locale.forLanguageTag("tr-TR"));
        if (term.length() > 100) throw ApiException.badRequest("Arama en fazla 100 karakter olabilir.");
        List<Item> matched = ordered.stream().filter(entry -> !archived(entry)).map(Entry::item)
                .filter(item -> exam == null || exam.isBlank() || exam.equals(item.exam())
                        || ("TYT-AYT".equals(item.exam()) && List.of("TYT", "AYT").contains(exam)))
                .filter(item -> subject == null || subject.isBlank() || subject.equals(item.subject()))
                .filter(item -> kind == null || kind.isBlank() || kind.equals(item.kind()))
                .filter(item -> grade == null || grade.equals(item.grade()))
                .filter(item -> term.isEmpty() || item.title().toLowerCase(Locale.forLanguageTag("tr-TR")).contains(term))
                .toList();
        int start = (int) Math.min((long) pageNumber * pageSize, matched.size());
        int end = Math.min(start + pageSize, matched.size());
        return new PageResponse<>(matched.subList(start, end), pageNumber, pageSize,
                matched.size(), (matched.size() + pageSize - 1) / pageSize);
    }

    public Filters filters() {
        Map<FacetKey, Long> counts = ordered.stream().filter(entry -> !archived(entry)).map(Entry::item)
                .collect(java.util.stream.Collectors.groupingBy(
                        item -> new FacetKey(item.exam(), item.subject(), item.grade(), item.kind()),
                        java.util.stream.Collectors.counting()));
        return new Filters(distinct(ordered.stream().filter(e -> !archived(e)).map(e -> e.item().exam()).toList()),
                distinct(ordered.stream().filter(e -> !archived(e)).map(e -> e.item().subject()).toList()),
                distinct(ordered.stream().filter(e -> !archived(e)).map(e -> e.item().kind()).toList()),
                ordered.stream().filter(e -> !archived(e)).map(e -> e.item().grade()).filter(java.util.Objects::nonNull)
                        .distinct().sorted().toList(),
                counts.entrySet().stream()
                        .map(entry -> new Facet(entry.getKey().exam(), entry.getKey().subject(),
                                entry.getKey().grade(), entry.getKey().kind(), entry.getValue()))
                        .sorted(Comparator.comparing(Facet::exam).thenComparing(Facet::subject)
                                .thenComparing(f -> f.grade() == null ? 0 : f.grade())
                                .thenComparing(Facet::kind))
                        .toList());
    }
    public List<Integer> catalogIdsByKind(String kind) {
        if(!filters().kinds().contains(kind))throw ApiException.badRequest("PDF kaynak türü geçersiz.");
        return ordered.stream().filter(e -> !archived(e)).map(Entry::item).filter(i->kind.equals(i.kind())).map(Item::id).toList();
    }

    /** Review candidates retain mappings even when a file needs repair; this does not approve them. */
    public List<CurriculumPdf> reviewCurriculumLinks(String exam, String subject) {
        String prefix = exam.toLowerCase(Locale.ROOT) + "." + subject + ".";
        return curriculumLinks.stream().filter(link -> link.topicId().startsWith(prefix))
                .filter(link -> byId.containsKey(link.catalogId()) && !archived(byId.get(link.catalogId())))
                .map(link -> new CurriculumPdf(link.topicId(), link.catalogId(),
                        byId.get(link.catalogId()).item().title(), byId.get(link.catalogId()).item().kind())).toList();
    }

    public String reviewSourceSha256(int id) {
        Entry entry = byId.get(id);
        if (entry == null || archived(entry)) throw ApiException.notFound("PDF bulunamadı.");
        return entry.sha256();
    }

    /** Only audited topic links with the same catalog and real-file checksum are exposed. */
    public List<CurriculumPdf> curriculumResources(String exam, String subject) {
        if (exam == null || !exam.matches("TYT|AYT") || subject == null || !subject.matches("[a-z]+")) {
            throw ApiException.badRequest("Sınav veya ders geçersiz.");
        }
        String prefix = exam.toLowerCase(Locale.ROOT) + "." + subject + ".";
        String catalogSubject = switch (subject) {
            case "geometri" -> "matematik";
            case "psikoloji", "sosyoloji", "mantik" -> "felsefe";
            default -> subject;
        };
        var available = new java.util.ArrayList<CurriculumPdf>();
        for (ReviewedLink link : curriculumLinks) {
            if (!link.topicId().startsWith(prefix)) continue;
            Entry entry = byId.get(link.catalogId());
            if (entry == null || !link.pdfSha256().equals(entry.sha256())
                    || !List.of(exam, "TYT-AYT").contains(entry.item().exam())
                    || !catalogSubject.equals(entry.item().subject())
                    || !"available".equals(entry.item().status())) continue;
            try {
                file(link.catalogId());
                available.add(new CurriculumPdf(link.topicId(), link.catalogId(), entry.item().title(), entry.item().kind()));
            } catch (ApiException ignored) {
                // A removed or changed source must not be shown as a topic link.
            }
        }
        return available.stream().sorted(Comparator.comparing(CurriculumPdf::topicId)
                .thenComparing(CurriculumPdf::kind).thenComparingInt(CurriculumPdf::id)).toList();
    }

    private List<String> distinct(List<String> values) {
        return values.stream().filter(value -> !value.isBlank()).distinct().sorted().toList();
    }

    /** Every inventory PDF is explained: opened, or refused with the reason that applies to it. */
    public Item detail(int id) {
        Entry entry = byId.get(id);
        if (entry == null) return inventoryDetail(id);
        if (archived(entry)) throw archivedPdf();
        if ("available".equals(entry.item().status())) {
            try {
                file(id);
            } catch (ApiException ex) {
                Item item = entry.item();
                return new Item(item.id(), item.title(), item.exam(), item.subject(), item.kind(),
                        item.grade(), item.pageCount(), fileProblem(ex), null);
            }
        }
        Item item = entry.item();
        ApprovedLink link = approvedLinks.get(id);
        String topic = "available".equals(item.status()) && link != null
                && entry.sha256().equals(link.pdfSha256()) ? link.topic() : null;
        return new Item(item.id(), item.title(), item.exam(), item.subject(), item.kind(),
                item.grade(), item.pageCount(), item.status(), topic);
    }

    private static ApiException archivedPdf() {
        return ApiException.notFound("Bu PDF arşive alındı; artık açılmıyor.");
    }

    private static String fileProblem(ApiException ex) {
        return ex instanceof PdfChangedException ? "changed_file" : "missing_file";
    }

    /** PDFs outside the topic catalog (exams, past questions, extra sources) are described by the label manifest. */
    private Item inventoryItem(int id) {
        Map<String, Object> row = labels == null ? null : labels.inventoryRow(id);
        if (row == null) return null;
        return new Item(id, String.valueOf(row.get("title")), String.valueOf(row.get("exam")),
                String.valueOf(row.get("subject")), String.valueOf(row.get("kind")),
                row.get("grade") instanceof Number grade ? grade.intValue() : null,
                row.get("pageCount") instanceof Number pages ? pages.intValue() : null,
                String.valueOf(row.get("availability")), null);
    }

    private Item inventoryDetail(int id) {
        Item item = inventoryItem(id);
        if (item == null) throw ApiException.notFound("Bu numarada PDF kaydı yok.");
        if (labels.isArchived(id)) throw archivedPdf();
        String status = item.status();
        if ("available".equals(status)) {
            try {
                labels.file(id);
            } catch (ApiException ex) {
                status = fileProblem(ex);
            }
        }
        return new Item(item.id(), item.title(), item.exam(), item.subject(), item.kind(),
                item.grade(), item.pageCount(), status, null);
    }

    /** Lightweight catalog validation for annotations; PDF bytes are verified when opened. */
    public Item annotationItem(int id) {
        Entry entry = byId.get(id);
        Item item = entry != null ? entry.item() : labels != null && !labels.isArchived(id) ? inventoryItem(id) : null;
        if (item == null || (entry != null && archived(entry)) || !"available".equals(item.status())) {
            throw ApiException.notFound("PDF bulunamadı.");
        }
        return item;
    }

    public List<String> approvedQuestionCodes(int id) {
        ApprovedLink link = approvedLinks.get(id);
        Entry entry = byId.get(id);
        if (link == null || entry == null || archived(entry) || !entry.sha256().equals(link.pdfSha256())
                || !"available".equals(entry.item().status())
                || !"TYT".equals(entry.item().exam()) || !"turkce".equals(entry.item().subject())) {
            throw ApiException.notFound("Doğrulanmış konu soru bağı bulunamadı.");
        }
        file(id); // Recheck the original PDF and its checksum before using the reviewed link.
        return link.questionCodes();
    }

    public Resource file(int id) {
        Entry entry = byId.get(id);
        if (entry == null && labels != null && labels.contains(id)) return labels.file(id);
        if (entry == null || archived(entry) || !"available".equals(entry.item().status()) || sourceRoot == null) {
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
                    || !entry.sha256().matches("[0-9a-f]{64}")) {
                throw ApiException.notFound("PDF bulunamadı.");
            }
            if (!sha256(file).equals(entry.sha256())) throw new PdfChangedException();
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
