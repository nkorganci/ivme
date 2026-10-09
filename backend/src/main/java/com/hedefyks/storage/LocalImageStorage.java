package com.hedefyks.storage;

import com.hedefyks.common.ApiException;
import com.hedefyks.config.AppProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

/** Görselleri app.images.dir klasöründen okur. Klasör dışına çıkan yollar (../) reddedilir. */
@Component
public class LocalImageStorage implements ImageStorage {

    private final Path root;
    private final List<Path> allowedRealRoots;

    public LocalImageStorage(AppProperties props) {
        this.root = Path.of(props.images().dir()).toAbsolutePath().normalize();
        List<Path> allowed = new ArrayList<>();
        try {
            Path realRoot = root.toRealPath();
            allowed.add(realRoot);
            // İlk açılışta tanımlı doğrudan alt klasör bağlantıları güvenilir görsel bağlarıdır.
            try (var children = Files.list(root)) {
                children.filter(Files::isDirectory).forEach(child -> {
                    try {
                        Path realChild = child.toRealPath();
                        if (!realChild.startsWith(realRoot)) allowed.add(realChild);
                    } catch (IOException ignored) {
                        // Kırık bağlantı servis edilmez.
                    }
                });
            }
        } catch (IOException ignored) {
            allowed.add(root); // Kök henüz yoksa daha sonra oluşan normal dosyalar çalışır.
        }
        this.allowedRealRoots = List.copyOf(allowed);
    }

    @Override
    public Resource load(String relativePath) {
        return resolve(relativePath).filter(LocalImageStorage::hasImageSignature).map(FileSystemResource::new)
                .orElseThrow(() -> ApiException.notFound("Soru görseli bulunamadı."));
    }

    @Override
    public boolean exists(String relativePath) {
        return resolve(relativePath).isPresent();
    }

    private Optional<Path> resolve(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            return Optional.empty();
        }
        if (!isImageName(relativePath)) {
            return Optional.empty();
        }
        try {
            Path p = root.resolve(relativePath).normalize();
            if (!p.startsWith(root) || !Files.isRegularFile(p)) return Optional.empty();
            Path real = p.toRealPath();
            if (!isImageName(real.getFileName().toString())) return Optional.empty();
            return allowedRealRoots.stream().anyMatch(real::startsWith) ? Optional.of(real) : Optional.empty();
        } catch (InvalidPathException | IOException e) {
            return Optional.empty();
        }
    }

    private static boolean isImageName(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        return lower.endsWith(".webp") || lower.endsWith(".png") || lower.endsWith(".jpg")
                || lower.endsWith(".jpeg") || lower.endsWith(".gif");
    }

    private static boolean hasImageSignature(Path path) {
        try (var stream = Files.newInputStream(path)) {
            byte[] b = stream.readNBytes(12);
            String name = path.getFileName().toString().toLowerCase(Locale.ROOT);
            if (name.endsWith(".webp")) {
                return b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                        && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P';
            }
            if (name.endsWith(".png")) {
                return b.length >= 8 && (b[0] & 0xff) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
                        && b[4] == 13 && b[5] == 10 && b[6] == 26 && b[7] == 10;
            }
            if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
                return b.length >= 3 && (b[0] & 0xff) == 0xff && (b[1] & 0xff) == 0xd8 && (b[2] & 0xff) == 0xff;
            }
            return b.length >= 6 && b[0] == 'G' && b[1] == 'I' && b[2] == 'F'
                    && b[3] == '8' && (b[4] == '7' || b[4] == '9') && b[5] == 'a';
        } catch (IOException e) {
            return false;
        }
    }
}
