ALTER TABLE page_annotations
    ADD COLUMN graph_json text NOT NULL DEFAULT '{"open":false,"xMin":-10,"xMax":10,"yMin":-10,"yMax":10}'
    CHECK (length(graph_json) <= 1024);
