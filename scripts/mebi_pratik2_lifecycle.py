"""Honor the user's persistent stop of Pratik 2 archive imports."""
import json
from pathlib import Path


def require_imports_enabled():
    policy=json.loads(Path(__file__).with_name('mebi-pratik2-lifecycle.json').read_text(encoding='utf8'))
    if policy.get('newQuestionImportsEnabled') is not True:
        raise ValueError('Pratik 2 yeni aktarımı kullanıcı talimatıyla kapalı; yalnız mevcut sorular ana bankaya taşınır.')
