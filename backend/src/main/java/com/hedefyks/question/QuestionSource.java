package com.hedefyks.question;

/** A bank and exam form one selectable source; mixed selections preserve each pair. */
public enum QuestionSource {
    CIKMIS_AYT(QuestionBank.CIKMIS, ExamType.AYT),
    CIKMIS_TYT(QuestionBank.CIKMIS, ExamType.TYT),
    OGM_AYT(QuestionBank.OGM, ExamType.AYT),
    OGM_TYT(QuestionBank.OGM, ExamType.TYT),
    CIKMIS_KPSS_OO_GY(QuestionBank.CIKMIS, ExamType.KPSS_OO_GY),
    CIKMIS_KPSS_OO_GK(QuestionBank.CIKMIS, ExamType.KPSS_OO_GK),
    CIKMIS_KPSS_LS_GY(QuestionBank.CIKMIS, ExamType.KPSS_LS_GY),
    CIKMIS_KPSS_LS_GK(QuestionBank.CIKMIS, ExamType.KPSS_LS_GK),
    CIKMIS_YURT_DISI_MY(QuestionBank.CIKMIS, ExamType.YURT_DISI_MY),
    MEBI2_AYT(QuestionBank.MEBI_PRACTICE_2, ExamType.AYT),
    MEBI2_TYT(QuestionBank.MEBI_PRACTICE_2, ExamType.TYT);

    private final QuestionBank bank;
    private final ExamType examType;

    QuestionSource(QuestionBank bank, ExamType examType) {
        this.bank = bank;
        this.examType = examType;
    }

    public QuestionBank bank() { return bank; }
    public ExamType examType() { return examType; }
}
