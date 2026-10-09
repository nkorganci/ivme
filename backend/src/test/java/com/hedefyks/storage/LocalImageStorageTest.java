package com.hedefyks.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.hedefyks.common.ApiException;
import com.hedefyks.config.AppProperties;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LocalImageStorageTest {

    @TempDir Path root;

    @Test
    void yalnizGecerliRasterGorselSunulur() throws Exception {
        var storage = new LocalImageStorage(new AppProperties(null,
                new AppProperties.Images(root.toString()), null, null));
        Files.writeString(root.resolve("sayfa.html"), "<script>alert(1)</script>");
        Files.writeString(root.resolve("sahte.webp"), "<script>alert(1)</script>");
        Files.write(root.resolve("gercek.webp"), new byte[] {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'});

        assertThat(storage.exists("sayfa.html")).isFalse();
        assertThatThrownBy(() -> storage.load("sayfa.html")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> storage.load("sahte.webp")).isInstanceOf(ApiException.class);
        assertThat(storage.load("gercek.webp").exists()).isTrue();
        assertThat(storage.exists("../gercek.webp")).isFalse();
    }
}
