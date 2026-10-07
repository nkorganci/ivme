package com.hedefyks.config;

import com.hedefyks.importer.ImportMode;
import com.hedefyks.importer.ImportReport;
import com.hedefyks.importer.QuestionImportService;
import com.hedefyks.question.QuestionRepository;
import java.nio.file.Files;
import java.nio.file.Path;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/** app.sample-data tanımlıysa ve soru tablosu boşsa örnek CSV'yi içe aktarıcıyla yükler (yalnız geliştirme). */
@Component
@Order(2)
class SampleDataLoader implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SampleDataLoader.class);

    private final AppProperties props;
    private final QuestionRepository questions;
    private final QuestionImportService importer;

    SampleDataLoader(AppProperties props, QuestionRepository questions, QuestionImportService importer) {
        this.props = props;
        this.questions = questions;
        this.importer = importer;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        String file = props.sampleData();
        if (file == null || file.isBlank() || questions.count() > 0) {
            return;
        }
        Path path = Path.of(file).toAbsolutePath().normalize();
        if (!Files.isRegularFile(path)) {
            log.warn("Örnek veri dosyası bulunamadı: {}", path);
            return;
        }
        ImportReport r = importer.run(Files.readAllBytes(path), path.getFileName().toString(), ImportMode.INSERT_ONLY, false);
        log.info("Örnek veri yüklendi: {} eklendi, {} hata, {} uyarı (dosya: {})", r.inserted(), r.errorCount(),
                r.warningCount(), path);
        r.errors().forEach(e -> log.warn("Örnek veri hatası: satır {} {} {}", e.row(), e.field(), e.message()));
    }
}
