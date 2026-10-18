package com.hedefyks.user;

import java.io.Serializable;
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/** Oturumda tutulan kullanıcı kimliği (Spring Security principal). */
public record AppUserDetails(Long id, String username, String email, String passwordHash, Role role, boolean enabled, boolean siteManager)
        implements UserDetails, Serializable {

    public static AppUserDetails of(User u) {
        return new AppUserDetails(u.getId(), u.getUsername(), u.getEmail(), u.getPasswordHash(), u.getRole(),
                u.isEnabled() && u.isApproved() && u.getArchivedAt() == null, u.isSiteManager());
    }

    public AppUserDetails(Long id,String username,String email,String passwordHash,Role role,boolean enabled) {
        this(id,username,email,passwordHash,role,enabled,false);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        var result = new java.util.ArrayList<GrantedAuthority>();
        result.add(new SimpleGrantedAuthority("ROLE_" + role.name()));
        if(siteManager) result.add(new SimpleGrantedAuthority("ROLE_SITE_MANAGER"));
        return result;
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
