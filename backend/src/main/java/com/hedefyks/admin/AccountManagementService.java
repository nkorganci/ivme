package com.hedefyks.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import com.hedefyks.common.PageResponse;
import com.hedefyks.user.Role;
import com.hedefyks.user.User;
import com.hedefyks.user.UserRepository;
import java.time.Instant;
import java.util.EnumMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountManagementService {
    public record Account(Long id, String username, String email, Role role, boolean enabled,
                          boolean siteManager, Instant createdAt) {
        static Account of(User user) {
            return new Account(user.getId(), user.getUsername(), user.getEmail(), user.getRole(),
                    user.isEnabled(), user.isSiteManager(), user.getCreatedAt());
        }
    }
    public record Summary(long total, Map<Role, Long> counts) {}
    private final UserRepository users;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public AccountManagementService(UserRepository users, JdbcTemplate jdbc, ObjectMapper mapper) {
        this.users=users; this.jdbc=jdbc; this.mapper=mapper;
    }

    @Transactional(readOnly=true)
    public PageResponse<Account> list(Role role, String query, int page, int size) {
        String search = query == null ? "" : query.trim();
        if (search.length()>100) throw ApiException.badRequest("Arama en fazla 100 karakter olabilir.");
        return PageResponse.of(users.findAccounts(role, search, PageResponse.pageable(page,size)), Account::of);
    }

    @Transactional(readOnly=true)
    public Summary summary() {
        Map<Role,Long> counts=new EnumMap<>(Role.class);
        for (Role role:Role.values()) counts.put(role,0L);
        jdbc.query("SELECT role,count(*) AS total FROM users WHERE archived_at IS NULL GROUP BY role", row -> {
            counts.put(Role.valueOf(row.getString("role")),row.getLong("total"));
        });
        return new Summary(counts.values().stream().mapToLong(Long::longValue).sum(),counts);
    }

    @Transactional
    public Account status(Long actorId, Long targetId, boolean enabled, String reason) {
        User target=editable(actorId,targetId);
        if (target.getArchivedAt()!=null) throw ApiException.notFound("Hesap silinmiş.");
        if (target.isEnabled()==enabled) return Account.of(target);
        if (!enabled) protectLastManager(target);
        target.setEnabled(enabled);
        target.setPauseReason(enabled ? null : reason.trim());
        users.saveAndFlush(target);
        audit(actorId,targetId,enabled ? "UNBLOCK" : "BLOCK",Map.of("reason",reason.trim()));
        return Account.of(target);
    }

    @Transactional
    public void delete(Long actorId, Long targetId, String confirmation, String reason) {
        User target=editable(actorId,targetId);
        if (!target.getUsername().equals(confirmation))
            throw ApiException.badRequest("Silmek için kullanıcı adını tam olarak yaz.");
        if (target.getArchivedAt()!=null) return;
        protectLastManager(target);
        target.setEnabled(false);
        target.setArchivedAt(Instant.now());
        target.setPauseReason(reason.trim());
        users.saveAndFlush(target);
        audit(actorId,targetId,"DELETE",Map.of("reason",reason.trim(),"historyPreserved",true));
    }

    private User editable(Long actorId, Long targetId) {
        // Serialize management writes so two managers cannot disable each other concurrently.
        jdbc.execute("SELECT pg_advisory_xact_lock(733114025)");
        User actor=users.lockById(actorId).orElseThrow(() -> ApiException.notFound("Yönetici hesabı bulunamadı."));
        if (!actor.isSiteManager() || !actor.isEnabled() || actor.getArchivedAt()!=null)
            throw new ApiException(HttpStatus.FORBIDDEN,"Kullanıcı yönetimi yetkin yok.");
        if (actorId.equals(targetId)) throw new ApiException(HttpStatus.CONFLICT,"Kendi yönetici hesabını kapatamaz veya silemezsin.");
        return users.lockById(targetId).orElseThrow(() -> ApiException.notFound("Kullanıcı bulunamadı."));
    }

    private void protectLastManager(User target) {
        if (target.isSiteManager() && target.isEnabled() && target.getArchivedAt()==null
                && jdbc.queryForObject("SELECT count(*) FROM users WHERE site_manager AND enabled AND archived_at IS NULL",Long.class)<=1)
            throw new ApiException(HttpStatus.CONFLICT,"Son etkin site yöneticisi kapatılamaz.");
    }

    private void audit(Long actorId,Long targetId,String action,Map<String,Object> details) {
        try {
            jdbc.update("INSERT INTO account_audit(actor_id,target_id,action,details) VALUES (?,?,?,?::jsonb)",
                    actorId,targetId,action,mapper.writeValueAsString(details));
        } catch (com.fasterxml.jackson.core.JsonProcessingException error) {
            throw new IllegalStateException("Yönetim kaydı oluşturulamadı.",error);
        }
    }
}
