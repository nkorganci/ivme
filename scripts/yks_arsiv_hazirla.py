"""Prepare an inactive, deduplicated archive from verified inventory.

Originals remain untouched. Immutable resources use same-volume hardlinks (not
backups); operational metadata is copied. No live path or catalog is activated.
"""
from collections import defaultdict, Counter
import html
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
from urllib.parse import quote

from yks_birlestirme import Store, digest, process_lock, read_json, write_json
from yks_stages.database import RESERVE
from yks_kaynak import SourceResolver

APP=Path(__file__).resolve().parents[1]
TARGET=APP.parent/'Kaynaklar/YKS'
IMMUTABLE={'.pdf','.mp4','.mp3','.zip','.xlsx','.xls','.docx'}


def segment(value,limit=52):
    clean=re.sub(r'[<>:"/\\|?*\x00-\x1f]',' ',str(value)).strip(' .')
    clean=re.sub(r'\s+',' ',clean)
    if not clean or clean.upper() in {'CON','PRN','AUX','NUL',*[f'COM{i}' for i in range(1,10)],*[f'LPT{i}' for i in range(1,10)]}:
        clean='Kaynak '+clean
    return (clean[:limit-9].rstrip(' .')+'--'+hashlib.sha256(clean.encode()).hexdigest()[:7]) if len(clean)>limit else clean


def resource_target(row,metadata):
    path=PurePosixPath(row['path']);parts=path.parts
    extension=path.suffix.lower()
    stem=segment(path.stem,56)
    name=stem+'--'+row['sha256'][:10]+extension
    if row['role']!='SOURCE_RESOURCE':
        return Path('Katalog/KaynakKayitlari')/segment(Path(row['root']).name)/Path(*[segment(p,45) for p in parts[:-1]])/name
    mebi=Path(row['root']).name=='mebi-yks'
    detail=metadata.get(row['path'],{})
    refs=detail.get('references',[])
    source_path=next((r['path'] for r in refs if '/subject-details/' in r.get('source','') and len(r.get('path',[]))==4),None)
    if mebi and source_path:
        exam,course,unit,topic=source_path
        course=re.sub(r'\s*\((?:TYT|AYT|TYT/AYT)\)\s*$','',course)
        kind='Videolar' if extension=='.mp4' else 'Sesli Ozetler' if extension=='.mp3' else 'Konu Ozetleri' if extension=='.pdf' else 'Diger Kaynaklar'
        return Path('Dersler')/segment(course,28)/exam/segment(unit,40)/segment(topic,48)/kind/name
    if 'Taramalar' in parts:
        i=parts.index('Taramalar');tail=parts[i+1:-1]
        tail=[p for p in tail if p not in ('PDF','Videolar')]
        return Path('Taramalar')/Path(*[segment(p,46) for p in tail])/name
    if any('Deneme' in p or 'deneme' in p for p in parts):
        exam=next((p for p in parts if p in ('TYT','AYT','Ortak')),'Ortak')
        return Path('Denemeler')/exam/segment(path.parent.parent.name,48)/name
    if Path(row['root']).name=='mufredat':
        return Path('Mufredat')/Path(*[segment(p,45) for p in parts[:-1]])/name
    if not mebi and Path(row['root']).name=='ogm-materyal' and len(parts)>=3:
        # Do not invent a narrow topic for a multi-topic book.
        return Path('Kitaplar')/segment(parts[0],28)/segment(parts[1],20)/segment(parts[-2],44)/name
    if Path(row['root']).name=='yks-cikmis-sorular':
        return Path('Cikmis Sorular')/segment(parts[0],40)/name
    exam=next((p for p in parts if p in ('TYT','AYT','Ortak')),'Ortak')
    category=next((p for p in reversed(parts[:-1]) if p not in ('PDF','Videolar','Cevrimdisi Paketler','Sesler')), 'Genel')
    return Path('Kitaplar')/exam/segment(category,48)/name


def build_plan(observations,metadata):
    groups=defaultdict(list);exceptions=[]
    for row in observations:
        if row['kind']!='FILE':continue
        if row['role']=='INCOMPLETE_OR_CONTROL':
            exceptions.append({**row,'reason':'Incomplete/control file retained at original path; not a resource'})
        else:groups[row['sha256']].append(row)
    resources=[];locations=[];targets=set()
    for sha,rows in sorted(groups.items()):
        canonical=min(rows,key=lambda r:(r['role']!='SOURCE_RESOURCE',Path(r['root']).name!='mebi-yks',len(r['path']),r['path']))
        target=resource_target(canonical,metadata)
        key=target.as_posix().casefold()
        if key in targets:raise ValueError('Target path collision')
        targets.add(key)
        row={'sha256':sha,'bytes':canonical['bytes'],'target':target.as_posix(),
             'sourcePath':str(Path(canonical['root'])/canonical['path']),
             'role':canonical['role'],'originals':rows,
             'method':'HARDLINK_IMMUTABLE' if canonical['role']=='SOURCE_RESOURCE' and target.suffix.lower() in IMMUTABLE else 'COPY_METADATA'}
        resources.append(row)
        for original in rows:
            locations.append({'originalPath':str(Path(original['root'])/original['path']),
                              'target':row['target'],'sha256':sha,'bytes':original['bytes']})
    return resources,locations,exceptions


def prepare(resources,locations,exceptions,target,folder):
    target=target.resolve()
    if target==target.parent or not target.is_dir():raise ValueError('Explicit existing target directory required')
    catalog=target/'Katalog';catalog.mkdir(exist_ok=True)
    projection={'version':1,'status':'PREPARED','archiveRoot':str(target),'locations':locations,
                'note':'Inactive physical location projection; does not own catalog/category/review identities.'}
    write_json(catalog/'hazirlanan-yollar.json',projection)
    hits=0
    for i,row in enumerate(resources,1):
        source=Path(row['sourcePath']);destination=(target/row['target'])
        if not destination.resolve().is_relative_to(target) or destination.is_symlink():
            raise ValueError('Unsafe archive destination')
        if destination.is_file():
            if digest(destination)!=row['sha256']:raise ValueError('Existing archive destination has different content')
            hits+=1
        else:
            if source.is_symlink() or digest(source)!=row['sha256']:raise ValueError('Original source bytes changed')
            if min(shutil.disk_usage(target).free,shutil.disk_usage(Path.home()).free)<RESERVE:
                raise RuntimeError('Disk reserve reached')
            destination.parent.mkdir(parents=True,exist_ok=True)
            if row['method']=='HARDLINK_IMMUTABLE':
                if source.stat().st_dev!=target.stat().st_dev:raise ValueError('Hardlink preparation must stay on one volume')
                os.link(source,destination)
            else:
                temporary=destination.with_name(destination.name+'.part')
                shutil.copyfile(source,temporary);temporary.replace(destination)
            if digest(destination)!=row['sha256']:raise ValueError('Prepared archive bytes differ')
        if i%100==0 or i==len(resources):
            write_json(folder/'archive-progress.json',{'status':'RUNNING','resourcesPrepared':i,'total':len(resources),'archiveRoot':str(target)})
            print(f'Archive preparation: {i}/{len(resources)} unique files',flush=True)
    resolver=SourceResolver(target,catalog/'hazirlanan-yollar.json',prepared=True)
    # Every legacy location must be mapped exactly once. Each physical target was
    # fully hashed above; repeat selected resolution across roots/formats in tests.
    if len(resolver.locations)!=len(locations):raise ValueError('Legacy alias coverage differs')
    write_json(catalog/'kaynak-kokenleri.json',{'version':1,'resources':resources,'exceptions':exceptions})
    links=[]
    for row in resources:
        if row['role']=='SOURCE_RESOURCE':
            links.append('<li><a href="'+quote(row['target'],safe='/')+'">'+html.escape(row['target'])+'</a></li>')
    page='<!doctype html><html lang="tr"><meta charset="utf-8"><title>YKS kaynak arşivi</title><style>body{font:16px system-ui;max-width:1200px;margin:2rem auto;padding:1rem}input{padding:.7rem;width:95%}li{margin:.65rem 0;overflow-wrap:anywhere}a{color:#174d91}</style><h1>YKS kaynak arşivi</h1><p>Hazırlık sürümü. Dersler, üniteler, konu özetleri, video, ses, kitap, deneme ve tarama kaynakları.</p><input id="q" aria-label="Kaynak ara" placeholder="Ders, konu veya dosya ara"><ul>'+''.join(links)+'</ul><script>document.getElementById("q").oninput=e=>{let q=e.target.value.toLocaleLowerCase("tr");document.querySelectorAll("li").forEach(x=>x.hidden=!x.textContent.toLocaleLowerCase("tr").includes(q))}</script></html>'
    (target/'index.html').write_text(page,encoding='utf-8')
    report={'status':'PASS','scope':'INACTIVE_ARCHIVE_PREPARATION','resources':len(resources),'legacyLocations':len(locations),
            'originalExceptions':len(exceptions),'methods':dict(Counter(r['method'] for r in resources)),
            'logicalBytes':sum(r['bytes'] for r in resources),'copiedMetadataBytes':sum(r['bytes'] for r in resources if r['method']=='COPY_METADATA'),
            'reusedTargets':hits,'sourceFilesMoved':0,'sourceFilesDeleted':0,'liveConfigurationChanged':False,
            'allTargetHashesVerified':True,'projectionSha256':digest(catalog/'hazirlanan-yollar.json'),
            'originsSha256':digest(catalog/'kaynak-kokenleri.json'),'hardlinksAreBackups':False,
            'nextAction':'Complete YKS-04/05 compatibility/semantic checks and YKS-07..10 pilot; YKS-11 alone activates archive'}
    write_json(folder/'archive-preparation-report.json',report)
    return report


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    if store.verify(state,'YKS-02')['status']!='VERIFIED':raise ValueError('Verified inventory required')
    record=state['stages']['YKS-02:full']
    path=next(store.child(state['runId']+'/'+a['path']) for a in record['artifacts'] if a['path'].replace('\\','/').endswith('/inventory.jsonl'))
    observations=[json.loads(line) for line in path.read_text(encoding='utf-8').splitlines()]
    mebi=read_json(Path(state['sourceRoots'][0])/'dosya-listesi.json')
    metadata={}
    for row in mebi:
        for p in [row['path'],*row.get('aliases',[])]:metadata[p.replace('\\','/')]=row
    resources,locations,exceptions=build_plan(observations,metadata)
    folder=store.child(state['runId']+'/arsiv-hazirlik');folder.mkdir(exist_ok=True)
    # This independent, reversible preparation is not acceptance of YKS-06 and
    # does not bypass unresolved taxonomy/generator or publication gates.
    TARGET.mkdir(exist_ok=True)
    with process_lock(folder/'.writer.lock'):
        report=prepare(resources,locations,exceptions,TARGET,folder)
    print(json.dumps(report),flush=True)


if __name__=='__main__':main()
