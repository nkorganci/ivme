"""Run evidence SQL acceptance only via ivme.py test in the isolated checkout."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET

from yks_birlestirme import Store,digest,read_json,write_json,signature,process_lock
from yks_stages.database import connection,Snapshot
from yks_stages.stage_03 import bank_stamp

APP=Path(__file__).resolve().parents[1]


def current_stamp():
    cmd,env=connection(APP)
    with Snapshot(cmd,env) as snapshot:return bank_stamp(snapshot)


def preserve_import_proof(root,checkout):
    """Recover byte-identical accepted proof from the frozen formal pilot copy."""
    original=read_json(root/'isolated-pilot/isolated-import-report.json')
    target=Path(original['testProofPath'])
    if not target.is_file() or digest(target)!=original['testProofSha256']:
        matches=[p for p in (root/'yks-10/pilot').rglob('actual-backend-proof.json') if digest(p)==original['testProofSha256']]
        if not matches:raise ValueError('Frozen original import-test proof missing')
        shutil.copyfile(matches[-1],target)
    # The raw Maven/cleanup log was copied by every accepted formal pilot.
    raw=checkout/'backend/target/ivme-test-son.log'
    copies=list((root/'yks-10/pilot').rglob('2-ivme-test-son.log'))
    if not copies:raise ValueError('Frozen original import raw log missing')
    hashes={digest(p) for p in copies}
    if len(hashes)!=1:raise ValueError('Original import raw logs disagree')
    shutil.copyfile(copies[-1],raw)


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);out=root/'database-archive';out.mkdir(exist_ok=True)
    schema=APP/'scripts/yks-evidence-schema.sql';template=APP/'scripts/yks-pilot-fixtures/YksEvidenceArchiveTest.java'
    original=read_json(root/'isolated-pilot/isolated-import-report.json');checkout=Path(original['sourceSnapshot'])
    if not checkout.is_relative_to(root) or not (checkout/'scripts/ivme.py').is_file():raise ValueError('Expected isolated source checkout required')
    before=current_stamp();identity={'schemaSha256':digest(schema),'testTemplateSha256':digest(template),'runnerSha256':digest(Path(__file__))}
    prior=out/'database-test-report.json'
    if prior.is_file():
        report=read_json(prior)
        if report.get('identity')==identity and report['status']=='PASS' and digest(report['logPath'])==report['logSha256'] and digest(report['xmlPath'])==report['xmlSha256']:
            print({'status':'PASS','reused':True,'actualPostgresTests':3,'database':'ivme_test'});return
    with process_lock(out/'.test-writer.lock'):
        target=checkout/'backend/src/test/java/com/hedefyks/YksEvidenceArchiveTest.java'
        previous={p:p.read_bytes() if p.is_file() else None for p in [target,checkout/'backend/target/ivme-test-son.json',checkout/'backend/target/ivme-test-son.log']}
        shutil.copyfile(template,target)
        env=os.environ.copy();env['IVME_YKS_EVIDENCE_SCHEMA']=str(schema)
        command=[sys.executable,'-X','utf8','scripts/ivme.py','test','YksEvidenceArchiveTest']
        # Reuse the already successful actual run if only report collection was
        # interrupted; never repeat a passing DB test merely to copy its XML.
        saved=checkout/'backend/target/ivme-test-son.json'
        collected=read_json(saved) if saved.is_file() else {}
        if collected.get('selection')=='YksEvidenceArchiveTest' and collected.get('status')=='PASS' and (out/'database-test.log').is_file():
            output=(out/'database-test.log').read_text(encoding='utf-8');result=subprocess.CompletedProcess(command,0,output,'')
        else:result=subprocess.run(command,cwd=checkout,env=env,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=900)
        log=out/'database-test.log';log.write_text(result.stdout+result.stderr,encoding='utf-8')
        xml=checkout/'backend/target-tests/surefire-reports/TEST-com.hedefyks.YksEvidenceArchiveTest.xml'
        parsed=ET.parse(xml).getroot() if xml.is_file() else None
        if result.returncode or parsed is None or int(parsed.get('tests','0'))!=3 or int(parsed.get('failures','0')) or int(parsed.get('errors','0')):
            raise ValueError('Database archive test failed: inspect '+str(log))
        raw=checkout/'backend/target/ivme-test-son.log'
        if 'IVME_TEST_RESULT=0' not in raw.read_text(encoding='utf-8'):raise ValueError('Test database cleanup marker missing')
        saved_xml=out/xml.name;shutil.copyfile(xml,saved_xml)
        shutil.copyfile(raw,out/'database-test-raw.log');shutil.copyfile(saved,out/'database-test-summary.json')
        # Restore generic result files so the four-test import acceptance remains
        # valid, and remove only our exact temporary fixture from that checkout.
        for file,data in previous.items():
            if file==target:
                if data is not None and data!=template.read_bytes():file.write_bytes(data)
                elif file.is_file() and digest(file)==digest(template):file.unlink()
            elif data is not None:file.write_bytes(data)
        preserve_import_proof(root,checkout)
        after=current_stamp()
        if after!=before:raise ValueError('Production YKS questions changed during isolated archive test')
        report={'status':'PASS','database':'ivme_test','actualPostgresTests':3,'identity':identity,'command':command,
            'logPath':str(log),'logSha256':digest(log),'xmlPath':str(saved_xml),'xmlSha256':digest(saved_xml),
            'temporaryDatabaseCleanupVerified':True,'productionBankStampBefore':before,'productionBankStampAfter':after,
            'productionQuestionWrites':0,'productionEvidenceWritesDuringTest':0,'teacherApproved':False}
        write_json(prior,report)
    print({k:v for k,v in report.items() if k not in ['identity','command']})


if __name__=='__main__':main()
