"""Explicit readings of the eight remaining language source/bank image pairs.

Each signature freezes complete source/bank texts, images, answers and package.
These are source-link decisions; existing bank content/labels are not replaced.
"""
import hashlib
import json

from pdf_slide_link_review import FIELDS
from pdf_source_scan import OUT, write_json

READINGS = {
    '3a-ayt-turk-dili-ve-edebiyati-06-11': {
        'canonicalCode': 'AYT_EsitAgirlik-0013',
        'reviewedPairSha256': 'cc7107acd2e2882b30e16df0ee038974764aeb3a1e2b7411725d4956044f3aa3',
        'sourceReading': 'İki tam görsel karşılaştırıldı: A seçeneğindeki yaşa-mak yalnız satır sonu bölünmesidir. İki öncül, anlamca birleştirme istemi ve beş seçeneğin bütün sözcükleri aynı; cevap A.',
        'matchType': 'TYPOGRAPHIC_VARIANT'},
    '3a-ayt-turk-dili-ve-edebiyati-12-07': {
        'canonicalCode': 'AYT_EsitAgirlik-0083',
        'reviewedPairSha256': '717a7c9429d930e5f4bf2c712252074b90395a7098f3c9a4a7661d6b8cd5ae84',
        'sourceReading': 'İki tam görselde Beyazıt Havuzu anlatısı, söylenemez istemi ve beş seçenek okundu. Bankanın C seçeneğinde Düşüncelerin sonrasındaki ek virgül, sorulan bilinç akışı tekniğini veya cevabı değiştirmiyor; kaynakta virgül olmadığı kanıtta korunur; C.',
        'matchType': 'PUNCTUATION_PRESENTATION_VARIANT'},
    '3a-ayt-turk-dili-ve-edebiyati-57-04': {
        'canonicalCode': 'AYT_EsitAgirlik-0079',
        'reviewedPairSha256': '6ed623ff129ac80402bd089f5a02bfb6e3a72f7d9c9da1b349665f1d27045d3b',
        'sourceReading': 'İki tam görselde Orhan Pamuk Ka anlatısı, postmodern roman istemi ve beş seçenek aynı. Bankanın E seçeneğinde son nokta yok; noktalama sorusu değildir, bütün sözcükler ve D cevabı korunur; D.',
        'matchType': 'PUNCTUATION_PRESENTATION_VARIANT'},
    '3a-tyt-turkce-12-03': {
        'canonicalCode': 'TYT-0035',
        'reviewedPairSha256': '9b6a7df903afa8c1276cce4fccec89c081b0b9e3a939ad4e5fdd30f14e9c1d44',
        'sourceReading': 'İki tam görselde beş numaralı yazar-gelenek cümlesi, anlamca yakınlık istemi ve bütün ikili seçenekler okundu. Bankada V. cümlenin son noktası yok; anlam ilişkisi ve B seçeneğindeki I-IV çifti aynı; B.',
        'matchType': 'PUNCTUATION_PRESENTATION_VARIANT'},
    '3a-tyt-turkce-12-05': {
        'canonicalCode': 'TYT-0036',
        'reviewedPairSha256': 'a76733efc7ab510a9b42fe62580685f8c2e38cb474b1f2853d8fe5bc73f602be',
        'sourceReading': 'İki tam görselde Davies ile toplumsal tabakalaşma öncülleri, anlamca birleştirme istemi ve beş seçenek aynı. Banka metninde inananlar,bu arasındaki boşluk eksik; virgül iki görselde de var, ayrı sözcükler ve B cevabı korunur; B.',
        'matchType': 'PUNCTUATION_PRESENTATION_VARIANT'},
    '3a-tyt-turkce-27-02': {
        'canonicalCode': 'TYT-0129',
        'reviewedPairSha256': '7917f20694baeaf633cefc571cc14cc5c6492a538a8953a77739aa082a89c225',
        'sourceReading': 'İki tam görselde öznellik açıklaması, desteklemeyen örnek istemi ve beş seçenek okundu. Bankanın E seçeneği yalnız son noktasını kaybetmiş; bütün sözcükler, olumsuz istem ve Himalaya örneği C aynı; C.',
        'matchType': 'PUNCTUATION_PRESENTATION_VARIANT'},
    '3a-tyt-turkce-42-04': {
        'canonicalCode': 'TYT-0140',
        'reviewedPairSha256': '34bf73ac632c4dfedbcb8adc4d88aeb73e66944ff50a0ed37f91397a31dc36d0',
        'sourceReading': 'İki tam görselde Foma-Rublev konuşması, ana düşünce istemi ve beş seçenek aynı. Kaynak E seçeneğindeki görebilir sözcüğü metin katmanında görebi lir olarak bölünmüş; basılı görselde sözcük aynı ve B cevabı korunur; B.',
        'matchType': 'TYPOGRAPHIC_VARIANT'},
    '3a-tyt-turkce-54-04': {
        'canonicalCode': 'TYT-0077',
        'reviewedPairSha256': 'e22227d27d2ff67686e6f592cf5892ee48cfe4fdef9941a45267dc2c6228c6aa',
        'sourceReading': 'İki tam görselde bilim karşıtlığının nedenleri açıklaması, boşluk tamamlama istemi ve bütün seçenekler aynı. Kaynak B seçeneğindeki son nokta bankada yok; sorulan anlam akışını ve B cevabını etkilemiyor; B.',
        'matchType': 'PUNCTUATION_PRESENTATION_VARIANT'},
}


def main():
    path = OUT / 'raw-verified-links.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    existing = {row['sourceCode']: row for row in data['verifiedLinks']}
    occurrences = json.loads((OUT / 'reconciliation.json').read_text(encoding='utf-8'))['occurrences']
    pairs = {o['evidence'].get('sourceCode'): o for o in occurrences
             if o['evidence']['origin'] == 'REVIEWED_RAW_SOURCE_BANK_LINK'}
    for code, reading in READINGS.items():
        occurrence = pairs[code]
        row = dict(occurrence['evidence']['comparisonEvidence'])
        signature = hashlib.sha256(json.dumps({key: row[key] for key in FIELDS}, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
        if reading['canonicalCode'] != row['canonicalCode'] or reading['reviewedPairSha256'] != signature:
            raise ValueError('Source/bank bytes changed after visual reading: ' + code)
        row.update({'status': 'VERIFIED_SOURCE_CONTENT_READING', 'comparisonMode': 'EXPLICIT_LITERAL_VARIANT',
                    'reviewMethod': 'RAW_SOURCE_CONTENT_REVIEW', 'sourceReading': reading['sourceReading'],
                    'matchType': reading['matchType']})
        row.pop('reviewSha256', None)
        row['reviewSha256'] = hashlib.sha256(json.dumps(row, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
        existing[code] = row
    data['verifiedLinks'] = list(existing.values())
    data['needsReview'] = [row for row in data['needsReview'] if row['sourceCode'] not in existing]
    write_json(path, data)
    print(json.dumps({'explicitReadings': len(READINGS), 'verifiedLinks': len(existing), 'needsReview': len(data['needsReview'])}))


if __name__ == '__main__':
    main()
