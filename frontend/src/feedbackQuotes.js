// Kısa sözler kaynaklarıyla saklanır; çeviriler Türkçe oldukları için ayrıca belirtilir.
const CORRECT = [
  { text: 'Harika, doğru bildin!', author: null },
  { text: 'Güzel iş, böyle devam!', author: null },
  { text: '“Yaptığın işi sev; elinden gelenin en iyisini yap.”', author: 'Katherine Johnson · çeviri',
    source: 'https://science.nasa.gov/people/katherine-johnson/' },
];

const WRONG = [
  { text: '“Başarılarda gururu yenmek, felâketlerde ümitsizliğe direnmek gerekir.”',
    author: 'Mustafa Kemal Atatürk', source: 'https://atam.gov.tr/basari-ve-basari-yolu/' },
  { text: '“Hayatta korkulacak bir şey yok; yalnızca anlaşılacak şeyler var.”',
    author: 'Marie Curie · çeviri', source: 'https://www.nobelprize.org/uploads/2025/04/annual-review-2024.pdf' },
  { text: 'Yanlışın, bir sonraki doğruya yol gösterir.', author: null },
];

export function feedbackForAnswer(correct, questionId) {
  const options = correct ? CORRECT : WRONG;
  return options[Math.abs(Number(questionId) || 0) % options.length];
}
