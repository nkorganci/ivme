-- Kişisel veri, istek yolu, IP veya hata metni içermez.
CREATE TABLE service_error_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category varchar(20) NOT NULL CHECK (category IN ('UNEXPECTED_API')),
    occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_service_error_events_time ON service_error_events(occurred_at);
