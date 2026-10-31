// EBOB–EKOK konusunun özgün görselleri okunan bağımsız aktarım soruları (TAS-09 ikinci konu). Derste çözümü gösterilmez.
// Pratik ekranı çözümü yalnız sunucu cevabı açtıktan sonra sunar. Sonuçlar testler/ebob-ekok-pilot.test.mjs ile bağımsız taranır.
export const EBOB_TRANSFER_EXAMS = {
  'TYT-0713': {
    teachingRole: 'independent',
    conceptId: 'ebob-ekok', archetype: 'asal-bolen', answer: 'C',
    title: '2023 TYT · iki gruplamadan sayıyı bul, bölenlerinden seç',
    cue: 'Bilye sayısını iki yoldan yaz: $3\\cdot AB$ ve $8\\cdot BA$. AB ile BA basamaklı sayılardır. Sayıyı bulunca grup sayısı onun bir böleni olmalı.',
    steps: [
      { text: 'Toplam bilye $N=3(10A+B)=8(10B+A)$.', why: 'Grup sayısı × gruptaki bilye = toplam. $AB=10A+B$ ve $BA=10B+A$; harflerin çarpımı değil.' },
      { text: '$30A+3B=80B+8A$, yani $22A=77B$ ve $2A=7B$.', why: 'Aynı harfleri bir tarafa topladık; iki tarafı 11’e böldük.' },
      { text: '2 ile 7 aralarında asal olduğundan 7, $A$’yı böler. $A$ sıfırdan farklı bir rakam: $A=7$, $B=2$.', why: '$7B=2A$ eşitliğinde 7, $2A$’yı böler ama 2’yle ortak böleni yok. AB ve BA iki basamaklı olduğu için $A, B\\neq0$.' },
      { text: '$N=3\\cdot72=216=8\\cdot27$ ve $216=2^3\\cdot3^3$.', why: 'İki yazım aynı sayıyı veriyor; asal çarpanlar bütün bölenleri belirler.' },
      { text: 'Eşit gruplarda grup sayısı 216’nın böleni olmalı: yalnız 2 ve 3 içerebilir, üsleri en çok 3. $40$ ve $60$ 5 içerir, $56$ 7 içerir, $48=2^4\\cdot3$’te 2’nin üssü fazla. $54=2\\cdot3^3$ uygundur.', why: 'Bir bölen, sayının asallarından başka asal taşıyamaz ve hiçbir asalda sayının üssünü aşamaz.' },
    ],
    result: 'C · 54',
    tip: '“Bütün bilyeler, her grupta eşit sayıda” ifadesi grup sayısının toplamın böleni olduğunu söyler. Seçenekleri tek tek bölmek yerine toplamı asal çarpanlarına ayır; başka asal taşıyan veya üssü fazla olan seçenek hemen elenir. Artan bilye olabiliyorsa bu kısa yol geçmez.',
    check: '$216:54=4$, yani 54 grupta 4’er bilye. $216:3=72$ (AB) ve $216:8=27$ (BA); rakamlar yer değiştirmiş.',
    mistake: '48 ve 56’yı “8’erli gruplanabiliyor” diye seçme: 8’in katı olmak 216’yı bölmek demek değildir; $48=2^4\\cdot3$ ama 216’da 2’nin üssü yalnız 3.',
  },
  'AYT_Sayisal-0021': {
    teachingRole: 'independent',
    conceptId: 'ebob-ekok', archetype: 'ebob-ekok-hesap', answer: 'C',
    title: '2022 AYT · faktöriyellerde ortak kısmı dışarı al',
    cue: 'İki ifadede de 6! var. Ortak kısmı dışarı alınca EKOK, ortak kısım ile kalan aralarında asal parçaların çarpımıdır.',
    steps: [
      { text: '$A=7!+6!=7\\cdot6!+6!=6!\\,(7+1)=8\\cdot6!$.', why: '$7!=7\\cdot6!$; ortak çarpan 6! paranteze alındı.' },
      { text: '$B=8!-7!=7!\\,(8-1)=7\\cdot7!=49\\cdot6!$.', why: '$8!=8\\cdot7!$ ve $7!=7\\cdot6!$.' },
      { text: '$A=6!\\cdot8$, $B=6!\\cdot49$; $8=2^3$ ile $49=7^2$ aralarında asal.', why: 'Kalan parçaların ortak asal çarpanı yok; ortak kısım tam olarak 6!.' },
      { text: 'EKOK$(A,B)=6!\\cdot8\\cdot49=392\\cdot6!$.', why: '$a=dm$, $b=dn$ ve $m$, $n$ aralarında asal ise EKOK $=dmn$: ortak kısım bir kez, kalanların hepsi.' },
      { text: '$7\\cdot8!=7\\cdot8\\cdot7\\cdot6!=392\\cdot6!$. Cevap C.', why: 'Seçenekler 7! ve 8! cinsinden; hepsini 6! cinsine çevirince karşılaştırma kolaylaşır.' },
    ],
    result: 'C · 7 · 8!',
    tip: 'Faktöriyel toplam ve farklarında en küçük faktöriyeli ortak çarpan yap. Kalan parçalar aralarında asalsa EKOK ortak kısım × kalanlar olur; kalanlar ortak çarpan taşıyorsa (ör. 8 ve 12) önce onların EBOB’unu da ortak kısma kat.',
    check: '$6!=720$: $A=5760$, $B=35280$. EBOB 720, EKOK $282240=7\\cdot40320$. $A\\cdot B=720\\cdot282240$ eşitliği de sağlanıyor.',
    mistake: '$7!+6!$’yı $13!$ sanma; faktöriyeller toplanmaz, ortak çarpan paranteze alınır. EKOK’u $A\\cdot B$ sanmak da ortak 6!’yı iki kez sayar.',
  },
};
