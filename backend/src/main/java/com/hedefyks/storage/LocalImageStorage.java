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
    private record Repair(String originalHash,String renderedHash) {}
    private final java.util.Map<String,Repair> repairs;

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
        var verified=new java.util.HashMap<String,Repair>();
        Path manifest=root.resolve("onarilmis/manifest.json");
        if(Files.isRegularFile(manifest))try{
            var data=new com.fasterxml.jackson.databind.ObjectMapper().readTree(manifest.toFile());
            for(var r:data.path("records"))if("APPLIED_DERIVED_RENDER".equals(r.path("state").asText()))
                verified.put(r.path("originalImage").asText(),new Repair(r.path("originalSha256").asText(),r.path("renderedImageSha256").asText()));
        }catch(IOException e){throw new IllegalStateException("Onarılmış görsel kanıtı okunamadı.",e);}
        repairs=java.util.Map.copyOf(verified);
    }

    @Override
    public Resource load(String relativePath) {
        Path original = resolve(relativePath).filter(LocalImageStorage::hasImageSignature)
                .orElseThrow(() -> ApiException.notFound("Soru görseli bulunamadı."));
        Repair repair=repairs.get(relativePath);
        if(repair!=null && repair.originalHash().equals(sha256(original))) {
            var rendered=resolve("onarilmis/"+relativePath).filter(LocalImageStorage::hasImageSignature)
                .filter(p->repair.renderedHash().equals(sha256(p)));
            if(rendered.isPresent())return new FileSystemResource(rendered.get());
        }
        // Kırpılmış kopya yalnızca doğrulanmış özgün görsel için kullanılır.
        // Kaynak dosya, CSV yolu ve etikete bağlı görsel hash'i değişmez.
        Path cropped = resolve("kirpilmis/" + relativePath)
                .filter(LocalImageStorage::hasImageSignature).orElse(original);
        return new FileSystemResource(cropped);
    }

    @Override
    public boolean exists(String relativePath) {
        return resolve(relativePath).isPresent();
    }
    private static String sha256(Path path) {
        try(var stream=Files.newInputStream(path)){return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(stream.readAllBytes()));}
        catch(IOException|java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}
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
