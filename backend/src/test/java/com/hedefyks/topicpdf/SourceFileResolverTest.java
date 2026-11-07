package com.hedefyks.topicpdf;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class SourceFileResolverTest {
    @TempDir Path temp;
    private final ObjectMapper mapper = new ObjectMapper();
    private String sha(Path file) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(file)));
    }
    private Path projection(Path archive, Path old, String target, String sha, String status) throws Exception {
        Path catalog = Files.createDirectories(archive.resolve("Katalog"));
        Path manifest = catalog.resolve("locations.json");
        mapper.writeValue(manifest.toFile(), Map.of("version",1,"status",status,"locations",List.of(
                Map.of("originalPath",old.toString(),"target",target,"sha256",sha))));
        return manifest;
    }
    @Test void disabledResolverPreservesLegacyChecks() throws Exception {
        Path file = temp.resolve("book.pdf"); Files.writeString(file,"original");
        var resolver = new SourceFileResolver();
        String hash = sha(file);
        assertThat(resolver.resolve(temp,"book.pdf",hash)).isEqualTo(file);
        assertThatThrownBy(() -> resolver.resolve(temp,"../book.pdf",hash)).isInstanceOf(ApiException.class);
        Files.writeString(file,"changed");
        assertThatThrownBy(() -> resolver.resolve(temp,"book.pdf",hash)).isInstanceOf(PdfChangedException.class);
    }
    @Test void mappedSourceSurvivesMissingLegacyPathAndRefusesWrongFallback() throws Exception {
        Path oldRoot = temp.resolve("old");
        Path archive = Files.createDirectory(temp.resolve("YKS"));
        Path file = archive.resolve("book.pdf"); Files.writeString(file,"original");
        String hash = sha(file);
        Path manifest = projection(archive,oldRoot.resolve("old.pdf"),"book.pdf",hash,"ACTIVE");
        var resolver = new SourceFileResolver(mapper,archive.toString(),manifest.toString());
        assertThat(resolver.resolve(oldRoot,"old.pdf",hash)).isEqualTo(file);
        Files.createDirectories(oldRoot); Files.writeString(oldRoot.resolve("old.pdf"),"original");
        Files.delete(file);
        assertThatThrownBy(() -> resolver.resolve(oldRoot,"old.pdf",hash)).isInstanceOf(ApiException.class);
    }
    @Test void preparedAndTraversalProjectionCannotActivate() throws Exception {
        Path archive = Files.createDirectory(temp.resolve("YKS"));
        String hash = "a".repeat(64);
        Path manifest = projection(archive,temp.resolve("old.pdf"),"../outside.pdf",hash,"ACTIVE");
        assertThatThrownBy(() -> new SourceFileResolver(mapper,archive.toString(),manifest.toString()))
                .isInstanceOf(IllegalStateException.class);
        projection(archive,temp.resolve("old.pdf"),"book.pdf",hash,"PREPARED");
        assertThatThrownBy(() -> new SourceFileResolver(mapper,archive.toString(),manifest.toString()))
                .isInstanceOf(IllegalStateException.class);
    }
}
