package com.hedefyks.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.hedefyks.common.ApiException;
import com.hedefyks.config.AppProperties;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LocalImageStorageTest {

    @TempDir Path root;
    @TempDir Path outside;

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

    @Test
    void altKlasordenDisariKacanDosyaBaglantisiReddedilir() throws Exception {
        Path privateImage = outside.resolve("private.webp");
        Files.write(privateImage, new byte[] {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'});
        Path folder = Files.createDirectory(root.resolve("images"));
        try {
            Files.createSymbolicLink(folder.resolve("leak.webp"), privateImage);
        } catch (UnsupportedOperationException | SecurityException | java.io.IOException e) {
            Assumptions.assumeTrue(false, "Bu sistem sembolik bağlantı oluşturmaya izin vermiyor.");
        }
        var storage = new LocalImageStorage(new AppProperties(null,
                new AppProperties.Images(root.toString()), null, null));
        assertThat(storage.exists("images/leak.webp")).isFalse();
        assertThatThrownBy(() -> storage.load("images/leak.webp")).isInstanceOf(ApiException.class);
    }

    @Test
    void yerelPilotGorselBaglantisiCalisir() {
        Path pilot = Path.of("..", "veri", "resimler-pilot").toAbsolutePath().normalize();
        String sample = "ogm/sb/9151.webp";
        Assumptions.assumeTrue(Files.isRegularFile(pilot.resolve(sample)), "Pilot görsel deposu bu makinede yok.");
        var storage = new LocalImageStorage(new AppProperties(null,
                new AppProperties.Images(pilot.toString()), null, null));
        assertThat(storage.exists(sample)).isTrue();
        assertThat(storage.load(sample).exists()).isTrue();
    }
}
