"""Independent whole-bank prose/stem/option retrieval; no automatic NEW decision."""
import argparse
from collections import Counter,defaultdict
import hashlib
import re
from pathlib import Path
import unicodedata

from yks_birlestirme import Store,digest,signature,read_json,write_json
from yks_soru_pilotu import APP,live_bank
from yks_secenek_degisimi import choices


def prose(value):
    value=unicodedata.normalize('NFC',value).replace('\u00ad','')
    value=re.sub(r'([a-zçğıöşüA-ZÇĞİÖŞÜ])-\s*\n\s*([a-zçğıöşüA-ZÇĞİÖŞÜ])',r'\1\2',value)
    return re.sub(r'\s+',' ',value.casefold().replace('i\u0307','i').translate(str.maketrans({'“':'"','”':'"','’':"'",'‘':"'"}))).strip()


def parts(text):
    # Join native PDF line wrapping before choices() folds whitespace; otherwise
    # the line-break distinction is irreversibly lost as an ordinary hyphen.
    text=re.sub(r'([a-zçğıöşüA-ZÇĞİÖŞÜ])-\s*\n\s*([a-zçğıöşüA-ZÇĞİÖŞÜ])',r'\1\2',text)
    try:
        stem,options=choices(text)
        return prose(stem),{letter:prose(value) for letter,value in options.items()}
    except ValueError:
        stem=re.split(r'(?:^|\s)A\s*\)',text,maxsplit=1)[0]
        return prose(re.sub(r'^\s*\d+[.)]\s*','',stem)),None


def features(stem):
    words=re.findall(r'[\w]+|[^\w\s]',stem)
    return set(words),set(zip(words,words[1:]))


def same_content(left,right):
    a,first=parts(left);b,second=parts(right)
    if not first or not second or a!=b or sorted(first.values())!=sorted(second.values()):return None
    mapping={letter:next(k for k,v in second.items() if v==value) for letter,value in first.items()}
    return {'letterMapping':mapping,'sameOptionOrder':all(k==v for k,v in mapping.items()),
        'method':'COMPLETE_NORMALIZED_STEM_AND_ALL_FIVE_OPTION_CONTENTS'}


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--subject',default='din');args=parser.parse_args()
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    folder=root/'question-topics'/args.subject;retrieval=read_json(folder/'topic-candidates.json');cards=[]
    for path,sha in retrieval['questionPackages'].items():
        if digest(path)!=sha:raise ValueError('Source question package changed')
        cards.extend(c for c in read_json(path)['cards'] if c['subjectId']==args.subject)
    bank,ocr=live_bank(APP);bank_sha=signature(bank)
    inventory=APP/'veri/content-labels/source-inventory.json';original={q['code']:q for q in read_json(inventory)['questions']}
    source_features=[];inverse=defaultdict(set)
    for i,card in enumerate(cards):
        if digest(card['image'])!=card['imageSha256']:raise ValueError('Source crop changed')
        stem,options=parts(card['text'])
        if not options:raise ValueError('Five complete source options required')
        words,pairs=features(stem);source_features.append((stem,options,words,pairs))
        for pair in pairs:inverse[pair].add(i)
    matches=[[] for c in cards];exact=[[] for c in cards];missing=[];text_hashes=[]
    for index,q in enumerate(bank):
        evidence=original.get(q['code'],{})
        if evidence.get('updated_at')!=q['stamp'] or evidence.get('image')!=q['image']:
            raise ValueError('Original bank text is stale: '+q['code'])
        native=evidence.get('original',{}).get('text','') or '';observed=ocr.get(q['code'],'') or ''
        variants=list(dict.fromkeys([v for v in [native,observed] if len(v.strip())>30]))
        if not variants:missing.append({**q,'nativeText':native,'ocrText':observed});continue
        text_hashes.append([q['code'],*[signature(v) for v in variants]])
        for text in variants:
            stem,options=parts(text);words,pairs=features(stem);overlaps=Counter()
            for pair in pairs:
                for i in inverse.get(pair,()):overlaps[i]+=1
            for i,(source_stem,source_options,source_words,source_pairs) in enumerate(source_features):
                if stem==source_stem and options and sorted(options.values())==sorted(source_options.values()):
                    exact[i].append({'code':q['code'],'version':q['stamp'],'answer':q['correct_answer'],
                        **same_content(cards[i]['text'],text)})
            for i,count in overlaps.items():
                source_stem,source_options,source_words,source_pairs=source_features[i]
                dice=2*count/(len(source_pairs)+len(pairs))
                word_dice=2*len(words&source_words)/(len(words)+len(source_words))
                score=.75*dice+.25*word_dice
                row={'code':q['code'],'version':q['stamp'],'image':q['image'],'sourcePrintedAnswer':cards[i]['answer'],
                    'bankAnswer':q['correct_answer'],'score':round(score,6),'stemBigramDice':round(dice,6),
                    'stemWordDice':round(word_dice,6),'bankText':text,'bankTextSha256':signature(text),
                    'bankTextMethod':'ORIGINAL_NATIVE' if text==native else 'EXISTING_CURRENT_OCR',
                    'sameStem':stem==source_stem,'allOptionsSameContent':bool(options and sorted(options.values())==sorted(source_options.values()))}
                matches[i].append(row)
        if (index+1)%20000==0:print(f'Secondary stem comparison: {index+1}/{len(bank)}',flush=True)
    results=[];lines=['# Din soruları: ikinci bağımsız banka karşılaştırması','',
        'Skor karar değildir. Kaynak ve banka kök/seçenekleri okunmalıdır.','']
    for i,card in enumerate(cards):
        by_code={}
        for row in sorted(matches[i],key=lambda r:-r['score']):by_code.setdefault(row['code'],row)
        top=list(by_code.values())[:5]
        results.append({'sourceCode':card['code'],'sourceTextSha256':card['textSha256'],'sourceImageSha256':card['imageSha256'],
            'exactContentCandidates':exact[i],'topStemCandidates':top,'decision':'SOURCE_CONTENT_REVIEW_REQUIRED'})
        lines.extend(['## '+card['code'],'','### Kaynak','',card['text'],''])
        for row in top[:2]:lines.extend(['### Banka '+row['code']+' / '+str(row['score']),'',row['bankText'],''])
    after,_=live_bank(APP)
    if signature(after)!=bank_sha:raise ValueError('Live bank changed during secondary comparison')
    report={'status':'PARTIAL' if missing else 'PASS','scope':'WHOLE_BANK_INDEPENDENT_PROSE_STEM_AND_OPTION_RETRIEVAL',
        'questions':len(cards),'bankQuestions':len(bank),'bankSnapshotSha256':bank_sha,
        'sourceInventorySha256':digest(inventory),'bankTextEvidenceSha256':signature(text_hashes),
        'sourcePackages':retrieval['questionPackages'],'newEmbeddings':0,'modelCalls':0,'newOcrCalls':0,
        'questionsWithoutUsableText':missing,'bankQuestionsWithUsableText':len(bank)-len(missing),
        'exactContentCandidates':sum(bool(r['exactContentCandidates']) for r in results),
        'newQuestionsAccepted':0,'questionBankWrites':0,'teacherApproved':False,'toolSha256':digest(Path(__file__)),
        'results':results}
    write_json(folder/'secondary-bank-comparison.json',report)
    (folder/'secondary-bank-review.md').write_text('\n'.join(lines),encoding='utf-8')
    print({k:v for k,v in report.items() if k not in ('results','sourcePackages')})


if __name__=='__main__':main()
