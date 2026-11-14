// Her durakta örneklerden ve kavram kapısından ayrı iki nicel madde. Öğretmen kontrolü bekliyor.
const q=(id,soru,dogru,gerekce,yanlis)=>({id,soru,secenekler:[{metin:dogru,dogru:true,neden:gerekce},...yanlis.map(([metin,neden])=>({metin,neden}))]});
export default {
 'kime-gore':[
  q('NK-ref1','Doğuyu artı seç. Tren yere göre +12 m/s, yolcu trene göre −3 m/s hızla gidiyor. Yolcunun yere göre hızı nedir?','+9 m/s.','Yere göre hız = trene göre hız + trenin yere göre hızı: −3+12=+9.',[['+15 m/s.','Yolcunun trene göre hızı eksi işaretli; büyüklükleri toplama.'],['−9 m/s.','Yolcu trene göre batıya yürür ama trenin doğu hızı daha büyük.']]),
  q('NK-ref2','Aynı doğru üzerinde konumlar xK=4+2 t ve xL=16−4 t (metre, saniye). L aracının K aracına göre hızı kaç m/s olur?','−6 m/s.','Yere göre hızlar +2 ve −4 m/s; L’nin K’ye göre hızı −4−2=−6 m/s.',[['−2 m/s.','−4+2 yaptın; gözlemcinin hızını çıkarmak gerekir.'],['+6 m/s.','Hız farkının büyüklüğü 6 ama yön eksi.']]),
 ],
 'yol-yer':[
  q('NK-yol1','Doğuyu artı seç. Yürüyüşçü 5 m batıya, sonra 2 m doğuya gidiyor. Yol ve yer değiştirmesi sırasıyla nedir?','7 m ve −3 m.','Yol 5+2=7; yönlü toplam −5+2=−3 m.',[['3 m ve −7 m.','Yolda büyüklükleri toplarsın; yer değiştirmede işaretleri korursun.'],['7 m ve +3 m.','Son konum başlangıcın batısında, işaret eksi.']]),
  q('NK-yol2','Cisim +7 m konumundan −2 m konumuna geliyor. İzlenen rota bilinmiyor. Yer değiştirmesi ve mümkün olan en kısa yol nedir?','−9 m ve 9 m.','Son eksi ilk: −2−7=−9 m. Yol en az bu vektörün büyüklüğü 9 m olabilir.',[['−5 m ve 5 m.','Konumların işaretlerini koru; −2−7, −9 eder.'],['+9 m ve 9 m.','Yer değiştirme eksi yöndedir; en kısa yol ise negatif olamaz.']]),
 ],
 'hiz-surat':[
  q('NK-hiz1','Araç +3 m/s ile 2 s, ardından −1 m/s ile 4 s gidiyor. Tüm hareketin ortalama hızı ve ortalama sürati nedir?','+1/3 m/s ve 5/3 m/s.','Yer değiştirme 6−4=2 m, yol 6+4=10 m, süre 6 s. İki payı aynı süreye böl.',[['+1 m/s ve 2 m/s.','Süreler eşit değil; hızların basit ortalamasını alamazsın.'],['5/3 m/s ve +1/3 m/s.','Yol süratin, yer değiştirme hızın payıdır.']]),
  q('NK-hiz2','Eşit uzunluktaki iki yolun her biri 12 km. İlk parça 36 km/h, ikinci parça 12 km/h süratle gidiliyor. Ortalama sürat nedir?','18 km/h.','Süreler 12/36=1/3 h ve 12/12=1 h; 24 km / (4/3 h)=18 km/h.',[['24 km/h.','Aritmetik ortalama ancak eşit sürelerde geçerlidir.'],['48 km/h.','Süratleri toplamak ortalama vermez; toplam yol/toplam süreyi kullan.']]),
 ],
 xt:[
  q('NK-xt1','x–t grafiği (0 s, −6 m) ile (4 s, +10 m) arasındaki düz doğru. Bu aralıktaki hız nedir?','+4 m/s.','Eğim=(10−(−6))/4=16/4=+4 m/s.',[['+2,5 m/s.','Son konumu süreye böldün; başlangıç konumu sıfır değil.'],['−4 m/s.','Konum artıyor; eğim artı olmalı.']]),
  q('NK-xt2','x–t grafiğinin doğrusal düğümleri (0 s,8 m), (2 s,4 m), (6 s,4 m), (8 s,0 m). Ortalama hızı ve durduğu süre nedir?','−1 m/s ve 4 s.','Net değişim 0−8=−8 m, süre 8 s: −1 m/s. Konum 2–6 s arasında sabit: 4 s.',[['+1 m/s ve 4 s.','Son konum ilkinden küçük; ortalama hız eksi.'],['−2 m/s ve 0 s.','−2 yalnız ilk parça hızı. Yatay parçada cisim 4 s durur.']]),
 ],
 vt:[
  q('NK-vt1','İlk konumu +5 m olan cismin hızı 3 saniyede 0’dan 8 m/s’ye doğrusal artıyor. Son konumu nedir?','+17 m.','v–t üçgen alanı 3×8/2=12 m. İlk konum 5 m eklenir:17 m.',[['+12 m.','12 m yer değiştirmedir; ilk konumu ekle.'],['+29 m.','Alan üçgendir; tüm süre boyunca 8 m/s gidilmez.']]),
  q('NK-vt2','Hız ilk 2 s +6 m/s, sonraki 4 s −3 m/s. Toplam yol ve yer değiştirme nedir?','24 m ve 0 m.','İşaretli alanlar+12 ve−12 m. Yol büyüklük toplamı 24 m, net 0 m.',[['0 m ve 24 m.','Geri dönüş alınan yolu silmez; net yer değiştirmeyi azaltır.'],['12 m ve 0 m.','İki yöndeki yollar da toplama girer.']]),
 ],
 'iki-hareketli':[
  q('NK-iki1','Aralarında 140 m olan iki araç aynı anda birbirine doğru sabit 8 ve 6 m/s süratlerle gidiyor. Karşılaşma süresi nedir?','10 s.','Aralık her saniye 8+6=14 m kapanır. 140/14=10 s.',[['70 s.','Sürat farkını aldın; birbirine doğru giderken kapanma hızı toplamdır.'],['17,5 s.','Yalnız 8 m/s’lik aracı saydın; diğeri de aralığı kapatır.']]),
  q('NK-iki2','Aynı yönde giden araçlardan öndeki 7 m/s, arkadaki 12 m/s sabit süratte. İlk aralık 50 m. Arkadaki kaç saniyede yetişir?','10 s.','Kapanma hızı 12−7=5 m/s; 50/5=10 s.',[['50/19 s.','Aynı yönde gittikleri için hızları toplamamalısın.'],['50/12 s.','Öndeki araç beklemiyor; kendi yoluna devam ediyor.']]),
 ],
 ivme:[
  q('NK-ivme1','Doğrusal harekette hız 2 saniyede +9 m/s’den +3 m/s’ye değişiyor. Ortalama ivme nedir?','−3 m/s².','Hız değişimi 3−9=−6 m/s; −6/2=−3 m/s².',[['+3 m/s².','Son eksi ilk kullan; hız değeri azalıyor.'],['+1,5 m/s².','Son hızı süreye böldün; gerekli olan hız değişimi.']]),
  q('NK-ivme2','İlk hız −1 m/s, sabit ivme −2 m/s². Üç saniye sonraki hız ve sürat değişimi nedir?','−7 m/s; sürat artar.','v=−1+(−2)×3=−7 m/s. Sürat 1’den 7’ye çıkar.',[['−7 m/s; sürat azalır.','Hız daha negatif olurken büyüklüğü artar.'],['+5 m/s; sürat artar.','İvmeyi işaretli hıza ekle: −1−6=−7.']]),
 ],
 'uc-grafik':[
  q('NK-uc1','İlk hız −5 m/s. İvme ilk 2 s +3 m/s², sonraki 1 s sıfır. Üçüncü saniye sonundaki hız nedir?','+1 m/s.','İlk alan+6 m/s, ikinci alan 0. −5+6=+1 m/s.',[['+6 m/s.','Alan hız değişimidir; ilk hız−5 m/s eklenir.'],['+4 m/s.','İvme yalnız ilk 2 saniyede 3 m/s²; üçüncü saniyede hız değişmez.']]),
  q('NK-uc2','İlk hız +7 m/s. İvme 3 s boyunca −1 m/s², sonraki 2 s +2 m/s². Son hız ve yön değiştirme durumu nedir?','+8 m/s; yön değiştirmez.','Önce 7−3=4, sonra 4+4=8 m/s. Hız iki parçada da artı kaldı.',[['+8 m/s; yön değiştirir.','İvmenin işaret değiştirmesi, hızın işaret değiştirmesi değildir.'],['+1 m/s; yön değiştirmez.','+1 yalnız net hız değişimidir; ilk hız 7 eklenmeli.']]),
 ],
};
