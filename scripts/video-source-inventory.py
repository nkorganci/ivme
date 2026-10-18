"""Reconcile all project video references and cache public provider metadata.

GET requests only; never downloads video/audio, uses accounts, or infers timed
content from a title. Provider chapters are candidates pending content review.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen

APP = Path(__file__).resolve().parents[1]
STATE = APP / 'veri/content-labels'
VERSION = 'youtube-player-v1'


def load(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def provider_id(url):
    parsed = urlparse(url)
    if parsed.hostname in {'youtube.com','www.youtube.com','m.youtube.com','youtu.be'}:
        code = parsed.path.strip('/').split('/')[-1] if parsed.hostname == 'youtu.be' or parsed.path.startswith(('/shorts/','/embed/')) else parse_qs(parsed.query).get('v',[''])[0]
        if re.fullmatch('[A-Za-z0-9_-]{11}', code):
            return 'youtube:' + code
        playlist=parse_qs(parsed.query).get('list',[''])[0]
        if playlist and re.fullmatch('[A-Za-z0-9_-]+',playlist): return 'youtube-playlist:'+playlist
    return None


def description_chapters(description, duration):
    result = []
    for line in description.splitlines():
        match = re.match(r'^\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—|:]?\s*(\S.*)$', line)
        if not match:
            continue
        parts=match[1].split(':')
        if int(parts[-1])>=60 or len(parts)==3 and int(parts[1])>=60:
            continue
        seconds = 0
        for part in parts:
            seconds = seconds * 60 + int(part)
        if seconds < duration and (not result or seconds > result[-1]['startSeconds']):
            result.append({'startSeconds':seconds,'title':match[2]})
    for index, row in enumerate(result):
        row['endSeconds'] = result[index+1]['startSeconds'] if index+1 < len(result) else duration
    return [r for r in result if 0 <= r['startSeconds'] < r['endSeconds'] <= duration]


def fetch_metadata(identity):
    code = identity.split(':',1)[1]
    result = {'providerId':identity,'extractorVersion':VERSION,'checkedAt':datetime.now(timezone.utc).isoformat(),
              'url':'https://www.youtube.com/watch?' + urlencode({'v':code}),
              'availability':'UNKNOWN','durationSeconds':None,'chapters':[], 'transcriptStatus':'NOT_AVAILABLE'}
    if identity.startswith('youtube-playlist:'):
        result.update(url='https://www.youtube.com/playlist?'+urlencode({'list':code}),availability='PLAYLIST_REFERENCE',reason='PLAYLIST_ENTRIES_NOT_ENUMERATED')
        return result
    try:
        with urlopen(Request(result['url'],headers={'User-Agent':'Mozilla/5.0'}),timeout=15) as response:
            html = response.read(4_000_000).decode('utf-8',errors='replace')
            result['httpStatus'] = response.status
        match = re.search(r'ytInitialPlayerResponse\s*=\s*',html)
        if not match:
            result['reason']='PUBLIC_PLAYER_METADATA_NOT_RETURNED'
            return result
        player = json.JSONDecoder().raw_decode(html[match.end():])[0]
        play = player.get('playabilityStatus',{})
        result['availability'] = play.get('status','UNKNOWN')
        result['reason'] = play.get('reason','')
        details = player.get('videoDetails',{})
        if details.get('videoId') != code:
            result['availability']='UNKNOWN';result['reason']='PROVIDER_IDENTITY_NOT_CONFIRMED'
            return result
        result['originalTitle']=details.get('title','')
        result['channel']=details.get('author','')
        duration = int(details['lengthSeconds']) if str(details.get('lengthSeconds','')).isdigit() else None
        result['durationSeconds']=duration
        if duration:
            result['chapters']=description_chapters(details.get('shortDescription',''),duration)
        tracks=player.get('captions',{}).get('playerCaptionsTracklistRenderer',{}).get('captionTracks',[])
        result['captionLanguages']=[t.get('languageCode') for t in tracks]
        # Availability of a caption track is not evidence that timed text was read.
        result['transcriptStatus']='TRACK_AVAILABLE_NOT_FETCHED' if tracks else 'NOT_AVAILABLE'
        meaningful={k:result[k] for k in ['providerId','originalTitle','channel','durationSeconds','chapters','captionLanguages']}
        result['metadataFingerprint']=hashlib.sha256(json.dumps(meaningful,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    except HTTPError as error:
        result.update(availability='RATE_LIMITED' if error.code==429 else 'HTTP_ERROR',httpStatus=error.code,reason='PROVIDER_RATE_LIMIT' if error.code==429 else 'PROVIDER_HTTP_ERROR')
    except (URLError,TimeoutError):
        result.update(availability='UNREACHABLE',reason='NETWORK_OR_PROVIDER_TIMEOUT')
    except (ValueError,KeyError,TypeError):
        result.update(availability='UNKNOWN',reason='INVALID_PUBLIC_PLAYER_METADATA')
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh',action='store_true')
    parser.add_argument('--retry-unresolved',action='store_true',help='Retry only cached access failures; keeps successful checks')
    parser.add_argument('--limit',type=int)
    parser.add_argument('--check',action='store_true')
    args=parser.parse_args()
    if args.limit is not None and args.limit < 1: parser.error('--limit must be positive')
    references=[]
    for row in load(APP/'backend/src/main/resources/content-review-catalog.json')['items']:
        if row['kind']=='VIDEO':
            references.append({'itemKey':row['key'],'providerId':provider_id(row['url']),'url':row['url'],
                               'exam':row['exam'],'subjectId':row['subjectId'],'source':'CURRICULUM'})
    for row in load(APP.parent/'veri-hatti/ogm-indirme/katalog.json'):
        if row.get('video'):
            references.append({'itemKey':f'pdf:{row["id"]}','providerId':provider_id(row['video']),'url':row['video'],
                               'exam':row['sinav'],'subjectId':row['ders'],'source':'OGM_CATALOG'})
    identities=sorted({r['providerId'] for r in references if r['providerId']})
    cache=STATE/'video-cache';cache.mkdir(parents=True,exist_ok=True)
    records={};pending=[]
    for identity in identities:
        file=cache/(identity.replace(':','-')+'-'+VERSION+'.json')
        if file.exists():
            records[identity]=load(file)
            if records[identity].get('httpStatus')==429:
                records[identity].update(availability='RATE_LIMITED',reason='PROVIDER_RATE_LIMIT')
            if args.refresh or args.retry_unresolved and records[identity]['availability'] in {'RATE_LIMITED','HTTP_ERROR','UNREACHABLE','UNKNOWN'}:
                pending.append(identity)
        else: pending.append(identity)
    selected=[] if args.check else pending[:args.limit] if args.limit else pending
    with ThreadPoolExecutor(max_workers=1 if args.retry_unresolved else 4) as executor:
        futures={executor.submit(fetch_metadata,key):key for key in selected}
        for number,future in enumerate(as_completed(futures),1):
            key=futures[future];record=future.result()
            previous=records.get(key)
            if previous and previous.get('metadataFingerprint'):
                history=cache/'history';history.mkdir(exist_ok=True)
                old=history/(key.replace(':','-')+'-'+previous['metadataFingerprint']+'.json')
                if not old.exists():old.write_text(json.dumps(previous,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
            records[key]=record
            file=cache/(key.replace(':','-')+'-'+VERSION+'.json');temp=file.with_suffix('.tmp')
            temp.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');temp.replace(file)
            if number % 50 == 0: print(json.dumps({'checked':number,'total':len(selected)}),flush=True)
    from collections import Counter
    report={'version':1,'references':references,'sources':records,'uniqueProviderAssets':len(identities),
        'uniqueProviderVideos':sum(i.startswith('youtube:') for i in identities),
        'playlists':sum(i.startswith('youtube-playlist:') for i in identities),
        'referenceCount':len(references),'reused':len(records)-len(selected),'requested':len(selected),
        'pending':sorted(set(identities)-records.keys()),'unresolvedReferences':[r for r in references if not r['providerId']],
        'availability':dict(Counter(r['availability'] for r in records.values())),
        'withDuration':sum(bool(r['durationSeconds']) for r in records.values()),
        'withChapters':sum(bool(r['chapters']) for r in records.values()),'contentReviewed':0,'modelCalls':0}
    output=STATE/'video-inventory.json';output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k not in ['references','sources','pending','unresolvedReferences']},ensure_ascii=False))
    if args.check and report['pending']: raise SystemExit(1)


if __name__=='__main__': main()
