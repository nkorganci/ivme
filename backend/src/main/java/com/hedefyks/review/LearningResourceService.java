package com.hedefyks.review;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hedefyks.common.ApiException;
import java.text.Normalizer;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class LearningResourceService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final LearningLabelStore store;
    private final ReviewCatalog vocabulary;
    private final ContentReviewService reviews;
    private final com.hedefyks.topicpdf.TopicPdfService pdfs;
    private final SharedQuestionLabels sharedLabels;
    private final com.hedefyks.learn.AnswerKeys answerKeys;
    public LearningResourceService(JdbcTemplate jdbc, ObjectMapper json, LearningLabelStore store,
                                   ReviewCatalog vocabulary, ContentReviewService reviews,com.hedefyks.topicpdf.TopicPdfService pdfs,SharedQuestionLabels sharedLabels,
                                   com.hedefyks.learn.AnswerKeys answerKeys) {
        this.jdbc=jdbc;this.json=json;this.store=store;this.vocabulary=vocabulary;this.reviews=reviews;
        this.pdfs=pdfs;
        this.sharedLabels=sharedLabels;
        this.answerKeys=answerKeys;
    }
    public Map<String,Object> metadata() {
        return metadata(exam->true);
    }

    /** Seçili sınavın ders ve konuları; YKS ve KPSS aynı katalogda kendi sınav kimlikleriyle ayrılır. */
    public Map<String,Object> metadata(java.util.function.Predicate<Object> examFilter) {
        var runs=jdbc.queryForList("SELECT r.run_key,r.summary::text AS summary FROM learning_catalog.runs r JOIN learning_catalog.current_run c USING(run_key)");
        var summary=runs.isEmpty()?Map.<String,Object>of():store.parse(runs.get(0).get("summary").toString());
        var types=jdbc.queryForList("SELECT 'taxonomy:'||n.id AS id,n.code,n.name,count(DISTINCT t.question_id) AS questions FROM taxonomy_nodes n LEFT JOIN learning_catalog.current_question_taxonomy t ON t.node_id=n.id WHERE n.kind='QUESTION_TYPE' AND n.active GROUP BY n.id,n.code,n.name ORDER BY n.name,n.id");
        var categories=vocabulary.categories().stream().filter(c->examFilter.test(c.get("exam"))).toList();
        var branches=new LinkedHashMap<String,Map<String,Object>>();
        for(var c:categories) if(!Boolean.FALSE.equals(c.get("selectable")) && c.get("subjectId")!=null && !"TAXONOMY".equals(c.get("origin")))
            branches.putIfAbsent(c.get("subjectId").toString(),Map.of("id",c.get("subjectId"),"name",c.get("subject")));
        var known=vocabulary.branches().stream().map(b->b.get("id")).collect(java.util.stream.Collectors.toSet());
        var ordered=new ArrayList<Map<String,Object>>(vocabulary.branches().stream().filter(b->branches.containsKey(b.get("id").toString())).toList());
        branches.values().stream().filter(b->!known.contains(b.get("id"))).forEach(ordered::add);
        return Map.of("summary",summary,"branches",ordered,"categories",categories,"labels",ReviewCatalog.LABELS,"pdfKinds",pdfs.filters().kinds(),"questionTypes",types);
    }
    /** Counts identities and the union of verified ranges; opening a source is never a completion. */
    public Map<String,Object> coverage(String exam,String subject) {
        boolean kpss=java.util.Arrays.stream(com.hedefyks.question.ExamType.values()).anyMatch(t->t.kpss()&&t.name().equals(exam)) && subject.startsWith("kpss-");
        boolean scoped=vocabulary.categories().stream().anyMatch(c->exam.equals(c.get("exam")) && subject.equals(c.get("subjectId")));
        if(!kpss && !scoped && (!Set.of("TYT","AYT").contains(exam) || !ReviewCatalog.ALIASES.containsKey(subject)))
            throw ApiException.badRequest("Kaynak kapsamı için sınav ve ders seçin.");
        String overrides;
        try{overrides=json.writeValueAsString(reviews.studentOverrides());}catch(Exception e){throw new IllegalStateException(e);}
        var groups=new LinkedHashMap<String,Coverage>();var total=new Coverage();
        jdbc.query(effectiveSql()+"""
                SELECT i.item_key,i.kind,CASE WHEN i.question_code IS NOT NULL THEN i.data->>'bank' END AS bank,coalesce(i.data->>'canonicalAssetId',i.item_key) AS asset,
                  a->>'categoryId' AS category,a->>'locatorStatus' AS location,
                  CASE WHEN i.kind IN ('PDF','VIDEO') THEN coalesce(a->'locators','[]'::jsonb) ELSE '[]'::jsonb END::text AS locators
                FROM effective i CROSS JOIN LATERAL jsonb_array_elements(i.labels->'assignments') a
                WHERE ?=ANY(i.effective_exams) AND ?=ANY(i.effective_subjects) AND i.kind<>'TOPIC'
                """,rs->{
            String key=rs.getString("item_key"),kind=rs.getString("kind"),asset=rs.getString("asset"),category=rs.getString("category");
            var group=groups.computeIfAbsent(category,ignored->new Coverage());
            group.add(key,kind,asset,category,rs.getString("bank"));total.add(key,kind,asset,category,rs.getString("bank"));
            if("VERIFIED".equals(rs.getString("location")))try{
                for(var locator:json.readTree(rs.getString("locators"))) {
                    boolean pdf="PDF".equals(kind)&&"PDF".equals(locator.path("type").asText());
                    boolean video="VIDEO".equals(kind)&&"VIDEO".equals(locator.path("type").asText());
                    if(!pdf&&!video)continue;
                    String first=pdf?"pdfPageStart":"startSeconds",last=pdf?"pdfPageEnd":"endSeconds";
                    String limit=pdf?"pageCount":"durationSeconds";
                    if(!locator.path(first).isNumber()||!locator.path(last).isNumber()||!locator.path(limit).isNumber())continue;
                    double from=locator.path(first).asDouble(),end=locator.path(last).asDouble(),bound=locator.path(limit).asDouble();
                    if(!Double.isFinite(from)||!Double.isFinite(end)||!Double.isFinite(bound)||end>bound)continue;
                    if(pdf?(from<1||end<from||from!=Math.rint(from)||end!=Math.rint(end)||bound!=Math.rint(bound)):(from<0||end<=from))continue;
                    double to=end+(pdf?1:0);
                    group.range(kind,asset,from,to);total.range(kind,asset,from,to);
                }
            }catch(java.io.IOException e){throw new IllegalStateException(e);}
        },overrides,exam,subject);
        var rows=new ArrayList<Map<String,Object>>();groups.forEach((id,count)->{var row=count.result();row.put("categoryId",id);rows.add(row);});
        return Map.of("summary",total.result(),"categories",rows);
    }
    /**
     * TAS-04 ortak sayım sözleşmesi. Soru: tamamlanmış pratik ve teslim edilmiş denemede her soru bir kez, ilk
     * yanıtlandığı karşılaşmada sayılır; deneme boşu yalnız soru hiç yanıtlanmadıkça karşılaşmadır. Toplam cevap ve
     * son sonuç ayrıca verilir. Konuyu Öğrenelim banka cevabı `question_attempts` üzerinden gelir; öğrenme olayındaki
     * kopyası yeniden sayılmaz. Açık pratikteki cevaplar "devam eden" olarak ayrıdır. Ders içi soru ve not alıştırması
     * bankadan ayrı "alıştırma"dır: yalnız sunucu puanı doğru/yanlışa girer, rehberli cevap bağımsız ölçüm sayılmaz.
     * Kart öz değerlendirmesi "tekrar"dır, doğru cevap sayılmaz. Genel toplamlar tekildir; konu alt toplamları örtüşebilir.
     */
    public Map<String,Object> progress(Long userId,String classification) {
        return progress(userId,classification,null);
    }
    public Map<String,Object> progress(Long userId,String classification,List<com.hedefyks.question.ExamType> exams) {
        String examScope=exams==null?"":exams.stream().map(e->"'"+e.name()+"'").collect(java.util.stream.Collectors.joining(","));
        String questionScope=exams==null?"":" AND q.exam_type IN ("+(examScope.isEmpty()?"NULL":examScope)+")";
        if(!Set.of("CURRENT","HISTORICAL").contains(classification))throw ApiException.badRequest("İlerleme sınıflaması geçersiz.");
        boolean historical="HISTORICAL".equals(classification);
        String overrides=overridesJson();
        var total=new ProgressCount();var categories=new LinkedHashMap<String,ProgressCount>();int[] unclassified={0};
        var counted=new HashSet<Long>();
        String sql=effectiveSql()+"""
            , events AS (
              SELECT question_id,is_correct,created_at AS occurred_at,id AS source_id,0 AS source_order,
                active_seconds,learning_label_snapshot FROM completed_practice_attempts WHERE user_id=? AND event_type='ANSWER'
              UNION ALL
              SELECT eq.question_id,eq.is_correct,e.submitted_at,eq.id,1,0,eq.learning_label_snapshot
                FROM exam_questions eq JOIN exams e ON e.id=eq.exam_id
                WHERE e.user_id=? AND e.status='SUBMITTED' AND e.submitted_at IS NOT NULL
            ), ranked AS (
              SELECT *,row_number() OVER(PARTITION BY question_id ORDER BY (is_correct IS NULL),occurred_at,source_order,source_id) AS rn,
                row_number() OVER(PARTITION BY question_id ORDER BY (is_correct IS NULL),occurred_at DESC,source_order DESC,source_id DESC) AS last_rn,
                count(*) OVER(PARTITION BY question_id) AS attempts,
                count(is_correct) OVER(PARTITION BY question_id) AS answers FROM events
            )
            SELECT f.question_id,f.is_correct,f.active_seconds,f.attempts,f.answers,l.is_correct AS last_correct,
              CASE WHEN ?='HISTORICAL' THEN f.learning_label_snapshot->'labels'->'assignments'
                ELSE i.labels->'assignments' END::text AS assignments
            FROM ranked f JOIN ranked l ON l.question_id=f.question_id AND l.last_rn=1
              JOIN questions q ON q.id=f.question_id
              LEFT JOIN effective i ON i.question_code=q.code WHERE f.rn=1
            """+questionScope;
        jdbc.query(sql,rs->{
            Boolean correct=(Boolean)rs.getObject("is_correct"),last=(Boolean)rs.getObject("last_correct");
            long repeats=rs.getLong("attempts")-1,seconds=rs.getLong("active_seconds"),answers=rs.getLong("answers");
            counted.add(rs.getLong("question_id"));
            total.add(correct,last,answers,repeats,seconds);
            var ids=topicIds(rs.getString("assignments"));if(ids.isEmpty())unclassified[0]++;
            for(String id:ids)categories.computeIfAbsent(id,key->new ProgressCount()).add(correct,last,answers,repeats,seconds);
        },overrides,userId,userId,classification);
        // Açık pratikteki cevaplar kayıtlıdır ama oturum bitmeden tamamlanmış sayıma girmez; ayrı gösterilir.
        long[] inProgress={0};var openByCategory=new HashMap<String,Long>();
        jdbc.query(effectiveSql()+"""
            SELECT DISTINCT ON (a.question_id) a.question_id,
              CASE WHEN ?='HISTORICAL' THEN a.learning_label_snapshot->'labels'->'assignments' ELSE i.labels->'assignments' END::text AS assignments
            FROM question_attempts a JOIN study_sessions s ON s.id=a.session_id AND s.user_id=a.user_id
              JOIN questions q ON q.id=a.question_id LEFT JOIN effective i ON i.question_code=q.code
            WHERE a.user_id=? AND s.status='IN_PROGRESS' AND a.event_type='ANSWER'
            """+questionScope+" ORDER BY a.question_id,a.id",rs->{
            if(counted.contains(rs.getLong("question_id")))return;
            inProgress[0]++;
            for(String id:topicIds(rs.getString("assignments")))openByCategory.merge(id,1L,Long::sum);
        },overrides,classification,userId);
        boolean lessons=exams==null || exams.stream().anyMatch(e->e==com.hedefyks.question.ExamType.TYT || e==com.hedefyks.question.ExamType.AYT);
        var exercise=lessons?exercise(userId,historical,overrides):new Breakdown<>(new ExerciseCount(),Map.<String,ExerciseCount>of());
        var review=lessons?review(userId,historical):new Breakdown<>(new ReviewCount(),Map.<String,ReviewCount>of());
        var ids=new LinkedHashSet<String>(categories.keySet());ids.addAll(openByCategory.keySet());
        ids.addAll(exercise.byCategory().keySet());ids.addAll(review.byCategory().keySet());
        var rows=new ArrayList<Map<String,Object>>();
        for(String id:ids){var row=categories.getOrDefault(id,new ProgressCount()).result();row.put("categoryId",id);
            row.put("inProgress",openByCategory.getOrDefault(id,0L));
            row.put("exercise",exercise.byCategory().getOrDefault(id,new ExerciseCount()).result());
            row.put("review",review.byCategory().getOrDefault(id,new ReviewCount()).result());rows.add(row);}
        var out=new LinkedHashMap<String,Object>();
        out.put("classification",classification);out.put("summary",total.result());out.put("inProgress",inProgress[0]);
        out.put("exercise",exercise.total().result());out.put("review",review.total().result());
        out.put("categories",rows);out.put("unclassified",unclassified[0]);
        out.put("counting","QUESTION_FIRST_ANSWERED_ENCOUNTER; blank only while never answered; topic subtotals may overlap; no historical label backfill");
        out.put("countingContract",COUNTING_CONTRACT);out.put("mediaProgressRecorded",false);
        return out;
    }
    private static final Map<String,String> COUNTING_CONTRACT=Map.of(
        "question","Tamamlanmış pratik + teslim edilmiş deneme; soru başına ilk yanıtlanan karşılaşma (total/correct/wrong/blank), toplam cevap (answers), son yanıt (lastCorrect/lastWrong)",
        "learnBank","Konuyu Öğrenelim banka cevabı question_attempts üzerinden sayılır; learning_engine_events kopyası tekrar sayılmaz",
        "inProgress","Açık pratik oturumunda cevaplanmış, henüz tamamlanmış sayıma girmemiş tekil sorular",
        "exercise","Ders içi soru ve not alıştırması; doğru/yanlış yalnız sunucu puanı; rehberli cevap bağımsız ölçüm sayılmaz",
        "review","Kart öz değerlendirmesi; tekrar etkinliğidir, doğru cevap sayılmaz");

    private String overridesJson(){
        try{return json.writeValueAsString(reviews.studentOverrides());}catch(Exception e){throw new IllegalStateException(e);}
    }
    /** Öğrenciye görünen konu bağları: ön koşul ve system.* yer tutucusu hariç. */
    private Set<String> topicIds(String assignments){
        var ids=new LinkedHashSet<String>();
        if(assignments!=null)try{for(var a:json.readTree(assignments))
            if(!"PREREQUISITE".equals(a.path("relation").asText()) && !a.path("categoryId").asText().startsWith("system."))ids.add(a.path("categoryId").asText());
        }catch(java.io.IOException e){throw new IllegalStateException(e);}
        ids.remove("");return ids;
    }
    private Set<String> snapshotIds(com.fasterxml.jackson.databind.JsonNode snapshot){
        var ids=new LinkedHashSet<String>();
        if(snapshot!=null)for(var id:snapshot)if(!id.asText().startsWith("system."))ids.add(id.asText());
        ids.remove("");return ids;
    }
    private com.fasterxml.jackson.databind.JsonNode tree(String text){
        try{return text==null?null:json.readTree(text);}catch(java.io.IOException e){throw new IllegalStateException(e);}
    }
    /** Not alıştırmasının cevap anındaki konu bağı (TAS-04 anlık kaydı); katalogda yoksa boş. */
    public List<String> studentTopicIds(String itemKey){
        var rows=jdbc.query(effectiveSql()+" SELECT (i.labels->'assignments')::text FROM effective i WHERE i.item_key=?",(rs,n)->rs.getString(1),overridesJson(),itemKey);
        return rows.isEmpty()?List.of():List.copyOf(topicIds(rows.getFirst()));
    }

    private record Breakdown<T>(T total,Map<String,T> byCategory){}
    /** Ders içi soru (öğrenme olayı) ve not alıştırması; öğe başına deneme sırasıyla birleştirilir. */
    private Breakdown<ExerciseCount> exercise(long userId,boolean historical,String overrides){
        var items=new LinkedHashMap<String,ExerciseItem>();
        jdbc.query("""
            SELECT * FROM (
              SELECT 'lesson:'||(payload->>'itemId') AS item_key,payload::text AS payload,correct,concept_id,
                NULL::text AS snapshot,NULL::boolean AS solution_seen,occurred_at AS at,id
                FROM learning_engine_events WHERE user_id=? AND kind='attempt' AND item_type='lesson_q'
              UNION ALL
              SELECT item_key,NULL,correct,NULL,category_snapshot::text,solution_seen,created_at,id
                FROM student_self_check_attempts WHERE user_id=? AND kind='SOURCE_PRACTICE'
            ) x ORDER BY at,id
            """,rs->{
            String key=rs.getString("item_key");Boolean correct=(Boolean)rs.getObject("correct");
            var item=items.computeIfAbsent(key,k->new ExerciseItem());
            String scoring,mode;com.fasterxml.jackson.databind.JsonNode snapshot;
            var payload=tree(rs.getString("payload"));
            if(payload!=null){
                // Eski kayıtta scoring/mode yok: istemci puanı doğrulanmamış sayılır, mod bağlamdan çıkarılır.
                scoring=payload.path("scoring").asText("CLIENT");
                mode=payload.hasNonNull("mode")?payload.get("mode").asText():com.hedefyks.learn.AnswerKeys.mode("lesson_q",payload);
                snapshot=payload.get("categoryIds");
                var lessonKey=answerKeys.lessonItem(payload.path("itemId").asText());
                item.current=answerKeys.conceptCategories(lessonKey!=null?lessonKey.conceptId():rs.getString("concept_id"));
            }else{
                scoring=correct==null?"CLIENT":"SERVER";
                mode=Boolean.TRUE.equals(rs.getObject("solution_seen"))?"GUIDED":"INDEPENDENT";
                snapshot=tree(rs.getString("snapshot"));
                item.note=key;
            }
            item.historical.addAll(snapshotIds(snapshot));
            item.add("SERVER".equals(scoring)?correct:null,mode);
        },userId,userId);
        var notes=items.values().stream().filter(i->i.note!=null).map(i->i.note).toList();
        var noteTopics=new HashMap<String,Set<String>>();
        if(!historical&&!notes.isEmpty())jdbc.query(effectiveSql()+" SELECT i.item_key,(i.labels->'assignments')::text FROM effective i WHERE i.item_key=ANY(?)",
            rs->{noteTopics.put(rs.getString(1),topicIds(rs.getString(2)));},overrides,notes.toArray(String[]::new));
        var total=new ExerciseCount();var byCategory=new HashMap<String,ExerciseCount>();
        for(var item:items.values()){
            total.add(item);
            Collection<String> ids=historical?item.historical:item.note!=null?noteTopics.getOrDefault(item.note,Set.of()):item.current;
            for(String id:ids)if(!id.startsWith("system."))byCategory.computeIfAbsent(id,k->new ExerciseCount()).add(item);
        }
        return new Breakdown<>(total,byCategory);
    }
    /** Kart öz değerlendirmesi: kart başına tekrar sayısı ve son değerlendirme. */
    private Breakdown<ReviewCount> review(long userId,boolean historical){
        var cards=new LinkedHashMap<String,ReviewCard>();
        jdbc.query("""
            SELECT payload->>'itemId',correct,concept_id,(payload->'categoryIds')::text FROM learning_engine_events
            WHERE user_id=? AND kind='attempt' AND item_type='flashcard' ORDER BY occurred_at,id
            """,rs->{
            var card=cards.computeIfAbsent(rs.getString(1),k->new ReviewCard());
            card.reviews++;card.known=Boolean.TRUE.equals(rs.getObject(2));
            card.current=answerKeys.conceptCategories(rs.getString(3));
            card.historical.addAll(snapshotIds(tree(rs.getString(4))));
        },userId);
        var total=new ReviewCount();var byCategory=new HashMap<String,ReviewCount>();
        for(var card:cards.values()){total.add(card);for(String id:historical?card.historical:card.current)byCategory.computeIfAbsent(id,k->new ReviewCount()).add(card);}
        return new Breakdown<>(total,byCategory);
    }
    private static final class ExerciseItem {
        long answers,guided,unverified;Boolean first,last,firstIndependent;String note;
        Collection<String> current=List.of();final Set<String> historical=new LinkedHashSet<>();
        void add(Boolean correct,String mode){answers++;if("GUIDED".equals(mode))guided++;
            if(correct==null){unverified++;return;}
            if(first==null)first=correct;last=correct;
            if(!"GUIDED".equals(mode)&&firstIndependent==null)firstIndependent=correct;}
    }
    private static final class ExerciseCount {
        long items,answers,firstCorrect,firstWrong,lastCorrect,lastWrong,independentItems,independentCorrect,guidedAnswers,unverifiedAnswers;
        void add(ExerciseItem i){items++;answers+=i.answers;guidedAnswers+=i.guided;unverifiedAnswers+=i.unverified;
            if(i.first!=null){if(i.first)firstCorrect++;else firstWrong++;}
            if(i.last!=null){if(i.last)lastCorrect++;else lastWrong++;}
            if(i.firstIndependent!=null){independentItems++;if(i.firstIndependent)independentCorrect++;}}
        Map<String,Object> result(){var r=new LinkedHashMap<String,Object>();r.put("items",items);r.put("answers",answers);
            r.put("firstCorrect",firstCorrect);r.put("firstWrong",firstWrong);r.put("lastCorrect",lastCorrect);r.put("lastWrong",lastWrong);
            r.put("independentItems",independentItems);r.put("independentCorrect",independentCorrect);
            r.put("guidedAnswers",guidedAnswers);r.put("unverifiedAnswers",unverifiedAnswers);return r;}
    }
    private static final class ReviewCard {long reviews;boolean known;Collection<String> current=List.of();final Set<String> historical=new LinkedHashSet<>();}
    private static final class ReviewCount {
        long cards,reviews,known;
        void add(ReviewCard c){cards++;reviews+=c.reviews;if(c.known)known++;}
        Map<String,Object> result(){var r=new LinkedHashMap<String,Object>();r.put("cards",cards);r.put("reviews",reviews);r.put("lastKnown",known);return r;}
    }
    private static final class ProgressCount {
        long total,correct,wrong,blank,repeats,seconds,answers,lastCorrect,lastWrong;
        void add(Boolean answer,Boolean last,long answered,long repeat,long active){total++;if(answer==null)blank++;else if(answer)correct++;else wrong++;
            if(last!=null){if(last)lastCorrect++;else lastWrong++;}answers+=answered;repeats+=repeat;seconds+=active;}
        Map<String,Object> result(){var r=new LinkedHashMap<String,Object>();r.put("total",total);r.put("correct",correct);r.put("wrong",wrong);r.put("blank",blank);
            r.put("answers",answers);r.put("lastCorrect",lastCorrect);r.put("lastWrong",lastWrong);
            r.put("repeatAttempts",repeats);r.put("firstActiveSeconds",seconds);return r;}
    }
    private static final class Coverage {
        final Map<String,Set<String>> keys=new HashMap<>();final Set<String> assets=new HashSet<>(),references=new HashSet<>();
        final Map<String,List<double[]>> pages=new HashMap<>(),seconds=new HashMap<>();
        final Map<String,Set<String>> banks=new HashMap<>();
        void add(String key,String kind,String asset,String category,String bank){keys.computeIfAbsent(kind,k->new HashSet<>()).add(key);assets.add(asset);references.add(key+"\n"+category);
            if("QUESTION".equals(kind) && bank!=null)banks.computeIfAbsent(bank,k->new HashSet<>()).add(key);}
        void range(String kind,String asset,double from,double to){("PDF".equals(kind)?pages:seconds).computeIfAbsent(asset,k->new ArrayList<>()).add(new double[]{from,to});}
        static double length(Map<String,List<double[]>> ranges){double total=0;for(var list:ranges.values()){
            list.sort(Comparator.comparingDouble(r->r[0]));double from=-1,to=-1;
            for(var r:list){if(from<0){from=r[0];to=r[1];}else if(r[0]<=to)to=Math.max(to,r[1]);else{total+=to-from;from=r[0];to=r[1];}}
            if(from>=0)total+=to-from;
        }return total;}
        Map<String,Object> result(){var result=new LinkedHashMap<String,Object>();long resources=0;
            for(String kind:List.of("QUESTION","PDF","VIDEO","NOTE")){int count=keys.getOrDefault(kind,Set.of()).size();result.put(kind,count);resources+=count;}
            result.put("resources",resources);result.put("physicalAssets",assets.size());result.put("references",references.size());
            result.put("bankCounts",Map.of("OGM",banks.getOrDefault("OGM",Set.of()).size(),"CIKMIS",banks.getOrDefault("CIKMIS",Set.of()).size()));
            result.put("verifiedPdfPages",length(pages));result.put("verifiedVideoSeconds",length(seconds));return result;
        }
    }
    private String effectiveSql() {
        return """
            WITH overrides AS (SELECT * FROM jsonb_to_recordset(?::jsonb) AS o(item_key text,labels jsonb,status text,category_ids text[],subject_ids text[],exam_ids text[])),
            effective AS (
                SELECT i.*,coalesce(o.labels,i.data->'automaticLabels') AS labels,coalesce(o.status,'PENDING') AS review_status,
                    coalesce(o.category_ids,i.category_ids) AS effective_categories,
                    ARRAY(SELECT a->>'categoryId' FROM jsonb_array_elements(coalesce(o.labels,i.data->'automaticLabels')->'assignments') a
                      WHERE o.status='APPROVE' OR a->>'scopeStatus'='CONFIRMED') AS confirmed_categories,
                    coalesce(o.subject_ids,i.subject_ids) AS effective_subjects,
                    coalesce(o.exam_ids,i.exam_ids) AS effective_exams,
                    coalesce(o.labels->>'contentFormat',i.content_format) AS effective_format,
                    coalesce(o.labels->'skills',i.skills) AS effective_skills,
                    coalesce(o.labels->'grades',i.grades) AS effective_grades
                FROM learning_catalog.current_items i
                LEFT JOIN overrides o USING(item_key)
                LEFT JOIN questions q ON i.question_code=q.code
                WHERE i.student_visible AND coalesce(o.status,'PENDING') <> 'REMOVE'
                  AND (i.question_code IS NULL OR (q.active AND i.source_stamp=extract(epoch from q.updated_at)::text))
            )
            """;
    }
    private String normalize(String value) {
        return Normalizer.normalize(value.toLowerCase(Locale.forLanguageTag("tr-TR")).replace('ı','i'),Normalizer.Form.NFD)
            .replaceAll("\\p{M}","").replaceAll("[^a-z0-9]+"," ").trim();
    }
    public Map<String,Object> list(String exam, String subject, String kind, List<String> categoryIds,
            String match, String q, String contentFormat, String skill, Integer grade,
            boolean approvedOnly, boolean availableOnly, boolean manualReviewOnly, String manualReviewType, boolean includeCandidates, boolean bankOnly, int page,String pdfKind,String questionTypeId,String teacherDifficulty) {
        return list(exam,subject,kind,categoryIds,match,q,contentFormat,skill,grade,approvedOnly,availableOnly,manualReviewOnly,manualReviewType,includeCandidates,bankOnly,page,pdfKind,questionTypeId,teacherDifficulty,"");
    }
    public Map<String,Object> list(String exam,String subject,String kind,List<String> categoryIds,String match,String q,
            String contentFormat,String skill,Integer grade,boolean approvedOnly,boolean availableOnly,boolean manualReviewOnly,
            String manualReviewType,boolean includeCandidates,boolean bankOnly,int page,String pdfKind,String questionTypeId,String teacherDifficulty,String labelStatus) {
        return listInternal(exam,subject,kind,categoryIds,match,q,contentFormat,skill,grade,approvedOnly,availableOnly,manualReviewOnly,manualReviewType,includeCandidates,bankOnly,page,List.of(),pdfKind,questionTypeId,teacherDifficulty,labelStatus);
    }
    @SuppressWarnings("unchecked")
    public Map<String,Object> item(String key) {
        if(key==null || key.length()>350)throw ApiException.badRequest("Kaynak kimliği geçersiz.");
        var result=listInternal("","","",List.of(),"ANY","","","",null,false,false,false,"",true,false,0,List.of(key),"","","","");
        var rows=(List<Map<String,Object>>)result.get("content");
        if(rows.isEmpty())throw ApiException.notFound("Kaynak bulunamadı.");return rows.getFirst();
    }
    @SuppressWarnings("unchecked")
    public Map<String,Map<String,Object>> items(List<String> keys) {
        if(keys.isEmpty())return Map.of();
        if(keys.size()>100)throw ApiException.badRequest("En fazla 100 kaynak seçilebilir.");
        var response=listInternal("","","",List.of(),"ANY","","","",null,false,false,false,"",true,false,0,keys,"","","","");
        var result=new LinkedHashMap<String,Map<String,Object>>();
        for(var row:(List<Map<String,Object>>)response.get("content"))result.put(row.get("key").toString(),row);
        return result;
    }
    private Map<String,Object> listInternal(String exam,String subject,String kind,List<String> categoryIds,String match,String q,
            String contentFormat,String skill,Integer grade,boolean approvedOnly,boolean availableOnly,boolean manualReviewOnly,
            String manualReviewType,boolean includeCandidates,boolean bankOnly,int page,List<String> itemKeys,String pdfKind,String questionTypeId,String teacherDifficulty,String labelStatus) {
        categoryIds=categoryIds.stream().filter(s->!s.isBlank()).distinct().toList();
        if(!Set.of("","TYT","AYT","TYT-AYT").contains(exam) || !Set.of("","QUESTION","PDF","NOTE","VIDEO").contains(kind)
            || (!subject.isBlank() && !ReviewCatalog.ALIASES.containsKey(subject)) || q.length()>100
            || categoryIds.size()>SharedQuestionLabels.MAX_CATEGORY_SELECTION || !Set.of("ANY","ALL").contains(match) || !Set.of("","ESTIMATED","APPROVED","UNRESOLVED").contains(labelStatus)
            || !Set.of("","EMPTY_OR_UNREADABLE","LOCATION_REVIEW","LABEL_REVIEW","TIME_REVIEW","SOURCE_REPAIR").contains(manualReviewType)
            || (!contentFormat.isBlank() && !ReviewCatalog.FORMATS.contains(contentFormat))
            || (!skill.isBlank() && !ReviewCatalog.SKILLS.contains(skill)) || (grade!=null && (grade<9 || grade>12))) throw ApiException.badRequest("Kaynak filtresi geçersiz.");
        String overrides;
        try { overrides=json.writeValueAsString(reviews.studentOverrides()); }
        catch(Exception e) { throw new IllegalStateException(e); }
        var args=new ArrayList<Object>(); args.add(overrides);
        String cte=effectiveSql();
        var where=new StringBuilder(" WHERE true");
        if(!itemKeys.isEmpty()){where.append(" AND i.item_key IN (").append(String.join(",",Collections.nCopies(itemKeys.size(),"?"))).append(")");args.addAll(itemKeys);}
        if(bankOnly)where.append(" AND i.kind='QUESTION' AND i.question_code IS NOT NULL");
        if(!questionTypeId.isBlank() || !teacherDifficulty.isBlank()) {
            var filter=new com.hedefyks.question.QuestionFilter(null,Set.of("TYT","AYT").contains(exam)?com.hedefyks.question.ExamType.valueOf(exam):null,subject,null,categoryIds,match,includeCandidates,questionTypeId,teacherDifficulty);
            where.append(" AND i.question_code IN (SELECT q.code FROM learning_catalog.question_ids_for_labels(?) selected JOIN questions q ON q.id=selected.id)");
            args.add(sharedLabels.selection(filter));
        }
        if("TYT-AYT".equals(exam))where.append(" AND i.exam='TYT-AYT'");
        else if(!exam.isBlank()) {where.append(" AND ?=ANY(i.effective_exams)");args.add(exam);}
        if(!pdfKind.isBlank()){
            var ids=pdfs.catalogIdsByKind(pdfKind);
            where.append(" AND i.kind='PDF' AND i.data->>'catalogId' IN (").append(String.join(",",Collections.nCopies(ids.size(),"?"))).append(")");
            ids.forEach(id->args.add(id.toString()));
        }
        if(!subject.isBlank()) {where.append(" AND ?=ANY(i.effective_subjects)");args.add(subject);}
        if(!kind.isBlank()) {where.append(" AND i.kind=?");args.add(kind);}
        if(!contentFormat.isBlank()) {where.append(" AND i.effective_format=?");args.add(contentFormat);}
        if(!skill.isBlank()) {where.append(" AND i.effective_skills @> ?::jsonb");args.add("[\""+skill+"\"]");}
        if(grade!=null) {where.append(" AND i.effective_grades @> ?::jsonb");args.add("["+grade+"]");}
        if(approvedOnly) where.append(" AND i.review_status='APPROVE'");
        if("APPROVED".equals(labelStatus))where.append(" AND i.review_status='APPROVE'");
        if("ESTIMATED".equals(labelStatus))where.append(" AND i.review_status<>'APPROVE' AND (i.labels->>'gradeStatus'='ESTIMATED' OR EXISTS (SELECT 1 FROM jsonb_array_elements(i.labels->'assignments') a WHERE a->>'scopeStatus'='CANDIDATE'))");
        if("UNRESOLVED".equals(labelStatus))where.append(" AND EXISTS (SELECT 1 FROM jsonb_array_elements(i.labels->'assignments') a WHERE a->>'categoryId' LIKE 'system.%')");
        if(availableOnly) where.append(" AND i.availability='available'");
        if(manualReviewOnly) where.append(" AND i.data->'manualReview'->>'status'='NEEDS_MANUAL_REVIEW'");
        if(!manualReviewType.isBlank()) {where.append(" AND i.data->'manualReview'->>'code'=?");args.add(manualReviewType);}
        if(manualReviewOnly || !manualReviewType.isBlank()) where.append("""
             AND NOT (coalesce(i.data->'manualReview'->'reasons'='["PHYSICS_TOPIC_SELECTION_REQUIRED"]'::jsonb,false)
               AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(i.labels->'assignments') a
                 WHERE a->>'categoryId' LIKE 'system.fizik.%'))
            """);
        if(!includeCandidates && (!bankOnly || !categoryIds.isEmpty())) where.append(" AND cardinality(i.confirmed_categories)>0");
        if(!q.isBlank()) {where.append(" AND i.search_text LIKE ? ESCAPE '\\'");args.add("%"+normalize(q)+"%");}
        if(!categoryIds.isEmpty()) {
            var known=new HashSet<String>();vocabulary.categories().forEach(c->known.add(c.get("id").toString()));
            if(!known.containsAll(categoryIds)) throw ApiException.badRequest("Konu etiketi artık kullanılmıyor.");
            var groups=vocabulary.categoryGroups(categoryIds);
            where.append(" AND (");
            for(int index=0;index<groups.size();index++) {
                if(index>0)where.append("ALL".equals(match)?" AND ":" OR ");
                var group=groups.get(index);
                where.append(includeCandidates?"i.effective_categories ":"i.confirmed_categories ").append("&& ARRAY[")
                    .append(String.join(",",Collections.nCopies(group.size(),"?"))).append("]::text[]");args.addAll(group);
            }
            where.append(")");
        }
        long total=jdbc.queryForObject(cte+"SELECT count(*) FROM effective i"+where,Long.class,args.toArray());
        var categoryMap=new HashMap<String,Map<String,Object>>();
        vocabulary.categories().forEach(c->categoryMap.put(c.get("id").toString(),c));
        int number=Math.max(0,page);var pageArgs=new ArrayList<>(args);pageArgs.add(itemKeys.isEmpty()?25:itemKeys.size());pageArgs.add((long)number*25);
        var rows=jdbc.query(cte+"SELECT i.data::text,i.labels::text,i.review_status FROM effective i"+where+" ORDER BY i.kind,i.item_key LIMIT ? OFFSET ?",(rs,n)->{
            var source=store.parse(rs.getString(1));var row=new LinkedHashMap<String,Object>();
            for(String field:List.of("key","kind","exam","subjectId","subject","title","topic","bank","url","availability",
                    "contractVersion","originalTitle","displayTitle","sourceLabel","sourceVersion","taxonomyVersion",
                    "canonicalAssetId","mediaType","remoteAvailability","durationSeconds")) row.put(field,source.get(field));
            var labels=store.parse(rs.getString(2));var publicLabels=new LinkedHashMap<String,Object>();
            boolean topicSelectionResolved=labels.get("assignments") instanceof List<?> assigned && assigned.stream()
                .noneMatch(a->a instanceof Map<?,?> map && Objects.toString(map.get("categoryId"),"").startsWith("system.fizik."));
            if(source.get("manualReview") instanceof Map<?,?> manual && !(topicSelectionResolved
                && List.of("PHYSICS_TOPIC_SELECTION_REQUIRED").equals(manual.get("reasons")))) {
                var safeManual=new LinkedHashMap<String,Object>();
                for(String field:List.of("status","code","label","reason"))if(manual.containsKey(field))safeManual.put(field,manual.get(field));
                var publicPages=new ArrayList<Map<String,Object>>();
                if(manual.get("pages") instanceof List<?> pages)for(Object value:pages)if(value instanceof Map<?,?> fields) {
                    var safePage=new LinkedHashMap<String,Object>();
                    for(String field:List.of("page","status","label","reason"))if(fields.containsKey(field))safePage.put(field,fields.get(field));
                    publicPages.add(safePage);
                }
                safeManual.put("pages",publicPages);row.put("manualReview",safeManual);
            }
            for(String field:List.of("assignments","difficulty","contentFormat","skills","grades","gradeStatus","gradeReason")) publicLabels.put(field,labels.get(field));
            // Machine evidence can contain internal references or answer-bearing
            // analysis. Students receive only presentation and location fields.
            if(labels.get("assignments") instanceof List<?> assignments) {
                var publicAssignments=new ArrayList<Map<String,Object>>();
                for(Object value:assignments) if(value instanceof Map<?,?> assignment) {
                    var safe=new LinkedHashMap<String,Object>();
                    for(String field:List.of("categoryId","relation","scopeStatus","confidence","confidenceReason","locatorStatus","locatorReason"))
                        if(assignment.containsKey(field)) safe.put(field,assignment.get(field));
                    if(assignment.get("locators") instanceof List<?> locators) {
                        var publicLocators=new ArrayList<Map<String,Object>>();
                        for(Object locator:locators) if(locator instanceof Map<?,?> fields) {
                            var safeLocator=new LinkedHashMap<String,Object>();
                            for(String field:List.of("type","sourceKey","pdfPageStart","pdfPageEnd","printedPageLabel","startSeconds","endSeconds","durationSeconds","questionCode","questionNumbers","sectionId","patternId"))
                                if(fields.containsKey(field)) safeLocator.put(field,fields.get(field));
                            publicLocators.add(safeLocator);
                        }
                        safe.put("locators",publicLocators);
                    }
                    publicAssignments.add(safe);
                }
                publicLabels.put("assignments",publicAssignments);
                if(source.get("contractVersion") instanceof Number version && version.intValue()==2)
                    row.put("displayTitle",ResourcePresentation.title(source,publicAssignments,categoryMap));
            }
            // Display the same effective identities used by the filters, including teacher corrections.
            var selected=new ArrayList<Map<String,Object>>();
            if(labels.get("assignments") instanceof List<?> assignments) for(Object value:assignments) {
                if(value instanceof Map<?,?> assignment) {
                    var c=categoryMap.get(assignment.get("categoryId"));
                    if(c!=null) selected.add(c);
                }
            }
            if(!selected.isEmpty()) {
                row.put("exam",String.join("-",selected.stream().map(c->c.get("exam").toString()).distinct().sorted().toList()));
                row.put("subjectId",selected.getFirst().get("subjectId"));
                row.put("subject",String.join(" · ",selected.stream().map(c->c.get("subject").toString()).distinct().toList()));
                row.put("topic",selected.getFirst().get("topic"));
                row.put("unit",String.join("; ",selected.stream().map(c->c.get("unit")).filter(java.util.Objects::nonNull).map(Object::toString).distinct().toList()));
                row.put("topics",selected.stream().map(c->c.get("topic").toString()).distinct().toList());
            }
            row.put("labels",publicLabels);row.put("reviewStatus",rs.getString(3));return row;
        },pageArgs.toArray());
        var typeRows=rows.isEmpty()?List.<Map<String,Object>>of():jdbc.queryForList("SELECT item_key,category_id AS id,code,name,taxonomy_version FROM learning_catalog.current_question_taxonomy WHERE kind='QUESTION_TYPE' AND item_key IN ("+String.join(",",Collections.nCopies(rows.size(),"?"))+") ORDER BY name,id",rows.stream().map(row->row.get("key")).toArray());
        for(var row:rows) {
            row.put("questionTypes",typeRows.stream().filter(t->row.get("key").equals(t.get("item_key"))).map(t->Map.of("id",t.get("id"),"code",t.get("code"),"name",t.get("name"),"taxonomyVersion",t.get("taxonomy_version"))).toList());
            if("APPROVE".equals(row.get("reviewStatus")))row.put("teacherDifficulty",((Map<?,?>)row.get("labels")).get("difficulty"));
        }
        return Map.of("content",rows,"page",number,"totalPages",(total+24)/25,"totalElements",total);
    }
}
