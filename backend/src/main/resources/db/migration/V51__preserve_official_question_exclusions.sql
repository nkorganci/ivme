CREATE FUNCTION learning_catalog.guard_official_question_exclusion()
RETURNS trigger LANGUAGE plpgsql AS $guard$
BEGIN
 IF NEW.active AND EXISTS(SELECT 1 FROM learning_catalog.official_question_corrections c
                         WHERE c.question_code=NEW.code AND c.official_status='cancelled') THEN
  RAISE EXCEPTION 'Officially cancelled question cannot be reactivated: %',NEW.code;
 END IF;
 RETURN NEW;
END $guard$;
CREATE TRIGGER guard_official_question_exclusion
BEFORE INSERT OR UPDATE OF active,code ON questions
FOR EACH ROW EXECUTE FUNCTION learning_catalog.guard_official_question_exclusion();
