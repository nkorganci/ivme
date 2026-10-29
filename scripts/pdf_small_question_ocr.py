"""Retry only unreadable tiny question images, preserving original image bytes."""
import hashlib
import json
from PIL import Image,ImageOps
import pymupdf
from kaynakli_arastirma_db import db_connection,query
from pdf_source_scan import APP,OUT,write_json
from pdf_ocr_cache import model_hash
from question_image_ocr import publish


def main():
    connection=db_connection('ivme');model=model_hash();observations=[]
    rows=json.loads((OUT/'low-text-bank-images.json').read_text(encoding='utf-8'))
    live={r['code']:r['stamp'] for r in json.loads(query(connection,"SELECT json_agg(x) FROM (SELECT code,extract(epoch FROM updated_at)::text stamp FROM questions WHERE active AND exam_type IN ('TYT','AYT')) x"))}
    for row in rows:
        path=APP/'veri/resimler-pilot'/row['image'];sha=hashlib.sha256(path.read_bytes()).hexdigest()
        target=OUT/'question-image-ocr'/f'{sha}-{model[:16]}-question-small-ocr-v1.json'
        if target.exists():result=json.loads(target.read_text(encoding='utf-8'))
        else:
            with Image.open(path) as original:
                rgb=original.convert('RGB');box=ImageOps.grayscale(rgb).point(lambda x:255 if x<195 else 0).getbbox()
                if not box:continue
                rgb=rgb.crop(box)
                factor=max(1,min(4,1600/rgb.width))
                rgb=rgb.resize((round(rgb.width*factor),round(rgb.height*factor)),Image.Resampling.LANCZOS)
                rgb=ImageOps.expand(rgb,20,'white')
                pix=pymupdf.Pixmap(pymupdf.csRGB,rgb.width,rgb.height,rgb.tobytes(),False)
            with pymupdf.open('pdf',pix.pdfocr_tobytes(language='tur',tessdata=str(APP/'veri/tessdata'))) as document:text=document[0].get_text()
            result={'imageSha256':sha,'modelSha256':model,'extractorVersion':'question-small-ocr-v1',
                'text':text,'textSha256':hashlib.sha256(text.encode()).hexdigest(),
                'transform':{'originalCrop':list(box),'scale':factor},'contentVerified':False,
                'status':'EXTRACTED' if sum(c.isalpha() for c in text)>=30 else 'VISUAL_REVIEW_REQUIRED'}
            write_json(target,result)
        if row['code'] in live:observations.append((row['code'],live[row['code']],result))
        print(row['code'],len(result['text']),result['status'],flush=True)
    publish(connection,observations)


if __name__=='__main__':main()
