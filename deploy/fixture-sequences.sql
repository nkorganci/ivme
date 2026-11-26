-- Explicitly copied IDs must never collide with a subsequent local insert.
DO $$
DECLARE s record; maximum bigint; last_id bigint; called boolean;
BEGIN
  FOR s IN
    SELECT t.oid::regclass AS target, a.attname AS key, seq.oid::regclass AS sequence
      FROM pg_class seq JOIN pg_depend d ON d.objid=seq.oid AND d.classid='pg_class'::regclass
      JOIN pg_class t ON t.oid=d.refobjid JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=d.refobjsubid
      WHERE seq.relkind='S' AND d.deptype IN ('a','i') AND t.relnamespace='public'::regnamespace
  LOOP
    EXECUTE format('LOCK TABLE %s IN SHARE ROW EXCLUSIVE MODE', s.target);
    EXECUTE format('SELECT max(%I) FROM %s', s.key, s.target) INTO maximum;
    EXECUTE format('SELECT last_value, is_called FROM %s', s.sequence) INTO last_id, called;
    IF maximum IS NOT NULL AND (maximum>last_id OR (maximum=last_id AND NOT called)) THEN
      PERFORM setval(s.sequence, maximum, true);
    END IF;
  END LOOP;
END $$;
