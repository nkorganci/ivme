package com.hedefyks.admin;

import com.hedefyks.admin.AdminDtos.Stats;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Ürün yöneticisi yalnız toplu kullanım sayılarını alır. */
@RestController
@RequestMapping("/api/admin")
public class AdminStatsController {

    private final AdminService service;

    public AdminStatsController(AdminService service) {
        this.service = service;
    }

    @GetMapping("/stats")
    public Stats stats() {
        return service.stats();
    }
}
