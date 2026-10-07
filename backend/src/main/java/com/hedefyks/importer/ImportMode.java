package com.hedefyks.importer;

public enum ImportMode {
    /** Yalnız yeni kodları ekler; var olan sorulara dokunmaz (atlanır). Varsayılan, en güvenli mod. */
    INSERT_ONLY,
    /** Yeni kodları ekler, var olanları dosyadaki değerlerle günceller (doğru cevap değişirse uyarı verir). */
    UPSERT
}
