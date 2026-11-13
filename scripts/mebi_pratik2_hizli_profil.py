"""Reuse Pratik 1 book profiles to verify EXISTING crops, without model calls.

The legacy engine supplies independent anchors, question regions and shared
context groups. Original pixels and every intersecting text/image/drawing
must fit the existing crop. No crop is created or repaired here. A failure
keeps the exceptional visual route; this is not a topic/teacher decision.
"""
import hashlib
import importlib
import re
import sys
from collections import Counter,OrderedDict
from pathlib import Path
import pymupdf
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE

STATUS='PROFILE_GEOMETRY_BODY_PROVED'
VERSION='legacy-book-profile-visible-source-objects-existing-crop-v2'
OPTION=re.compile(r'(?<!\w)([ABCDE])\s*\)')
CACHE=OrderedDict()


def legacy_modules():
    folder=APP.parent/'veri-hatti/ogm-sorular'
    if str(folder) not in sys.path:sys.path.insert(0,str(folder))
    return importlib.import_module('motor'),importlib.import_module('kitaplar'),importlib.import_module('deneme')


def inside(outer,inner,tolerance=.25):
    return (inner.x0>=outer.x0-tolerance and inner.y0>=outer.y0-tolerance
            and inner.x1<=outer.x1+tolerance and inner.y1<=outer.y1+tolerance)


def expected_scale(row):
    # Explicit source format, never resize an image to make a comparison pass.
    return 2.5 if row.get('priorSourcePixelProof') and row.get('sourceRegions') else 2.0


def visible_paths(drawings,page_rect):
    """Honor PDF clipping scopes; invisible paint is not question content.

    MuPDF's extended scissor is a conservative rectangular bound of the real
    clip. Keeping that bound may retain extra objects; it never drops paint
    visible outside that bound. A same-level entry ends the earlier scope.
    """
    clips={};result=[]
    for drawing in drawings:
        level=drawing.get('level',0)
        clips={k:v for k,v in clips.items() if k<level}
        if drawing['type']=='clip':
            clips[level]=pymupdf.Rect(drawing['scissor']);continue
        if drawing['type']=='group':continue
        rect=pymupdf.Rect(drawing['rect'])
        # A stroke's mathematical rect may have zero height or width.
        width=(drawing.get('width') or 0)/2 if drawing['type'] in {'s','fs'} else 0
        rect=pymupdf.Rect(rect.x0-width-.05,rect.y0-width-.05,rect.x1+width+.05,rect.y1+width+.05)
        rect &= page_rect
        for scissor in clips.values():rect &= scissor
        if not rect.is_empty:result.append((drawing,rect))
    return result


class Profile:
    def __init__(self,pdf,row):
        motor,books,mocks=legacy_modules();self.pdf=pdf;self.pages={};self.drawings={}
        book=motor.Kitap.__new__(motor.Kitap);book.doc=pdf;book.yol=pdf.name
        book.aralik=range(len(pdf));book.sayfa={}
        original_page=book.S
        def source_page(index):
            fresh=index not in book.sayfa;page=original_page(index)
            if fresh:
                page.cizimler=[];page.ayiricilar=[]
                for drawing,rect in self.visible_drawings(index):
                    if rect.width<2 and rect.height>page.H*.35 and abs(rect.x0-page.W/2)<10:
                        page.ayiricilar.append(tuple(rect));continue
                    if rect.height<2 and rect.width>page.W*.8:continue
                    if rect.width>page.W*.9 and rect.height>page.H*.9:continue
                    page.cizimler.append((*tuple(rect),rect.width<2 and rect.height>60))
            return page
        book.S=source_page
        if '-FULL-MOCK-' in row.get('groupId',''):
            result=mocks.deneme(book);self.kind='MOCK_PRINTED_SECTION'
        else:
            result=books.mebi_tarama(book);self.kind='SINGLE_TARAMA_PRINTED_TEST'
        if not result.get('testler'):raise ValueError('No independent book profile')
        anchors=[a for t in result['testler'] for a in t['capalar']]
        elements=motor.ogeleri_sirala(book,result['soru_sayfalari'],anchors)
        motor.bolge_hesapla(book,elements,result['soru_sayfalari'],kes=result.get('kes'))
        tests={(a['pi'],a['col'],a['y0'],a['n']):t for t in result['testler'] for a in t['capalar']}
        self.cards=[]
        for card in motor.kartlar(elements):
            questions=[o for o in card['ogeler'] if o['tur']=='q']
            if card.get('grup') or len(questions)!=1 or len(card['nolar'])!=1:continue
            q=questions[0]
            if q.get('zayif') or q.get('basili_no') is not None:continue
            test=tests.get((q['pi'],q['col'],q['y0'],q['n']))
            if test is None:continue
            self.cards.append((q,card,test))
        self.code_sha=hashlib.sha256(b''.join(Path(m.__file__).read_bytes() for m in (motor,books,mocks))).hexdigest()

    def visible_drawings(self,index):
        if index not in self.drawings:
            page=self.pdf[index]
            self.drawings[index]=visible_paths(page.get_drawings(extended=True),page.rect)
        return self.drawings[index]

    def card(self,row):
        found=[]
        for q,card,test in self.cards:
            if q['n']!=row['printedNumber'] or q['pi']+1!=row['bodyPage']:continue
            if self.kind=='MOCK_PRINTED_SECTION':
                number=re.search(r'-S([1-4])-Q',row['code'])
                titles={'TYT':['TÜRKÇE','SOSYAL','TEMEL MATEMATİK','FEN'],
                        'AYT':['TDE-SB1','SB2','MATEMATİK','FEN']}
                if not number or test.get('test_turu')!=titles[row['exam']][int(number[1])-1]:continue
            elif str(test.get('tno'))!=str(row.get('testNumber')):continue
            parts=card.get('parcalar') or q.get('parcalar')
            if not parts or len(parts)!=1 or parts[0][0]+1!=row['bodyPage']:continue
            found.append((q,card,pymupdf.Rect(parts[0][1])))
        return found[0] if len(found)==1 else None

    def objects(self,index):
        if index not in self.pages:
            page=self.pdf[index];objects=[]
            for w in page.get_text('words'):objects.append(('TEXT',pymupdf.Rect(w[:4]),w[4]))
            for image in page.get_image_info():objects.append(('IMAGE',pymupdf.Rect(image['bbox']),''))
            for drawing,rect in self.visible_drawings(index):
                if (rect.width<2 and rect.height>page.rect.height*.3 and abs(rect.x0-page.rect.width/2)<10):continue
                if rect.height<2 and rect.width>page.rect.width*.8 and rect.y0>page.rect.height-45:continue
                if rect.width>page.rect.width*.9 and rect.height>page.rect.height*.9 and drawing.get('fill')==(1.0,1.0,1.0):continue
                objects.append(('DRAWING',rect,''))
            self.pages[index]=objects
        return self.pages[index]


def geometry(objects,region,clip,number):
    selected=[]
    for kind,box,text in objects:
        if not region.intersects(box):continue
        if not inside(region,box) or not inside(clip,box):return None
        selected.append((kind,box,text))
    words=[(b,t) for kind,b,t in selected if kind=='TEXT']
    if not words:return None
    text=' '.join(t for _,t in words);counts=Counter(OPTION.findall(text))
    if any(counts[c]!=1 for c in 'ABCDE'):return None
    anchors=[(b,t) for b,t in words if re.fullmatch(r'\d{1,3}[.)]',t) and b.y0<region.y0+15]
    if not any(t==str(number)+'.' for _,t in anchors):return None
    # A shared passage is never accepted merely because all choices fit.
    if re.search(r'\d+\s*[-–]\s*\d+\.?\s*soru',text,re.I):return None
    return {'objectCounts':dict(Counter(k for k,_,_ in selected)),'nativeWords':len(words),
            'choiceCounts':dict(counts)}


def prove(pdf,row,path):
    expected=(SOURCE/row['relativePath']).resolve()
    if not expected.is_relative_to(SOURCE) or Path(pdf.name).resolve()!=expected:return None
    if hashlib.sha256(path.read_bytes()).hexdigest()!=row['imageSha256']:raise ValueError('Existing crop changed')
    key=(row['sourceSha256'],str(expected))
    if key not in CACHE:
        try:CACHE[key]=Profile(pdf,row)
        except (ValueError,IndexError,KeyError):CACHE[key]=None
        while len(CACHE)>4:CACHE.popitem(last=False)
    profile=CACHE[key]
    if profile is None:return None
    # A closed/reopened original needs a fresh in-memory profile, never a new crop.
    if profile.pdf is not pdf:
        CACHE.pop(key);return prove(pdf,row,path)
    match=profile.card(row)
    if match is None:return None
    q,card,region=match;clip=pymupdf.Rect(row['bodyClip'])
    proof=geometry(profile.objects(row['bodyPage']-1),region,clip,row['printedNumber'])
    if proof is None:return None
    # Explicit references at the start need shared context proof, not a guess.
    text=' '.join(card.get('metin') or q.get('metin') or [])
    if re.match(r'^\s*\d+\.\s*(?:Yukarıdaki|Bu parçaya|Bu metne|Buna göre)',text,re.I):return None
    scale=expected_scale(row);page=pdf[row['bodyPage']-1]
    fresh=page.get_pixmap(matrix=pymupdf.Matrix(scale,scale),clip=clip,alpha=False)
    saved=pymupdf.Pixmap(str(path))
    if (fresh.width,fresh.height,fresh.n,fresh.samples)!=(saved.width,saved.height,saved.n,saved.samples):return None
    return {'status':STATUS,'method':VERSION,'imageSha256':row['imageSha256'],'sourceSha256':row['sourceSha256'],
            'sourcePage':row['bodyPage'],'sourceClip':list(clip),'independentProfileRegion':list(region),
            'profile':profile.kind,'profileCodeSha256':profile.code_sha,'renderScale':scale,
            'sourcePixelSha256':hashlib.sha256(fresh.samples).hexdigest(),**proof,
            'modelCalls':0,'imageWrites':0,'teacherApproved':False,'fineTopicClaimed':False}
