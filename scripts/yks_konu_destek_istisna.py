"""Challenge actual false-positive model support; never approve by model agreement."""
from pathlib import Path
import pymupdf

from yks_birlestirme import Store,read_json,write_json,digest
from yks_soru_pilotu import APP
from yks_konu_girdileri import load_bound_cards

SEMANTIC='431007b80f0bc81d1c4ff888a782f9b949293d019b4af9603b8cbc4a2eb96005'
DECISIONS={
 'mebi-4487d9cd94c1-q10':('ACTUAL_QUESTION_TOPIC_SCOPE_CONFLICT_OVERRIDES_BOTH_MODELS',
    'Soru el-Kanun fi’t-Tıp eserinin sahibi tarihsel âlimi soruyor. Verilen yaprak otopsi/ötanazi/organ nakli/kan bağışı gibi güncel dinî hükümleri ele alıyor. Hekim/tıp sözcükleri ortak olsa da ölçülen konu aynı değil.'),
 'mebi-ce999c53fd1e-q6':('DIRECT_TOPIC_SOURCE_SUPPORT_INSUFFICIENT_DESPITE_BOTH_MODELS',
    'Soru cömertlik, karşılıksız harcama ve israf dengesi üzerinedir. Sağlanan alıntı yalnız Kur’an kavramlarını bilmenin genel önemini anlatıyor; ölçülen ahlaki kavrama doğrudan dayanak sunmuyor.'),
 'mebi-ce999c53fd1e-q5':('RELEVANT_PROPERTY_SOURCE_QUOTE_REVIEW_STILL_REQUIRED',
    'Soru mülkiyetin sınırları ve emanet sorumluluğunu ölçüyor. Seçili ekonomik hayat alıntısı çalışma/helal kazanç ve infaktan söz ediyor; mülkiyet sınırına doğrudan kaynak paragrafı ayrıca doğrulanmalı.'),
 'mebi-bebe3f7f3117-q3':('ACTUAL_SAME_PDF_OPENING_QUOTE_ADDED_TOPIC_ASSOCIATION_STILL_UNPUBLISHED',
    'Eski seçili alıntı kabir/berzah/kıyamet aşamalarındandı. Gerçek aynı yaprağın başlangıcı ahiretin ebedî yurt olduğunu ve dünya-ahiret geçişini doğrudan açıklıyor; yeni alıntı bu soru köküyle ilişkilidir.'),
}
EXTRA_QUOTE=('İslam’ın temel inanç esaslarından olan ahiret insanoğlunun ebedî yurdudur. Ölüm, dünya ile ahiret arasında bir geçiş\n'
 'kapısıdır. Ahiret hayatının kendi içinde aşamaları vardır.')


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);folder=root/'full-question-topics/din'
    semantic_path=folder/'semantic-topic-review.json';semantic=read_json(semantic_path)
    if digest(semantic_path)!=SEMANTIC or semantic['status']!='COMPLETE':raise ValueError('Actually examined independent model result set changed')
    primary_path=folder/'content-topic-review.json';primary=read_json(primary_path)
    if semantic['inputReviewSha256']!=digest(primary_path):raise ValueError('Primary source reading changed')
    source_pairs=read_json(root/'cross-source-candidates/actual-image-pair-review.json')
    viewed={m['sourceCode']:r for r in source_pairs['results'] for m in r['members']}
    cards=load_bound_cards(read_json(folder/'topic-candidates.json'));rows={r['sourceCode']:r for r in primary['results']}
    independent={r['sourceCode']:r for r in semantic['results']};results=[]
    for code,(status,reason) in DECISIONS.items():
        row=rows[code];card=cards[code];proof=row['suggestion']['topicEvidence'];actual=viewed[code]
        if independent[code]['status']!='INDEPENDENT_TOPIC_SUPPORTED' or not actual['actualImagePairRead']:
            raise ValueError('This challenge requires both the actual question image reading and the original supported model decision')
        if digest(card['image'])!=row['sourceImageSha256'] or digest(proof['sourcePath'])!=proof['sourceSha256']:
            raise ValueError('Actually read question/topic source bytes changed')
        with pymupdf.open(proof['sourcePath']) as doc:
            if proof['quote'] not in doc[proof['page']-1].get_text(sort=True):raise ValueError('Original proposed PDF quote changed')
            extra=({'sourcePath':proof['sourcePath'],'sourceSha256':proof['sourceSha256'],'page':1,'quote':EXTRA_QUOTE}
                if code=='mebi-bebe3f7f3117-q3' else None)
            if extra and extra['quote'] not in doc[0].get_text(sort=True):raise ValueError('Actually read additional PDF quote missing')
        results.append({'sourceCode':code,'sourceSha256':card['sourceSha256'],'sourceImageSha256':row['sourceImageSha256'],
            'sourceTextSha256':card['textSha256'],'categoryId':row['suggestion']['categoryId'],'originalSemanticStatus':independent[code]['status'],
            'status':status,'actualSourceScopeReading':reason,'originalTopicEvidence':proof,'additionalActualTopicEvidence':extra,
            'viewedSourceBoardPath':actual['viewedBoardPath'],'viewedSourceBoardSha256':actual['viewedBoardSha256'],
            'categoryAssignmentsWritten':0,'newQuestionAdmissionAccepted':False,'teacherApproved':False})
    output={'status':'PASS','scope':'FOUR_EXPLICIT_ACTUAL_SOURCE_CHALLENGES_TO_MODEL_SUPPORTED_TOPIC_CANDIDATES',
        'primaryReviewSha256':digest(primary_path),'independentReviewSha256':SEMANTIC,'questions':4,
        'twoModelSupportedQuestionsStillHeld':3,'actualSamePdfQuoteSupplements':1,'results':results,
        'toolSha256':digest(Path(__file__)),'newModelCalls':0,'questionBankWrites':0,'categoryAssignmentsWritten':0,'teacherApproved':False}
    write_json(folder/'actual-topic-support-challenges.json',output)
    print({k:v for k,v in output.items() if k!='results'})


if __name__=='__main__':main()
