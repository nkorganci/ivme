"""Create the explicitly authorized local content operator, never edit others.

No usable password is printed or persisted. The existing dev loopback login
selects this named account; admin privileges and site-manager status stay off.
"""
import json
import secrets
import bcrypt
from mebi_pratik2_tam_pdf_tarama import BASE
from kaynakli_arastirma_db import db_connection,query
from yks_birlestirme import write_json


def run():
    cmd,env,_=db_connection('ivme');connection=(cmd,env,None)
    existing=query(connection,"SELECT role||':'||enabled||':'||approved FROM users WHERE lower(username)='ivmeoperator'")
    if existing:
        if existing!='OPERATOR:true:true':raise ValueError('Existing account differs; no role/status changes allowed')
        print('Authorized local operator already exists');return
    password_hash='{bcrypt}'+bcrypt.hashpw(secrets.token_urlsafe(36).encode(),bcrypt.gensalt()).decode()
    sql="""WITH added AS (
      INSERT INTO users(username,email,password_hash,role,enabled,approved,password_change_required,site_manager)
      VALUES ('ivmeoperator','ivmeoperator@local.invalid','%s','OPERATOR',true,true,true,false)
      RETURNING id,role,enabled,approved,site_manager
    ), audit AS (
      INSERT INTO user_record_audit(user_id,record_type,record_key,operation)
      SELECT id,'local_operator_account','MEBI_PRACTICE_2_USER_AUTHORIZED','INSERT' FROM added
    ) SELECT row_to_json(added) FROM added""" % password_hash.replace("'","''")
    result=json.loads(query(connection,sql))
    write_json(BASE/'local-operator-created.json',{'status':'CREATED','account':'ivmeoperator',
        'userAuthorization':'CREATE_OPERATOR_IF_ABSENT_FOR_THIS_TASK','accountResult':result,
        'existingUserRolesChanged':0,'passwordPersisted':False})
    print(json.dumps({'status':'CREATED','username':'ivmeoperator','role':result['role'],'existingUserRolesChanged':0}))


if __name__=='__main__':run()
