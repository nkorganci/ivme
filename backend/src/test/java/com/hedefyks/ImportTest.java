package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;

import com.hedefyks.importer.ImportMode;
import com.hedefyks.importer.ImportReport;
import com.hedefyks.importer.QuestionImportService;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class ImportTest extends TestBase {

    private static final String HEADER = "code,exam_type,subject,topic,year,source,image,correct_answer,choice_count,solution_url,active\n";
    private static final String IMG = "TYT/turkce/TYT-0001.webp";

    @Autowired QuestionImportService importer;

    @Test void eskiCsvResmiIptaliGeriAlmadanDigerSorulariIceAlabilir() {
        var cancelled=question("OFFICIAL-1","Matematik","C");
        jdbc.update("INSERT INTO learning_catalog.official_question_corrections(correction_key,question_id,question_code,official_status,source_url,source_sha256,identity,before_active,before_source_stamp,answer_events,exam_references) VALUES ('test-cancellation',?,'OFFICIAL-1','cancelled','https://www.osym.gov.tr/test',?, '{}'::jsonb,true,'test',0,0)",cancelled.getId(),"a".repeat(64));
        jdbc.update("UPDATE questions SET active=false WHERE id=?",cancelled.getId());
        var report=run(HEADER+"OFFICIAL-1,TYT,Matematik,Konu,,,"+IMG+",C,,,true\nNEW-ACTIVE,TYT,Matematik,Konu,,,"+IMG+",B,,,true\n",ImportMode.UPSERT,false);
        assertThat(report.errorCount()).isZero();assertThat(report.applied()).isTrue();
        assertThat(report.warnings()).anyMatch(i->"active".equals(i.field()) && i.message().contains("iptal"));
        assertThat(questions.findByCode("OFFICIAL-1").orElseThrow().isActive()).isFalse();
        assertThat(questions.findByCode("NEW-ACTIVE").orElseThrow().isActive()).isTrue();
        assertThat(questions.findByCode("OFFICIAL-1").orElseThrow().getCorrectAnswer()).isEqualTo("C");
    }

    private ImportReport run(String csv, ImportMode mode, boolean dryRun) {
        return importer.run(csv.getBytes(StandardCharsets.UTF_8), "sorular.csv", mode, dryRun);
    }

    @Test
    void ortakEtiketTaslagiSoruIleBirlikteKaydedilirVeAtlananKayitEzilmez() {
        String csv=HEADER+"INTAKE-1,TYT,Matematik,Yeni dar konu,,,"+IMG+",C,,,\n";
        assertThat(run(csv,ImportMode.INSERT_ONLY,true).errorCount()).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM learning_catalog.question_intake",Integer.class)).isZero();
        assertThat(run(csv,ImportMode.INSERT_ONLY,false).applied()).isTrue();
        var draft=jdbc.queryForMap("SELECT resource::text AS resource,updated_at::text AS stamp FROM learning_catalog.question_intake WHERE question_code='INTAKE-1'");
        assertThat(draft.get("resource").toString()).contains("contractVersion","NEEDS_MANUAL_REVIEW","Dersin genel kapsamı").doesNotContain("correctAnswer");
        assertThat(run(csv,ImportMode.INSERT_ONLY,false).skipped()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT updated_at::text FROM learning_catalog.question_intake WHERE question_code='INTAKE-1'",String.class)).isEqualTo(draft.get("stamp"));
        assertThat(questions.findByCode("INTAKE-1").orElseThrow().getCorrectAnswer()).isEqualTo("C");
    }

    @Test
    void gecerliDosyaEklenirVeTekrarEdinceAtlanir() {
        String csv = HEADER + "A-1,TYT,Matematik,Sayılar,2024,Kaynak," + IMG + ",C,5,https://ornek.com/c,true\n"
                + "A-2,AYT,Fizik,,,," + IMG + ",e,,,\n";
        ImportReport dry = run(csv, ImportMode.INSERT_ONLY, true);
        assertThat(dry.errorCount()).isZero();
        assertThat(dry.inserted()).isEqualTo(2);
        assertThat(dry.applied()).isFalse();
        assertThat(questions.count()).isZero();                                    // dryRun hiçbir şey yazmaz

        ImportReport real = run(csv, ImportMode.INSERT_ONLY, false);
        assertThat(real.applied()).isTrue();
        assertThat(questions.count()).isEqualTo(2);
        assertThat(questions.findByCode("A-2").orElseThrow().getCorrectAnswer()).isEqualTo("E");

        ImportReport again = run(csv, ImportMode.INSERT_ONLY, false);
        assertThat(again.inserted()).isZero();
        assertThat(again.skipped()).isEqualTo(2);
    }

    @Test
    void hataVarsaHicbirSeyYazilmazVeTumHatalarRaporlanir() {
        String csv = HEADER
                + "B-1,TYT,Matematik,,,," + IMG + ",A,,,\n"                      // geçerli
                + "B-1,TYT,Matematik,,,," + IMG + ",A,,,\n"                      // dosyada tekrar
                + "B-2,XYZ,,,,,,,F,9,,\n"                                          // çok sayıda hata
                + ",TYT,Fizik,,,," + IMG + ",A,,,\n";                             // kod boş
        ImportReport r = run(csv, ImportMode.INSERT_ONLY, false);
        assertThat(r.applied()).isFalse();
        assertThat(questions.count()).isZero();
        assertThat(r.errors()).extracting(e -> e.field())
                .contains("code", "exam_type", "subject", "image", "correct_answer", "choice_count");
        assertThat(r.errors()).anyMatch(e -> e.message().contains("tekrar"));
    }

    @Test
    void eksikZorunluSutunRaporlanir() {
        ImportReport r = run("code,subject\nA-1,Matematik\n", ImportMode.INSERT_ONLY, false);
        assertThat(r.applied()).isFalse();
        assertThat(r.errors()).extracting(e -> e.field()).contains("exam_type", "image", "correct_answer");
    }

    @Test
    void insertOnlyVarOlanaDokunmazUpsertGunceller() {
        run(HEADER + "C-1,TYT,Matematik,,,," + IMG + ",A,,,\n", ImportMode.INSERT_ONLY, false);
        String changed = HEADER + "C-1,TYT,Fizik,,,," + IMG + ",B,,,\n";

        ImportReport insertOnly = run(changed, ImportMode.INSERT_ONLY, false);
        assertThat(insertOnly.skipped()).isEqualTo(1);
        assertThat(questions.findByCode("C-1").orElseThrow().getSubject()).isEqualTo("Matematik");

        ImportReport upsert = run(changed, ImportMode.UPSERT, false);
        assertThat(upsert.updated()).isEqualTo(1);
        assertThat(upsert.warnings()).anyMatch(w -> "correct_answer".equals(w.field()) && w.message().contains("A → B"));
        var q = questions.findByCode("C-1").orElseThrow();
        assertThat(q.getSubject()).isEqualTo("Fizik");
        assertThat(q.getCorrectAnswer()).isEqualTo("B");
    }

    @Test
    void noktaliVirgulAyraciVeJsonDesteklenir() {
        String semicolon = HEADER.replace(',', ';') + "D-1;TYT;Matematik;;;;" + IMG + ";A;;;\n";
        assertThat(run(semicolon, ImportMode.INSERT_ONLY, false).inserted()).isEqualTo(1);

        String json = "[{\"code\":\"D-2\",\"exam_type\":\"ayt\",\"subject\":\"Kimya\",\"image\":\"" + IMG + "\",\"correct_answer\":\"d\",\"year\":2022}]";
        ImportReport r = importer.run(json.getBytes(StandardCharsets.UTF_8), "sorular.json", ImportMode.INSERT_ONLY, false);
        assertThat(r.errorCount()).isZero();
        assertThat(questions.findByCode("D-2").orElseThrow().getYear()).isEqualTo(2022);
    }
}
