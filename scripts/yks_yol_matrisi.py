"""Prepare exact legacy layouts and verify every old path without activating them.

Immutable resources link to the unique prepared object. Mutable metadata copies
retain exact original relative names, including HTML's relative asset links.
"""
from collections import Counter
import json
import os
from pathlib import Path
import shutil
from urllib.parse import unquote,urlsplit
from html.parser import HTMLParser

from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_stages.stage_02 import tree_snapshot
from yks_arsiv_hazirla import IMMUTABLE,TARGET
from yks_kaynak import path_key,relative_part

APP=Path(__file__).resolve().parents[1]


class Links(HTMLParser):
    def __init__(self):super().__init__();self.links=[]
    def handle_starttag(self,tag,attrs):
        self.links.extend(value for key,value in attrs if key in ('href','src') and value)


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    stage=state['stages']['YKS-02:full']
    inventory=next(store.child(state['runId']+'/'+a['path']) for a in stage['artifacts'] if a['path'].endswith('inventory.jsonl'))
    entries=[json.loads(line) for line in inventory.read_text(encoding='utf-8').splitlines()]
    before,links=tree_snapshot(state['sourceRoots'])
    if signature([before,links])!=stage['inputs']['sourceTreeSignature']:raise ValueError('Original source tree changed since verified inventory')
    projection=read_json(TARGET/'Katalog/hazirlanan-yollar.json')
    origins=read_json(TARGET/'Katalog/kaynak-kokenleri.json')
    preparation=read_json(store.child(state['runId']+'/arsiv-hazirlik/archive-preparation-report.json'))
    if projection['status']!='PREPARED' or preparation['projectionSha256']!=digest(TARGET/'Katalog/hazirlanan-yollar.json') or preparation['originsSha256']!=digest(TARGET/'Katalog/kaynak-kokenleri.json'):
        raise ValueError('Archive preparation proof changed')
    by_old={path_key(r['originalPath']):r for r in projection['locations']}
    objects={r['sha256']:r for r in origins['resources']}
    folder=store.child(state['runId']+'/yol-uyumluluk');folder.mkdir(exist_ok=True)
    mirror=TARGET/'Katalog/EskiYollar';mirror.mkdir(exist_ok=True)
    roots=[{'originalRoot':r,'target':('Katalog/EskiYollar/'+Path(r).name)} for r in state['sourceRoots']]
    rows=[];counts=Counter();html_links=[];verified=set()
    with process_lock(folder/'.path-matrix.lock'):
        for entry in entries:
            if entry['kind']!='FILE':continue
            source=Path(entry['root'])/relative_part(entry['path'])
            destination=mirror/Path(entry['root']).name/relative_part(entry['path'])
            if not destination.resolve().is_relative_to(mirror.resolve()) or destination.is_symlink():raise ValueError('Unsafe compatibility destination')
            mapping=by_old.get(path_key(source));obj=objects.get(entry['sha256'])
            immutable=entry['role']=='SOURCE_RESOURCE' and source.suffix.lower() in IMMUTABLE
            if mapping and mapping['sha256']!=entry['sha256']:raise ValueError('Location source identity differs')
            canonical=TARGET/relative_part(mapping['target']) if mapping else source
            if immutable:
                if entry['sha256'] not in verified:
                    if obj is None or not canonical.is_file() or not os.path.samefile(canonical,obj['sourcePath']):
                        raise ValueError('Immutable object no longer shares verified source identity')
                    verified.add(entry['sha256'])
                if destination.exists():
                    if not os.path.samefile(destination,canonical):raise ValueError('Existing compatibility resource is not the unique object')
                else:
                    destination.parent.mkdir(parents=True,exist_ok=True);os.link(canonical,destination)
                method='SHARED_VERIFIED_IMMUTABLE_OBJECT'
            else:
                if not destination.exists():
                    destination.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,destination)
                if digest(destination)!=entry['sha256']:raise ValueError('Compatibility metadata differs')
                method='COPIED_EXACT_LEGACY_METADATA'
            counts[method]+=1
            rows.append({'originalPath':str(source),'compatibilityTarget':destination.relative_to(TARGET).as_posix(),
                'sourceSha256':entry['sha256'],'canonicalTarget':mapping['target'] if mapping else None,'method':method})
            if len(rows)%500==0:print(f'Legacy path matrix: {len(rows)}/{len(before)}',flush=True)
        targets={path_key(TARGET/r['compatibilityTarget']) for r in rows}
        for row in rows:
            file=TARGET/row['compatibilityTarget']
            if file.suffix.lower() not in ('.html','.htm'):continue
            parser=Links();parser.feed(file.read_text(encoding='utf-8-sig'))
            for link in parser.links:
                url=urlsplit(link)
                if url.scheme or url.netloc or not url.path:continue
                target=(file.parent/unquote(url.path)).resolve()
                if not target.is_relative_to(mirror.resolve()):raise ValueError('Legacy HTML local link escapes compatibility archive')
                html_links.append({'html':row['compatibilityTarget'],'href':link,
                    'exists':target.is_file(),'indexed':path_key(target) in targets})
        missing=[r for r in html_links if not r['exists']]
        # Pre-existing unpublished links stay explicitly unresolved. A migration
        # cannot silently turn them into downloaded assets or claim them as new failures.
        for row in missing:
            html=next(r for r in rows if r['compatibilityTarget']==row['html'])
            old=(Path(html['originalPath']).parent/unquote(urlsplit(row['href']).path)).resolve()
            if old.is_file():raise ValueError('A valid legacy HTML link broke in the prepared layout')
            row['reason']='ALREADY_MISSING_IN_ORIGINAL_SOURCE'
        after,after_links=tree_snapshot(state['sourceRoots'])
        if signature([before,links])!=signature([after,after_links]):raise ValueError('Original source tree changed during compatibility preparation')
        write_json(folder/'legacy-path-matrix.json',{'version':1,'status':'PREPARED','legacyRoots':roots,'locations':rows})
        write_json(folder/'legacy-html-links.json',{'links':html_links,'preexistingMissing':missing})
        report={'status':'PASS','scope':'INACTIVE_EXACT_LEGACY_LAYOUT_COMPATIBILITY','legacyFiles':len(rows),
            'methods':dict(counts),'htmlLocalLinks':len(html_links),'preexistingMissingLinks':len(missing),'newBrokenLinks':0,
            'oldSourceTreeUnchanged':True,'sourceTreeSignature':signature([before,links]),
            'immutableValidation':'UNCHANGED_FULL_SHA_INVENTORY_PLUS_SAME_PHYSICAL_OBJECT',
            'metadataValidation':'FRESH_FULL_SHA256','rootsActivated':0,'sourceFilesMoved':0,'sourceFilesDeleted':0,
            'matrixSha256':digest(folder/'legacy-path-matrix.json'),'htmlLinksSha256':digest(folder/'legacy-html-links.json')}
        write_json(folder/'path-matrix-report.json',report)
    print(json.dumps(report))


if __name__=='__main__':main()
