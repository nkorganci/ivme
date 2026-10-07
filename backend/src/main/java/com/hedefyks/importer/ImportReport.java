package com.hedefyks.importer;

import java.util.List;

/**
 * İçe aktarma raporu. errors boş değilse hiçbir şey yazılmaz (applied=false).
 * errors/warnings listeleri en fazla 1000 kayıt taşır; tam sayılar errorCount/warningCount alanlarındadır.
 */
public record ImportReport(boolean dryRun, ImportMode mode, boolean applied, int totalRows, int inserted, int updated,
                           int skipped, int errorCount, int warningCount, List<Issue> errors, List<Issue> warnings) {

    /** row: dosyadaki kayıt sırası (CSV'de başlık = 1, ilk soru = 2; JSON'da dizideki sıra). */
    public record Issue(int row, String code, String field, String message) {}
}
