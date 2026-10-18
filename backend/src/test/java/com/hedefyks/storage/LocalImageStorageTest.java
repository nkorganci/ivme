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
    void sourceRepairRequiresBothOriginalAndRenderedHashesAndPreservesOriginal() throws Exception {
        byte[] header={'R','I','F','F',0,0,0,0,'W','E','B','P'};
        Path original=root.resolve("1.webp");Files.write(original,header);
        Path repaired=Files.createDirectory(root.resolve("onarilmis")).resolve("1.webp");
        byte[] corrected=java.util.Arrays.copyOf(header,14);Files.write(repaired,corrected);
        var digest=java.security.MessageDigest.getInstance("SHA-256");
        var manifest=new com.fasterxml.jackson.databind.ObjectMapper().createObjectNode();
        var record=manifest.putArray("records").addObject();record.put("state","APPLIED_DERIVED_RENDER");record.put("originalImage","1.webp");
        record.put("originalSha256",java.util.HexFormat.of().formatHex(digest.digest(header)));
        record.put("renderedImageSha256",java.util.HexFormat.of().formatHex(digest.digest(corrected)));
        Files.writeString(root.resolve("onarilmis/manifest.json"),manifest.toString());
        var storage=new LocalImageStorage(new AppProperties(null,new AppProperties.Images(root.toString()),null,null));
        assertThat(storage.load("1.webp").getFile().toPath()).isEqualTo(repaired);
        assertThat(Files.readAllBytes(original)).isEqualTo(header);
        Files.write(repaired,header);assertThat(storage.load("1.webp").getFile().toPath()).isEqualTo(original);
        Files.write(repaired,corrected);Files.write(original,corrected);
        assertThat(storage.load("1.webp").getFile().toPath()).isEqualTo(original);
    }

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

    @Test
    void kirpilmisKopyaVarsaSunulurKaynakYoluKorunur() throws Exception {
        Path original = Files.createDirectories(root.resolve("ogm/sb")).resolve("1.webp");
        Path cropped = Files.createDirectories(root.resolve("kirpilmis/ogm/sb")).resolve("1.webp");
        byte[] header = {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'};
        Files.write(original, header);
        Files.write(cropped, header);
        var storage = new LocalImageStorage(new AppProperties(null,
                new AppProperties.Images(root.toString()), null, null));

        assertThat(storage.load("ogm/sb/1.webp").getFile().toPath()).isEqualTo(cropped);
        assertThat(storage.exists("ogm/sb/1.webp")).isTrue();
        Files.delete(cropped);
        assertThat(storage.load("ogm/sb/1.webp").getFile().toPath()).isEqualTo(original);
    }
}
