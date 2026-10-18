package com.hedefyks.tracking;

import com.hedefyks.common.ApiException;
import java.time.LocalDate;
import java.util.List;

public record MathLearning(String examType, String branch, String subtopic, String goal,
                           Score beforeTest, Score afterTest, Homework assignment,
                           List<String> errorTypes, String mastery, LocalDate reviewDate,
                           Score reviewTest, boolean reviewDone, String nextStep, String teacherEvaluation,
                           @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_EMPTY) String categoryId,
                           @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_EMPTY) List<String> resourceKeys) {
    public MathLearning(String examType,String branch,String subtopic,String goal,Score beforeTest,Score afterTest,Homework assignment,
            List<String> errorTypes,String mastery,LocalDate reviewDate,Score reviewTest,boolean reviewDone,String nextStep,String teacherEvaluation,String categoryId) {
        this(examType,branch,subtopic,goal,beforeTest,afterTest,assignment,errorTypes,mastery,reviewDate,reviewTest,reviewDone,nextStep,teacherEvaluation,categoryId,List.of());
    }
    public MathLearning(String examType,String branch,String subtopic,String goal,Score beforeTest,Score afterTest,Homework assignment,
            List<String> errorTypes,String mastery,LocalDate reviewDate,Score reviewTest,boolean reviewDone,String nextStep,String teacherEvaluation) {
        this(examType,branch,subtopic,goal,beforeTest,afterTest,assignment,errorTypes,mastery,reviewDate,reviewTest,reviewDone,nextStep,teacherEvaluation,null);
    }
    public record Score(Integer correct, Integer wrong, Integer blank) {
        void validate() {
            if (correct == null && wrong == null && blank == null) return;
            if (correct == null || wrong == null || blank == null)
                throw ApiException.badRequest("Test için doğru, yanlış ve boş sayılarını birlikte girin.");
            count(correct); count(wrong); count(blank);
        }
    }

    public record Homework(Integer given, Integer correct, Integer wrong, Integer blank,
                           LocalDate assignedDate, LocalDate dueDate, String source) {
        Homework checked() {
            count(given);
            new Score(correct, wrong, blank).validate();
            if (correct != null && (given == null || correct + wrong + blank > given))
                throw ApiException.badRequest("Ödev sonuçları verilen soru sayısını aşamaz; verilen sayısını da girin.");
            if (assignedDate != null && dueDate != null && dueDate.isBefore(assignedDate))
                throw ApiException.badRequest("Ödev teslim tarihi verilme tarihinden önce olamaz.");
            return new Homework(given, correct, wrong, blank, assignedDate, dueDate, text(source, 1000));
        }
    }

    public MathLearning checked() {
        choice(examType, List.of("TYT", "AYT"), "Sınav türü");
        choice(branch, List.of("MATHEMATICS", "GEOMETRY"), "Branş");
        choice(mastery, List.of("NOT_STARTED", "LEARNING", "ASSESSED", "REVIEW_NEEDED", "PRACTICING", "MASTERED", "VERIFIED"), "Konu seviyesi");
        if (beforeTest != null) beforeTest.validate();
        if (afterTest != null) afterTest.validate();
        if (reviewTest != null) reviewTest.validate();
        List<String> errors = errorTypes == null ? List.of() : errorTypes;
        if (errors.size() > 6 || errors.stream().distinct().count() != errors.size())
            throw ApiException.badRequest("Hata türleri geçersiz.");
        for (String error : errors)
            choice(error, List.of("KNOWLEDGE", "CALCULATION", "READING", "ATTENTION", "TIME", "METHOD"), "Hata türü");
        var resources=resourceKeys==null?List.<String>of():resourceKeys.stream().distinct().toList();
        if(resources.size()>20 || resources.stream().anyMatch(key->key==null || key.length()>350 || !key.matches("(?:question|pdf|video|note|note-question):[^\\r\\n]+")))
            throw ApiException.badRequest("Kaynak bağlantıları geçersiz.");
        return new MathLearning(examType, branch, text(subtopic, 1000), text(goal, 2000), beforeTest, afterTest,
                assignment == null ? null : assignment.checked(), List.copyOf(errors), mastery, reviewDate,
                reviewTest, reviewDone, text(nextStep, 2000), text(teacherEvaluation, 5000),text(categoryId,350),resources);
    }

    private static void count(Integer value) {
        if (value != null && (value < 0 || value > 10000))
            throw ApiException.badRequest("Soru sayıları 0 ile 10000 arasında olmalı.");
    }

    private static void choice(String value, List<String> allowed, String label) {
        if (value == null || !allowed.contains(value)) throw ApiException.badRequest(label + " geçersiz.");
    }

    private static String text(String value, int max) {
        String result = value == null ? "" : value.trim();
        if (result.length() > max) throw ApiException.badRequest("Takip metni çok uzun.");
        return result;
    }
}
