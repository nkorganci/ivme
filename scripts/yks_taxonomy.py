"""Pure MEBI hierarchy/crosswalk proposals; no DB, files, models or publication."""
from collections import defaultdict
from copy import deepcopy
import hashlib
import re
import unicodedata

SUBJECTS = {'biyoloji': ['biyoloji'], 'cografya': ['cografya'], 'fizik': ['fizik'],
            'kimya': ['kimya'], 'matematik': ['matematik', 'geometri'], 'tarih': ['tarih'],
            'turkce': ['turkce'], 'turk dili ve edebiyati': ['edebiyat'],
            'din kulturu ve ahlak bilgisi': ['din'], 'felsefe': ['felsefe'],
            'mantik': ['mantik'], 'psikoloji': ['psikoloji'], 'sosyoloji': ['sosyoloji']}

# Reviewed provider UNIT names, not an arbitrary title classifier. Unknown future
# units still require review. Trigonometric functions in AYT remain mathematics;
# the TYT right-triangle unit belongs to geometry.
GEOMETRY_UNITS = '''Analitik Düzlemde Temel Dönüşümler|Dairenin Çevresi ve Alanı|Doğrunun Analitik İncelenmesi|Katı Cisimler|Çemberde Açılar|Çemberde Teğet|Çemberin Analitik İncelenmesi|Çemberin Temel Elemanları|Dik Üçgen ve Trigonometri|Dörtgenler ve Özellikleri|Çokgenler|Özel Dörtgenler|Üçgenin Alanı|Üçgenin Yardımcı Elemanları|Üçgenlerde Eşlik ve Benzerlik|Üçgenlerde Temel Kavramlar'''.split('|')
MATHEMATICS_UNITS = '''Anlık Değişim Oranı ve Türev|Belirli İntegral ve Uygulamaları|Belirsiz İntegral|Deneysel ve Teorik Olasılık|Fonksiyon Dönüşümleri|Fonksiyonlar ile İlgili Uygulamalar|Gerçek Sayı Dizileri|Koşullu Olasılık|Limit ve Süreklilik|Logaritma Fonksiyonu|Toplam-Fark ve İki Kat Açı Formülleri|Trigonometrik Denklemler|Trigonometrik Fonksiyonlar|Türevin Uygulamaları|Yönlü Açılar|Üstel Fonksiyon|Üstel, Logaritmik Denklemler ve Eşitsizlikler|İkinci Dereceden Bir Bilinmeyenli Eşitsizlik Sistemleri|İkinci Dereceden Bir Bilinmeyenli Eşitsizlikler|İkinci Dereceden Fonksiyon ve Grafikleri|İkinci Dereceden İki Bilinmeyenli Denklem Sistemleri|Basit Olayların Olasılıkları|Birinci Dereceden Denklemler ve Eşitsizlikler|Bölünebilme Kuralları|Denklemler ve Eşitsizlikler ile İlgili Uygulamalar|Fonksiyon Kavramı ve Gösterimi|Kümelerde Temel Kavramlar|Kümelerde İşlemler|Merkezi Eğilim ve Yayılım Ölçüleri|Polinom Kavramı ve Polinomlarda İşlemler|Polinomların Çarpanlara Ayrılması|Sayı Kümeleri|Sıralama ve Seçme|Verilerin Grafikle Gösterilmesi|Önermeler ve Bileşik Önermeler|Üslü İfadeler ve Denklemler|İki Fonksiyonun Bileşkesi ve Bir Fonksiyonun Tersi|İkinci Dereceden Bir Bilinmeyenli Denklemler'''.split('|')


def normalise(value):
    value = str(value or '').lower().replace('ı', 'i')
    value = ''.join(c for c in unicodedata.normalize('NFKD', value) if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', ' ', value).strip()


def terms(category):
    return {normalise(t) for t in [category.get('topic'), category.get('subtopic'), *category.get('aliases', [])] if t}


def subject_options(course, unit, previous):
    title = re.sub(r'\s*\((?:TYT|AYT|TYT/AYT)\)\s*$', '', course).strip()
    choices = SUBJECTS.get(normalise(title), [])
    if len(choices) > 1:
        if normalise(unit) in {normalise(u) for u in GEOMETRY_UNITS}:
            return ['geometri']
        if normalise(unit) in {normalise(u) for u in MATHEMATICS_UNITS}:
            return ['matematik']
        exact = {c['subjectId'] for c in previous if c.get('subjectId') in choices and
                 normalise(unit) in terms(c) | {normalise(c.get('unit'))}}
        if len(exact) == 1:
            return sorted(exact)
    return choices


def provider_nodes(pages):
    result = []
    seen = set()
    by_url = {p['url']: p for p in pages}
    order = {}
    for page in pages:
        links = [c['url'] for c in page.get('children', []) if c.get('url')]
        for index, link in enumerate(links):
            order.setdefault(link, index)
    unit_order={tuple(p['path']):order.get(p['url']) for p in pages if len(p.get('path',[]))==3}
    course_order={tuple(p['path']):order.get(p['url']) for p in pages if len(p.get('path',[]))==2}
    unit_ids={tuple(p['path']):p['url'].rsplit('/',1)[-1] for p in pages if len(p.get('path',[]))==3}
    course_ids={tuple(p['path']):p['url'].rsplit('/',1)[-1] for p in pages if len(p.get('path',[]))==2}
    for page in pages:
        if '/student/section/subject-details/' not in page['url']:
            continue
        path = page['path']
        if len(path) != 4 or path[0] not in ('TYT', 'AYT'):
            raise ValueError('Unexpected MEBI topic hierarchy')
        node_id = page['url'].rsplit('/', 1)[1]
        if node_id in seen:
            raise ValueError('Duplicate provider node ID')
        seen.add(node_id)
        result.append({'providerNodeId': node_id, 'exam': path[0], 'course': path[1], 'unit': path[2],
                       'title': page.get('title') or path[3], 'sourceUrl': page['url'],
                       'sourcePath': path, 'orderInUnit': order.get(page['url']),
                       'orderOfUnit':unit_order.get(tuple(path[:3])),
                       'orderOfCourse':course_order.get(tuple(path[:2])),
                       'providerUnitId':unit_ids.get(tuple(path[:3])),
                       'providerCourseId':course_ids.get(tuple(path[:2])),
                       'courseSuggestsBothExams': '(TYT/AYT)' in path[1],
                       'assets': deepcopy(page.get('assets', []))})
    return sorted(result, key=lambda n: (n['exam'], n['orderOfCourse'] if n['orderOfCourse'] is not None else 9999,
        n['course'],n['orderOfUnit'] if n['orderOfUnit'] is not None else 9999,n['unit'],
        n['orderInUnit'] if n['orderInUnit'] is not None else 9999,n['title']))


def crosswalk(pages, previous):
    if len({c['id'] for c in previous}) != len(previous):
        raise ValueError('Previous category identity is not unique')
    nodes = provider_nodes(pages)
    canonical = [c for c in previous if c.get('canonicalUnit') and c.get('selectable') is not False and c.get('exam') in ('TYT', 'AYT')]
    legacy_curriculum = [c for c in previous if c.get('origin') == 'CURRICULUM'
                         and c.get('exam') in ('TYT', 'AYT') and not c.get('subtopic')
                         and c not in canonical]
    reused = defaultdict(list)
    results, issues = [], []
    for node in nodes:
        subjects = subject_options(node['course'], node['unit'], canonical)
        candidates = [c for c in canonical if c.get('exam') == node['exam'] and c.get('subjectId') in subjects and normalise(node['title']) in terms(c)]
        legacy_fallback = False
        if not candidates:
            # An old, hidden curriculum identity can still own lessons/reviews.
            # Source/PDF heading identities are not interchangeable with topics.
            candidates = [c for c in legacy_curriculum if c.get('exam') == node['exam']
                          and c.get('subjectId') in subjects and normalise(node['title']) in terms(c)]
            legacy_fallback = bool(candidates)
        if len(candidates) > 1:
            narrowed = [c for c in candidates if normalise(c.get('unit')) == normalise(node['unit'])]
            if narrowed:
                candidates = narrowed
        record = {**node, 'subjectCandidates': subjects, 'teacherApproved': False}
        if len(candidates) == 1:
            old = candidates[0]
            record.update(legacyCategoryId=old['id'], proposedCategoryId=old['id'],
                          action='REUSE_LEGACY_CURRICULUM_NAME_CANDIDATE' if legacy_fallback else 'REUSE_EXACT_NAME_CANDIDATE',
                          subjectId=old['subjectId'], existingDefinitionPreserved=True,
                          existingSelectable=old.get('selectable') is not False)
            reused[old['id']].append(node['providerNodeId'])
            # Only an explicit existing counterpart row supports shared scope.
            counterpart = [c for c in canonical if c.get('exam') != old['exam'] and
                           c.get('subjectId') == old['subjectId'] and old.get('excelRowId') and
                           c.get('excelRowId') == old['excelRowId'] and normalise(node['title']) in terms(c)]
            if counterpart:
                record['sharedContentKey'] = 'excel-row:' + old['excelRowId']
                record['existingCounterpartIds'] = [c['id'] for c in counterpart]
        elif len(candidates) > 1:
            record.update(action='REVIEW_AMBIGUOUS', legacyCandidates=[c['id'] for c in candidates])
            issues.append({'node': node['providerNodeId'], 'reason': 'Multiple exact legacy candidates'})
        else:
            scope = subjects[0] if len(subjects) == 1 else None
            record.update(action='NEW_PROVIDER_TOPIC_CANDIDATE', subjectId=scope,
                          proposedCategoryId=('mebi.' + node['exam'].lower() + '.' + scope + '.' + node['providerNodeId']) if scope else None)
        if not subjects or len(subjects) > 1:
            issues.append({'node': node['providerNodeId'], 'reason': 'Subject scope requires source review', 'choices': subjects})
        results.append(record)
    for old_id, ids in reused.items():
        if len(ids) > 1:
            issues.append({'legacyId': old_id, 'nodes': ids, 'reason': 'Multiple provider nodes require context/content comparison'})
    retained = [{'id': c['id'], 'action': 'PRESERVE_EXISTING_ID', 'currentlySelectable': c.get('canonicalUnit') and c.get('selectable') is not False,
                 'newProviderNodes': reused.get(c['id'], [])} for c in previous]
    unmatched = [c['id'] for c in canonical if c['id'] not in reused]
    return {'version': 1, 'providerNodes': results, 'legacyIdentities': retained,
            'unmatchedSelectableLegacyIds': unmatched, 'issues': issues,
            'structuralMappingComplete': not issues and not unmatched,
            'readyForPublication': False, 'reviewEvidenceRequired': True,
            'published': False, 'questionsRelabeled': 0, 'studentProgressChanged': 0,
            'note': 'An exact name is a proposal, not semantic/teacher approval. Provider source and legacy identity remain separate.'}


def scope_candidates(category, nodes, previous):
    """Explain a legacy broad/composite scope without spreading saved mastery."""
    exam=category.get('exam');subject=category.get('subjectId')
    exams={exam}
    if category.get('excelRowId'):
        exams.update(c['exam'] for c in previous if c.get('excelRowId')==category['excelRowId']
                     and c.get('subjectId')==subject and c.get('canonicalUnit'))
    original=str(category.get('topic') or '')
    clean=re.sub(r'\([^)]*\)','',original).strip()
    fragments={normalise(t) for t in [clean,*clean.split('/'),*category.get('aliases',[])] if t.strip()}
    candidates=[]
    for node in nodes:
        if node.get('subjectId')!=subject or node['exam'] not in exams:
            continue
        title,unit=normalise(node['title']),normalise(node['unit'])
        reason=None
        if title in fragments:
            reason='EXACT_LEAF_TITLE' if node['exam']==exam else 'EXPLICIT_EXISTING_COUNTERPART_LEAF'
        elif unit in fragments:
            reason='EXACT_UNIT_TITLE_LEGACY_WIDER_THAN_LEAF'
        if reason:
            candidates.append({'providerNodeId':node['providerNodeId'],'sourceUrl':node['sourceUrl'],
                               'reason':reason,'exam':node['exam'],'unit':node['unit'],'title':node['title'],
                               'progressTransferAllowed':False})
    return candidates
