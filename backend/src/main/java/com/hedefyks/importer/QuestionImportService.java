package com.hedefyks.importer;

import com.hedefyks.importer.ImportReport.Issue;
import com.hedefyks.importer.QuestionFileParser.Parsed;
import com.hedefyks.importer.QuestionFileParser.RawRow;
import com.hedefyks.question.ExamType;
import com.hedefyks.question.Question;
import com.hedefyks.question.QuestionRepository;
import com.hedefyks.storage.ImageStorage;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * CSV/JSON'dan soru içe aktarma. Önce TÜM satırlar doğrulanır; tek bir hata bile varsa hiçbir şey yazılmaz.
 * Var olan sorular INSERT_ONLY modunda asla değişmez; UPSERT modunda değişiklikler raporlanır.
 * (Geçmiş sınav sonuçları soru değişse de etkilenmez; bkz. exam_questions kopyaları.)
 */
@Service
public class QuestionImportService {

    static final int MAX_ISSUES = 1000;
    private static final Set<String> KNOWN = Set.of("code", "exam_type", "subject", "topic", "year",
            "source", "image", "correct_answer", "choice_count", "solution_url", "active");
    private static final List<String> REQUIRED = List.of("code", "exam_type", "subject", "image", "correct_answer");
    private static final Pattern CODE = Pattern.compile("^[\\p{L}\\p{N}_.-]+$");

    private final QuestionFileParser parser;
    private final QuestionRepository questions;
    private final ImageStorage images;
    private final TransactionTemplate tx;

    public QuestionImportService(QuestionFileParser parser, QuestionRepository questions, ImageStorage images,
                                 TransactionTemplate tx) {
        this.parser = parser;
        this.questions = questions;
        this.images = images;
        this.tx = tx;
    }

    /** Doğrulanmış satır. */
    private record Candidate(int row, String code, ExamType examType, String subject, String topic,
                             Integer year, String source, String image, String correctAnswer,
                             int choiceCount, String solutionUrl, boolean active) {}

    /** Toplanan sorunlar; listeler sınırlı, sayaçlar tam. */
    private static final class Issues {
        final List<Issue> errors = new ArrayList<>();
        final List<Issue> warnings = new ArrayList<>();
        int errorCount;
        int warningCount;

        void error(int row, String code, String field, String message) {
            errorCount++;
            if (errors.size() < MAX_ISSUES) errors.add(new Issue(row, code, field, message));
        }

        void warn(int row, String code, String field, String message) {
            warningCount++;
            if (warnings.size() < MAX_ISSUES) warnings.add(new Issue(row, code, field, message));
        }
    }

    private record Plan(List<Question> inserts, int updated, int skipped) {}

    public ImportReport run(byte[] fileBytes, String filename, ImportMode mode, boolean dryRun) {
        Issues issues = new Issues();
        Parsed parsed;
        try {
            parsed = parser.parse(fileBytes, filename);
        } catch (IOException e) {
            issues.error(0, null, null, e.getMessage());
            return report(dryRun, mode, false, 0, new Plan(List.of(), 0, 0), issues);
        }

        checkHeader(parsed.header(), issues);
        List<Candidate> candidates = new ArrayList<>();
        if (issues.errorCount == 0) {
            Map<String, Integer> firstRow = new HashMap<>();
            for (RawRow raw : parsed.rows()) {
                Candidate c = validate(raw, issues);
                if (c == null) continue;
                Integer first = firstRow.putIfAbsent(c.code(), c.row());
                if (first != null) {
                    issues.error(c.row(), c.code(), "code", "Bu kod dosyada tekrar ediyor (ilk geçtiği kayıt: " + first + ").");
                } else {
                    candidates.add(c);
                }
            }
        }

        Plan plan = plan(candidates, loadExisting(candidates), mode, issues);
        boolean apply = !dryRun && issues.errorCount == 0;
        if (apply) {
            tx.executeWithoutResult(status -> {
                // Aynı planı yönetilen (tx içindeki) varlıklarla yeniden uygula: güncellemeler commit'te yazılır
                Plan live = plan(candidates, loadExisting(candidates), mode, new Issues());
                questions.saveAll(live.inserts());
            });
        }
        return report(dryRun, mode, apply, parsed.rows().size(), plan, issues);
    }

    // ------------------------------------------------------------------ doğrulama

    private void checkHeader(List<String> header, Issues issues) {
        if (header.isEmpty()) {
            issues.error(1, null, null, "Dosya boş veya başlık satırı yok.");
            return;
        }
        for (String required : REQUIRED) {
            if (!header.contains(required)) {
                issues.error(1, null, required, "Zorunlu sütun eksik: " + required);
            }
        }
        for (String h : header) {
            if (!KNOWN.contains(h)) issues.warn(1, null, h, "Bilinmeyen sütun yok sayıldı: " + h);
        }
    }

    private Candidate validate(RawRow raw, Issues issues) {
        Map<String, String> v = raw.values();
        int row = raw.row();
        String code = v.getOrDefault("code", "");
        int before = issues.errorCount;

        if (raw.extraColumns() > 0) {
            issues.error(row, code, null, "Satırda başlıktan fazla sütun var (tırnak veya ayraç hatası olabilir).");
        }
        if (code.isEmpty()) issues.error(row, null, "code", "Zorunlu alan boş: code");
        else if (code.length() > 60) issues.error(row, code, "code", "Kod en fazla 60 karakter olabilir.");
        else if (!CODE.matcher(code).matches()) issues.error(row, code, "code", "Kod yalnız harf, rakam, _ . - içerebilir.");

        ExamType examType = null;
        String et = v.getOrDefault("exam_type", "").toUpperCase(Locale.ROOT);
        if (et.isEmpty()) issues.error(row, code, "exam_type", "Zorunlu alan boş: exam_type");
        else try { examType = ExamType.valueOf(et); }
        catch (IllegalArgumentException e) { issues.error(row, code, "exam_type", "exam_type TYT veya AYT olmalı: " + et); }

        String subject = required(v, "subject", 80, row, code, issues);
        String topic = optional(v, "topic", 160, row, code, issues);
        String source = optional(v, "source", 200, row, code, issues);

        Integer year = null;
        String y = v.getOrDefault("year", "");
        if (!y.isEmpty()) {
            try {
                year = Integer.valueOf(y);
                if (year < 1990 || year > 2100) throw new NumberFormatException();
            } catch (NumberFormatException e) {
                year = null;
                issues.error(row, code, "year", "year 1990–2100 arasında bir sayı olmalı: " + y);
            }
        }

        String image = v.getOrDefault("image", "").replace('\\', '/');
        while (image.startsWith("/")) image = image.substring(1);
        if (image.isEmpty()) issues.error(row, code, "image", "Zorunlu alan boş: image");
        else if (image.length() > 300) issues.error(row, code, "image", "Görsel yolu en fazla 300 karakter olabilir.");
        else if (image.contains("..") || image.matches("^[A-Za-z]:.*")) {
            issues.error(row, code, "image", "Görsel yolu klasör dışına çıkamaz; kök klasöre göre göreli olmalı.");
        } else if (!images.exists(image)) {
            issues.warn(row, code, "image", "Görsel dosyası resim klasöründe bulunamadı: " + image);
        }

        int choiceCount = 5;
        String cc = v.getOrDefault("choice_count", "");
        if (!cc.isEmpty()) {
            try {
                choiceCount = Integer.parseInt(cc);
                if (choiceCount < 4 || choiceCount > 5) throw new NumberFormatException();
            } catch (NumberFormatException e) {
                choiceCount = 5;
                issues.error(row, code, "choice_count", "choice_count 4 veya 5 olmalı: " + cc);
            }
        }

        String answer = v.getOrDefault("correct_answer", "").toUpperCase(Locale.ROOT);
        if (answer.isEmpty()) issues.error(row, code, "correct_answer", "Zorunlu alan boş: correct_answer");
        else if (!answer.matches("^[A-E]$")) issues.error(row, code, "correct_answer", "correct_answer A–E arasında tek harf olmalı: " + answer);
        else if (answer.charAt(0) - 'A' >= choiceCount) issues.error(row, code, "correct_answer", "Doğru cevap şık sayısının dışında: " + answer);

        String solutionUrl = optional(v, "solution_url", 500, row, code, issues);
        if (solutionUrl != null && !solutionUrl.matches("^https?://\\S+$")) {
            issues.error(row, code, "solution_url", "solution_url http:// veya https:// ile başlamalı.");
        }

        boolean active = true;
        String a = v.getOrDefault("active", "").toLowerCase(Locale.ROOT);
        if (!a.isEmpty()) {
            switch (a) {
                case "true", "1", "evet", "yes" -> active = true;
                case "false", "0", "hayır", "hayir", "no" -> active = false;
                default -> issues.error(row, code, "active", "active true veya false olmalı: " + a);
            }
        }

        if (issues.errorCount > before) return null;
        return new Candidate(row, code, examType, subject, topic, year, source, image, answer,
                choiceCount, solutionUrl, active);
    }

    private static String required(Map<String, String> v, String field, int max, int row, String code, Issues issues) {
        String s = v.getOrDefault(field, "");
        if (s.isEmpty()) issues.error(row, code, field, "Zorunlu alan boş: " + field);
        else if (s.length() > max) issues.error(row, code, field, field + " en fazla " + max + " karakter olabilir.");
        return s;
    }

    private static String optional(Map<String, String> v, String field, int max, int row, String code, Issues issues) {
        String s = v.getOrDefault(field, "");
        if (s.isEmpty()) return null;
        if (s.length() > max) issues.error(row, code, field, field + " en fazla " + max + " karakter olabilir.");
        return s;
    }

    // ------------------------------------------------------------------ plan

    private Map<String, Question> loadExisting(List<Candidate> candidates) {
        Map<String, Question> existing = new HashMap<>();
        List<String> codes = candidates.stream().map(Candidate::code).toList();
        for (int i = 0; i < codes.size(); i += 1000) {
            questions.findByCodeIn(codes.subList(i, Math.min(i + 1000, codes.size())))
                    .forEach(q -> existing.put(q.getCode(), q));
        }
        return existing;
    }

    /** Eklenecek/güncellenecek/atlanacakları belirler; var olan varlıkları yerinde günceller (UPSERT). */
    private Plan plan(List<Candidate> candidates, Map<String, Question> existing, ImportMode mode, Issues issues) {
        List<Question> inserts = new ArrayList<>();
        int updated = 0, skipped = 0;
        for (Candidate c : candidates) {
            Question q = existing.get(c.code());
            if (q == null) {
                inserts.add(toEntity(c));
            } else if (mode == ImportMode.INSERT_ONLY) {
                skipped++;
            } else {
                Map<String, String> changes = diff(q, c);
                if (changes.isEmpty()) {
                    skipped++;
                } else {
                    if (changes.containsKey("correct_answer")) {
                        issues.warn(c.row(), c.code(), "correct_answer", "Doğru cevap değişti: " + changes.get("correct_answer")
                                + " (geçmiş sınav sonuçları etkilenmez).");
                    }
                    apply(q, c);
                    updated++;
                }
            }
        }
        return new Plan(inserts, updated, skipped);
    }

    private static Map<String, String> diff(Question q, Candidate c) {
        Map<String, String> m = new LinkedHashMap<>();
        if (!Objects.equals(q.getCorrectAnswer(), c.correctAnswer())) m.put("correct_answer", q.getCorrectAnswer() + " → " + c.correctAnswer());
        if (q.getExamType() != c.examType()) m.put("exam_type", "");
        if (!Objects.equals(q.getSubject(), c.subject())) m.put("subject", "");
        if (!Objects.equals(q.getTopic(), c.topic())) m.put("topic", "");
        if (!Objects.equals(q.getYear(), c.year())) m.put("year", "");
        if (!Objects.equals(q.getSource(), c.source())) m.put("source", "");
        if (!Objects.equals(q.getImage(), c.image())) m.put("image", "");
        if (q.getChoiceCount() != c.choiceCount()) m.put("choice_count", "");
        if (!Objects.equals(q.getSolutionUrl(), c.solutionUrl())) m.put("solution_url", "");
        if (q.isActive() != c.active()) m.put("active", "");
        return m;
    }

    private static void apply(Question q, Candidate c) {
        q.setExamType(c.examType());
        q.setSubject(c.subject());
        q.setTopic(c.topic());
        q.setYear(c.year());
        q.setSource(c.source());
        q.setImage(c.image());
        q.setCorrectAnswer(c.correctAnswer());
        q.setChoiceCount(c.choiceCount());
        q.setSolutionUrl(c.solutionUrl());
        q.setActive(c.active());
        q.setUpdatedAt(Instant.now());
    }

    private static Question toEntity(Candidate c) {
        Question q = new Question();
        q.setCode(c.code());
        apply(q, c);
        return q;
    }

    private static ImportReport report(boolean dryRun, ImportMode mode, boolean applied, int totalRows, Plan plan,
                                       Issues issues) {
        return new ImportReport(dryRun, mode, applied, totalRows, plan.inserts().size(), plan.updated(), plan.skipped(),
                issues.errorCount, issues.warningCount, issues.errors, issues.warnings);
    }
}
