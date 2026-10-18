package com.hedefyks.config;

import com.hedefyks.importer.ImportMode;
import com.hedefyks.importer.ImportReport;
import com.hedefyks.importer.QuestionImportService;
import java.nio.file.Files;
import java.nio.file.Path;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * İsteğe bağlı toplu yükleme: app.import-file (env YKS_IMPORT_DOSYASI) bir CSV/JSON yolu ise, uygulama açılırken
 * dosya yönetim ekranındakiyle AYNI içe aktarıcıdan geçirilir (önce tüm satırlar doğrulanır, hata varsa hiçbir şey yazılmaz).
 * Mod: app.import-mode (env YKS_IMPORT_MODU = INSERT_ONLY | UPSERT, varsayılan INSERT_ONLY). Yönetici hesabı gerekmez.
 * İş bitince değişkeni kaldırıp uygulamayı normal başlat.
 */
@Component
@Order(3)
class FileImportRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(FileImportRunner.class);

    private final QuestionImportService importer;
    private final String file;
    private final ImportMode mode;

    FileImportRunner(QuestionImportService importer,
                     @Value("${app.import-file:}") String file,
                     @Value("${app.import-mode:INSERT_ONLY}") ImportMode mode) {
        this.importer = importer;
        this.file = file;
        this.mode = mode;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (file == null || file.isBlank()) {
            return;
        }
        Path path = Path.of(file.trim()).toAbsolutePath().normalize();
        if (!Files.isRegularFile(path)) {
            throw new IllegalStateException("İçe aktarma dosyası bulunamadı: " + path);
        }
        ImportReport r = importer.run(Files.readAllBytes(path), path.getFileName().toString(), mode, false);
        log.info("İçe aktarma ({}): uygulandı={}, toplam={}, eklenen={}, güncellenen={}, atlanan={}, hata={}, uyarı={}",
                mode, r.applied(), r.totalRows(), r.inserted(), r.updated(), r.skipped(), r.errorCount(), r.warningCount());
        r.errors().stream().limit(30).forEach(e -> log.error("  HATA satır {} [{}] {}: {}", e.row(), e.code(), e.field(), e.message()));
        r.warnings().stream().limit(30).forEach(e -> log.warn("  UYARI satır {} [{}] {}: {}", e.row(), e.code(), e.field(), e.message()));
        if (!r.applied()) {
            throw new IllegalStateException("İçe aktarma uygulanamadı; hata sayısı: " + r.errorCount());
        }
    }
}
