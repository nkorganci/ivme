-- Preserve existing physics decisions while extending the same workflow to every branch.
ALTER TABLE physics_content_reviews RENAME TO content_reviews;
ALTER TABLE physics_content_review_history RENAME TO content_review_history;
