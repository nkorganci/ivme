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
        links = [c['url'] for c in page.get('children', []) if '/subject-details/' in c['url']]
        for index, link in enumerate(links):
            order.setdefault(link, index)
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
                       'courseSuggestsBothExams': '(TYT/AYT)' in path[1],
                       'assets': deepcopy(page.get('assets', []))})
    return sorted(result, key=lambda n: (n['exam'], n['course'], n['unit'], n['orderInUnit'] if n['orderInUnit'] is not None else 9999, n['title']))


def crosswalk(pages, previous):
    if len({c['id'] for c in previous}) != len(previous):
        raise ValueError('Previous category identity is not unique')
    nodes = provider_nodes(pages)
    canonical = [c for c in previous if c.get('canonicalUnit') and c.get('selectable') is not False and c.get('exam') in ('TYT', 'AYT')]
    reused = defaultdict(list)
    results, issues = [], []
    for node in nodes:
        subjects = subject_options(node['course'], node['unit'], canonical)
        candidates = [c for c in canonical if c.get('exam') == node['exam'] and c.get('subjectId') in subjects and normalise(node['title']) in terms(c)]
        if len(candidates) > 1:
            narrowed = [c for c in candidates if normalise(c.get('unit')) == normalise(node['unit'])]
            if narrowed:
                candidates = narrowed
        record = {**node, 'subjectCandidates': subjects, 'teacherApproved': False}
        if len(candidates) == 1:
            old = candidates[0]
            record.update(legacyCategoryId=old['id'], proposedCategoryId=old['id'], action='REUSE_EXACT_NAME_CANDIDATE', subjectId=old['subjectId'])
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
