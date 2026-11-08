"""Generate provider course/unit/topic views over unique prepared archive objects."""
from collections import defaultdict
import html
import json
import os
from pathlib import Path
from urllib.parse import quote,unquote,urlsplit

from yks_birlestirme import Store,digest,read_json,write_json,signature,process_lock
from yks_arsiv_hazirla import TARGET
from yks_yol_matrisi import Links
from yks_kaynak import path_key,relative_part

APP=Path(__file__).resolve().parents[1]
CSS='body{font:17px/1.55 system-ui;max-width:1160px;margin:24px auto;padding:16px;color:#182b45;background:#f5f7fa}a{color:#174d91;overflow-wrap:anywhere}article,details,section{background:white;border:1px solid #dce3eb;border-radius:10px;padding:16px;margin:14px 0}h1{font-size:1.8rem;overflow-wrap:anywhere}h2{font-size:1.35rem}li{margin:8px 0;overflow-wrap:anywhere}input{font:inherit;padding:12px;box-sizing:border-box;width:100%}summary{cursor:pointer;font-weight:bold}small{color:#42556d}[hidden]{display:none!important}'


def page(title,body):return '<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+html.escape(title)+'</title><style>'+CSS+'</style>'+body+'</html>'


def local_href(source,target):return quote(os.path.relpath(target,source.parent).replace('\\','/'),safe='/')


def build(candidate,projection,origins,target):
    locations={path_key(r['originalPath']):r for r in projection['locations']}
    groups=defaultdict(list);courses=candidate['navigation']
    for course in courses:
        for unit in course['units']:
            for topic in unit['topics']:groups[topic['contentKey']].append((course,unit,topic))
    view_folder=target/'Gezinme';view_folder.mkdir(exist_ok=True)
    views={};files=[];assets=0
    for key,refs in groups.items():
        file=view_folder/(signature(key)[:24]+'.html');views[key]=file
        topics=[t for c,u,t in refs];names=list(dict.fromkeys(t['title'] for t in topics))
        scopes=sorted({e for t in topics for e in t['examScopes']})
        body='<p><a href="../index.html">YKS kaynakları</a></p><h1>'+html.escape(' / '.join(names))+'</h1><p>'+html.escape(' + '.join(scopes))+'</p>'
        contexts=list(dict.fromkeys(c['title']+' · '+u['title'] for c,u,t in refs))
        body+='<p>'+html.escape(' / '.join(contexts))+'</p><section><h2>Kaynaklar</h2><ul>'
        unique={a['sourceSha256']:a for t in topics for a in t['assets']}
        for sha,asset in unique.items():
            mapped=locations.get(path_key(asset['originalPath']))
            if mapped is None or mapped['sha256']!=sha:raise ValueError('Provider topic asset identity is not in prepared archive')
            resource=target/relative_part(mapped['target'])
            if not resource.is_file() or not resource.resolve().is_relative_to(target.resolve()):raise ValueError('Prepared provider asset missing/unsafe')
            label={'pdf':'PDF konu özeti','mp4':'Konu anlatım videosu','mp3':'Sesli özet'}.get(asset['kind'],asset['title'])
            body+='<li><a href="'+local_href(file,resource)+'">'+html.escape(label)+'</a></li>';assets+=1
        body+='</ul></section><section><h2>MEBİ çalışmaları</h2><ul>'
        for c,u,t in refs:
            url='https://mebi.eba.gov.tr'+t['sourceUrl']
            body+='<li><a href="'+html.escape(url,quote=True)+'">'+html.escape(c['exam']+' · '+t['title'])+'</a></li>'
        body+='</ul><p>Çevrim içi çalışmalar MEBİ hesabıyla açılır.</p></section>'
        file.write_text(page(names[0],body),encoding='utf-8')
        files.append({'path':file.relative_to(target).as_posix(),'sha256':digest(file),'contentKey':key,
            'categoryIds':list(dict.fromkeys(t['categoryId'] for t in topics)),'examScopes':scopes})
    index=target/'index.html'
    body='<h1>YKS kaynakları</h1><p>TYT ve AYT · ders, ünite ve konu sırasıyla</p><input id="q" type="search" aria-label="Kaynak ara" placeholder="Ders, ünite veya konu ara"><main>'
    for course in courses:
        body+='<details class="course" open><summary>'+html.escape(course['exam']+' · '+course['title'])+'</summary>'
        for unit in course['units']:
            body+='<section class="unit"><h2>'+html.escape(unit['title'])+'</h2><ol>'
            for topic in unit['topics']:
                search=' '.join([course['exam'],course['title'],unit['title'],topic['title']])
                body+='<li class="entry" data-search="'+html.escape(search,quote=True)+'"><a href="'+local_href(index,views[topic['contentKey']])+'">'+html.escape(topic['title'])+'</a></li>'
            body+='</ol></section>'
        body+='</details>'
    body+='</main><details class="course"><summary>Kitaplar, denemeler, taramalar ve bütün kaynak dosyaları</summary><ul>'
    for row in origins['resources']:
        if row['role']!='SOURCE_RESOURCE':continue
        resource=target/relative_part(row['target'])
        body+='<li class="entry" data-search="'+html.escape(row['target'],quote=True)+'"><a href="'+local_href(index,resource)+'">'+html.escape(row['target'])+'</a></li>'
    body+='</ul></details><script>document.getElementById("q").oninput=e=>{const q=e.target.value.toLocaleLowerCase("tr");document.querySelectorAll(".entry").forEach(x=>x.hidden=!x.dataset.search.toLocaleLowerCase("tr").includes(q));document.querySelectorAll(".unit,.course").forEach(x=>{x.hidden=![...x.querySelectorAll(".entry")].some(e=>!e.hidden);if(q&&x.tagName==="DETAILS")x.open=true})}</script>'
    index.write_text(page('YKS kaynakları',body),encoding='utf-8');files.append({'path':'index.html','sha256':digest(index)})
    link_count=0
    for row in files:
        file=target/row['path'];parser=Links();parser.feed(file.read_text(encoding='utf-8'))
        for href in parser.links:
            parsed=urlsplit(href)
            if parsed.scheme or parsed.netloc or not parsed.path:continue
            path=(file.parent/unquote(parsed.path)).resolve()
            if not path.is_relative_to(target.resolve()) or not path.is_file():raise ValueError('Generated archive link is missing or unsafe')
            link_count+=1
    return {'version':1,'status':'PREPARED','courses':len(courses),'units':sum(len(c['units']) for c in courses),
        'providerTopics':sum(len(u['topics']) for c in courses for u in c['units']),'uniqueContentViews':len(groups),
        'topicAssetLinks':assets,'generatedLocalLinks':link_count,'newBrokenLinks':0,'files':files}


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    stage=state['stages']['YKS-04:full']
    artifact=next(a for a in stage['artifacts'] if a['path'].endswith('navigation-candidate.json'))
    file=store.child(state['runId']+'/'+artifact['path'])
    if stage['status']!='VERIFIED' or digest(file)!=artifact['sha256']:raise ValueError('Verified provider tree required')
    folder=store.child(state['runId']+'/arsiv-hazirlik')
    with process_lock(folder/'.navigation-writer.lock'):
        report=build(read_json(file),read_json(TARGET/'Katalog/hazirlanan-yollar.json'),read_json(TARGET/'Katalog/kaynak-kokenleri.json'),TARGET)
        report.update(providerTreeSha256=artifact['sha256'],generatorSha256=digest(Path(__file__)),originalSourceWrites=0,
                      catalogPublished=False,modelsCalled=0)
        write_json(TARGET/'Katalog/gezinti.json',report)
        write_json(folder/'archive-navigation-report.json',report)
    print(json.dumps({k:v for k,v in report.items() if k!='files'}))


if __name__=='__main__':main()
