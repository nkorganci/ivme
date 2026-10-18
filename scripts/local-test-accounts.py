"""Provision the four named test accounts. Resetting other accounts is restricted to ivme_dev.

Preview is the default. --apply reads the password from stdin (never arguments).
Requires bcrypt in the maintenance Python environment; backups stay outside Git.
Existing main accounts are never modified. No learning or content rows are deleted.
"""
import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from kaynakli_arastirma_db import db_connection, query

APP = Path(__file__).resolve().parents[1]
ACCOUNTS = (("admin", "ADMIN", None), ("student", "USER", "STUDENT"),
            ("teacher", "TEACHER", "TEACHER"), ("parent", "PARENT", "PARENT"))


def literal(value):
    return "NULL" if value is None else "'" + str(value).replace("'", "''") + "'"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", choices=("ivme_dev", "ivme"), default="ivme_dev")
    parser.add_argument("--reset-other-accounts", action="store_true")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if args.reset_other_accounts and args.database != "ivme_dev":
        raise ValueError("Account cleanup is restricted to ivme_dev.")
    connection = db_connection(args.database)
    snapshot = json.loads(query(connection, """SELECT json_build_object('database',current_database(),
        'accounts',(SELECT coalesce(json_agg(row_to_json(u)),'[]') FROM users u))"""))
    if snapshot["database"] != args.database:
        raise ValueError("Unexpected database; nothing changed.")
    report = {"database": args.database, "mode": "APPLY" if args.apply else "PREVIEW",
              "resetOtherAccounts": args.reset_other_accounts, "learningHistoryPreserved": True,
              "existingAccounts": len(snapshot["accounts"])}
    if not args.apply:
        print(json.dumps(report))
        return
    import bcrypt
    password = sys.stdin.readline().rstrip("\r\n").encode("utf-8")
    if not 8 <= len(password) <= 72:
        raise ValueError("Password must be 8–72 UTF-8 bytes.")
    if not args.reset_other_accounts:
        by_name = {u["username"].casefold(): u for u in snapshot["accounts"]}
        for name, role, _ in ACCOUNTS:
            existing = by_name.get(name)
            if existing and (existing["role"] != role or not existing["enabled"]
                    or not existing.get("approved") or existing["archived_at"] is not None
                    or not bcrypt.checkpw(password, existing["password_hash"].removeprefix("{bcrypt}").encode())
                    or (role == "ADMIN" and not existing["site_manager"])):
                raise ValueError("A named account already exists with different settings; preserved without modification.")
    if any("approved" not in u for u in snapshot["accounts"]):
        raise ValueError("Apply the registration approval migration before provisioning accounts.")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = APP / "veri/yedek" / f"{args.database}-accounts-before-test-setup-{stamp}.dump"
    backup.parent.mkdir(parents=True, exist_ok=True)
    command, env, _ = connection
    saved = subprocess.run([str(Path(command[0]).with_name("pg_dump.exe")),
                            *command[command.index("--host"):], "--format=custom", "--table=public.users",
                            "--table=public.account_audit", "--file", str(backup)],
                           env=env, capture_output=True, text=True)
    if saved.returncode:
        raise RuntimeError("Account backup failed; nothing changed.")
    statements = ["BEGIN;", f"DO $$ BEGIN IF current_database()<>{literal(args.database)} THEN RAISE EXCEPTION 'Wrong database'; END IF; END $$;",
                  "SELECT pg_advisory_xact_lock(733114025);", "LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE;",
                  "CREATE TEMP TABLE original_accounts ON COMMIT DROP AS SELECT id,md5(row_to_json(u)::text) digest FROM users u;"]
    if args.reset_other_accounts:
        statements.append("""UPDATE users SET username='admin' WHERE id=(SELECT id FROM users
            WHERE lower(username)='nazile' AND role='ADMIN' AND site_manager AND archived_at IS NULL LIMIT 1)
            AND NOT EXISTS(SELECT 1 FROM users WHERE lower(username)='admin');""")
    for name, role, category in ACCOUNTS:
        hashed = "{bcrypt}" + bcrypt.hashpw(password, bcrypt.gensalt(rounds=10)).decode()
        statements.append(f"""INSERT INTO users(username,email,phone,password_hash,role,category,site_manager,
            enabled,approved,password_change_required,created_at)
            SELECT {literal(name)},{literal(name+'@ivme.invalid')},'+905550000000',{literal(hashed)},
              {literal(role)},{literal(category)},{str(role=='ADMIN').lower()},true,true,false,now()
            WHERE NOT EXISTS(SELECT 1 FROM users WHERE lower(username)={literal(name)});""")
        if args.reset_other_accounts:
            statements.append(f"""UPDATE users SET username={literal(name)},password_hash={literal(hashed)},role={literal(role)},
                category={literal(category)},site_manager={str(role=='ADMIN').lower()},enabled=true,approved=true,
                password_change_required=false,archived_at=NULL,pause_reason=NULL,
                phone=coalesce(nullif(phone,''),'+905550000000') WHERE lower(username)={literal(name)};""")
    if args.reset_other_accounts:
        statements.append("""WITH archived AS (UPDATE users SET enabled=false,archived_at=now(),pause_reason='Local test account reset'
            WHERE archived_at IS NULL AND lower(username) NOT IN ('admin','student','teacher','parent') RETURNING id)
            INSERT INTO account_audit(actor_id,target_id,action,details)
            SELECT (SELECT id FROM users WHERE username='admin'),id,'DELETE','{"reason":"Local test account reset","historyPreserved":true}'::jsonb
            FROM archived;""")
    else:
        statements.append("""DO $$ BEGIN IF EXISTS(SELECT 1 FROM original_accounts p LEFT JOIN users u ON u.id=p.id
            WHERE u.id IS NULL OR p.digest<>md5(row_to_json(u)::text)) THEN RAISE EXCEPTION 'Existing accounts changed'; END IF; END $$;""")
    statements.extend(["""INSERT INTO account_audit(actor_id,target_id,action,details)
        SELECT (SELECT id FROM users WHERE username='admin'),u.id,'LOCAL_TEST_SETUP','{}'::jsonb FROM users u
        LEFT JOIN original_accounts o ON o.id=u.id WHERE lower(u.username) IN ('admin','student','teacher','parent')
        AND (o.id IS NULL OR o.digest<>md5(row_to_json(u)::text));""",
        """SELECT json_build_object('activeAccounts',(SELECT count(*) FROM users WHERE archived_at IS NULL),
            'testAccounts',(SELECT json_agg(json_build_object('username',username,'role',role,'approved',approved,'enabled',enabled))
                FROM users WHERE username IN ('admin','student','teacher','parent')));""", "COMMIT;"])
    # Suppress SELECT advisory-lock output so the only output is the final report.
    statements = [s.replace("SELECT pg_advisory_xact_lock(733114025);", "DO $$ BEGIN PERFORM pg_advisory_xact_lock(733114025); END $$;") for s in statements]
    report.update(json.loads(query(connection, "\n".join(statements))))
    report["backup"] = str(backup.relative_to(APP))
    report["existingMainAccountsPreserved"] = not args.reset_other_accounts
    folder = APP / "veri/content-labels/integration/registration-approval-20261018"
    folder.mkdir(parents=True, exist_ok=True)
    (folder / f"{args.database}-accounts.json").write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
