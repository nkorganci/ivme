"""Inspect HTML and offline ZIP text without executing scripts or opening sites.

Records local resource links and login-only quizzes separately. ZIP text is
cached with member coordinates/names and content hashes for later review.
"""
import hashlib
import json
import re
import zipfile
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
from mebi_pratik2_tam_pdf_tarama import BASE, SOURCE
from mebi_pratik2_kapsam_denetimi import safe_member
from yks_birlestirme import write_json


class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]; self.text=[]
    def handle_starttag(self, tag, attrs):
        for key,value in attrs:
            if key in ('href','src') and value: self.links.append(value)
    def handle_data(self, data): self.text.append(data)


def inspect_html(text, path):
    parser=Links(); parser.feed(text)
    local=[]; quizzes=[]
    for link in parser.links:
        url=urlsplit(link)
        if url.scheme in ('http','https'):
            if '/quiz/' in url.path: quizzes.append(link)
        elif not url.scheme and url.path:
            target=(path.parent/unquote(url.path)).resolve()
            safe=target.is_relative_to(SOURCE)
            local.append({'href':link,'withinSource':safe,'exists':safe and target.is_file()})
    return {'links':local,'loginQuizReferences':quizzes,
            'text':' '.join(parser.text), 'status':'HTML_INSPECTED_NOT_QUESTION_ACCEPTANCE'}


def run():
    items=json.loads((BASE/'inventory.json').read_text(encoding='utf8'))['items']
    out=BASE/'package-content';out.mkdir(exist_ok=True)
    summary=[]; review=[]
    for item in items:
        ext=item['extension']
        if ext not in ('.html','.zip'):continue
        path=SOURCE/item['relativePath']; target=out/(item['sha256']+'.json')
        if target.exists():
            data=json.loads(target.read_text(encoding='utf8'))
        else:
            with path.open('rb') as stream: actual=hashlib.file_digest(stream,'sha256').hexdigest()
            if actual!=item['sha256']:raise ValueError('Source changed: '+str(path))
            data={'sourceSha256':actual,'relativePath':item['relativePath'],'studentVisible':False}
            if ext=='.html':
                data.update(inspect_html(path.read_text(encoding='utf8',errors='replace'),path))
            else:
                members=[]
                try:
                    with zipfile.ZipFile(path) as archive:
                        for info in archive.infolist():
                            if info.is_dir():continue
                            suffix=Path(info.filename).suffix.lower()
                            row={'name':info.filename,'bytes':info.file_size,'safePath':safe_member(info.filename)}
                            if not row['safePath']: row['status']='UNSAFE_MEMBER_PATH_REVIEW'
                            elif suffix in ('.html','.htm','.js','.xml','.json','.txt') and info.file_size<=8*1024*1024:
                                raw=archive.read(info)
                                row.update(status='TEXT_CACHED',sha256=hashlib.sha256(raw).hexdigest(),
                                    text=raw.decode('utf8',errors='replace'))
                            else: row['status']='BINARY_OR_LARGE_MEMBER_REVIEW'
                            members.append(row)
                    data.update(status='ZIP_MEMBERS_INSPECTED',members=members)
                except (OSError,zipfile.BadZipFile,RuntimeError,NotImplementedError) as error:
                    data.update(status='PACKAGE_READ_ERROR',errorType=type(error).__name__,members=members)
            write_json(target,data)
        summary.append({'relativePath':item['relativePath'],'cache':str(target.relative_to(BASE)),
                        'status':data['status'],'sourceSha256':item['sha256']})
        for url in data.get('loginQuizReferences',[]):
            review.append({'queue':'MEBI_PRACTICE_2_REVIEW_QUEUE','studentVisible':False,
                'sourceSha256':item['sha256'],'relativePath':item['relativePath'],
                'url':url,'reviewStatus':'LOCAL_QUESTION_BODY_UNAVAILABLE',
                'reason':'QUIZ_LINK_ONLY_CONTENT_NOT_PRESENT_IN_LOCAL_HTML'})
        if len(summary)%100==0: print(json.dumps({'containersInspected':len(summary)}),flush=True)
    result={'status':'CONTAINER_DISCOVERY_COMPLETE','containers':summary,
            'counts':dict(Counter(r['status'] for r in summary)),
            'reviewQueueAdditions':review,'acceptedQuestions':0,'stage02Accepted':False}
    write_json(BASE/'package-content-report.json',result)
    print(json.dumps({'status':result['status'],'counts':result['counts'],'quizReferenceReviews':len(review)}),flush=True)


if __name__=='__main__':run()
