package com.hedefyks.admin;

import com.hedefyks.admin.AdminDtos.Stats;
import com.hedefyks.progress.ProgressService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

/** Ürün yöneticisi yalnız toplu kullanım sayılarını alır. */
@RestController
@RequestMapping("/api/admin")
public class AdminStatsController {

    private final AdminService service;

    public AdminStatsController(AdminService service) {
        this.service = service;
    }

    @GetMapping("/stats")
    public Stats stats(@RequestParam(defaultValue = "DAY") ProgressService.Period period) {
        return service.stats(period);
    }
}
