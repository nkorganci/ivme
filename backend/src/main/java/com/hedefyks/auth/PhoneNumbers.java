package com.hedefyks.auth;

import com.hedefyks.common.ApiException;
import java.util.Map;
import org.springframework.http.HttpStatus;

/** Cep telefonunu saklama için E.164 biçimine çevirir; numara sahipliğini doğrulamaz. */
final class PhoneNumbers {

    private PhoneNumbers() {}

    static String normalize(String input) {
        if (input == null) {
            throw invalid();
        }
        String phone = input.trim().replaceAll("[\\s().-]", "");
        if (phone.startsWith("00")) {
            phone = "+" + phone.substring(2);
        } else if (phone.matches("05[0-9]{9}")) {
            phone = "+90" + phone.substring(1);
        } else if (phone.matches("5[0-9]{9}")) {
            phone = "+90" + phone;
        }
        if (!phone.matches("\\+[1-9][0-9]{7,14}")) {
            throw invalid();
        }
        if (phone.startsWith("+90") && !phone.matches("\\+905[0-9]{9}")) {
            throw invalid();
        }
        return phone;
    }

    private static ApiException invalid() {
        return new ApiException(HttpStatus.BAD_REQUEST, "Cep telefonu numarasını kontrol et.",
                Map.of("phone", "Türkiye için 05xx xxx xx xx, diğer ülkeler için +ülke koduyla gir."));
    }
}
