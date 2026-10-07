package com.hedefyks.question;

import com.hedefyks.common.ApiException;

/** Şık (A–E) doğrulama yardımcısı. */
public final class Answers {

    private static final String LETTERS = "ABCDE";

    private Answers() {}

    public static boolean isValid(String answer, int choiceCount) {
        if (answer == null || answer.length() != 1) return false;
        int i = LETTERS.indexOf(answer.charAt(0));
        return i >= 0 && i < choiceCount;
    }

    /** Büyük harfe çevirir; geçersizse 400 fırlatır. Boş değer null döner. */
    public static String normalize(String answer, int choiceCount) {
        if (answer == null || answer.isBlank()) return null;
        String a = answer.trim().toUpperCase();
        if (!isValid(a, choiceCount)) {
            throw ApiException.badRequest("Geçersiz şık: " + answer);
        }
        return a;
    }
}
