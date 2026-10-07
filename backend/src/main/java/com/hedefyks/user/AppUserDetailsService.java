package com.hedefyks.user;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository users;

    public AppUserDetailsService(UserRepository users) {
        this.users = users;
    }

    /** "username" olarak kullanıcı adı veya e-posta gelir. */
    @Override
    public UserDetails loadUserByUsername(String login) {
        return users.findByLogin(login.trim())
                .map(AppUserDetails::of)
                .orElseThrow(() -> new UsernameNotFoundException("Kullanıcı bulunamadı"));
    }
}
