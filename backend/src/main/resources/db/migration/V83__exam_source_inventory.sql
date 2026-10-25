-- Sınav kaynak envanteri: her sınav klasöründeki PDF'in rolü ve işlenme durumu, ayrıca eksik yıl/soru kayıtları.
-- Yayın betiği (scripts/kpss-yayinla.py) bir sınavın satırlarını tek işlemde baştan yazar; elle düzenlenmez.

-- Sınav klasöründeki her PDF bir satırdır; yol klasöre göredir. Rol: soru kitapçığı, cevap anahtarı, yardımcı belge
-- (aynı kitapçığın kopyası, %10 örneği, kılavuz) ya da başka sınavın oturumu. KAPSAM_DISI satırı hangi sınavda
-- işleneceğini notunda söyler.
CREATE TABLE exam_source_documents (
    track_id        varchar(40) NOT NULL REFERENCES exam_tracks(id),
    path            text        NOT NULL,
    sha256          char(64)    NOT NULL,
    role            varchar(20) NOT NULL CHECK (role IN ('SORU_KITAPCIGI', 'CEVAP_ANAHTARI', 'YARDIMCI', 'KAPSAM_DISI')),
    status          varchar(20) NOT NULL CHECK (status IN ('ISLENDI', 'KAPSAM_DISI', 'ISLENMEDI')),
    exam_years      int[]       NOT NULL DEFAULT '{}',
    question_count  int         NOT NULL DEFAULT 0 CHECK (question_count >= 0),
    active_count    int         NOT NULL DEFAULT 0 CHECK (active_count BETWEEN 0 AND question_count),
    note            text        NOT NULL,
    catalog_run_key text,
    recorded_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (track_id, path)
);

-- Bir sınavın bir yılında bir testte bulunmayan veya yayımlanmayan sorular. Kaynak bulununca ilgili satır yayında kendiliğinden
-- kalkar. EKSIK_YIL: o yılın kitapçığı yok; KISMI_YIL: yalnız ÖSYM %10 örnekleri var; EKSIK_SORU: tam kitapçıkta okunamayan
-- soru; CEVAP_BEKLIYOR: soru sınıflandırıldı ama cevap anahtarı yok; IPTAL: ÖSYM'nin iptal ettiği soru (yayımlanmaz).
CREATE TABLE exam_coverage_gaps (
    track_id        varchar(40) NOT NULL REFERENCES exam_tracks(id),
    exam_year       int         NOT NULL CHECK (exam_year BETWEEN 2000 AND 2100),
    exam_type       varchar(10) NOT NULL,
    gap_type        varchar(20) NOT NULL CHECK (gap_type IN ('EKSIK_YIL', 'KISMI_YIL', 'EKSIK_SORU', 'CEVAP_BEKLIYOR', 'IPTAL')),
    expected_count  int         NOT NULL CHECK (expected_count > 0),
    available_count int         NOT NULL CHECK (available_count BETWEEN 0 AND expected_count),
    question_numbers int[]      NOT NULL DEFAULT '{}',
    note            text        NOT NULL,
    target_folder   text,
    recorded_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (track_id, exam_year, exam_type, gap_type)
);
CREATE INDEX ix_exam_coverage_gaps_type ON exam_coverage_gaps (gap_type, track_id);
