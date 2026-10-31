// Üretildi: python scripts/ivme.py icerik calistir <kavram> (TAS-09). Elle düzenleme.
// Kaynaklı öğretim kanıtı olan konular; teacherApproved yalnız icerik-hatti/kararlar kaydından gelir.
import bolmeBolunebilme from './bolme-bolunebilme.json' with { type: 'json' };
import ebobEkok from './ebob-ekok.json' with { type: 'json' };

export const EVIDENCE = {
  'bolme-bolunebilme': bolmeBolunebilme,
  'ebob-ekok': ebobEkok,
};
