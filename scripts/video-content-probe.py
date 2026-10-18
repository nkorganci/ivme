"""Try public timed-text formats and enumerate playlist entries; cache failures honestly.

No accounts, media downloads or invented timings. Empty HTTP 200 responses are
not transcripts. A small caption probe bounds repeated provider-wide failures.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlencode,urlparse,parse_qs,urlunparse
from urllib.request import Request,urlopen
import xml.etree.ElementTree as ET

APP=Path(__file__).resolve().parents[1]
STATE=APP/'veri/content-labels'
VERSION='public-caption-playlist-v2'


def load(path):return json.loads(path.read_text(encoding='utf-8'))


def get(url):
    with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=12) as response:
        return response.status,response.read(8_000_000)


def embedded(html,name):
    match=re.search(r'(?:'+re.escape(name)+r'|\["'+re.escape(name)+r'"\])\s*=\s*',html)
    return json.JSONDecoder().raw_decode(html[match.end():])[0] if match else {}


def playlist_entries(data):
    found={}
    def walk(value):
        if isinstance(value,dict):
            for key,row in value.items():
                if key in {'playlistVideoRenderer','playlistPanelVideoRenderer'} and isinstance(row,dict):
                    code=row.get('videoId','')
                    title=row.get('title',{})
                    title=title.get('simpleText') or ''.join(r.get('text','') for r in title.get('runs',[]))
                    if re.fullmatch('[a-zA-Z0-9_-]{11}',code):
                        found.setdefault(code,{'providerId':'youtube:'+code,'title':title,'url':'https://www.youtube.com/watch?v='+code})
                walk(row)
        elif isinstance(value,list):
            for row in value:walk(row)
    walk(data)
    return [{**row,'position':n+1} for n,row in enumerate(found.values())]


def timed_segments(raw,fmt,duration):
    result=[]
    if not raw.strip():return result
    if fmt=='json3':
        for event in json.loads(raw).get('events',[]):
            if event.get('segs') and 'tStartMs' in event and 'dDurationMs' in event:
                result.append({'startSeconds':event['tStartMs']/1000,'endSeconds':(event['tStartMs']+event['dDurationMs'])/1000,
                               'text':''.join(s.get('utf8','') for s in event['segs']).strip()})
    else:
        root=ET.fromstring(raw)
        for row in root.iter():
            if row.tag=='text' and row.get('start') is not None:
                start=float(row.get('start'));end=start+float(row.get('dur','0'))
            elif row.tag=='p' and row.get('t') is not None:
                start=float(row.get('t'))/1000;end=start+float(row.get('d','0'))/1000
            else:continue
            result.append({'startSeconds':start,'endSeconds':end,'text':''.join(row.itertext()).strip()})
    return [s for s in result if s['text'] and 0<=s['startSeconds']<s['endSeconds']<=duration]


def probe(identity,metadata):
    row={'providerId':identity,'extractorVersion':VERSION,'checkedAt':datetime.now(timezone.utc).isoformat(),
         'sourceMetadataFingerprint':metadata.get('metadataFingerprint'),'attempts':[],'status':'MANUAL_REVIEW_REQUIRED'}
    try:
        status,raw=get(metadata['url']);html=raw.decode('utf-8','replace')
        if identity.startswith('youtube-playlist:'):
            entries=playlist_entries(embedded(html,'ytInitialData'))
            row.update(entries=entries,status='ENTRIES_EXTRACTED' if entries else 'PLAYLIST_ENTRIES_UNRESOLVED',
                       coverage='FIRST_PUBLIC_RESPONSE_ONLY')
            row['attempts'].append({'method':'PUBLIC_PLAYLIST_DATA','httpStatus':status,'entries':len(entries)})
            if not entries:
                try:
                    rss_status,rss=get('https://www.youtube.com/feeds/videos.xml?'+urlencode({'playlist_id':identity.split(':',1)[1]}))
                    feed=ET.fromstring(rss)
                    for entry in feed.findall('{http://www.w3.org/2005/Atom}entry'):
                        code=entry.findtext('{http://www.youtube.com/xml/schemas/2015}videoId')
                        if code and re.fullmatch('[a-zA-Z0-9_-]{11}',code):entries.append({'providerId':'youtube:'+code,
                            'title':entry.findtext('{http://www.w3.org/2005/Atom}title') or '',
                            'url':'https://www.youtube.com/watch?v='+code,'feedPosition':len(entries)+1})
                    row['attempts'].append({'method':'PUBLIC_PLAYLIST_RSS','httpStatus':rss_status,'entries':len(entries)})
                    row.update(entries=entries,status='PARTIAL_ENTRIES_EXTRACTED' if entries else 'PLAYLIST_ENTRIES_UNRESOLVED',coverage='RSS_RECENT_ENTRIES_ONLY')
                except Exception as error:row['attempts'].append({'method':'PUBLIC_PLAYLIST_RSS','errorType':type(error).__name__})
        else:
            player=embedded(html,'ytInitialPlayerResponse')
            tracks=player.get('captions',{}).get('playerCaptionsTracklistRenderer',{}).get('captionTracks',[])
            if not tracks:row['reason']='NO_PUBLIC_CAPTION_TRACK';return row
            track=next((t for t in tracks if t.get('languageCode')=='tr'),tracks[0]);u=urlparse(track['baseUrl'])
            if u.scheme!='https' or u.hostname not in {'www.youtube.com','youtube.com'} or u.path!='/api/timedtext':
                raise ValueError('Unexpected public caption source')
            for fmt in ['json3','srv3','srv1']:
                parameters=parse_qs(u.query);parameters['fmt']=[fmt]
                url=urlunparse(u._replace(query=urlencode(parameters,doseq=True)))
                status,raw=get(url)
                segments=timed_segments(raw,fmt,metadata.get('durationSeconds') or 0)
                row['attempts'].append({'method':'PUBLIC_TIMEDTEXT_'+fmt.upper(),'httpStatus':status,'bytes':len(raw),'segments':len(segments)})
                if segments:
                    row.update(status='TIMED_TEXT_EXTRACTED',segments=segments,language=track.get('languageCode'));break
            if row['status']!='TIMED_TEXT_EXTRACTED':row['reason']='PUBLIC_TIMEDTEXT_EMPTY_OR_UNUSABLE'
            if row['status']!='TIMED_TEXT_EXTRACTED':
                direct='https://www.youtube.com/api/timedtext?'+urlencode({'v':identity.split(':',1)[1],'lang':track.get('languageCode','tr'),'kind':'asr','fmt':'json3'})
                status,raw=get(direct);segments=timed_segments(raw,'json3',metadata.get('durationSeconds') or 0)
                row['attempts'].append({'method':'PUBLIC_TIMEDTEXT_DIRECT_ASR','httpStatus':status,'bytes':len(raw),'segments':len(segments)})
                if segments:row.update(status='TIMED_TEXT_EXTRACTED',segments=segments,language=track.get('languageCode'))
    except Exception as error:row['reason']=type(error).__name__
    row['evidenceFingerprint']=hashlib.sha256(json.dumps({k:v for k,v in row.items() if k!='checkedAt'},sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    return row


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--caption-limit',type=int,default=3);parser.add_argument('--refresh',action='store_true')
    args=parser.parse_args()
    if args.caption_limit<0:parser.error('Non-negative caption limit required')
    inventory=load(STATE/'video-inventory.json')['sources']
    cache=STATE/'video-content-cache';cache.mkdir(exist_ok=True)
    output={};used=0;reused=0
    for identity,metadata in inventory.items():
        file=cache/(identity.replace(':','-')+'-'+VERSION+'.json')
        saved=load(file) if file.exists() else None
        if saved and not args.refresh and saved.get('sourceMetadataFingerprint')==metadata.get('metadataFingerprint'):
            output[identity]=saved;reused+=1;continue
        if identity.startswith('youtube:') and (not metadata.get('captionLanguages') or used>=args.caption_limit):continue
        if identity.startswith('youtube:'):used+=1
        row=probe(identity,metadata);output[identity]=row
        if saved and saved.get('entries'):
            entries={e['providerId']:e for e in saved['entries']}
            entries.update({e['providerId']:e for e in row.get('entries',[])})
            row['entries']=list(entries.values())
        row['evidenceFingerprint']=hashlib.sha256(json.dumps({k:v for k,v in row.items() if k not in {'checkedAt','evidenceFingerprint'}},sort_keys=True,ensure_ascii=False).encode()).hexdigest()
        if saved and saved.get('evidenceFingerprint')!=row.get('evidenceFingerprint'):
            history=cache/'history';history.mkdir(exist_ok=True)
            previous=history/(identity.replace(':','-')+'-'+str(saved.get('evidenceFingerprint','legacy'))+'.json')
            if not previous.exists():previous.write_text(json.dumps(saved,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        temp=file.with_suffix('.tmp');temp.write_text(json.dumps(row,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');temp.replace(file)
        print(json.dumps({'providerId':identity,'status':row['status'],'reason':row.get('reason'),'entries':len(row.get('entries',[]))}),flush=True)
    report={'version':1,'extractorVersion':VERSION,'sources':output,'summary':{'captionRequests':used,'reused':reused,
        'states':dict(Counter(r['status'] for r in output.values())),'unprobedVideoAssets':sum(k.startswith('youtube:') and k not in output for k in inventory),
        'playlistEntries':sum(len(r.get('entries',[])) for r in output.values()),'modelCalls':0}}
    (STATE/'video-content-index.json').write_text(json.dumps(report,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    print(json.dumps(report['summary']))


if __name__=='__main__':main()
