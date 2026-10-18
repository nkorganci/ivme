package com.hedefyks.importer;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Uses the publication validator once per batch, before any import mutation. */
@Service
public class ResourceIntake {
    private final ObjectMapper json;
    private final JdbcTemplate jdbc;
    public ResourceIntake(ObjectMapper json,JdbcTemplate jdbc){this.json=json;this.jdbc=jdbc;}
    public Map<String,Map<String,Object>> validate(List<Map<String,Object>> metadata) {
        if(metadata.isEmpty())return Map.of();
        Process process=null;
        Path output=null;
        try {
            Path cwd=Path.of("").toAbsolutePath();
            Path root=Files.isRegularFile(cwd.resolve("scripts/resource-intake.mjs"))?cwd:cwd.getParent();
            if(root==null || !Files.isRegularFile(root.resolve("scripts/resource-intake.mjs")))throw new IllegalStateException("Intake validator missing");
            // Arguments are fixed; imported text goes through JSON stdin, never a shell.
            output=Files.createTempFile("ivme-intake-",".json");
            process=new ProcessBuilder("node",root.resolve("scripts/resource-intake.mjs").toString())
                .directory(root.toFile()).redirectOutput(output.toFile()).redirectError(ProcessBuilder.Redirect.DISCARD).start();
            try(var stream=process.getOutputStream()){json.writeValue(stream,metadata);}
            if(!process.waitFor(30,TimeUnit.SECONDS) || process.exitValue()!=0)throw new IllegalStateException("Intake validation failed");
            var result=json.readTree(output.toFile());
            if(result.path("resources").size()!=metadata.size())throw new IllegalStateException("Incomplete intake");
            var resources=new LinkedHashMap<String,Map<String,Object>>();
            for(var item:result.path("resources"))resources.put(item.path("questionCode").asText(),json.convertValue(item,new TypeReference<>(){}));
            return resources;
        } catch(Exception failure){throw new IllegalStateException("Ortak etiket doğrulayıcısı çalıştırılamadı. Node.js ve uygulama scripts dizinini kontrol edin.",failure);}
        finally {
            if(process!=null && process.isAlive())process.destroyForcibly();
            if(output!=null)try{Files.deleteIfExists(output);}catch(Exception ignored){}
        }
    }
    public void stage(String code,Map<String,Object> resource) {
        try {
            jdbc.update("""
                INSERT INTO learning_catalog.question_intake(question_code,source_stamp,resource,status)
                SELECT code,extract(epoch from updated_at)::text,?::jsonb,'PENDING' FROM questions WHERE code=?
                ON CONFLICT(question_code) DO UPDATE SET source_stamp=excluded.source_stamp,
                  resource=excluded.resource,status='PENDING',updated_at=now()
                """,json.writeValueAsString(resource),code);
        }catch(Exception failure){throw new IllegalStateException("Etiket kabul kaydı yazılamadı; soru aktarımı geri alındı.",failure);}
    }
}
