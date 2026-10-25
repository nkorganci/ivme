package com.hedefyks.question;

/** Bir sınavın soru kitapçığı testi. YKS: TYT/AYT; KPSS Ortaöğretim ve Lisans: Genel Yetenek/Genel Kültür. */
public enum ExamType {
    TYT("TYT"),
    AYT("AYT"),
    KPSS_OO_GY("KPSS Ortaöğretim Genel Yetenek"),
    KPSS_OO_GK("KPSS Ortaöğretim Genel Kültür"),
    KPSS_LS_GY("KPSS Lisans Genel Yetenek"),
    KPSS_LS_GK("KPSS Lisans Genel Kültür");

    private final String label;

    ExamType(String label) { this.label = label; }

    public String label() { return label; }

    public boolean kpss() { return name().startsWith("KPSS_"); }
}
