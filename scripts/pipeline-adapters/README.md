# YKS pipeline okuyucuları

Bu dosyalar `ivme/pipeline` tüketicilerinin sürümlü kaynaklarıdır.
`python scripts/yks_pipeline_uyum.py` kurulu kopyaları hash ile denetler;
`--apply` yalnız bu iki dosyayı önceki kopyasını koruyarak günceller.

Katalog okuması `READ ONLY REPEATABLE READ` kullanır. Gezinme yayımlanana
kadar önceki seçim sürer. MEBİ gezinmesi seçilmiş ayrıntılı kimliklerin
görünümünü verir; eski tanımlar ve kaynak embeddingleri değiştirilmez.
