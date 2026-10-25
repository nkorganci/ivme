package com.hedefyks.topicpdf;

import com.hedefyks.common.ApiException;
import org.springframework.http.HttpStatus;

/** The source file exists but its SHA-256 no longer matches the catalog record. */
public class PdfChangedException extends ApiException {
    public PdfChangedException() {
        super(HttpStatus.NOT_FOUND, "PDF dosyası değişmiş; içeriği katalogdaki SHA-256 kaydıyla uyuşmuyor.");
    }
}
