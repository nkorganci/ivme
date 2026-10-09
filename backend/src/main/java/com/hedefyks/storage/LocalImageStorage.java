package com.hedefyks.storage;

import com.hedefyks.common.ApiException;
import com.hedefyks.config.AppProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Optional;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

/** Görselleri app.images.dir klasöründen okur. Klasör dışına çıkan yollar (../) reddedilir. */
@Component
public class LocalImageStorage implements ImageStorage {

    private final Path root;

    public LocalImageStorage(AppProperties props) {
        this.root = Path.of(props.images().dir()).toAbsolutePath().normalize();
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
        String name = relativePath.toLowerCase(Locale.ROOT);
        if (!name.endsWith(".webp") && !name.endsWith(".png") && !name.endsWith(".jpg")
                && !name.endsWith(".jpeg") && !name.endsWith(".gif")) {
            return Optional.empty();
        }
        try {
            Path p = root.resolve(relativePath).normalize();
            return p.startsWith(root) && Files.isRegularFile(p) ? Optional.of(p) : Optional.empty();
        } catch (InvalidPathException e) {
            return Optional.empty();
        }
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
