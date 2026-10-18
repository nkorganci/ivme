package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hedefyks.user.AccountCategory;
import com.hedefyks.user.AppUserDetails;
import com.hedefyks.user.Role;
import com.hedefyks.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class StudentDirectoryTest extends TestBase {
    private MockHttpServletRequestBuilder directory(User account) {
        return get("/api/admin/students").with(
                org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors
                        .user(AppUserDetails.of(account)));
    }

    private User manager() {
        User manager = user("siteManager", Role.ADMIN);
        manager.setSiteManager(true);
        return users.save(manager);
    }

    @Test
    void yalniz_acik_site_yonetimi_yetkisi_ogrenci_listesini_gorebilir() throws Exception {
        mvc.perform(get("/api/admin/students")).andExpect(status().isUnauthorized());
        for (Role role : Role.values()) {
            mvc.perform(directory(user("account_" + role.name(), role))).andExpect(status().isForbidden());
        }
        mvc.perform(directory(manager())).andExpect(status().isOk());
    }

    @Test
    void eski_ve_yeni_ogrenciler_listelenir_diger_roller_ve_gizli_alanlar_donmez() throws Exception {
        User manager = manager();
        User legacy = user("eskiOgrenci", Role.USER);
        User student = user("yeniOgrenci", Role.USER);
        student.setCategory(AccountCategory.STUDENT);
        student.setEnabled(false);
        users.save(student);
        user("operator", Role.OPERATOR);
        user("parent", Role.PARENT);
        user("teacher", Role.TEACHER);
        var result = mvc.perform(directory(manager))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2));
        var content = read(result).path("content");
        assertThat(content.size()).isEqualTo(2);
        var ids = new java.util.ArrayList<Long>();
        for (var row : content) {
            ids.add(row.path("id").asLong());
            var fields = new java.util.ArrayList<String>();
            row.fieldNames().forEachRemaining(fields::add);
            assertThat(fields).containsExactlyInAnyOrder("id", "username", "email", "enabled", "archivedAt", "createdAt");
        }
        assertThat(ids).containsExactlyInAnyOrder(legacy.getId(), student.getId());
        assertThat(result.andReturn().getResponse().getContentAsString())
                .doesNotContain("passwordHash", "password_hash", "Sifre1234");
    }

    @Test
    void arama_sayfalama_ve_sayfa_boyutu_siniri_tutarlidir() throws Exception {
        User manager = manager();
        user("ali", Role.USER);
        user("veli", Role.USER);
        mvc.perform(directory(manager).param("query", "ALI@EXAMPLE"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].username").value("ali"));
        mvc.perform(directory(manager).param("query", "%"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        var first = read(mvc.perform(directory(manager).param("size", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalPages").value(2)));
        var second = read(mvc.perform(directory(manager).param("size", "1").param("page", "1"))
                .andExpect(status().isOk()));
        assertThat(first.path("content").get(0).path("id").asLong())
                .isNotEqualTo(second.path("content").get(0).path("id").asLong());
        mvc.perform(directory(manager).param("size", "10000").param("page", "-1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.size").value(100))
                .andExpect(jsonPath("$.page").value(0));
        mvc.perform(directory(manager).param("query", "x".repeat(101)))
                .andExpect(status().isBadRequest());
    }
}
