package com.hedefyks.question;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import com.hedefyks.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

/** Soru başına kalıcı adresi ({public-base-url}/soru/{code}) gösteren QR'ı anında üretir; saklanmaz. */
@Service
public class QrService {

    private final String configuredBaseUrl;

    public QrService(AppProperties props) {
        String b = props.publicBaseUrl();
        this.configuredBaseUrl = b == null || b.isBlank() ? null : b.trim().replaceAll("/+$", "");
    }

    /**
     * Kalıcı soru adresi. Üretimde doğrulanan sabit YKS_SITE_ADRESI kullanılır. Geliştirme ortamında
     * ayar yoksa istek adresinden yerel URL türetilir; güvenilmeyen proxy başlıkları işlenmez.
     */
    public String questionUrl(HttpServletRequest request, String code) {
        String base = configuredBaseUrl != null ? configuredBaseUrl
                : ServletUriComponentsBuilder.fromContextPath(request).build().toUriString();
        return base + "/soru/" + code;
    }

    public byte[] png(String url, int size) {
        int s = Math.min(Math.max(size, 100), 800);
        try {
            BitMatrix matrix = new QRCodeWriter().encode(url, BarcodeFormat.QR_CODE, s, s,
                    Map.of(EncodeHintType.MARGIN, 1, EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M,
                            EncodeHintType.CHARACTER_SET, "UTF-8"));
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            return out.toByteArray();
        } catch (WriterException e) {
            throw new IllegalStateException("QR üretilemedi", e);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
