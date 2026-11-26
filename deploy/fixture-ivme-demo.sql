-- Dedicated synthetic accounts for DevLoginController in the writable fixture.
DO $$
BEGIN
  IF current_user <> 'dev_ivme' OR
     (current_database() <> 'ivme_local' AND current_database() NOT LIKE 'loading_ivme_%') THEN
    RAISE EXCEPTION 'Requires the local fixture role and database';
  END IF;
  INSERT INTO users(username, email, password_hash, role, approved)
  SELECT alias, alias||'@example.invalid', '!', role, true
  FROM (VALUES ('ADMIN','admin'),('USER','student'),('TEACHER','teacher'),
               ('PARENT','parent'),('OPERATOR','ivmeoperator')) AS demo(role,alias)
  WHERE NOT EXISTS (SELECT 1 FROM users WHERE username=alias);
END $$;
