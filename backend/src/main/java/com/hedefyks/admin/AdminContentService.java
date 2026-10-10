package com.hedefyks.admin;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Etkin ve koleksiyona atanmış tekil soru kayıtlarının toplamları. */
@Service
@Transactional(readOnly = true)
public class AdminContentService {
    public record Coverage(long total, long cikmis, long ogm, long tyt, long ayt) {}

    private final JdbcTemplate jdbc;

    public AdminContentService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Coverage coverage() {
        return jdbc.queryForObject("""
                SELECT count(*) AS total,
                       count(*) FILTER (WHERE bank = 'CIKMIS') AS cikmis,
                       count(*) FILTER (WHERE bank = 'OGM') AS ogm,
                       count(*) FILTER (WHERE exam_type = 'TYT') AS tyt,
                       count(*) FILTER (WHERE exam_type = 'AYT') AS ayt
                FROM questions WHERE active AND bank IN ('CIKMIS', 'OGM')
                """, (rs, n) -> new Coverage(rs.getLong("total"), rs.getLong("cikmis"),
                        rs.getLong("ogm"), rs.getLong("tyt"), rs.getLong("ayt")));
    }
}
