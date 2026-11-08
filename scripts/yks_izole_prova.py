"""Run the actual bounded import in a separate source snapshot and temporary ivme_test."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import uuid

from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock,now
from yks_soru_pilotu import APP,live_bank


def git(*args,cwd=APP):
    return subprocess.run(['git',*args],cwd=cwd,capture_output=True,text=True,encoding='utf-8',errors='replace',check=True).stdout.strip()


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    stage=state['stages']['YKS-09:pilot']
    if store.verify(state,'YKS-09','pilot')['status']!='VERIFIED':raise ValueError('Verified bounded source package required')
    package=next((root/a['path']).parent for a in stage['artifacts'] if a['path'].endswith('bounded-source-package-acceptance.json'))
    before,_=live_bank(APP);bank_sha=signature(before)
    if bank_sha!=read_json(package/'bounded-source-package-acceptance.json')['bankSnapshotSha256']:
        raise ValueError('Question bank changed after bounded selection')
    folder=root/'isolated-pilot';folder.mkdir(exist_ok=True)
    with process_lock(folder/'.writer.lock'):
        commit=git('rev-parse','HEAD');template=APP/'scripts/yks-pilot-fixtures/YksSourcePilotTest.java'
        candidate=root/'yol-uyumluluk/maintenance-candidate.json'
        identity={'sourceCommit':commit,'candidateSha256':digest(candidate),'sourcePackageSha256':digest(package/'bounded-source-package-acceptance.json'),
            'testTemplateSha256':digest(template),'runnerSha256':digest(Path(__file__)),'bankSnapshotSha256':bank_sha}
        destination=folder/('source-'+commit[:8]+'-'+signature(identity)[:8])
        report_path=folder/'isolated-import-report.json'
        report={'status':'RUNNING','scope':'ACTUAL_BOUNDED_IMPORT_IN_SEPARATE_SOURCE_SNAPSHOT','started':now(),
            'identity':identity,'sourceSnapshot':str(destination),'sourcePackage':str(package),'productionQuestionWrites':0,
            'productionCatalogPublished':False,'teacherApproved':False}
        write_json(report_path,report)
        try:
            if not destination.exists():
                destination.mkdir()
                archive=folder/('snapshot-'+uuid.uuid4().hex+'.tar')
                try:
                    with archive.open('wb') as stream:
                        subprocess.run(['git','archive','--format=tar',commit],cwd=APP,stdout=stream,check=True)
                    with tarfile.open(archive) as source:
                        for member in source:
                            target=(destination/member.name).resolve()
                            if not target.is_relative_to(destination.resolve()) or member.issym() or member.islnk():
                                raise ValueError('Source snapshot contains an unsafe path/link')
                        source.extractall(destination,filter='data')
                finally:
                    if archive.is_file():archive.unlink()
                git('init','--initial-branch=main',cwd=destination)
                git('add','.',cwd=destination)
                git('-c','user.name=YKS isolated verification','-c','user.email=yks-verification@localhost',
                    'commit','-qm','Isolated source snapshot '+commit,cwd=destination)
            # Candidate changes and credentials exist only in this isolated copy.
            shutil.copyfile(candidate,destination/'backend/src/main/resources/content-taxonomy.json')
            target=destination/'backend/src/test/java/com/hedefyks/YksSourcePilotTest.java';shutil.copyfile(template,target)
            local=APP/'.codex/local-environment.json'
            if local.is_file():
                values={k:v for k,v in read_json(local).items() if k in ['DbUser','DbPassword']}
                write_json(destination/'.codex/local-environment.json',values)
            images=destination/'ornek-veri/resimler'
            for item in read_json(package/'pilot-resources-v2.json')['resources']:
                relative=item['sourceImage']['reference'];source=package/'images'/relative;target=images/relative
                if not target.resolve().is_relative_to(images.resolve()):raise ValueError('Unsafe source image reference')
                target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target)
                if digest(target)!=item['sourceImage']['sha256']:raise ValueError('Isolated source crop changed')
            sample=APP/'ornek-veri/resimler/TYT/turkce/TYT-0001.webp';target=images/'TYT/turkce/TYT-0001.webp'
            target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(sample,target)
            env=os.environ.copy();env['IVME_YKS_PILOT_PACKAGE']=str(package)
            # backend-test.ps1 creates/drops only ivme_test and refuses to replace
            # an already existing test database. No app/runtime launcher is used.
            command=[sys.executable,'-X','utf8','scripts/ivme.py','test','YksSourcePilotTest']
            result=subprocess.run(command,cwd=destination,env=env,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=1800)
            log=folder/'isolated-import.log';log.write_text(result.stdout+result.stderr,encoding='utf-8')
            evidence=destination/'backend/target/ivme-test-son.json'
            proof=read_json(evidence) if evidence.is_file() else {}
            if result.returncode or proof.get('status')!='PASS' or proof.get('totals',{}).get('tests')!=4:
                raise ValueError('Actual isolated import failed; inspect '+str(log))
            after,_=live_bank(APP)
            if signature(after)!=bank_sha:raise ValueError('Production question snapshot changed during isolated verification')
            report.update(status='PASS',finished=now(),tests=proof['totals'],testProofPath=str(evidence),testProofSha256=digest(evidence),
                command=command,logPath=str(log),logSha256=digest(log),productionBankSnapshotUnchanged=True)
            write_json(report_path,report)
        except BaseException as exc:
            report.update(status='FAIL',finished=now(),errorType=type(exc).__name__,error=str(exc));write_json(report_path,report);raise
    print({k:v for k,v in report.items() if k not in ('identity','command')})


if __name__=='__main__':main()
