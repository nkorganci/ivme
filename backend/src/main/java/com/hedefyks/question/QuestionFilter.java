package com.hedefyks.question;

/** Soru bankası / sınav filtresi; boş alanlar "hepsi" demektir. */
public record QuestionFilter(QuestionBank bank, ExamType examType, String subject, String topic) {

    public QuestionFilter {
        subject = blankToNull(subject);
        topic = blankToNull(topic);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
