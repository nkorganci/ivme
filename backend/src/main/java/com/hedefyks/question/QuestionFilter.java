package com.hedefyks.question;

/** Soru bankası / sınav filtresi; boş alanlar "hepsi" demektir. */
public record QuestionFilter(QuestionBank bank, ExamType examType, String subject, String topic,
        java.util.List<String> categoryId, String categoryMatch, Boolean includeCandidates,String questionTypeId,String teacherDifficulty,
        java.util.List<QuestionSource> source) {

    public QuestionFilter(QuestionBank bank,ExamType examType,String subject,String topic,java.util.List<String> categoryId,String categoryMatch,Boolean includeCandidates,String questionTypeId,String teacherDifficulty) {
        this(bank,examType,subject,topic,categoryId,categoryMatch,includeCandidates,questionTypeId,teacherDifficulty,java.util.List.of());
    }

    public QuestionFilter(QuestionBank bank,ExamType examType,String subject,String topic,java.util.List<String> categoryId,String categoryMatch,Boolean includeCandidates) {
        this(bank,examType,subject,topic,categoryId,categoryMatch,includeCandidates,null,null);
    }

    public QuestionFilter(QuestionBank bank,ExamType examType,String subject,String topic) {
        this(bank,examType,subject,topic,java.util.List.of(),"ANY",true);
    }

    public QuestionFilter {
        subject = blankToNull(subject);
        topic = blankToNull(topic);
        categoryId=categoryId==null?java.util.List.of():categoryId.stream().filter(s->s!=null && !s.isBlank()).distinct().toList();
        categoryMatch=categoryMatch==null || categoryMatch.isBlank()?"ANY":categoryMatch;
        includeCandidates=includeCandidates==null?true:includeCandidates;
        questionTypeId=blankToNull(questionTypeId);teacherDifficulty=blankToNull(teacherDifficulty);
        source=source==null?java.util.List.of():source.stream().filter(java.util.Objects::nonNull).distinct().toList();
    }

    public boolean hasSharedSelection(){return !categoryId.isEmpty() || questionTypeId!=null || teacherDifficulty!=null;}

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
