"""Resolve body-check course from printed mock instructions, never topics.

No conventional exam ranges are assumed. The source must print the section
title and its actual numbered course ranges before the candidate page.
"""
import re
from mebi_pratik2_konu_basligi import normalize

TITLES={
    'TYT:1':'türkçe testi','TYT:2':'sosyal bilimler testi',
    'TYT:3':'temel matematik testi','TYT:4':'fen bilimleri testi',
    'AYT:1':'türk dili ve edebiyatı-sosyal bilimler-1 testi',
    'AYT:2':'sosyal bilimler-2 testi','AYT:3':'matematik testi',
    'AYT:4':'fen bilimleri testi',
}
ALIASES={'turk dili ve edebiyati':'Edebiyat','tarih':'Tarih','cografya':'Coğrafya',
         'felsefe':'Felsefe','din kulturu ve ahlak bilgisi':'Din Kültürü',
         'fizik':'Fizik','kimya':'Kimya','biyoloji':'Biyoloji'}
COURSES=r'Türk Dili ve Edebiyatı|Tarih(?:-[12])?|Coğrafya(?:-[12])?|Felsefe Grubu|Felsefe|Din Kültürü ve Ahlak Bilgisi|Fizik|Kimya|Biyoloji'
RANGES=re.compile(r'('+COURSES+r')\s*\(\s*(\d+)\s*[-–]\s*(\d+)\s*\)',re.I)


def printed_course(text,section,number):
    """Return a course only when one printed instruction uniquely supports it."""
    title=TITLES.get(section)
    if title is None:return None
    # Match an entire printed header line, not 'matematik testi' inside the
    # distinct 'temel matematik testi' section of a combined TYT/AYT PDF.
    raw_intro=re.search(r'Bu\s+testte\b',text,re.I)
    if not raw_intro:return None
    expected={normalize(title),normalize(section.split(':')[0]+' '+title)}
    if not any(normalize(line) in expected for line in text[:raw_intro.start()].splitlines()):return None
    flat=' '.join(text.split())
    if normalize(title) not in normalize(flat):return None
    intro=re.search(r'Bu testte\b(.*?)Cevaplarınızı',flat,re.I)
    if not intro:return None
    instructions=intro.group(1)
    if section in {'TYT:1','TYT:3','AYT:3'}:
        total=re.fullmatch(r'\s*(\d+) soru vardır\.\s*2\.\s*',instructions)
        if not total or not 1<=number<=int(total.group(1)):return None
        return ('Türkçe' if section=='TYT:1' else 'Matematik',intro.group(0))
    intervals=[]
    for match in RANGES.finditer(instructions):
        name,lo,hi=match.groups();lo=int(lo);hi=int(hi)
        if hi<lo:return None
        intervals.append((lo,hi,name))
    hits=[name for lo,hi,name in intervals if lo<=number<=hi]
    if len(hits)!=1:return None
    name=re.sub(r'-[12]$','',hits[0]);subject=ALIASES.get(normalize(name))
    # A printed Felsefe Grubu range does not identify psychology/logic/sociology.
    return (subject,intro.group(0)) if subject else None


def resolve_mock_course(row,group,pdf,cache):
    if not group or group.get('keyIdentityType')!='PREVERIFIED_MOCK_SECTION':return row,None
    section=group.get('sectionId')
    if section not in TITLES or section.split(':')[0]!=row['exam']:return row,None
    key=(row['sourceSha256'],section)
    if key not in cache:
        # Small text-only read; original PDF was hash-checked by the caller.
        cache[key]=[]
        for i,page in enumerate(pdf):
            text=page.get_text()
            if 'bu testte' in normalize(text):cache[key].append((i+1,text))
    for page,text in reversed(cache[key]):
        if page>row['bodyPage']:continue
        found=printed_course(text,section,row['printedNumber'])
        if found:
            subject,quote=found
            return {**row,'subject':subject},{
                'basis':'EXPLICIT_PRINTED_MOCK_SECTION_COURSE_NUMBER_RANGE',
                'sourceSha256':row['sourceSha256'],'sourcePage':page,
                'sectionId':section,'printedNumber':row['printedNumber'],
                'resolvedSubject':subject,'sourceQuote':quote,
                'fineTopicClaimed':False,'teacherApproved':False}
    return row,None
