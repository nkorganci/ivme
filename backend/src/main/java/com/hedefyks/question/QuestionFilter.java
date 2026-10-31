package com.hedefyks.question;

/** Soru bankası / sınav filtresi; boş alanlar "hepsi" demektir. */
public record QuestionFilter(QuestionBank bank, ExamType examType, String subject, String topic,
        java.util.List<String> categoryId, String categoryMatch, Boolean includeCandidates,String questionTypeId,String teacherDifficulty,
        java.util.List<QuestionSource> source,
        /** Kişisel zorluk etiketi (TAS-06): KOLAY / ORTA / ZOR / NONE (etiketsiz); boş = süzme yok. */
        String myDifficulty,
        /** Kişisel işaret (TAS-06): AGAIN / HIDE / UNMARKED; boş = süzme yok. */
        String mark,
        /** Yalnız otomatik pratik havuzunda: HIDE ile gizlenen sorular çıkarılır, bekleyen AGAIN öne alınır. */
        Boolean skipHidden) {

    private static final java.util.Set<String> DIFFICULTIES = java.util.Set.of("KOLAY", "ORTA", "ZOR", "NONE");
    private static final java.util.Set<String> MARKS = java.util.Set.of("AGAIN", "HIDE", "UNMARKED");

    public QuestionFilter(QuestionBank bank, ExamType examType, String subject, String topic, java.util.List<String> categoryId, String categoryMatch,
            Boolean includeCandidates, String questionTypeId, String teacherDifficulty, java.util.List<QuestionSource> source) {
        this(bank,examType,subject,topic,categoryId,categoryMatch,includeCandidates,questionTypeId,teacherDifficulty,source,null,null,null);
    }

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
        myDifficulty=myDifficulty==null || !DIFFICULTIES.contains(myDifficulty.trim()) ? null : myDifficulty.trim();
        mark=mark==null || !MARKS.contains(mark.trim()) ? null : mark.trim();
        skipHidden=skipHidden==null?false:skipHidden;
    }

    /** Aynı süzgeç, otomatik pratik havuzu için: gizlenen sorular çıkar, bekleyen "tekrar göster" soruları öne alınır. */
    public QuestionFilter forPractice() {
        return new QuestionFilter(bank,examType,subject,topic,categoryId,categoryMatch,includeCandidates,questionTypeId,teacherDifficulty,source,myDifficulty,mark,true);
    }

    /** Kişisel süzgeç var mı (kullanıcıya özgü SQL gerekir)? */
    public boolean hasPersonal() { return myDifficulty != null || mark != null || skipHidden; }

    public boolean hasSharedSelection(){return !categoryId.isEmpty() || questionTypeId!=null || teacherDifficulty!=null;}

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
