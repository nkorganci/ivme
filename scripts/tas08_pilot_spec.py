"""Elle incelenmiş TAS-08 kapsamı; hash/bbox çıktıları tas08_pilot_kanit.py üretir."""
BOOK_URL = 'https://ogmmateryal.eba.gov.tr/panel/upload/pdf/3y2qa2oq1vx.pdf'
BOOK_SHA = '8ff2f001aad6f332362a0a219cee714204ac69cc2281f48e0fe3211829927bcd'
BOOK_TITLE = 'MEB Matematik 9 · Denklemler ve Eşitsizlikler (2017–23 programı)'
# Her iddia bir kaynak paragrafına; özgün genişletmeler ayrıca belirtilir.
CLAIMS = {
    'bolme': (88, ['blk-9e3cdb0be845', 'blk-a40e844acd8e', 'blk-453e0396c427', 'blk-ad706c99b3ba'], 'Bölme eşitliği ve kalan sınırı'),
    'basamak4': (90, ['blk-605953edd002', 'blk-a63c9061026b'], 'Son iki basamak ve 100 katsayısı'),
    'basamak8': (92, ['blk-858111ab8236', 'blk-bc2370d3315e', 'blk-1f2433657b94', 'blk-b319a1708b29'], 'Son üç basamak ve 1000 katsayısı'),
    'toplam3': (90, ['blk-b23018c8f720', 'blk-ed55304a07cc'], 'Rakam toplamının 3 ile kalanı'),
    'toplam9': (92, ['blk-e21d514103ea'], 'Rakam toplamının 9 ile kalanı'),
    'isaret11': (93, ['blk-e975fcc5ad86'], '11 için sağdan başlayan işaretli toplam'),
    'negatif11': (94, ['blk-45e1ffbd25cb'], 'Negatif işaretli toplamı kalan aralığına taşıma'),
    'ortak': (94, ['blk-aa24db497e02', 'blk-487ec764b93b', 'blk-df60a1c14e38'], 'Aralarında asal çarpanların ortak koşulu'),
    'saat': (106, ['blk-8b561101d323'], 'Saat döngüsünde 24 ile kalan'),
    'baslangic': (106, ['blk-f147f8afdb06'], 'İlk olayın sayıldığı periyotta bir eksik aralık'),
    'dongu': (107, ['blk-307c9673871e'], 'Tekrarlanan dizide kalan ile konum'),
}
SECTIONS = {
    's1': (['bolme'], 'Doğal sayılarda eş gruplar ve artan; bölen pozitiftir.'),
    's1b': (['bolme'], 'Basamak açılımını bölme eşitliğine yerleştirme. AYT örneği ortak temelin uygulamasıdır.'),
    's2': (['basamak4', 'basamak8'], '2, 5, 10 ve 25 kuralları aynı basamak açılımından özgün olarak türetilir.'),
    's2b': (['toplam3', 'toplam9'], 'Rakam sınırları ve bütün koşulların kesişimi birlikte denetlenir.'),
    's3': (['isaret11', 'negatif11'], 'Tam bölünme ile işaretli kalan hesabı birbirinden ayrılır.'),
    's3b': (['ortak', 'toplam9', 'basamak4'], '12 için 3 ve 4; ortak bölen varsa çarpım kuralı uygulanmaz.'),
    's4': (['bolme', 'saat'], 'Özgün türetim: A=dq+r, B=dp+s açılımlarıyla toplam, fark ve çarpım.'),
    's4b': (['bolme', 'ortak', 'baslangic', 'dongu'], 'Özgün türetim: kalanları ardışık çarparak kuvvet döngüsü; bölmenin karşı örneği.'),
}
QUESTIONS = {
    'AYT_Sayisal-0014': {'sectionId': 's1b', 'role': 'guided', 'claims': ['bolme'], 'imageSha256': '4223c87a90dd86fc2f9e4a855d5684f6c90bb38f955cf0e821cb56d39e951209'},
    'TYT-0593': {'sectionId': 's3b', 'role': 'guided', 'claims': ['toplam9', 'basamak4', 'ortak'], 'imageSha256': '9e127ed9096c20e7c64d884dd2173d607bbce3d090cc7459ad346b1417482593'},
    'TYT-0592': {'sectionId': 's1b', 'role': 'independent', 'claims': ['bolme'], 'imageSha256': 'eda917ba5b399561b31015f06f187092de4405e7801dec186677a816b012d323'},
    'TYT-0597': {'sectionId': 's2b', 'role': 'independent', 'claims': ['bolme', 'toplam3'], 'imageSha256': 'bc5f909dfc09bd63643071cc057dbd8ba66cfa57b21a2c47ea4dd787ad40fe10'},
}
