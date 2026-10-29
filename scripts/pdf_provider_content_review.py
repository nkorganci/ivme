"""Explicit complete PDF/bank readings for provider questions with no usable text.

Provider ID, printed number and answer agreement are necessary but cannot prove
the rendered body is complete. Frozen pair readings distinguish identical image
content from damaged PDF text without changing bank answers or teacher reviews.
"""
import argparse
from collections import defaultdict
import hashlib
import json

import pymupdf

from pdf_source_scan import APP, OUT, ROOT, digest, read_scan, write_json
from pdf_source_reconcile import db_connection, json_query

PAIR_FIELDS=['sourceSha256','sourceRelativePath','pdfPage','printedNumber','sourceCode','canonicalCode',
             'bankStamp','bankAnswer','printedAnswer','apiAnswer','bbox','nativePageTextSha256',
             'sourceRenderSha256','bankImageSha256','bankImage']
READINGS={
 'sb-2044':('19a78a768be1d75491436d4c459182766c763cd5b8c919ad8106f232f8f1aac7','3945e0987071768c89190be26439b9fddb572acc827b2f53eafef3aac7c3ff83','VERIFIED',
   'Hız oranı 3/2, eşit kinetik enerji, De Broglie dalga boyu istemi ve beş kesir seçeneği iki tam görselde aynı; B.'),
 'sb-7113':('1a28e171c877637e334dcf60551a346bab868e2f462add6aeda14efd461f5909','da8764b942e204889376f75af11caab47aa18c56f5f52d1a1a8095675be84e25','VERIFIED',
   'Kömürün yanmasında oluşmaz istemi, altı çizili olumsuzluk ve SO2, CO2, CO, NH3, NO2 seçenekleri aynı; D.'),
 'sb-89212':('63238a96ae031fe5ba6c71e07e4e6298f1928b305377fab3701277ef2188cc62','86cb3c3c3548158b5c94e01eba60e84ea3b0a8931c4e6415d29b1a7c7fc98e81','VERIFIED',
   'İnsanın litosfere etkisi sorusunun tam kökü ve beş seçeneği aynı; eğimli tarım arazilerinde erozyon D.'),
 'sb-90085':('a264c27044a699641dce3681764dc2bd60e2b3b05a0aac0b484fa8a227326d4d','8ef50cce6f00933a19fa559005b79e44430dcfe36b751263d80e9940b1677763','VERIFIED',
   'Hacı Bektaş-ı Veli alıntısı, Bektaşilik için en kapsamlı yargı istemi ve beş seçenek aynı; B.'),
 'sb-90107':('a434b3bde30a55ad5d9c7f172c3c9ec3ca9942f303e768c441ec96ebd54bb962','59abc992ba1906dffd667882510db3830e34559fbc9eb70fcce4d15b9dca1ca4','VERIFIED',
   'Basir, Semi ve Kerim isimleriyle davranış ilişkisi açıklaması, istem ve beş seçenek aynı; A.'),
 'sb-84776':('b36a34fa833c8274f4c4364a14e256058b93b1fe0d13767583c6fa626d1ab3e7','24ce1bab118f3a8c7f6f9e736aa8a1c089ab42a22816f5d6d81e20f56a8eab3e','VERIFIED',
   'Öyle bir yerdeyim ki şiirinin bütün dizeleri ve yoktur istemi iki görselde aynı; birleşik fiil, basit fiil, türemiş fiil, basit isim, basit sıfat seçenekleri aynı; A.'),
 'sb-87704':('e6583abc1ff20e6a06e071ec412b73dbdf544755b1f679cf43138f81708dede9','45d4f877085a08b78be6c252577ffd3d64570aa7fa7da2b86d78ec00b81ffad9','VERIFIED',
   'Küreselleşme cümlesi, fiilimsi/bağlı cümle/isim cümlesi yargıları, söylenemez istemi ve beş kombinasyon aynı; E.'),
 'sb-89379':('5525ab5bf87fef09c0ef2c089b6281eafdb70f63baaf052bcf965c982d86c765','13cac3324eebc0485e60cbf4971be5982af1f080d2db07c1b00a576ab214d553','VERIFIED',
   'Kimyasal çözünmede su ve sıcaklık açıklaması, en etkili bölge istemi ve beş coğrafi seçenek aynı; Endonezya D.'),
 'sb-87398':('5525ab5bf87fef09c0ef2c089b6281eafdb70f63baaf052bcf965c982d86c765','bec00404a12eae88c6112de1235c0dfc2d72999ca1c7a35510a50cb10fb69f78','VERIFIED',
   'Savan açıklaması, dünya haritasının I-V noktaları, daha yaygın istemi ve bütün ikili seçenekler aynı; I ve III B.'),
 'sb-15976':('902a0fa57d8913f479fa61744e3a46e283be478f5375100ba4f373699a441b23','228a027e2f57a9e42a7011c7ec1b0b24356443d7bc164bd50be291e2466171ca','PDF_STEM_TRUNCATED',
   'PDF tam sol kenarı ayrıca açıldı: İnsan/verilmiştir ve Bu/doku sözcüklerinin başları kaynakta kesilmiş. Bankadaki beş organ, epitel doku istemi ve seçenekler tamdır. Banka cevabı E korunur; bozuk PDF tam sayılmaz.'),
 'sb-15980':('902a0fa57d8913f479fa61744e3a46e283be478f5375100ba4f373699a441b23','4464aed4b8f05a6e1a67b16ce2df1ee54d4574a6d70cd2d67c583be4a810ebd8','PDF_STEM_TRUNCATED',
   'PDF tam sol kenarında Yoğun/kasta/bileşik sözcüklerinin ilk harfleri kaynakta kesilmiş. Bankada hızlı kasılma, ATP tükenmesi ve beş seçenek tamdır. Banka cevabı C korunur; bozuk PDF tam sayılmaz.'),
 'sb-84728':('a6ba0eecd8c6673afa9495b2780001adc0a68e793b52f8874d5de62770bc1a39','f605261a8207ce82dd9a16f75922472c84845b12a5e414358c50085ffef85349','VERIFIED',
   'Şinasi ve Tasvir-i Efkâr paragrafı, cümle türü örneği yoktur istemi, bütün noktalama ve beş cümle türü seçeneği aynı; C.'),
 'sb-86334':('a6ba0eecd8c6673afa9495b2780001adc0a68e793b52f8874d5de62770bc1a39','18e30e7ad334c341285223c6721510613a716ee062a3bf2d92610830e1da92e9','VERIFIED',
   'Yüklemine göre isim/yapısına göre girişik birleşik değildir istemi ve genetik mühendisliğiyle ilgili beş tam cümle aynı; D.'),
 'sb-20260':('ba2df8e692cf79458ccfce029fa7a5c96d24f1272a6ae10179918754fd14526f','a9cb06992e6e9a3eb31c163dc8cb57ce4bc7b74401e53bc61af55699e8f235aa','VERIFIED',
   'CH4/C2H6 formülleri, I-III öncüllerde mol ve ürün sayıları, bütün beş kombinasyon aynı; I ve II C.'),
 'sb-7061':('ba2df8e692cf79458ccfce029fa7a5c96d24f1272a6ae10179918754fd14526f','7df99f94ac69545ec63595c0b3f83ad2f68ff46b26720b9cb47320374711f264','VERIFIED',
   'Eşit molde yakılan alkollerin en fazla yakıt özelliği istemi ve CH3OH/C5H11OH/C2H5OH/C3H7OH/C4H9OH seçenekleri aynı; B.'),
 'sb-90007':('dc093d4dce9a80b882828e8659b8857022ff46bd095e499dbb55b377a016c8e5','e1dd70b070042a2161da9885c3f85c762846001a8071c2bb1526af8cea0b929c','VERIFIED',
   'Necâtî Bey hakkındaki eski dilde metin ve iki dize bütün harf/işaretleriyle okundu; edebî tür istemi ve tezkire/surname/kıyafetname/pendname/menakıbname seçenekleri aynı; A.'),
 'sb-86448':('dc093d4dce9a80b882828e8659b8857022ff46bd095e499dbb55b377a016c8e5','ce7b59bdcaa90c7662a90b1bb913745ea3ea4feccf850a46e469fcd95a7977e3','VERIFIED',
   'Başarı ve otokontrol paragrafı, yoktur istemi ve beş dil bilgisi seçeneği aynı; B.'),
 'sb-86049':('e4a25f387d2820a15f3d71827afd8e9c88bb9ca5df8d91f20cb8456205ace5f7','e07dbc3758b83ff4413720d31ecba0f4de52156de05c2374e122d9d764a38c20','VERIFIED',
   'Kuyucak köyündeki lavanta, 3 bin dekar ve yüzde 93 verileri, yoktur istemi ve beş seçenek aynı; B.'),
 'sb-87384':('e4a25f387d2820a15f3d71827afd8e9c88bb9ca5df8d91f20cb8456205ace5f7','5e92700cbb937563131c4c88f876dc2692e0585c0afaa5e5ba8594bd2cffd4ba','VERIFIED',
   'Orta oyunu paragrafının I-V cümleleri, zamir istemi, bütün sözcükler/noktalama ve beş kombinasyon aynı; I ve IV C.'),
}


def pair_signature(row):
    return hashlib.sha256(json.dumps({key:row[key] for key in PAIR_FIELDS},ensure_ascii=False,sort_keys=True).encode()).hexdigest()


def validate(row, sha, number, code, question, page, printed_answer, api_answer):
    reading=READINGS.get(code)
    if not reading or reading[0]!=sha or pair_signature(row)!=reading[1]:
        raise ValueError('Provider reading has no frozen source/bank pair')
    expected={'sourceSha256':sha,'printedNumber':number,'sourceCode':code,'canonicalCode':code,
              'bankStamp':question['source_stamp'],'bankImage':question['image'],
              'bankAnswer':question['correct_answer'],'printedAnswer':printed_answer,'apiAnswer':api_answer,
              'nativePageTextSha256':page['textSha256'],'pdfPage':page['page']}
    if any(row.get(k)!=v for k,v in expected.items()):raise ValueError('Provider reading source, answer or bank changed')
    if row['bankAnswer']!=printed_answer or printed_answer!=api_answer:raise ValueError('Provider answers conflict')
    if row.get('teacherApproved') is not False or row['status']!=reading[2] or row['sourceReading']!=reading[3]:
        raise ValueError('Provider disposition differs from the explicit reading')
    return row


def build_pair(occurrence, filename, question, document):
    sha=occurrence['sha256'];number=occurrence['numbers'][0];code=occurrence['code']
    page=read_scan(sha)['pages'][occurrence['page']-1]
    anchor=next(a for a in page['examples'] if a['number']==number and a['text'].strip()==f'Soru {number}')
    x0,y0,_,_=anchor['bbox'];mid=page['width']/2;right=x0>mid
    following=[a['bbox'][1] for a in page['examples'] if a['text'].startswith('Soru ')
               and (a['bbox'][0]>mid)==right and a['bbox'][1]>y0+3]
    bottom=min(following)-2 if following else page['height']*.94
    bbox=[mid+3 if right else 24,y0-2,page['width']-24 if right else mid-3,bottom]
    render=document[occurrence['page']-1].get_pixmap(clip=pymupdf.Rect(bbox),dpi=144,alpha=False).tobytes('png')
    row={'sourceSha256':sha,'sourceRelativePath':filename,'pdfPage':occurrence['page'],'printedNumber':number,
         'sourceCode':code,'canonicalCode':code,'bankStamp':question['source_stamp'],'bankAnswer':question['correct_answer'],
         'printedAnswer':occurrence['evidence']['printedAnswer'],'apiAnswer':occurrence['evidence']['apiAnswer'],
         'bbox':bbox,'nativePageTextSha256':page['textSha256'],'sourceRenderSha256':hashlib.sha256(render).hexdigest(),
         'bankImageSha256':digest(APP/'veri/resimler-pilot'/question['image']),'bankImage':question['image']}
    return row,render


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preview',action='store_true',help='Rebuild the exact reviewed pairs; never writes database records')
    args=parser.parse_args()
    data=json.loads((OUT/'reconciliation.json').read_text(encoding='utf-8'))
    files={f['sha256']:f['path'] for f in data['files']}
    bank={q['code']:q for q in json_query(db_connection('ivme'),
          "SELECT code,image,correct_answer,extract(epoch FROM updated_at)::text source_stamp FROM questions WHERE active AND exam_type IN ('TYT','AYT')")}
    selected=defaultdict(list)
    for o in data['occurrences']:
        reading=READINGS.get(o['code'])
        if reading and reading[0]==o['sha256'] and o['evidence']['origin']=='PROVIDER_ID_PRINTED_SEQUENCE_AND_ANSWER':selected[o['sha256']].append(o)
    results=[]
    for sha,occurrences in selected.items():
        filename=files[sha]
        if digest(ROOT/filename)!=sha:raise ValueError('Original provider PDF changed')
        with pymupdf.open(ROOT/filename) as document:
            for o in occurrences:
                row,render=build_pair(o,filename,bank[o['code']],document)
                _,signature,status,reading=READINGS[o['code']]
                row.update({'status':status,'sourceReading':reading,'teacherApproved':False})
                validate(row,sha,o['numbers'][0],o['code'],bank[o['code']],read_scan(sha)['pages'][o['page']-1],
                         o['evidence']['printedAnswer'],o['evidence']['apiAnswer'])
                if args.preview:
                    target=OUT/'provider-content-previews'/(o['code']+'-source.png');target.parent.mkdir(exist_ok=True);target.write_bytes(render)
                results.append(row)
    if len(results)!=len(READINGS):raise ValueError('Reviewed provider location missing')
    write_json(OUT/'provider-content-review.json',{'reviewMethod':'EXPLICIT_COMPLETE_PDF_BANK_READING','items':results})
    print(json.dumps({'verified':sum(r['status']=='VERIFIED' for r in results),'pdfDefects':sum(r['status']!='VERIFIED' for r in results)}))


if __name__=='__main__':main()
