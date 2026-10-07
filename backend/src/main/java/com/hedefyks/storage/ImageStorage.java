package com.hedefyks.storage;

import org.springframework.core.io.Resource;

/**
 * Soru görseli deposu. Şimdilik yerel klasör (LocalImageStorage); ileride Cloudflare R2 / S3
 * için başka bir gerçekleme yazılır, veritabanı ve ön yüz değişmez (veritabanında yalnız göreli yol var).
 */
public interface ImageStorage {

    /** Göreli yoldaki görseli döner; yoksa veya güvensizse 404 (ApiException) fırlatır. */
    Resource load(String relativePath);

    boolean exists(String relativePath);
}
