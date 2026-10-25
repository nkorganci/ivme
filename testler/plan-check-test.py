import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('plan_check', Path(__file__).resolve().parents[1] / 'scripts/plan-check.py')
plan = importlib.util.module_from_spec(spec)
spec.loader.exec_module(plan)


class PlanCheckTest(unittest.TestCase):
    def fixture(self, root):
        folder = root / 'docs/plan'
        folder.mkdir(parents=True)
        (folder / 'README.md').write_text('[adım](04-adim.md)', encoding='utf-8')
        (folder.parent / 'devam.md').write_text('| Sıradaki görev | `04.01` |', encoding='utf-8')
        (folder / '04-adim.md').write_text('# 4. Adım\n## 04.01 — İş', encoding='utf-8')
        return folder

    def test_closed_next_task_is_detected(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); directory = self.fixture(root)
            self.assertEqual(plan.check(root)['status'], 'PASS')
            (directory.parent / 'devam.md').write_text('| Sıradaki görev | `03.04` |', encoding='utf-8')
            self.assertTrue(any('nonexistent' in e for e in plan.check(root)['errors']))

    def test_deleted_step_link_is_detected(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); directory = self.fixture(root)
            with (directory / 'README.md').open('a', encoding='utf-8') as stream:
                stream.write('\n[eski](03_SILINMIS.md)')
            self.assertTrue(any('missing local link' in e for e in plan.check(root)['errors']))

    def test_duplicate_task_is_detected(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); directory = self.fixture(root)
            with (directory / '04-adim.md').open('a', encoding='utf-8') as stream:
                stream.write('\n## 04.01 — Yinelenen')
            self.assertTrue(any('Duplicate task' in e for e in plan.check(root)['errors']))

    def test_root_readme_link_is_checked(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); self.fixture(root)
            (root / 'README.md').write_text('[missing](docs/plan/old.md)', encoding='utf-8')
            self.assertTrue(any('README.md: missing local link' in e for e in plan.check(root)['errors']))


if __name__ == '__main__':
    unittest.main()
