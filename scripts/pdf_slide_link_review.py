"""Explicit source/bank readings; a model MATCH is never the acceptance gate."""
import hashlib
import json
from pdf_source_scan import OUT,write_json

FIELDS=['sourceCode', 'canonicalCode', 'sourceSha256', 'packageSha256', 'sourceTextSha256', 'bankTextSha256', 'sourceImageSha256', 'bankImageSha256', 'sourceAnswer', 'bankAnswer']
# The pair hash freezes both complete texts, images, answers and source package.
READINGS={
  "pdf-01ea43dabcb81155-p0011-q01": {
    "canonicalCode": "3a-tyt-felsefe-74-07",
    "reviewedPairSha256": "fdbc90d58c3ee2b279308fd31259d8dda73564a3e04142365f6839265fc1c18b",
    "sourceReading": "Husserl sorusunda yalnız ad baş harfi ve satır bölünmeleri farklı; tam kök, beş seçenek ve C aynı."
  },
  "pdf-01ea43dabcb81155-p0033-q01": {
    "canonicalCode": "sb-2476",
    "reviewedPairSha256": "fcc5ffe83c1e2d846631234945a8d9a5a3bdc6a7ad00dc3766d89554d541a032",
    "sourceReading": "Sartre alıntısı ve sorulan olumsuz çıkarım aynı; alıntının tanıtımı/ifade biçimi değişmiş; beş seçenek ve B aynı."
  },
  "pdf-01ea43dabcb81155-p0038-q01": {
    "canonicalCode": "sb-29775",
    "reviewedPairSha256": "eea1f547803b697c0749bce2e0ea15ca2138f89cba9696ede797c125e6a0216a",
    "sourceReading": "Marx madde-hareket ve diyalektik kökü ile beş seçenek aynı. Şekilde sözcüğü anlatı içindedir; şekil sorusu değildir; D."
  },
  "pdf-01ea43dabcb81155-p0048-q01": {
    "canonicalCode": "sb-2473",
    "reviewedPairSha256": "3a1e37bf06aa8b63aa161b66746bc8b282da6f2ee0b6e5146e2bb2d22588dc9a",
    "sourceReading": "Popper kuğu örneğinin aynı yanlışlanabilirlik açıklaması yeniden ifade edilmiş; sorulan olumsuz çıkarım, beş seçenek ve B aynı."
  },
  "pdf-074e8bea6164fa38-p0005-q01": {
    "canonicalCode": "sb-2458",
    "reviewedPairSha256": "c2a3dabaa73784b5b89ab07ed3922b84e1f1ad0c3485ac7f42d0a834df3d1bc9",
    "sourceReading": "Modernizm aklı/akıl söz dizimi dışında aynı kök, beş seçenek ve D."
  },
  "pdf-074e8bea6164fa38-p0024-q01": {
    "canonicalCode": "yk-felsefe-test-08-01-05",
    "reviewedPairSha256": "795115dc02d333893a47a5f48bb7a4f178d2eeccc59641b5b59dfca807e32e29",
    "sourceReading": "Yüzyıl numarası ve satır bölünmeleri karşılaştırıldı; beş seçenek, soru anlamı ve D aynı."
  },
  "pdf-074e8bea6164fa38-p0032-q01": {
    "canonicalCode": "sb-22082",
    "reviewedPairSha256": "05ca7a44ea8654e632a1023f980bd7742a236cb243c24d285f860bfccc2a1a7c",
    "sourceReading": "Seçeneklerde felsefe öznesi bankada açık yazılmış; aynı beş özellik ve dogmatiklik yanlış seçeneği D."
  },
  "pdf-074e8bea6164fa38-p0036-q01": {
    "canonicalCode": "sb-2464",
    "reviewedPairSha256": "3fca77163b50921cc94c715a19be7c6475d06bb0b5058dcecc4289ee935a0655",
    "sourceReading": "Bergson/Whitehead ve bilimin metafizik kabulleri kökü aynı; rölativite terimi genişletilmiş. Beş seçenek ve A aynı; şekil atfı yok."
  },
  "pdf-13a5d1aef378a1d8-p0010-q01": {
    "canonicalCode": "sb-2395",
    "reviewedPairSha256": "9314d8a9dc39cd0d41e0bbaddb2390887df8489b4845854fcac6c1075cd00a28",
    "sourceReading": "Özelik/özellik ve aydınlanma yazımları, sınıf altlığı dışında aynı kök ve seçenekler; D."
  },
  "pdf-13a5d1aef378a1d8-p0016-q01": {
    "canonicalCode": "sb-29760",
    "reviewedPairSha256": "4ed0991316ecfe71209daebd7bd77abf998f6de8ff071acf0232395ea4d96183",
    "sourceReading": "Başarmıştır/başarmışlardır çekimi ve sınıf altlığı dışında aynı bilgi ve beş seçenek; D."
  },
  "pdf-13a5d1aef378a1d8-p0033-q01": {
    "canonicalCode": "sb-29768",
    "reviewedPairSha256": "f2541ab887f60bf8d91df26f120917f99f13cf655e3acbaf966b9a3ee3d5232c",
    "sourceReading": "Descartes önermesi ve konusu soruluyor; konusu edilmiştir/konusudur aynı soru, beş seçenek ve D aynı."
  },
  "pdf-1a02fe189cf176e5-p0014-q01": {
    "canonicalCode": "sb-29738",
    "reviewedPairSha256": "38be69e8517b79bb41db62d05ea04172a4f225457b48422d8725636139a60722",
    "sourceReading": "Hobbes açıklaması ve çıkarılamayan yargı aynı; soru cümlesi yeniden ifade edilmiş, beş seçenek ve A aynı."
  },
  "pdf-1a02fe189cf176e5-p0028-q01": {
    "canonicalCode": "sb-29741",
    "reviewedPairSha256": "75805352c0b9eb221b8b64e61077fbc79f09c1a7e04e144dd0b1e0566eb053b6",
    "sourceReading": "Bacon açıklaması ve konu alanı aynı; soru cümlesi ve imkân yazımı dışında beş seçenek aynı; E."
  },
  "pdf-1a02fe189cf176e5-p0030-q01": {
    "canonicalCode": "sb-29828",
    "reviewedPairSha256": "e6dc31307195b22db6f467fed113244168a2264880d2e93fe5e48d7eaf44e2c5",
    "sourceReading": "Bacon idolleri ve doğanın kitabı kökü aynı; adın iyelik yazımı dışında beş seçenek aynı; D. Benzetme metinseldir."
  },
  "pdf-2779a300fc4fbd7a-p0034-q01": {
    "canonicalCode": "sb-29752",
    "reviewedPairSha256": "f146bc8eb4e900d37fc30a3e9dc20d3581c58ba99716511b42669483552e21a1",
    "sourceReading": "Felsefe döneminin özgürleşmesi/çeşitlenmesi aynı açıklama; seçeneklerde felsefesi eki açılmış, aynı tarih aralıkları ve D."
  },
  "pdf-2779a300fc4fbd7a-p0036-q01": {
    "canonicalCode": "sb-29764",
    "reviewedPairSha256": "3e24bdababe4bbc926d0c2382f3227ccd8735c96f9664b0613cd5e7ca6da824c",
    "sourceReading": "Bilimsel kavramsal dilin anlaşılmayı güçleştirmesi aynı E seçeneğidir; diğer dört seçenek, sorulan olumsuz çıkarım ve E aynı."
  },
  "pdf-4a2f5f617534b7d5-p0019-q01": {
    "canonicalCode": "AYT_EsitAgirlik-0226",
    "reviewedPairSha256": "92f4b3e8f2b1dbbcf202baa1f42d2b565a3a0ec8e309ccae02a027f216310d41",
    "sourceReading": "Kök Türk/Göktürk, İşpara/İşbara yazım farkı var; aynı özgün olay, beş seçenek ve C."
  },
  "pdf-58b5cf6a90bea871-p0038-q01": {
    "canonicalCode": "sb-29770",
    "reviewedPairSha256": "f0e8ee3ac339edd50bc40b4888bc5e1783d09c9e6362be794f4cb17a1847171d",
    "sourceReading": "Kant aydınlanma alıntısı ve aklı başkasının kılavuzluğu olmadan kullanma açıklaması eşdeğer; beş seçenek ve A aynı."
  },
  "pdf-58cd106c7ec93538-p0017-q01": {
    "canonicalCode": "yk-felsefe-test-12-01-14",
    "reviewedPairSha256": "25f71d7a8f8ccca79fc2e3458617dcbc04cd9eac986d0bb288471f523f738916",
    "sourceReading": "Soru kökü ve beş seçenek aynı; satır ayrımı ve bankanın YGS 2015 altlığı dışında fark yok; B."
  },
  "pdf-58cd106c7ec93538-p0036-q01": {
    "canonicalCode": "yk-felsefe-test-12-01-11",
    "reviewedPairSha256": "c9858cde70f328c4a9a90f887d2672bf8146d554ac10943326d6ab572ab0815d",
    "sourceReading": "Kurama bağlı gözlem sorusunda düştüğü/düşürdüğü dil farkı var; sorulan ilişki ve beş seçenek aynı; B. Kaynaklardaki sınav yılı çelişkisi özgün metinde korunur."
  },
  "pdf-5cda8723d5df6177-p0016-q01": {
    "canonicalCode": "sb-29728",
    "reviewedPairSha256": "9286ad8d8ad4bb65aa43bbff9ae2dd74c8b8e154b0fa62f2eb33de63022cc3cd",
    "sourceReading": "Campanella/Campenella yazımı ve sınıf başlığı dışında aynı kök, beş seçenek ve B."
  },
  "pdf-5cda8723d5df6177-p0019-q01": {
    "canonicalCode": "sb-2327",
    "reviewedPairSha256": "fdf3b01db97f4fd661c424f87007e3901e988fee9807cb3415b0d7d2ef7008dc",
    "sourceReading": "Bacon/More ideal devlet ütopyaları aynı; gerekli koşulları sağlamak/tasarlamak aynı yanlış çeldiricinin anlatımı, diğer seçenekler ve B aynı."
  },
  "pdf-5cda8723d5df6177-p0021-q01": {
    "canonicalCode": "sb-2312",
    "reviewedPairSha256": "78e26c14f237935c1c5d1b28aee67924f438ee02fbb8fe453ab6c8f931c1d07c",
    "sourceReading": "İnsan/insanlar çekimi, Bacon iyelik yazımı dışında aynı kök ve seçenekler; D."
  },
  "pdf-5cda8723d5df6177-p0025-q01": {
    "canonicalCode": "sb-29821",
    "reviewedPairSha256": "a5e0cbdedd2d77c8cadd3ddbc69b43c4633f60dd320034dcd8fc5ad12e0255a6",
    "sourceReading": "Standart/standard yazımı, aktarım sözcükleri ve satır farkları dışında ütopya kökü ve beş seçenek aynı; C."
  },
  "pdf-6a6707b268afdf5a-p0008-q01": {
    "canonicalCode": "sb-22076",
    "reviewedPairSha256": "1d22f8af70e095229acf745a7e53bda5bfcfbe7c4d4e6e3180acd684f764a695",
    "sourceReading": "Ana kaynaklara dönmenin özgün metinle tartışma anlamı aynı; felsefede öznesi seçeneklerde açılmış; beş seçenek ve B aynı."
  },
  "pdf-7923a033953e8d53-p0025-q01": {
    "canonicalCode": "sb-39741",
    "reviewedPairSha256": "34b796eadbcea5a34a832ba4bc78fde4039daf96af3fde11e9cff6505a82d5c2",
    "sourceReading": "Soru isteminde gösterilebilir/hangisidir ve olarak farkı dışında aynı kök, beş seçenek ve D."
  },
  "pdf-7923a033953e8d53-p0027-q01": {
    "canonicalCode": "3a-tyt-felsefe-43-05",
    "reviewedPairSha256": "857a82cabb8b5eeec68eb368681c2797e5610a8b720726614edf42f5776e0d9d",
    "sourceReading": "Teknolojinin etik sorun doğurması aynı yargı; olabilir/gerçekleşir çekimi dışında aynı kök, beş seçenek ve E."
  },
  "pdf-7923a033953e8d53-p0029-q01": {
    "canonicalCode": "yk-felsefe-test-01-01-06",
    "reviewedPairSha256": "de73de992aeb38e41b55fdb4c1be1f9c6b6df841d3ad829bc1e0163cfdd639f3",
    "sourceReading": "Dogmatik anlayış sorusunda yalnız satır ayrımları ve YGS altlığı farklı; tam kök ve beş seçenek aynı; E."
  },
  "pdf-7d2900144b32704c-p0055-q01": {
    "canonicalCode": "TYT-0371",
    "reviewedPairSha256": "4e3b14efcf41b977f008e1e0921004cec753e7c2a481c7db07735c1a3622f809",
    "sourceReading": "Gazneli Mahmud/Mahmut ve unvan/ünvan yazımları dışında tam kök ve beş seçenek aynı; A."
  },
  "pdf-7e8886f7fa42defd-p0073-q01": {
    "canonicalCode": "AYT_Sozel-0413",
    "reviewedPairSha256": "d3224c565a1dcf6101ce39eaca5ecdf44fd6307c3a01b0cfa29ceed3f02ce95a",
    "sourceReading": "Kanunuesasi birleşik/ayrı yazımı dışında kök ve beş seçenek aynı; E."
  },
  "pdf-8b19fd17ecd847ff-p0039-q01": {
    "canonicalCode": "3a-tyt-felsefe-44-05",
    "reviewedPairSha256": "735e84db2ab03e33a90aca6c2fcb23e091607d47758978f701a5816fec3f903c",
    "sourceReading": "Felsefi kuramın bütünlüğü kökü aynı; disiplin/konu, düşünce/malzeme ve anlamlı yapı ifadeleri aynı beş yargıyı karşılıyor; C. Görsel gerektiren atıf yok."
  },
  "pdf-8b19fd17ecd847ff-p0041-q01": {
    "canonicalCode": "sb-39733",
    "reviewedPairSha256": "82ad34576e732abb778b151714903bb2ab942b44ad9057425daf47e73ba058e4",
    "sourceReading": "Felsefi okuryazarlık ve metin analizi kökü aynı; kavram/terim sözcük değişimi dışında beş seçenek aynı; E. Görsel gerektiren atıf yok."
  },
  "pdf-8b19fd17ecd847ff-p0043-q01": {
    "canonicalCode": "sb-17953",
    "reviewedPairSha256": "35a14ee0df618322c3fba007b01be32a7b44e9434ba63237921c016ebe44863f",
    "sourceReading": "Metin analizinin ana argümana katkısı sorusunda mastar/yüklem değişmiş; aynı beş önerme ve B."
  },
  "pdf-aa06a25b329d6ad6-p0033-q01": {
    "canonicalCode": "yk-felsefe-test-11-01-07",
    "reviewedPairSha256": "150521a24f66b1271b9fade146906ed1a456e3699c2dee9426c280d28d098566",
    "sourceReading": "Ahlaki değerler sorusunda tam kök ve beş seçenek aynı; yalnız ÖSS 1999 altlığı bankada var; B."
  },
  "pdf-ade416d31115af4d-p0029-q01": {
    "canonicalCode": "sb-29806",
    "reviewedPairSha256": "86f65ebcb04c47b158f5397453a84fc4102ec85601dcb893086ffdabf1270a49",
    "sourceReading": "Etmez/etmemektedir çekimi dışında kök ve beş seçenek aynı; C."
  },
  "pdf-ade416d31115af4d-p0033-q01": {
    "canonicalCode": "sb-29786",
    "reviewedPairSha256": "3cfd07d79780612b3a1dfb993f55a798c19bc6fd2f1c71ef3ace2e3586aa88d1",
    "sourceReading": "Locke alıntısının adı başa/sona alınmış; tam alıntı, soru istemi, beş seçenek ve B aynı."
  },
  "pdf-b094ab6e26e57495-p0009-q01": {
    "canonicalCode": "yk-felsefe-test-12-01-15",
    "reviewedPairSha256": "20329ab0f4448957b77f2bfd0f1112e6d9ae7730e044dd753e7e95f37511508e",
    "sourceReading": "Rousseau genel irade kökü, beş seçenek ve C aynı; yalnız idrak yazımı ve satır ayrımı farklı; metinsel açıklama."
  },
  "pdf-c76d197b9be672bc-p0018-q01": {
    "canonicalCode": "cd-2021-mini-deneme-1-01-28",
    "reviewedPairSha256": "3713a9f107101762c00c495fc75e4d35d1a988dd62a4bafbe67d840f6052c1b4",
    "sourceReading": "Bentham adı bir nüshada açık; ılımlı/altın orta aynı çeldirici, sorulan yararcılık ve beş seçenek aynı; A."
  },
  "pdf-c76d197b9be672bc-p0020-q01": {
    "canonicalCode": "yk-felsefe-test-04-01-09",
    "reviewedPairSha256": "1520630c3fc357ab6fd67010f0b525b9234ded9e719c6568d7156aba4f269b42",
    "sourceReading": "Aynı mutluluk sorusu; satır ayrımı ve YGS altlığı dışında kök ve beş seçenek aynı; B."
  },
  "pdf-ce848d479a66b8cd-p0007-q01": {
    "canonicalCode": "yk-felsefe-test-01-01-07",
    "reviewedPairSha256": "7e35daca0b85af147946277e7c184f91a6fa04d5f66adf9c985c6758758ab261",
    "sourceReading": "Yalnız kelimelerin dizgi bölünmeleri farklı; kök, beş seçenek ve B aynı."
  },
  "pdf-ce848d479a66b8cd-p0017-q01": {
    "canonicalCode": "TYT-0483",
    "reviewedPairSha256": "e1d394d05ba17cce62b1b35f3f62eb985982316446310acb58d74cc96e66dc71",
    "sourceReading": "Levinas başkasının varlığını kabul etme sorusu; kök, beş seçenek ve C aynı; şekilde sözcüğü anlatı içindedir."
  },
  "pdf-ce848d479a66b8cd-p0030-q01": {
    "canonicalCode": "yk-felsefe-test-12-01-14",
    "reviewedPairSha256": "a80636129a96808b9415b99ff8c862483c6f3669a87a68aadb5f7bb7e0fccec8",
    "sourceReading": "Aynı Bergson sezgiciliği sorusu; satır ayrımı ve YGS 2015 altlığı dışında kök ve beş seçenek aynı; B."
  },
  "pdf-da0e87580c35521c-p0005-q01": {
    "canonicalCode": "sb-39627",
    "reviewedPairSha256": "7fcdbf98bb4074017cb3696500d68b015c1be7bcc8af3ad50efa00bf7a270053",
    "sourceReading": "Yusuf Has Hacib/Hacip yazımı dışında kök, beş seçenek ve D aynı."
  },
  "pdf-dc1aa3afeb6f3a1b-p0033-q01": {
    "canonicalCode": "sb-2465",
    "reviewedPairSha256": "2558469451919fb132ceea6d67a960cf418406668f8fca44b26cd349c6ed928a",
    "sourceReading": "İyi/iyiyi isteme çekimi dışında Nietzsche sorusunun kökü, beş seçenek ve D aynı."
  },
  "pdf-dc9493dddad0336d-p0021-q01": {
    "canonicalCode": "sb-29651",
    "reviewedPairSha256": "8284cadc491ab5a63034a79f4c9e0781bbe6eae75cc774a128087d8610f3310d",
    "sourceReading": "Alıntılardaki der yüklemlerinin kaldırılması dışında aynı üç yargı, kök, beş seçenek ve D."
  },
  "pdf-dc9493dddad0336d-p0036-q01": {
    "canonicalCode": "sb-17767",
    "reviewedPairSha256": "232f6b4b780f44c5b8146e9a2f35f842966614b5aab18e86dccb29f95346f7dd",
    "sourceReading": "Din felsefesine ait ifadeler aynı; soru istemi yeniden ifade edilmiş, aynı beş seçenek ve E."
  },
  "pdf-df1445341a0a7d73-p0017-q01": {
    "canonicalCode": "3a-tyt-felsefe-47-06",
    "reviewedPairSha256": "7db891de0424bd623682f389107cae14b022c176aad0c8ad63fd0b40b814a1ee",
    "sourceReading": "Yalnız satır ayrımları farklı; tam kök, beş seçenek ve A aynı."
  },
  "pdf-ef5b9db0e4cbd6c5-p0067-q01": {
    "canonicalCode": "AYT_Sozel-0395",
    "reviewedPairSha256": "126ca88615cdbe898884a8afb615460801148f77c7bf86248e74905d4e492045",
    "sourceReading": "Mehmed/Mehmet yazımı dışında kök, beş seçenek ve B aynı."
  },
  "pdf-ef5b9db0e4cbd6c5-p0069-q01": {
    "canonicalCode": "AYT_EsitAgirlik-0259",
    "reviewedPairSha256": "30f55a1113cf66d05fa84529f36205f4491827556136c33f2f3447fd4003fefc",
    "sourceReading": "Mehmed/Mehmet yazımı ve kaynak sınav başlığı dışında kök, beş seçenek ve C aynı."
  }
}

def main():
    comparison=json.loads((OUT/'slide-link-comparison.json').read_text(encoding='utf-8'))
    verified=list(comparison['verifiedLinks']);pending=[]
    for row in comparison['needsReview']:
        review=READINGS.get(row['sourceCode'])
        if not review:pending.append(row);continue
        signature=hashlib.sha256(json.dumps({k:row[k] for k in FIELDS},ensure_ascii=False,sort_keys=True).encode()).hexdigest()
        if signature!=review['reviewedPairSha256'] or row['canonicalCode']!=review['canonicalCode']:
            raise ValueError('Previously read content changed; read source and bank again')
        if row['sourceAnswer']!=row['bankAnswer'] or row['teacherApproved'] is not False:
            raise ValueError('Manual link does not authorize answer changes or teacher approval')
        accepted={**row,'status':'VERIFIED_SOURCE_CONTENT_READING','reviewMethod':'SOURCE_AND_BANK_CONTENT_READING',
            'matchType':'REVIEWED_PARAPHRASE','sourceReading':review['sourceReading'],'reviewedPairSha256':signature}
        accepted['reviewSha256']=hashlib.sha256(json.dumps(accepted,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
        verified.append(accepted)
    write_json(OUT/'slide-verified-links.json',{'verifiedLinks':verified,'needsReview':pending,
        'excludedOtherExams':comparison['excludedOtherExams']})
    print(json.dumps({'verifiedLinks':len(verified),'needsReview':len(pending)}))

if __name__=='__main__':main()
