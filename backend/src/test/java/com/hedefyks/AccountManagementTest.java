package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.hedefyks.user.AppUserDetails;
import com.hedefyks.user.Role;
import com.hedefyks.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class AccountManagementTest extends TestBase {
    private User manager(String name) {
        User account=user(name,Role.ADMIN); account.setSiteManager(true); return users.save(account);
    }
    private MockHttpServletRequestBuilder as(User account,MockHttpServletRequestBuilder request) {
        return request.with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(AppUserDetails.of(account)));
    }
    private MockHttpServletRequestBuilder changeStatus(User actor,User target,boolean enabled) {
        return as(actor,patch("/api/admin/accounts/"+target.getId()+"/status")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":"+enabled+",\"reason\":\"test reason\"}");
    }
    private MockHttpServletRequestBuilder erase(User actor,User target,String confirmation) {
        return as(actor,delete("/api/admin/accounts/"+target.getId())).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"confirmation\":\""+confirmation+"\",\"reason\":\"test reason\"}");
    }

    @Test void tum_roller_listelenir_bos_kategoriler_acikca_sifirdir() throws Exception {
        User manager=manager("siteManager");
        mvc.perform(as(manager,get("/api/admin/accounts/summary"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.counts.TEACHER").value(0)).andExpect(jsonPath("$.counts.PARENT").value(0));
        mvc.perform(as(manager,get("/api/admin/accounts").param("role","TEACHER")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        for(Role role:Role.values()) user("account_"+role,role);
        var response=mvc.perform(as(manager,get("/api/admin/accounts"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(6));
        for(var account:read(response).path("content")) {
            var fields=new java.util.ArrayList<String>(); account.fieldNames().forEachRemaining(fields::add);
            assertThat(fields).containsExactlyInAnyOrder("id","username","email","role","enabled","siteManager","createdAt");
        }
        mvc.perform(as(manager,get("/api/admin/accounts/summary"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.counts.ADMIN").value(2)).andExpect(jsonPath("$.counts.USER").value(1));
        mvc.perform(as(manager,get("/api/admin/accounts").param("role","USER"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test void yonetim_yetkisi_ve_csrf_tum_islemlerde_zorunludur() throws Exception {
        mvc.perform(get("/api/admin/accounts")).andExpect(status().isUnauthorized());
        User target=user("student",Role.USER);
        for(Role role:Role.values()) {
            User actor=user("ordinary_"+role,role);
            mvc.perform(as(actor,get("/api/admin/accounts"))).andExpect(status().isForbidden());
            mvc.perform(changeStatus(actor,target,false)).andExpect(status().isForbidden());
            mvc.perform(erase(actor,target,target.getUsername())).andExpect(status().isForbidden());
        }
        User manager=manager("siteManager");
        mvc.perform(as(manager,patch("/api/admin/accounts/"+target.getId()+"/status"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":false,\"reason\":\"\"}"))
                .andExpect(status().isForbidden());
        assertThat(users.findById(target.getId()).orElseThrow().isEnabled()).isTrue();
    }

    @Test void engelleme_acik_oturumu_sonlandirir_engel_kaldirma_girisi_acar() throws Exception {
        User manager=manager("siteManager"); User student=user("student",Role.USER);
        var session=login(student.getUsername(),"Sifre1234");
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk());
        mvc.perform(changeStatus(manager,student,false)).andExpect(status().isOk()).andExpect(jsonPath("$.enabled").value(false));
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"student\",\"password\":\"Sifre1234\"}")).andExpect(status().isUnauthorized());
        mvc.perform(changeStatus(manager,student,true)).andExpect(status().isOk()).andExpect(jsonPath("$.enabled").value(true));
        mvc.perform(get("/api/auth/me").session(login("student","Sifre1234"))).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM account_audit WHERE target_id=? AND action IN ('BLOCK','UNBLOCK')",Integer.class,student.getId())).isEqualTo(2);
    }

    @Test void tum_hesap_turleri_gecmis_korunarak_silinir_yanlis_onay_reddedilir() throws Exception {
        User manager=manager("siteManager");
        for(Role role:Role.values()) {
            User target=user("delete_"+role,role);
            jdbc.update("INSERT INTO account_activity_days(user_id,day,requests,logins) VALUES (?,CURRENT_DATE,4,1)",target.getId());
            mvc.perform(erase(manager,target,"wrong confirmation")).andExpect(status().isBadRequest());
            assertThat(users.findById(target.getId()).orElseThrow().getArchivedAt()).isNull();
            mvc.perform(erase(manager,target,target.getUsername())).andExpect(status().isNoContent());
            User deleted=users.findById(target.getId()).orElseThrow();
            assertThat(deleted.isEnabled()).isFalse(); assertThat(deleted.getArchivedAt()).isNotNull();
            assertThat(jdbc.queryForObject("SELECT requests FROM account_activity_days WHERE user_id=?",Integer.class,target.getId())).isEqualTo(4);
        }
        mvc.perform(as(manager,get("/api/admin/accounts"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(as(manager,get("/api/admin/students"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM account_audit WHERE action='DELETE'",Integer.class)).isEqualTo(Role.values().length);
    }

    @Test void kendi_hesabini_kapatamaz_ve_engellenen_yonetici_baska_hesaba_dokunamaz() throws Exception {
        User manager=manager("siteManager");
        mvc.perform(changeStatus(manager,manager,false)).andExpect(status().isConflict());
        mvc.perform(erase(manager,manager,manager.getUsername())).andExpect(status().isConflict());
        User second=manager("secondManager");
        mvc.perform(changeStatus(manager,second,false)).andExpect(status().isOk());
        mvc.perform(changeStatus(second,manager,false)).andExpect(status().isUnauthorized());
        assertThat(users.findById(manager.getId()).orElseThrow().isEnabled()).isTrue();
    }
}
