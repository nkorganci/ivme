package com.hedefyks.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SourceNotesRoutesTest {
    @ParameterizedTest
    @ValueSource(strings = {
        "/kaynakli-ders-notlari", "/kaynakli-ders-notlari/etiketler",
        "/kaynakli-ders-notlari/analiz",
        "/kaynakli-ders-notlari/tyt-turkce", "/kaynakli-ders-notlari/ayt-edebiyat",
        "/kaynakli-ders-notlari/tyt-tarih", "/kaynakli-ders-notlari/tyt-cografya",
        "/kaynakli-ders-notlari/tyt-felsefe", "/kaynakli-ders-notlari/tyt-din",
        "/kaynakli-ders-notlari/tyt-biyoloji", "/kaynakli-ders-notlari/tyt-kimya"
    })
    void directNavigationAndRefreshOpenTheReactApplication(String path) throws Exception {
        MockMvcBuilders.standaloneSetup(new SpaForwardController()).build()
                .perform(get(path)).andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
    }
}
