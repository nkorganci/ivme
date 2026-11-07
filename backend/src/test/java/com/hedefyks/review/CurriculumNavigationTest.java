package com.hedefyks.review;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.Test;

class CurriculumNavigationTest {
    private final ObjectMapper json=new ObjectMapper();
    private Map<String,Object> navigation() throws Exception {
        return json.readValue("""
          {"version":1,"authority":"MEBI_PROVIDER","originalPath":"D:/private/archive.pdf","courses":[
           {"id":"course","exam":"TYT","subjectId":"matematik","title":"Matematik","units":[
            {"id":"source-unit","title":"Sayı Kümeleri","topics":[
             {"categoryId":"legacy-fine","sourceExam":"TYT","title":"Tek ve Çift Sayılar","order":1,
              "contentKey":"one-content","examScopes":["TYT"],"examCategoryIds":{"TYT":["legacy-fine"]},
              "assets":[{"originalPath":"D:/private/source.pdf"}]}]}]}]}
          """,new com.fasterxml.jackson.core.type.TypeReference<>(){});
    }
    private Map<String,Object> old() {
        return Map.of("id","legacy-fine","exam","TYT","subjectId","matematik","subject","Matematik",
                "topic","Eski ad","canonicalTopicIds",List.of("old-wide"),"selectable",false);
    }
    @Test void projectionLeavesOriginalReviewDefinitionUnchangedAndDoesNotBroadenSelection() throws Exception {
        var old=old();String before=json.writeValueAsString(old);
        var selected=CurriculumNavigation.selections(navigation(),List.of(old));
        assertThat(json.writeValueAsString(old)).isEqualTo(before);
        assertThat(selected).hasSize(1);var row=selected.get(0);
        assertThat(row.get("id")).isEqualTo("legacy-fine");assertThat(row.get("topic")).isEqualTo("Tek ve Çift Sayılar");
        assertThat(row.get("unitId")).isEqualTo("source-unit");assertThat(row.get("selectable")).isEqualTo(true);
        assertThat(row).doesNotContainKey("canonicalTopicIds");
    }
    @Test void publicMetadataNeverContainsLocalSourcePaths() throws Exception {
        var result=CurriculumNavigation.publicView(navigation());
        assertThat(json.writeValueAsString(result)).doesNotContain("originalPath","D:/private","assets");
        assertThat(result.get("authority")).isEqualTo("MEBI_PROVIDER");
    }
    @Test void unknownIdentityOrWrongExamFailsInsteadOfChangingAnExistingScope() throws Exception {
        assertThatThrownBy(()->CurriculumNavigation.selections(navigation(),List.of())).isInstanceOf(IllegalStateException.class);
        var changed=new LinkedHashMap<>(old());changed.put("exam","AYT");
        assertThatThrownBy(()->CurriculumNavigation.selections(navigation(),List.of(changed))).isInstanceOf(IllegalStateException.class);
    }
    @Test void absentNavigationKeepsExistingSelectionRules() {
        var old=Map.<String,Object>of("id","old","canonicalUnit",true,"selectable",true);
        assertThat(CurriculumNavigation.selections(Map.of(),List.of(old,old()))).containsExactly(old);
        assertThat(CurriculumNavigation.publicView(Map.of())).isEmpty();
    }
    @Test void unscopedSystemAndHistoricalEntriesStayValidAlongsideNavigation() throws Exception {
        var unscoped=Map.<String,Object>of("id","system.scope","origin","SYSTEM","selectable",false);
        assertThat(CurriculumNavigation.selections(navigation(),List.of(old(),unscoped))).hasSize(1);
        assertThat(unscoped).doesNotContainKey("exam");
    }
}
