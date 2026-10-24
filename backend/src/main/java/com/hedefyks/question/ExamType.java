package com.hedefyks.question;

/** Bir sınavın soru kitapçığı testi. YKS: TYT/AYT; KPSS Ortaöğretim: Genel Yetenek/Genel Kültür. */
public enum ExamType {
    TYT("TYT"),
    AYT("AYT"),
    KPSS_OO_GY("KPSS Ortaöğretim Genel Yetenek"),
    KPSS_OO_GK("KPSS Ortaöğretim Genel Kültür");

    private final String label;

    ExamType(String label) { this.label = label; }

    public String label() { return label; }

    public boolean kpss() { return name().startsWith("KPSS_"); }
}
