package com.hedefyks.topicpdf;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** File-location projection only; source/category/review identities remain in the shared catalog. */
@Component
public class SourceFileResolver {
    private record Location(Path target, String sha256) {}
    private final Path archiveRoot;
    private final Map<String, Location> locations = new HashMap<>();

    public SourceFileResolver() { archiveRoot = null; }

    @Autowired
    public SourceFileResolver(ObjectMapper mapper,
            @Value("${app.yks-resources.root:}") String root,
            @Value("${app.yks-resources.location-manifest:}") String manifest) {
        if (manifest.isBlank()) { archiveRoot = null; return; }
        try {
            if (root.isBlank()) throw new IllegalArgumentException("YKS resource root required");
            archiveRoot = Path.of(root).toRealPath();
            Path projection = Path.of(manifest).toRealPath();
            if (!projection.startsWith(archiveRoot.resolve("Katalog")))
                throw new IllegalArgumentException("Location projection outside archive catalog");
            var value = mapper.readTree(projection.toFile());
            if (value.path("version").asInt() != 1 || !"ACTIVE".equals(value.path("status").asText()))
                throw new IllegalArgumentException("Inactive location projection");
            for (var row : value.path("locations")) {
                Path original = Path.of(row.path("originalPath").asText());
                String sha = row.path("sha256").asText();
                if (!original.isAbsolute() || !sha.matches("[0-9a-f]{64}"))
                    throw new IllegalArgumentException("Invalid source identity");
                Path target = archiveRoot.resolve(relative(row.path("target").asText())).normalize();
                if (!target.startsWith(archiveRoot) || locations.putIfAbsent(key(original), new Location(target, sha)) != null)
                    throw new IllegalArgumentException("Invalid or duplicate resource location");
            }
        } catch (IOException | RuntimeException ex) {
            throw new IllegalStateException("YKS file-location projection could not be loaded", ex);
        }
    }

    private static Path relative(String text) {
        String normalized = text.replace('\\', '/');
        Path value = Path.of(normalized);
        if (normalized.isBlank() || normalized.contains("..") || normalized.contains(":") || value.isAbsolute())
            throw ApiException.notFound("PDF bulunamadı.");
        return value;
    }

    private static String key(Path path) {
        String result = path.toAbsolutePath().normalize().toString().replace('\\', '/');
        return System.getProperty("os.name").toLowerCase(Locale.ROOT).contains("win")
                ? result.toLowerCase(Locale.ROOT) : result;
    }

    public Path resolve(Path sourceRoot, String relativePath, String expectedSha256) {
        try {
            Path part = relative(relativePath);
            if (!relativePath.toLowerCase(Locale.ROOT).endsWith(".pdf") || !expectedSha256.matches("[0-9a-f]{64}"))
                throw ApiException.notFound("PDF bulunamadı.");
            Location mapped = locations.get(key(sourceRoot.resolve(part)));
            if (mapped != null && !mapped.sha256().equals(expectedSha256)) throw new PdfChangedException();
            Path root = mapped == null ? sourceRoot.toRealPath() : archiveRoot;
            Path file = mapped == null ? root.resolve(part).normalize() : mapped.target();
            if (!file.startsWith(root) || !Files.isRegularFile(file, LinkOption.NOFOLLOW_LINKS)
                    || !file.toRealPath().startsWith(root)) throw ApiException.notFound("PDF bulunamadı.");
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (var in = Files.newInputStream(file)) {
                byte[] buffer = new byte[1024 * 1024];
                for (int n; (n = in.read(buffer)) != -1;) digest.update(buffer, 0, n);
            }
            if (!HexFormat.of().formatHex(digest.digest()).equals(expectedSha256)) throw new PdfChangedException();
            return file;
        } catch (ApiException ex) { throw ex; }
        catch (Exception ex) { throw ApiException.notFound("PDF bulunamadı."); }
    }
}
