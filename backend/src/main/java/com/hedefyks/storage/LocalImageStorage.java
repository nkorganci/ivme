package com.hedefyks.storage;

import com.hedefyks.common.ApiException;
import com.hedefyks.config.AppProperties;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
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
        return resolve(relativePath).map(FileSystemResource::new)
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
        try {
            Path p = root.resolve(relativePath).normalize();
            return p.startsWith(root) && Files.isRegularFile(p) ? Optional.of(p) : Optional.empty();
        } catch (InvalidPathException e) {
            return Optional.empty();
        }
    }
}
