-- Identity index remains compatible with existing four-column INSERTs.
-- Relation evidence/locators are versioned in the existing item JSON, not a second catalog.
CREATE OR REPLACE VIEW learning_catalog.current_relation_details AS
SELECT i.run_key, i.item_key, a->>'categoryId' AS category_id,
       a->>'relation' AS relation, a->>'relationKey' AS relation_key,
       a->>'sourceVersion' AS source_version,
       a->>'categoryFingerprint' AS category_fingerprint,
       a->>'scopeStatus' AS scope_status, a->>'confidence' AS confidence,
       a->>'confidenceReason' AS confidence_reason,
       a->'evidence' AS evidence, a->>'locatorStatus' AS locator_status,
       a->>'locatorReason' AS locator_reason, a->'locators' AS locators,
       a->'review' AS review
FROM learning_catalog.current_items i
CROSS JOIN LATERAL jsonb_array_elements(i.data->'automaticLabels'->'assignments') a;
