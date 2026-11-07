"""Resolve immutable file locations; this projection never owns catalog identities."""
import json
import os
from pathlib import Path, PurePosixPath

from yks_birlestirme import digest


def relative_part(value):
    text = str(value).replace('\\', '/')
    path = PurePosixPath(text)
    if not text or path.is_absolute() or '..' in path.parts or ':' in text or '\x00' in text:
        raise ValueError('Invalid resource relative path')
    return Path(*path.parts)


def path_key(value):
    text = str(Path(value).absolute()).replace('\\', '/')
    return text.casefold() if os.name == 'nt' else text


def managed_legacy_roots(manifest=None):
    """Only explicitly activated old root junctions may re-enter a legacy scan."""
    archive=Path(__file__).resolve().parents[2]/'Kaynaklar/YKS'
    if manifest is None:
        manifest=archive/'Katalog/etkin-yollar.json'
        if not manifest.is_file():return {}
    else:
        manifest=Path(manifest);archive=manifest.parent.parent
    value=json.loads(manifest.read_text(encoding='utf-8'))
    if value.get('status')!='ACTIVE':return {}
    allowed={}
    base=(archive/'Katalog/EskiYollar').resolve()
    for row in value.get('legacyRoots',[]):
        original=Path(row['originalRoot']).absolute()
        target=archive/relative_part(row['target'])
        if not target.resolve().is_relative_to(base) or target.resolve()==base or not target.is_dir():
            raise ValueError('Unsafe managed legacy root')
        if path_key(original) in allowed:raise ValueError('Duplicate managed legacy root')
        allowed[path_key(original)]=target.resolve()
    return allowed


def iter_resource_paths(root, pattern='*', manifest=None):
    """Legacy source enumeration excludes the inactive YKS preparation tree.

    Explicit archive workflows use their verified location projection. An archive
    never becomes a second source merely by appearing under Kaynaklar.
    """
    root=Path(root)
    managed=managed_legacy_roots(manifest)
    for current, directories, names in os.walk(root,followlinks=True):
        for name in list(directories):
            path=Path(current)/name
            staging=(Path(current)==root and root.name.casefold()=='kaynaklar' and name.casefold()=='yks')
            linked=path.is_symlink() or getattr(path,'is_junction',lambda:False)()
            permitted=linked and managed.get(path_key(path))==path.resolve()
            if staging or linked and not permitted:
                directories.remove(name)
        for name in names:
            path=Path(current)/name
            if not path.is_symlink() and path.match(pattern):
                yield path


class SourceResolver:
    def __init__(self, archive_root=None, manifest=None, prepared=False):
        self.root = Path(archive_root).resolve() if archive_root is not None else None
        self.locations = {}
        if manifest is None:
            return
        if self.root is None:
            raise ValueError('Archive root required')
        path = Path(manifest).resolve()
        if not path.is_relative_to(self.root / 'Katalog'):
            raise ValueError('Location projection must be inside archive catalog')
        value = json.loads(path.read_text(encoding='utf-8'))
        if value.get('version') != 1 or value.get('status') not in (('ACTIVE', 'PREPARED') if prepared else ('ACTIVE',)):
            raise ValueError('Inactive or unknown location projection')
        for row in value['locations']:
            key = path_key(row['originalPath'])
            if key in self.locations:
                raise ValueError('Duplicate legacy location')
            relative_part(row['target'])
            if len(row['sha256']) != 64 or any(c not in '0123456789abcdef' for c in row['sha256']):
                raise ValueError('Invalid resource identity')
            self.locations[key] = row

    def resolve(self, source_root, relative, sha256):
        source_root = Path(source_root).absolute()
        original = source_root / relative_part(relative)
        row = self.locations.get(path_key(original))
        if row is not None:
            if row['sha256'] != sha256:
                raise ValueError('Location identity differs from requested source')
            root, candidate = self.root, self.root / relative_part(row['target'])
        else:
            root, candidate = source_root.resolve(), original
        if candidate.is_symlink() or not candidate.is_file() or not candidate.resolve().is_relative_to(root):
            raise ValueError('Missing or unsafe resource location')
        if digest(candidate) != sha256:
            raise ValueError('Resource content changed')
        return candidate.resolve()
