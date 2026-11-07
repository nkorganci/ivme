"""Source enumeration after the explicitly activated YKS location cutover."""
import json
from pathlib import Path,PurePosixPath


def archive_root():return Path(__file__).resolve().parents[1]/'Kaynaklar/YKS'


def active_locations(archive=None):
    root=Path(archive) if archive is not None else archive_root()
    file=root/'Katalog/etkin-yollar.json'
    if not file.is_file():return None
    data=json.loads(file.read_text(encoding='utf-8'))
    if data.get('status')!='ACTIVE':return None
    if data.get('version')!=1:raise ValueError('Unsupported active archive location version')
    return data


def pdf_paths(legacy_root,archive=None):
    root=Path(archive) if archive is not None else archive_root()
    data=active_locations(root)
    if data is None:return sorted(Path(legacy_root).rglob('*.pdf'),key=lambda p:str(p).casefold())
    chosen={}
    for row in data['locations']:
        part=PurePosixPath(row['target'].replace('\\','/'))
        if part.is_absolute() or '..' in part.parts or ':' in str(part):raise ValueError('Unsafe active source path')
        if part.suffix.lower()!='.pdf':continue
        candidate=root/Path(*part.parts)
        if not candidate.is_file() or not candidate.resolve().is_relative_to(root.resolve()):
            raise ValueError('Active source is missing or escapes archive')
        # Existing pipeline rows keep their old paths and extraction/embedding keys.
        original=Path(row['originalPath'])
        try:preferred=original.is_relative_to(Path(legacy_root)) and original.is_file()
        except ValueError:preferred=False
        old=chosen.get(row['sha256'])
        if old is None or preferred and not old[1]:chosen[row['sha256']]=(original if preferred else candidate,preferred)
    return sorted((p for p,_ in chosen.values()),key=lambda p:str(p).casefold())


def archive_subject_folder(folder,archive=None):
    root=Path(archive) if archive is not None else archive_root()
    if active_locations(root) is None:return None
    try:parts=Path(folder).relative_to(root).parts
    except ValueError:return None
    return parts[1] if len(parts)>1 and parts[0] in ('Dersler','Kitaplar') else None
