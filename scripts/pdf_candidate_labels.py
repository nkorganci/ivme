"""Propose controlled topic IDs for a source-specific, reviewed exam/subject scope.

Uses the published DB taxonomy and cached local Ollama; outputs proposals only.
The source-specific scope below is an input review, not teacher approval.
"""
from collections import defaultdict
import importlib.util
import hashlib
import json
from pathlib import Path

from kaynakli_arastirma_db import db_connection, query
from pdf_source_scan import OUT, write_json

APP = Path(__file__).resolve().parents[1]


def mini_scope(number):
    if number <= 9: return 'TYT', 'turkce'
    if number <= 15: return 'AYT', 'edebiyat'
    if number <= 20: return 'TYT', 'tarih'
    if number <= 25: return 'TYT', 'cografya'
    if number <= 30: return 'TYT', 'felsefe'
    if number <= 41: return ('TYT' if number in (31,32,33,37,40) else 'AYT'), 'matematik'
    if number <= 45: return 'TYT', 'geometri'
    if number <= 50: return ('AYT' if number == 50 else 'TYT'), 'fizik'
    if number <= 55: return ('TYT' if number in (51,52) else 'AYT'), 'kimya'
    return ('AYT' if number in (59,60) else 'TYT'), 'biyoloji'


def main():
    connection = db_connection('ivme')
    categories = json.loads(query(connection, "SELECT json_agg(definition) FROM learning_catalog.current_categories WHERE definition->>'canonicalUnit'='true' AND definition->>'exam' IN ('TYT','AYT')"))
    package = json.loads((APP / 'veri/content-labels/pdf-extraction/mini-test-04/candidates.json').read_text(encoding='utf-8'))
    if package['sourceSha256'] != 'ed96214e0e6c0fe004c4ce5344361a022cab77a49c9ff63b966a8cc1cb72c7aa':
        raise ValueError('Source-specific scope no longer matches the reviewed PDF')
    supplements = {
        43: 'Dik üçgende kenarortay, benzerlik ve uzunluk oranları; kaynak görselde AD=DB, BF=FC, AF=3AE, DE=5, AC soruluyor.',
        52: 'Polimerlerin kullanım alanlarının eşleştirilmesi: PET, PVC, kauçuk, Kevlar, polistiren.',
        53: 'CaCO3(k) + 178 kJ ⇌ CaO(k) + CO2(g) dengesini sıcaklık, saf katı miktarı, gaz miktarı ve hacim değişiminin etkilemesi.'}
    spec = importlib.util.spec_from_file_location('local_ollama', APP / 'scripts/ollama-sor.py')
    local = importlib.util.module_from_spec(spec); spec.loader.exec_module(local)
    local.ensure_server()
    grouped = defaultdict(list)
    for card in package['cards']:
        grouped[mini_scope(card['printedNumber'])].append(card)
    output_path = OUT / 'mini-test-04-label-proposals.json'
    previous = json.loads(output_path.read_text(encoding='utf-8')) if output_path.exists() else {}
    output = previous.get('labels', []) if previous.get('sourceSha256') == package['sourceSha256'] else []
    done = {r['code'] for r in output}
    for (exam, subject), cards in grouped.items():
        cards = [c for c in cards if c['code'] not in done]
        if not cards: continue
        allowed = [c for c in categories if c['exam'] == exam and c['subjectId'] == subject]
        if not allowed: raise ValueError(f'No published controlled categories: {exam}/{subject}')
        for start in range(len(cards)):
            batch = cards[start:start+1]
            propose_batch(local, exam, subject, allowed, batch, supplements, output)
            write_json(output_path, {'sourceSha256': package['sourceSha256'], 'labels': output})


def propose_batch(local, exam, subject, allowed, cards, supplements, output):
        schema = {'type': 'object', 'properties': {'labels': {'type': 'array', 'minItems':len(cards),'maxItems':len(cards),'items': {'type': 'object',
            'properties': {'code': {'type': 'string', 'enum': [c['code'] for c in cards]},
                           'categoryId': {'type': 'string', 'enum': [c['id'] for c in allowed]},
                           'reason': {'type': 'string', 'maxLength': 100}, 'confidence': {'type': 'string', 'enum': ['LOW','MEDIUM','HIGH']}},
            'required': ['code','categoryId','reason','confidence'], 'additionalProperties': False}}},
            'required': ['labels'], 'additionalProperties': False}
        prompt = ('Bir YKS eğitim içeriği sınıflandırıcısısın. Sorunun ölçtüğü beceri ve konuyu seç. '
                  'Parçada anılan kişi veya nesneye göre ders değiştirme. Her soru için yalnız izinli kategori kimliklerinden birini seç. '
                  'Öğretmen onayı verme. Soru metni bozuksa güveni düşür. Her kod tam bir kez bulunmalı.\n'
                  f'Sınav: {exam}; ders: {subject}\nKategoriler:\n' +
                  json.dumps([{'id': c['id'], 'unit': c['unit'], 'topic': c['topic']} for c in allowed], ensure_ascii=False) +
                  '\nSorular:\n' + json.dumps([{'code': c['code'], 'text': supplements.get(c['printedNumber'], c['text'])} for c in cards], ensure_ascii=False))
        payload = {'model': local.MODEL, 'prompt': prompt, 'format': schema, 'stream': False, 'think': False,
                   'options': {'temperature': 0, 'num_ctx': 8192, 'num_predict': 600}}
        key = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        cached_path = OUT / 'local-label-cache' / f'{key}.json'
        cached = cached_path.exists()
        if cached:
            result = json.loads(cached_path.read_text(encoding='utf-8'))
        else:
            raw = local.api('/api/generate', payload)['response']
            result = json.loads(raw)
            write_json(cached_path, result)
        labels = result['labels']
        if sorted(c['code'] for c in cards) != sorted(r['code'] for r in labels):
            raise ValueError('Local model omitted or repeated a source question')
        for label in labels:
            category = next(c for c in allowed if c['id'] == label['categoryId'])
            output.append({**label, 'exam': exam, 'subjectId': subject, 'subject': category['subject'],
                           'unit': category['unit'], 'topic': category['topic'], 'teacherApproved': False})
        print(f'{exam}/{subject}: {len(labels)} local label proposals ({"cache" if cached else "new"})', flush=True)


if __name__ == '__main__':
    main()
