package com.hedefyks.admin;

import com.hedefyks.common.ApiException;
import com.hedefyks.common.PageResponse;
import com.hedefyks.user.User;
import com.hedefyks.user.UserRepository;
import java.time.Instant;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Read-only student directory; the separate SITE_MANAGER permission is required. */
@RestController
@RequestMapping("/api/admin/students")
public class StudentDirectoryController {
    public record Student(Long id, String username, String email, boolean enabled,
                          Instant archivedAt, Instant createdAt) {
        static Student of(User user) {
            return new Student(user.getId(), user.getUsername(), user.getEmail(), user.isEnabled(),
                    user.getArchivedAt(), user.getCreatedAt());
        }
    }

    private final UserRepository users;

    public StudentDirectoryController(UserRepository users) {
        this.users = users;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public PageResponse<Student> students(@RequestParam(defaultValue = "") String query,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "25") int size) {
        String search = query.trim();
        if (search.length() > 100) throw ApiException.badRequest("Arama en fazla 100 karakter olabilir.");
        return PageResponse.of(users.findStudents(search, PageResponse.pageable(page, size)), Student::of);
    }
}
