package com.hedefyks.question;

/** Soru koleksiyonu. */
public enum QuestionBank {
    /** "AYT-TYT Çıkmış Sorular": OGM YKS çıkmış soru kitapçıkları. */
    CIKMIS,
    /** "Soru Bankası": OGM Soru Bankası ve diğer tüm OGM kaynakları. */
    OGM,
    /** Eski bağlantı/oturum belirteci; mevcut sorular OGM ana bankasına taşındı. */
    MEBI_PRACTICE_2;

    public QuestionBank canonical() { return this == MEBI_PRACTICE_2 ? OGM : this; }
}
