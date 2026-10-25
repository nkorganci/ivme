# Bilinen test hataları

Bu listedeki hatalar bilinen ve yapılan işten bağımsız durumlardır. Hiçbir AI oturumu
bunları her seferinde yeniden araştırmaz. `python scripts/ivme.py test` sonucu bu
listeyle karşılaştırır ve yalnız **yeni** hataları gösterir. Bir hata düzeltilince
satırı silinir; yeni bir hata bilinçli olarak kabul edilirse nedeniyle eklenir.

Son tam doğrulama: 25 Ekim 2026, `15587bb` — 259 test, 6 başarısız, 5 hata, 1 atlandı.

## Backend (`testler/backend-test.ps1`)

Neden: test verisi Excel müfredatından önceki ünite/konu beklentilerini kullanıyor
(“Kalıtım” ünitesi, 237 / 530 konu farkı). Düzeltme, testleri Excel ilk sayfa
kimliklerine taşımaktır; ayrı bir iş olarak yapılmadıkça dokunulmaz.

- `CanonicalUnitFlowTest.estimatesAreFilterableAndLegacyCategoryAndNamedFiltersShareOnePool`
- `CanonicalUnitFlowTest.practiceAndExamUseTheSameCanonicalUnitAndSaveItsSnapshot`
- `CanonicalUnitFlowTest.metadataOffersExactlyReferenceUnitsWithoutLegacySubtopics`
- `CanonicalUnitFlowTest.teacherUnitSelectionChangesCurrentProgressButPreservesFirstAttemptAndOriginalQuestion`
- `ContentReviewFlowTest.multipleBranchesAndTopicsShareValidatedDifficultyAndFilters`
- `ContentReviewFlowTest.changedImageOrQuestionMetadataRequiresNewReviewAndOtherBranchesAreExcluded`
- `ContentReviewFlowTest.writtenLessonExamplesAndAllBranchesUseTheSameCatalog`
- `OfficialCancellationFlowTest.futureSelectionExclusionPreservesKeysAttemptsAndSubmittedScoresAndIsIdempotent`
- `PhysicsTopicReviewTest.topicOnlyDecisionUsesSharedHistoryWithoutApprovingContentAndRejectsOldRevision`
- `PhysicsTopicReviewTest.physicsSelectionPreservesOtherBranchLabelsWithoutConfirmingThem`
- `PhysicsTopicReviewTest.teacherTopicSelectionImmediatelyUpdatesLibraryQuestionFilterAndReviewQueue`

## UI betikleri

- `testler/question-collection-ui.mjs` — seçici yeniden yazımından (`50977eb`) beri eski beklentiyle başarısız.
