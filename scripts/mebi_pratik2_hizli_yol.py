"""Gated deterministic checks of saved images; no recropping or AI labels."""
import hashlib
import json
from pathlib import Path
from mebi_pratik2_tam_pdf_tarama import APP,BASE
from mebi_pratik2_hizli_profil import STATUS,VERSION,prove as profile_prove,expected_scale

COMPLETE_STATUSES={'MODEL_NO_VISIBLE_ISSUE','DETERMINISTIC_NATIVE_BODY_PROVED',
                   'NATIVE_BODY_COMPLETENESS_PROVED',STATUS}
ROOT=BASE/'fast-profile-transition'
_categories=None


def code_digest():
    paths=[Path(__file__),APP/'scripts/mebi_pratik2_hizli_profil.py',APP/'scripts/mebi_pratik2_native_govde.py']
    paths += [APP.parent/'veri-hatti/ogm-sorular'/name for name in ['motor.py','kitaplar.py','deneme.py']]
    return hashlib.sha256(b''.join(p.read_bytes() for p in paths)).hexdigest()


def enabled():
    path=ROOT/'enabled.json'
    if not path.exists():return False
    gate=json.loads(path.read_text(encoding='utf8'))
    return gate.get('status')=='VERIFIED_EXISTING_CROP_FAST_PATH' and gate.get('codeSha256')==code_digest()


def valid_receipt(value,row):
    return (value.get('status')==STATUS and value.get('method')==VERSION
        and value.get('sourceSha256')==row['sourceSha256'] and value.get('imageSha256')==row['imageSha256']
        and value.get('sourcePage')==row['bodyPage'] and value.get('sourceClip')==row['bodyClip']
        and value.get('modelCalls')==0 and value.get('imageWrites')==0 and value.get('teacherApproved') is False
        and value.get('fineTopicClaimed') is False and bool(value.get('sourcePixelSha256')))


def prove(pdf,row,path,group=None,pilot=False):
    global _categories
    if not pilot and not enabled():return None
    from mebi_pratik2_native_govde import prove as native_prove,resolve_body_subject,ALLOWED
    from mebi_pratik2_deneme_ders_kaniti import resolve_mock_course
    proof_row=row;subject_evidence=None
    if row.get('subject') not in ALLOWED:
        if _categories is None:_categories=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
        proof_row,subject_evidence=resolve_body_subject(row,_categories)
        if proof_row.get('subject') not in ALLOWED and group:
            cache=getattr(pdf,'_mebi_course_cache',None)
            if cache is None:cache={};pdf._mebi_course_cache=cache
            proof_row,subject_evidence=resolve_mock_course(row,group,pdf,cache)
    native=native_prove(pdf[row['bodyPage']-1],proof_row,path,scale=expected_scale(row))
    if native:
        if subject_evidence:native['sourceSubjectEvidence']=subject_evidence
        return native
    return profile_prove(pdf,row,path)
