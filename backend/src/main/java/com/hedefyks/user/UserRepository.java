package com.hedefyks.user;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {

    List<User> findByRoleIn(Collection<Role> roles);
    long countByRole(Role role);

    /** Legacy students may have no category; their USER role remains authoritative. */
    @Query("""
            select u from User u where u.role = com.hedefyks.user.Role.USER
              and (:query = '' or locate(lower(:query), lower(u.username)) > 0
                   or locate(lower(:query), lower(u.email)) > 0)
            order by u.createdAt desc, u.id desc
            """)
    org.springframework.data.domain.Page<User> findStudents(@Param("query") String query,
            org.springframework.data.domain.Pageable pageable);

    /** Aynı öğrencinin eşzamanlı deneme isteklerinde tur ve iki yanıt sınırını korur. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> lockById(@Param("id") Long id);

    // Küçük/büyük harf duyarsız; veritabanındaki lower(...) tekil indekslerle uyumlu
    @Query("select u from User u where lower(u.username) = lower(:login) or lower(u.email) = lower(:login)")
    Optional<User> findByLogin(@Param("login") String login);

    @Query("select count(u) > 0 from User u where lower(u.username) = lower(:username)")
    boolean existsByUsername(@Param("username") String username);

    @Query("select count(u) > 0 from User u where lower(u.email) = lower(:email)")
    boolean existsByEmail(@Param("email") String email);
}
