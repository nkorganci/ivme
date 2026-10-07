package com.hedefyks.importer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Component;

/** CSV (ayraç otomatik: , ; sekme) veya JSON (nesne dizisi) dosyasını ham satırlara çevirir. */
@Component
class QuestionFileParser {

    record RawRow(int row, Map<String, String> values, int extraColumns) {}

    record Parsed(List<String> header, List<RawRow> rows) {}

    private final ObjectMapper mapper;

    QuestionFileParser(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    Parsed parse(byte[] bytes, String filename) throws IOException {
        String text = new String(bytes, StandardCharsets.UTF_8);
        if (!text.isEmpty() && text.charAt(0) == '\uFEFF') text = text.substring(1);
        boolean json = (filename != null && filename.toLowerCase(Locale.ROOT).endsWith(".json"))
                || text.stripLeading().startsWith("[") || text.stripLeading().startsWith("{");
        return json ? parseJson(text) : parseCsv(text);
    }

    private Parsed parseCsv(String text) throws IOException {
        String firstLine = text.lines().findFirst().orElse("");
        char delimiter = ',';
        long best = firstLine.chars().filter(c -> c == ',').count();
        for (char c : new char[] {';', '\t'}) {
            long n = firstLine.chars().filter(x -> x == c).count();
            if (n > best) { best = n; delimiter = c; }
        }
        CSVFormat format = CSVFormat.DEFAULT.builder().setDelimiter(delimiter).setIgnoreEmptyLines(true).setTrim(true).get();
        List<String> header = null;
        List<RawRow> rows = new ArrayList<>();
        try (CSVParser parser = CSVParser.parse(text, format)) {
            for (CSVRecord rec : parser) {
                if (header == null) {
                    header = rec.stream().map(QuestionFileParser::normalizeKey).toList();
                    continue;
                }
                Map<String, String> values = new LinkedHashMap<>();
                for (int i = 0; i < header.size(); i++) {
                    values.put(header.get(i), i < rec.size() ? rec.get(i) : "");
                }
                rows.add(new RawRow((int) rec.getRecordNumber(), values, Math.max(0, rec.size() - header.size())));
            }
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw new IOException("CSV okunamadı: " + e.getMessage(), e);
        }
        return new Parsed(header == null ? List.of() : header, rows);
    }

    private Parsed parseJson(String text) throws IOException {
        JsonNode root = mapper.readTree(text);
        JsonNode array = root.isArray() ? root : root.path("questions");
        if (!array.isArray()) {
            throw new IOException("JSON, nesne dizisi olmalı (veya {\"questions\": [...]}).");
        }
        List<String> header = new ArrayList<>();
        List<RawRow> rows = new ArrayList<>();
        int index = 0;
        for (JsonNode item : array) {
            index++;
            if (!item.isObject()) {
                throw new IOException("JSON dizisinin " + index + ". öğesi nesne değil.");
            }
            Map<String, String> values = new LinkedHashMap<>();
            item.fields().forEachRemaining(e -> {
                String key = normalizeKey(e.getKey());
                if (!header.contains(key)) header.add(key);
                values.put(key, e.getValue().isNull() ? "" : e.getValue().asText().trim());
            });
            rows.add(new RawRow(index, values, 0));
        }
        return new Parsed(header, rows);
    }

    private static String normalizeKey(String key) {
        return key == null ? "" : key.trim().toLowerCase(Locale.ROOT);
    }
}
