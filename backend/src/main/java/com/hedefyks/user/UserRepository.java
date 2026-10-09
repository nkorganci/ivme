package com.hedefyks.user;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {

    List<User> findByRoleIn(Collection<Role> roles);
    long countByRole(Role role);

    // Küçük/büyük harf duyarsız; veritabanındaki lower(...) tekil indekslerle uyumlu
    @Query("select u from User u where lower(u.username) = lower(:login) or lower(u.email) = lower(:login)")
    Optional<User> findByLogin(@Param("login") String login);

    @Query("select count(u) > 0 from User u where lower(u.username) = lower(:username)")
    boolean existsByUsername(@Param("username") String username);

    @Query("select count(u) > 0 from User u where lower(u.email) = lower(:email)")
    boolean existsByEmail(@Param("email") String email);
}
