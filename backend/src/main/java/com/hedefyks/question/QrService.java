package com.hedefyks.question;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import com.hedefyks.config.AppProperties;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Map;
import org.springframework.stereotype.Service;

/** Soru başına kalıcı adresi ({public-base-url}/soru/{code}) gösteren QR'ı anında üretir; saklanmaz. */
@Service
public class QrService {

    private final String baseUrl;

    public QrService(AppProperties props) {
        String b = props.publicBaseUrl();
        this.baseUrl = b.endsWith("/") ? b.substring(0, b.length() - 1) : b;
    }

    public String questionUrl(String code) {
        return baseUrl + "/soru/" + code;
    }

    public byte[] png(String code, int size) {
        int s = Math.min(Math.max(size, 100), 800);
        try {
            BitMatrix matrix = new QRCodeWriter().encode(questionUrl(code), BarcodeFormat.QR_CODE, s, s,
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
