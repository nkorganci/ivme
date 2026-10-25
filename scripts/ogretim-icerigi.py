"""Öğretim döngüsü içeriğini doğrular, güven puanını hesaplar ve PostgreSQL'e sürümlü aktarır.

Kaynak dosyalar: ornek-veri/ogretim-pilotu/<branş>/<soru-kodu>.json (sözleşme:
docs/semalar/ogretim-icerigi-v1.schema.json). Çalışma anında uygulama yalnız
tutor_contents tablosunu okur; bu betik dosyaları değiştirmez.

Komutlar:
  dogrula             Şema + anlamsal kurallar + SymPy denetimleri + DB bağları (salt okunur)
  aktar               Doğrulamayı çalıştırır, değişen içeriği yeni sürüm olarak ekler
  yeniden-uretim      Açık yeniden üretim isteklerini iş dosyasına yazar (EXPORTED)
  kalibrasyon         Güven bandı ile öğretmen kararlarını karşılaştırır

Gerekli paketler: sympy, jsonschema (.venv). Model veya ağ çağrısı yapılmaz.
"""

import argparse
import functools
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from yerel_ortam import default_database

APP = Path(__file__).resolve().parents[1]
CONTENT_ROOT = APP / "ornek-veri/ogretim-pilotu"
SCHEMA_PATH = APP / "docs/semalar/ogretim-icerigi-v1.schema.json"
REPORT_ROOT = APP / "veri/ogretim-pilotu"
DEFAULT_IMAGES = APP / "veri/resimler-pilot"
VERIFIER_VERSION = "ogretim-dogrulayici-v1"

LETTERS = "ABCDE"
COMPUTABLE_SUBJECTS = {"matematik", "geometri", "fizik", "kimya"}
PRE_ANSWER_PATHS = ("hints", "strategyChoice", "pattern")
TURKISH_VOWELS = set("aeıioöuüâîûAEIİOÖUÜÂÎÛ")
STOPWORDS = set("""ve veya ile bir bu şu o de da ki mi mı mu mü için gibi kadar daha en çok az ise olan olarak
her hiç ne neden nasıl hangi aşağıdaki yukarıdaki verilen göre ait değil değildir yoktur vardır olur olabilir""".split())


# --------------------------------------------------------------------------- SymPy kum havuzu

@functools.lru_cache(maxsize=1)
def _namespace():
    import sympy as sp
    from sympy.logic.boolalg import Equivalent, Implies, Xor
    names = {name: getattr(sp, name) for name in [
        "sqrt", "Rational", "pi", "E", "exp", "log", "sin", "cos", "tan", "cot", "sec", "csc", "asin", "acos",
        "atan", "diff", "integrate", "limit", "oo", "Abs", "factorial", "binomial", "floor", "ceiling", "Sum",
        "simplify", "expand", "factor", "solve", "Eq", "Interval", "Union", "Intersection", "Complement",
        "FiniteSet", "Mod", "gcd", "lcm",
        "Max", "Min", "nsimplify", "Integer", "Float", "S", "I", "re", "im", "conjugate", "Piecewise", "Symbol",
        "Matrix", "det", "summation", "Product", "And", "Or", "Not", "true", "false", "N", "deg", "rad", "Poly",
        "degree", "rem", "quo", "div", "roots", "Derivative", "Integral", "series", "Lambda", "symbols", "sign", "Tuple"]
        if hasattr(sp, name)}
    names.update({"Equivalent": Equivalent, "Implies": Implies, "Xor": Xor, "ln": sp.log})
    for letter in "abcdfghijklmnpqrstuvwxyz":
        names[letter] = sp.Symbol(letter, real=True)
    names["e_"] = sp.E
    return names


def sympy_namespace():
    return dict(_namespace())


FORBIDDEN = re.compile(r"__|\bimport\b|\beval\b|\bexec\b|\blambda\b|\bglobals\b|\blocals\b|\bgetattr\b")
ALLOWED_ATTRIBUTES = re.compile(r"\bInterval\.(?:open|Ropen|Lopen)\b")
ATTRIBUTE_ACCESS = re.compile(r"[A-Za-z_)\]]\s*\.\s*[A-Za-z_]")


def parse_sympy(text):
    from sympy.parsing.sympy_parser import parse_expr, standard_transformations
    if not isinstance(text, str) or FORBIDDEN.search(text) or ATTRIBUTE_ACCESS.search(ALLOWED_ATTRIBUTES.sub("I", text)):
        raise ValueError(f"İzin verilmeyen ifade: {text!r}")
    if "=" in text and not any(op in text for op in ("==", "<=", ">=", "!=")):
        raise ValueError(f"Eşitlik için 'equation' veya Eq(...) kullanın: {text!r}")
    return parse_expr(text, local_dict=sympy_namespace(), global_dict={"__builtins__": {}},
                      transformations=standard_transformations, evaluate=True)


def same_value(left, right):
    import sympy as sp
    try:
        if isinstance(left, sp.Set) or isinstance(right, sp.Set):
            return sp.simplify(left) == sp.simplify(right)
        if isinstance(left, (sp.Tuple, tuple)) or isinstance(right, (sp.Tuple, tuple)):
            return len(left) == len(right) and all(same_value(a, b) for a, b in zip(left, right))
        if isinstance(left, (bool, sp.logic.boolalg.Boolean)) or isinstance(right, (bool, sp.logic.boolalg.Boolean)):
            return bool(left) == bool(right) if isinstance(left, bool) or isinstance(right, bool) else left == right
        difference = sp.simplify(left - right)
        if difference == 0:
            return True
        numeric = sp.N(difference, 30)
        return bool(numeric.is_number and abs(numeric) < sp.Float("1e-9"))
    except Exception:  # Karşılaştırılamayan türler eşit sayılmaz.
        return False


def equation(text):
    import sympy as sp
    if "=" not in text:
        return parse_sympy(text)
    left, right = text.split("=", 1)
    return sp.Eq(parse_sympy(left), parse_sympy(right))


def count_syllables(line):
    return sum(1 for char in line if char in TURKISH_VOWELS)


def run_check(check, choice_values):
    """Tek denetimi çalıştırır; (geçti mi, ayrıntı) döner. Hata asla sessizce geçmez."""
    import sympy as sp
    kind = check["type"]
    try:
        if kind == "sympy":
            value, expected = parse_sympy(check["expr"]), parse_sympy(check["equals"])
            if "tolerance" in check:
                gap = abs(sp.N(value - expected, 30))
                return bool(gap <= check["tolerance"]), f"|{sp.sstr(sp.N(value, 8))} − {sp.sstr(expected)}| = {sp.sstr(sp.N(gap, 3))} ≤ {check['tolerance']}"
            return same_value(value, expected), f"{sp.sstr(value)} ≟ {sp.sstr(expected)}"
        if kind in ("choice", "twinChoice"):
            if not choice_values:
                return False, "choiceValues yok"
            value = parse_sympy(check["expr"])
            matches = [letter for letter, raw in sorted(choice_values.items()) if same_value(value, parse_sympy(raw))]
            return matches == [check["choice"]], f"değer {sp.sstr(value)}; eşleşen şıklar {matches or 'yok'}"
        if kind == "solve":
            variable = sympy_namespace()[check["var"]]
            solutions = sp.solve(equation(check["equation"]), variable)
            expected = [parse_sympy(str(item)) for item in check["expect"]]
            found = sorted(sp.sstr(item) for item in solutions)
            ok = len(solutions) == len(expected) and all(any(same_value(s, e) for s in solutions) for e in expected)
            return ok, f"çözümler {found}"
        if kind == "inequality":
            variable = sympy_namespace()[check["var"]]
            relation = parse_sympy(check["expr"])
            solved = sp.solve_univariate_inequality(relation, variable, relational=False)
            expected = parse_sympy(check["expect"])
            return sp.simplify(solved) == sp.simplify(expected), f"çözüm kümesi {sp.sstr(solved)}"
        if kind == "syllables":
            lines = [line.strip() for line in re.split(r"\n|\s/\s", check["text"]) if line.strip()]
            counts = [count_syllables(line) for line in lines]
            return counts == list(check["expect"]), f"hece sayıları {counts}"
        if kind == "logic":
            from sympy.logic.inference import satisfiable
            from sympy.logic.boolalg import Equivalent
            expression = parse_sympy(check["expr"])
            if "equivalentTo" in check:
                other = parse_sympy(check["equivalentTo"])
                return not satisfiable(sp.Not(Equivalent(expression, other))), "denklik sınandı"
            expect = check["expect"]
            assignment = {sympy_namespace()[name]: bool(value) for name, value in expect["assign"].items()}
            value = bool(expression.subs(assignment))
            return value == bool(expect["value"]), f"doğruluk değeri {value}"
    except Exception as error:
        return False, f"hesaplanamadı: {type(error).__name__}: {error}"
    return False, f"bilinmeyen denetim türü {kind}"


# --------------------------------------------------------------------------- sızıntı denetimi

def normalized(text):
    text = unicodedata.normalize("NFC", text or "").casefold()
    return re.sub(r"\s+", " ", text)


def value_forms(raw_values):
    """Sonucun metinde aranacak biçimleri: 0,2 / 0.2 / 1/5 / 0,20 gibi."""
    import sympy as sp
    forms = set()
    for raw in raw_values:
        if raw is None:
            continue
        text = str(raw).strip()
        if text and len(text) <= 24 and re.search(r"\d", text):
            forms.add(text.replace(" ", ""))
            forms.add(text.replace(" ", "").replace(",", "."))
            forms.add(text.replace(" ", "").replace(".", ","))
        try:
            value = sp.nsimplify(parse_sympy(text.replace(",", "."))) if re.fullmatch(r"[0-9.,/\- ]+", text) else None
        except Exception:
            value = None
        if value is not None and value.is_number:
            if value.is_Rational:
                forms.add(f"{value.p}/{value.q}" if value.q != 1 else str(value.p))
            decimal = sp.N(value, 12)
            if decimal.is_finite:
                plain = f"{float(decimal):.6f}".rstrip("0").rstrip(".")
                forms.update({plain, plain.replace(".", ",")})
    return {form for form in forms if form and form not in {"0", "1"}}


def contains_value(text, form):
    pattern = r"(?<![\w.,/])" + re.escape(form) + r"(?![\w/]|[.,]\d)"
    return re.search(pattern, text.replace(" ", " ")) is not None


LETTER_REFERENCE = re.compile(r"(?:\b(?:[Cc]evap|[Yy]anıt|[Dd]oğru şık|[Şş]ık(?:kı|ki)?)\s*[:\-]?\s*\(?[A-E]\)?(?!\w))|"
                              r"(?:(?<!\w)[A-E]\)\s)|(?:(?<!\w)[A-E] şıkk)")


def content_words(text):
    words = re.findall(r"[0-9a-zçğıöşüâîû]+", normalized(text))
    return {word for word in words if len(word) > 2 and word not in STOPWORDS}


def pre_answer_texts(content):
    texts = []
    for index, hint in enumerate(content["hints"]):
        texts.append((f"hints[{index}].text", hint["text"]))
    choice = content["strategyChoice"]
    texts.append(("strategyChoice.prompt", choice["prompt"]))
    for index, option in enumerate(choice["options"]):
        texts.append((f"strategyChoice.options[{index}].text", option["text"]))
        texts.append((f"strategyChoice.options[{index}].feedback", option["feedback"]))
    pattern = content["pattern"]
    for key in ("trigger", "bigIdea", "whenNot", "examTip"):
        texts.append((f"pattern.{key}", pattern[key]))
    for index, step in enumerate(pattern["method"]):
        texts.append((f"pattern.method[{index}]", step))
    visual = content["visual"]
    if visual.get("recommended") and visual.get("stage") == "PRE":
        texts.append(("visual.title", visual["title"]))
        for index, frame in enumerate(visual["frames"]):
            texts.append((f"visual.frames[{index}].caption", frame["caption"]))
        for index, option in enumerate((visual.get("predict") or {}).get("options", [])):
            texts.append((f"visual.predict.options[{index}].feedback", option["feedback"]))
    return texts


def leak_findings(content):
    findings = []
    key = content["question"]["answerKey"]
    answer_raw = [content["solution"]["finalAnswer"]["value"], content["reading"]["choices"].get(key)]
    if content.get("choiceValues"):
        answer_raw.append(content["choiceValues"].get(key))
    forms = value_forms(answer_raw)
    correct_text = content["reading"]["choices"].get(key, "")
    correct_words = content_words(correct_text)
    # Şekil transkripsiyonundaki sayılar da soruda verilmiş bilgidir.
    question_text = content["reading"]["text"] + " " + (content["reading"]["figure"] or "")
    for path, text in pre_answer_texts(content):
        if LETTER_REFERENCE.search(text):
            findings.append({"code": "LETTER_REFERENCE", "severity": "HARD", "path": path,
                             "message": "İpucu/ön metin şık harfi anıyor."})
        for form in sorted(forms):
            # Soruda zaten verilen bir sayının ipucunda geçmesi sızıntı değildir.
            if contains_value(text, form) and not contains_value(question_text, form):
                findings.append({"code": "ANSWER_VALUE", "severity": "SOFT" if len(form) == 1 else "HARD",
                                 "path": path, "message": f"Ön metin sonucu ({form}) içeriyor."})
        if len(correct_text) >= 12 and normalized(correct_text) in normalized(text):
            findings.append({"code": "ANSWER_TEXT", "severity": "HARD", "path": path,
                             "message": "Ön metin doğru şıkkın metnini aynen içeriyor."})
        elif len(correct_words) >= 4:
            overlap = len(correct_words & content_words(text)) / len(correct_words)
            if overlap >= 0.7:
                findings.append({"code": "ANSWER_OVERLAP", "severity": "SOFT", "path": path,
                                 "message": f"Ön metin doğru şıkla %{round(overlap * 100)} sözcük paylaşıyor."})
    return findings


# --------------------------------------------------------------------------- anlamsal kurallar

def exactly_one_correct(options, path, issues):
    ids = [option["id"] for option in options]
    if len(set(ids)) != len(ids):
        issues.append(issue("DUPLICATE_OPTION_ID", "HARD", path, "Seçenek kimlikleri tekrar ediyor."))
    if sum(1 for option in options if option["correct"]) != 1:
        issues.append(issue("CORRECT_OPTION_COUNT", "HARD", path, "Tam bir doğru seçenek olmalı."))


def issue(code, severity, path, message):
    return {"code": code, "severity": severity, "path": path, "message": message}


def semantic_issues(content):
    issues = []
    question, reading = content["question"], content["reading"]
    if content["contentKey"] != f"tutor:{question['code']}":
        issues.append(issue("CONTENT_KEY", "HARD", "contentKey", "contentKey soru koduyla uyuşmuyor."))
    expected_letters = list(LETTERS[:question["choiceCount"]])
    if sorted(reading["choices"]) != expected_letters:
        issues.append(issue("CHOICE_LETTERS", "HARD", "reading.choices", f"Şıklar {expected_letters} olmalı."))
    if reading["status"] != "CLEAR":
        issues.append(issue("READING_NOT_CLEAR", "HARD", "reading.status",
                            "Görsel tam okunamadı; eksik bilgi uydurulmaz, öğretmen incelemesi gerekir."))
    if reading["status"] == "CLEAR" and reading["uncertain"]:
        issues.append(issue("READING_UNCERTAIN", "HARD", "reading.uncertain", "CLEAR okuma belirsiz parça içeremez."))
    levels = [(hint["level"], hint["kind"]) for hint in content["hints"]]
    if levels != [(1, "KAVRAM"), (2, "STRATEJI"), (3, "ADIM")]:
        issues.append(issue("HINT_LADDER", "HARD", "hints", "İpuçları KAVRAM→STRATEJI→ADIM sırasında olmalı."))
    exactly_one_correct(content["strategyChoice"]["options"], "strategyChoice.options", issues)
    step_ids = [step["id"] for step in content["solution"]["steps"]]
    if len(set(step_ids)) != len(step_ids):
        issues.append(issue("DUPLICATE_STEP", "HARD", "solution.steps", "Adım kimlikleri tekrar ediyor."))
    for index, step in enumerate(content["solution"]["steps"]):
        if "selfExplain" in step:
            exactly_one_correct(step["selfExplain"]["options"], f"solution.steps[{index}].selfExplain", issues)
    if not any("selfExplain" in step for step in content["solution"]["steps"]):
        issues.append(issue("NO_SELF_EXPLANATION", "HARD", "solution.steps",
                            "En az bir adımda 'Neden?' (kendini açıklama) sorusu olmalı."))
    final = content["solution"]["finalAnswer"]
    if final["choice"] != question["answerKey"]:
        issues.append(issue("FINAL_CHOICE", "HARD", "solution.finalAnswer.choice", "Çözümün şıkkı anahtarla uyuşmuyor."))
    if final["choice"] not in reading["choices"]:
        issues.append(issue("FINAL_CHOICE_MISSING", "HARD", "solution.finalAnswer.choice", "Şık okunan şıklarda yok."))
    misconception_ids = [item["id"] for item in content["misconceptions"]]
    if len(set(misconception_ids)) != len(misconception_ids):
        issues.append(issue("DUPLICATE_MISCONCEPTION", "HARD", "misconceptions", "Yanılgı kimlikleri tekrar ediyor."))
    for index, item in enumerate(content["misconceptions"]):
        if item["choice"] == question["answerKey"]:
            issues.append(issue("MISCONCEPTION_ON_KEY", "HARD", f"misconceptions[{index}].choice",
                                "Yanılgı doğru şıkka bağlanamaz."))
        elif item["choice"] and item["choice"] not in reading["choices"]:
            issues.append(issue("MISCONCEPTION_CHOICE", "HARD", f"misconceptions[{index}].choice", "Şık yok."))
    visual = content["visual"]
    if visual.get("recommended") and visual.get("predict"):
        exactly_one_correct(visual["predict"]["options"], "visual.predict.options", issues)
    twin = content["twin"]
    if twin["answer"] not in twin["choices"]:
        issues.append(issue("TWIN_ANSWER", "HARD", "twin.answer", "İkiz sorunun cevabı şıklarda yok."))
    if len(twin["choices"]) < 4:
        issues.append(issue("TWIN_CHOICES", "SOFT", "twin.choices", "İkiz soruda en az dört şık önerilir."))
    original, copy = content_words(reading["text"]), content_words(twin["text"])
    if original and copy and len(original & copy) / max(1, len(copy)) > 0.8:
        issues.append(issue("TWIN_COPY", "HARD", "twin.text", "İkiz soru kaynak sorunun kopyasına çok yakın."))
    if twin.get("choiceValues") and not twin.get("check"):
        issues.append(issue("TWIN_UNCHECKED", "HARD", "twin.check", "Sayısal ikiz sorunun cevabı denetlenmeli."))
    values = content.get("choiceValues")
    if values is not None:
        if sorted(values) != sorted(reading["choices"]):
            issues.append(issue("CHOICE_VALUES", "HARD", "choiceValues", "choiceValues şıklarla aynı harfleri taşımalı."))
        if not final.get("check"):
            issues.append(issue("FINAL_UNCHECKED", "HARD", "solution.finalAnswer.check",
                                "Sayısal soruda son cevap bağımsız denetlenmeli."))
    elif question["subjectId"] in COMPUTABLE_SUBJECTS and not any(step.get("check") for step in content["solution"]["steps"]):
        issues.append(issue("NO_COMPUTATION_CHECK", "SOFT", "solution.steps",
                            "Sayısal derste hiçbir adım bağımsız denetlenmedi."))
    if not content["classification"]["catalogAgreement"]:
        issues.append(issue("CATALOG_DISAGREEMENT", "SOFT", "classification.catalogAgreement",
                            content["classification"]["catalogNote"] or "Katalog etiketiyle uyuşmazlık."))
    return issues


# --------------------------------------------------------------------------- denetimler ve güven

def collect_checks(content):
    checks = []
    values, twin = content.get("choiceValues"), content["twin"]
    final = content["solution"]["finalAnswer"].get("check")
    if final:
        checks.append(("solution.finalAnswer.check", final, values, "final"))
    for index, step in enumerate(content["solution"]["steps"]):
        if step.get("check"):
            checks.append((f"solution.steps[{index}].check", step["check"], values, "step"))
    for index, item in enumerate(content["misconceptions"]):
        if item.get("check"):
            checks.append((f"misconceptions[{index}].check", item["check"], values, "misconception"))
    if content["alternative"] and content["alternative"].get("check"):
        checks.append(("alternative.check", content["alternative"]["check"], values, "alternative"))
    if twin.get("check"):
        checks.append(("twin.check", twin["check"], twin.get("choiceValues"), "twin"))
    return checks


def verify(content):
    results = []
    for path, check, values, role in collect_checks(content):
        if role == "twin" and check["type"] == "twinChoice" and check["choice"] != content["twin"]["answer"]:
            results.append({"path": path, "role": role, "type": check["type"], "passed": False,
                            "detail": "Denetlenen şık ikiz sorunun cevabı değil."})
            continue
        if role == "final" and check["type"] == "choice" and check["choice"] != content["question"]["answerKey"]:
            results.append({"path": path, "role": role, "type": check["type"], "passed": False,
                            "detail": "Son cevap denetimi anahtar şıkkı sınamıyor."})
            continue
        if role == "misconception" and check["type"] == "choice":
            index = int(re.search(r"\[(\d+)\]", path).group(1))
            if check["choice"] != content["misconceptions"][index]["choice"]:
                results.append({"path": path, "role": role, "type": check["type"], "passed": False,
                                "detail": "Yanılgı denetimi bağlandığı şıkkı sınamıyor."})
                continue
        squeeze = lambda text: re.sub(r"\s+", "", str(text))
        if check["type"] == "sympy" and squeeze(check["expr"]) == squeeze(check["equals"]):
            results.append({"path": path, "role": role, "type": check["type"], "passed": False,
                            "detail": "Denetim kendini doğruluyor; bağımsız bir hesap içermiyor."})
            continue
        passed, detail = run_check(check, values)
        result = {"path": path, "role": role, "type": check["type"], "passed": passed, "detail": detail}
        if check["type"] in ("choice", "twinChoice") and values and squeeze(check["expr"]) == squeeze(values.get(check["choice"], "")):
            result["encoding"] = True  # Şıkkı yeniden yazar; hesap değil, yalnız teklik ve anahtar uyumu sınar.
        results.append(result)
    return results


def score(content, issues, checks):
    """Güven: bağımsız sinyallerden hesaplanır, modelin kendi beyanından değil."""
    hard = [item for item in issues if item["severity"] == "HARD"]
    soft = [item for item in issues if item["severity"] == "SOFT"]
    failed = [item for item in checks if not item["passed"]]
    computable = content.get("choiceValues") is not None or any(item["role"] in ("final", "step") for item in checks)
    by_role = lambda role: [item for item in checks if item["role"] == role]
    if computable:
        finals = [item for item in by_role("final") if item["passed"]]
        final_weight = 0.0 if not finals else 0.12 if all(item.get("encoding") for item in finals) else 0.25
        steps = by_role("step")
        step_ratio = (sum(item["passed"] for item in steps) / len(steps)) if steps else 0.0
        confidence = (0.55 + final_weight + 0.12 * step_ratio
                      + 0.04 * any(item["passed"] for item in by_role("alternative"))
                      + 0.02 * any(item["passed"] for item in by_role("misconception"))
                      + 0.02 * any(item["passed"] for item in by_role("twin")))
    else:
        mapped = {item["choice"] for item in content["misconceptions"] if item["choice"]}
        confidence = min(0.70, 0.55 + 0.08 * bool(content["sources"]) + 0.04 * (len(mapped) >= 2)
                         + 0.03 * (content["twin"]["answer"] in content["twin"]["choices"]))
    reading = content["reading"]
    confidence -= 0.08 if reading["figureCritical"] else 0.0
    confidence -= {"HIGH": 0.0, "MEDIUM": 0.10, "LOW": 0.25}[reading["confidence"]]
    confidence -= min(0.15, 0.03 * len(soft))
    if any(item["code"] == "KEY_CONFLICT" for item in issues):
        confidence = min(confidence, 0.10)
    elif reading["status"] == "UNREADABLE":
        confidence = 0.0
    elif hard or failed:
        confidence = min(confidence, 0.30)
    confidence = round(max(0.0, min(1.0, confidence)), 3)
    band = "HIGH" if confidence >= 0.85 else "MEDIUM" if confidence >= 0.65 else "LOW"
    reasons = sorted({item["code"] for item in issues} | ({"CHECK_FAILED"} if failed else set())
                     | ({f"BAND_{band}"} if band != "HIGH" else set())
                     | ({"VERBAL_NEEDS_TEACHER"} if not computable else set()))
    review_flag = bool(hard or failed or soft or band != "HIGH")
    status = "NEEDS_REVIEW" if (hard or failed or band == "LOW") else "AUTO_VERIFIED"
    return {"confidence": confidence, "band": band, "reviewFlag": review_flag, "reviewReasons": reasons,
            "status": status, "computable": computable}


# --------------------------------------------------------------------------- DB bağlantısı (yalnız yerel)

def db_connection(database=None):
    config = (APP / "backend/src/main/resources/application-dev.yml").read_text(encoding="utf-8")

    def setting(name):
        raw = re.search(rf"(?m)^\s{{4}}{name}:\s*(.+)$", config).group(1).strip()
        expression = re.fullmatch(r"\$\{([A-Z0-9_]+)(?::(.*))?\}", raw)
        return os.environ.get(expression[1], expression[2] or "") if expression else raw.strip("\"'")

    uri = urlparse(setting("url").removeprefix("jdbc:"))
    host = os.environ.get("PGHOST", uri.hostname or "localhost")
    if host not in {"localhost", "127.0.0.1", "::1"}:
        raise ValueError("Bu aktarım yalnız yerel PostgreSQL için tasarlandı.")
    name = database or default_database()
    if name not in {"ivme", "ivme_test"}:
        raise ValueError("Beklenmeyen hedef veritabanı")
    psql = shutil.which("psql") or next((str(path) for version in ("18", "17", "16", "15", "14", "13")
        for path in [Path(f"C:/Program Files/PostgreSQL/{version}/bin/psql.exe")] if path.exists()), None)
    if not psql:
        raise ValueError("psql bulunamadı")
    env = os.environ.copy()
    env["PGPASSWORD"] = os.environ.get("PGPASSWORD", setting("password"))
    env["PGCLIENTENCODING"] = "UTF8"
    env["PGCONNECT_TIMEOUT"] = "5"
    command = [psql, "-X", "--no-password", "--set=ON_ERROR_STOP=1", "--host", host,
               "--port", os.environ.get("PGPORT", str(uri.port or 5432)), "--username",
               os.environ.get("PGUSER", setting("username")), "--dbname", name]
    return command, env, name


def query(connection, sql):
    command, env, _ = connection
    result = subprocess.run([*command, "--tuples-only", "--no-align", "--quiet"], env=env,
                            input=sql + ";\n", capture_output=True, text=True, encoding="utf-8")
    if result.returncode:
        raise RuntimeError(result.stderr.strip())
    return result.stdout.strip()


def sql_text(value):
    return "'" + str(value).replace("'", "''") + "'"


def db_facts(connection, codes):
    """Soru anahtarı, görsel yolu ve katalog bağlarını tek sorguda okur (salt okunur)."""
    array = "ARRAY[" + ",".join(sql_text(code) for code in codes) + "]::text[]"
    raw = query(connection, f"""
        SELECT coalesce(json_object_agg(q.code, json_build_object(
          'id', q.id, 'answerKey', q.correct_answer, 'choiceCount', q.choice_count, 'image', q.image,
          'active', q.active, 'examType', q.exam_type,
          'categoryIds', (SELECT i.category_ids FROM learning_catalog.current_items i
                          WHERE i.kind='QUESTION' AND i.question_code=q.code LIMIT 1),
          'sourceTopic', (SELECT i.data->>'sourceTopic' FROM learning_catalog.current_items i
                          WHERE i.kind='QUESTION' AND i.question_code=q.code LIMIT 1))), '{{}}'::json)
        FROM questions q WHERE q.code = ANY({array})""")
    facts = json.loads(raw or "{}")
    categories = query(connection, """
        SELECT coalesce(json_agg(category_id), '[]'::json) FROM learning_catalog.current_categories""")
    return facts, set(json.loads(categories or "[]"))


def sha256_file(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def db_issues(content, facts, categories, images_root):
    issues = []
    question = content["question"]
    fact = facts.get(question["code"])
    if not fact:
        return [issue("QUESTION_MISSING", "HARD", "question.code", "Soru veritabanında yok.")]
    if not fact["active"]:
        issues.append(issue("QUESTION_INACTIVE", "HARD", "question.code", "Soru etkin değil."))
    if fact["answerKey"] != question["answerKey"]:
        issues.append(issue("KEY_CONFLICT", "HARD", "question.answerKey",
                            f"Veritabanı anahtarı {fact['answerKey']}, içerik {question['answerKey']}. "
                            "Anahtar değiştirilmez; öğretmen/özgün kitapçık kararı gerekir."))
    if fact["choiceCount"] != question["choiceCount"]:
        issues.append(issue("CHOICE_COUNT", "HARD", "question.choiceCount", "Şık sayısı veritabanıyla uyuşmuyor."))
    if fact["examType"] != question["exam"]:
        issues.append(issue("EXAM_TYPE", "HARD", "question.exam", "Sınav türü veritabanıyla uyuşmuyor."))
    if question["categoryId"] not in categories:
        issues.append(issue("CATEGORY_UNKNOWN", "HARD", "question.categoryId", "Kategori yayımlanmış sözlükte yok."))
    elif question["categoryId"] not in (fact.get("categoryIds") or []):
        issues.append(issue("CATEGORY_NOT_ON_ITEM", "SOFT", "question.categoryId",
                            "Kategori sorunun katalog etiketlerinde yok; etiket incelemesine gider."))
    for index, prerequisite in enumerate(content["classification"]["prerequisites"]):
        if prerequisite not in categories:
            issues.append(issue("PREREQUISITE_UNKNOWN", "HARD", f"classification.prerequisites[{index}]",
                                "Ön koşul kategorisi sözlükte yok."))
    image = Path(images_root) / fact["image"]
    if not image.exists():
        issues.append(issue("IMAGE_MISSING", "HARD", "question.imageSha256", f"Görsel yok: {fact['image']}"))
    elif sha256_file(image) != question["imageSha256"]:
        issues.append(issue("IMAGE_CHANGED", "HARD", "question.imageSha256",
                            "Görsel değişmiş; okuma ve çözüm yeniden incelenmeli."))
    content["_questionId"] = fact["id"]
    return issues


# --------------------------------------------------------------------------- dosyalar ve rapor

def load_schema_validator():
    from jsonschema import Draft202012Validator, FormatChecker
    return Draft202012Validator(json.loads(SCHEMA_PATH.read_text(encoding="utf-8")), format_checker=FormatChecker())


def content_files(root=CONTENT_ROOT):
    return sorted(path for path in Path(root).glob("*/*.json"))


def canonical_sha(content):
    clean = {key: value for key, value in content.items() if not key.startswith("_")}
    payload = json.dumps(clean, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def pattern_consistency(contents):
    issues, cards = {}, {}
    for path, content in contents:
        card = content["pattern"]
        previous = cards.setdefault(card["key"], (path, card))
        if previous[1] != card:
            issues.setdefault(path, []).append(issue("PATTERN_DRIFT", "HARD", "pattern",
                f"Aynı kalıp anahtarı {previous[0].name} dosyasında farklı kartla tanımlı."))
    return issues


def evaluate(paths, connection=None, images_root=DEFAULT_IMAGES, offline_facts=None):
    validator = load_schema_validator()
    loaded, items = [], []
    for path in paths:
        try:
            content = json.loads(Path(path).read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            items.append({"file": str(path), "schemaErrors": [f"JSON okunamadı: {error}"], "status": "INVALID"})
            continue
        errors = [f"{'/'.join(map(str, error.absolute_path)) or '(kök)'}: {error.message}"
                  for error in sorted(validator.iter_errors(content), key=lambda e: list(map(str, e.absolute_path)))]
        if errors:
            items.append({"file": str(path), "code": content.get("question", {}).get("code"),
                          "schemaErrors": errors, "status": "INVALID"})
            continue
        if Path(path).parent.name != content["question"]["subjectId"]:
            errors.append("Dosya klasörü branş kimliğiyle uyuşmuyor.")
        if Path(path).stem != content["question"]["code"]:
            errors.append("Dosya adı soru koduyla uyuşmuyor.")
        if errors:
            items.append({"file": str(path), "code": content["question"]["code"], "schemaErrors": errors,
                          "status": "INVALID"})
            continue
        loaded.append((Path(path), content))
    facts, categories = ({}, set())
    if connection is not None and loaded:
        facts, categories = db_facts(connection, [content["question"]["code"] for _, content in loaded])
    elif offline_facts is not None:
        facts, categories = offline_facts
    drift = pattern_consistency(loaded)
    for path, content in loaded:
        issues = semantic_issues(content) + leak_findings(content) + drift.get(path, [])
        if connection is not None or offline_facts is not None:
            issues += db_issues(content, facts, categories, images_root)
        checks = verify(content)
        result = score(content, issues, checks)
        items.append({"file": str(path.relative_to(APP)) if path.is_relative_to(APP) else str(path),
                      "code": content["question"]["code"], "subjectId": content["question"]["subjectId"],
                      "categoryId": content["question"]["categoryId"], "patternKey": content["pattern"]["key"],
                      "questionId": content.get("_questionId"), "contentSha256": canonical_sha(content),
                      "issues": issues, "checks": checks, **result, "_content": content})
    return items


def summary(items):
    valid = [item for item in items if item.get("status") != "INVALID"]
    by_subject = {}
    for item in valid:
        row = by_subject.setdefault(item["subjectId"], {"count": 0, "autoVerified": 0, "needsReview": 0,
                                                         "categories": set(), "patterns": set()})
        row["count"] += 1
        row["autoVerified" if item["status"] == "AUTO_VERIFIED" else "needsReview"] += 1
        row["categories"].add((item["categoryId"], item["_content"]["question"]["subtopic"]))
        row["patterns"].add(item["patternKey"])
    return {
        "files": len(items), "invalid": len(items) - len(valid),
        "autoVerified": sum(item["status"] == "AUTO_VERIFIED" for item in valid),
        "needsReview": sum(item["status"] == "NEEDS_REVIEW" for item in valid),
        "bands": {band: sum(item["band"] == band for item in valid) for band in ("HIGH", "MEDIUM", "LOW")},
        "checks": {"total": sum(len(item["checks"]) for item in valid),
                   "passed": sum(sum(check["passed"] for check in item["checks"]) for item in valid)},
        "hardIssues": sum(sum(issue["severity"] == "HARD" for issue in item["issues"]) for item in valid),
        "subjects": {key: {"count": row["count"], "autoVerified": row["autoVerified"], "needsReview": row["needsReview"],
                           "distinctTopics": len(row["categories"]), "distinctPatterns": len(row["patterns"])}
                     for key, row in sorted(by_subject.items())},
    }


def write_report(items, label):
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    target = REPORT_ROOT / f"{label}-{stamp}"
    target.mkdir(parents=True, exist_ok=True)
    public = [{key: value for key, value in item.items() if not key.startswith("_")} for item in items]
    report = {"verifierVersion": VERIFIER_VERSION, "createdAt": stamp, "summary": summary(items), "items": public}
    (target / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return target / "report.json", report


# --------------------------------------------------------------------------- aktarım

def import_sql(items, verifier_report):
    statements = ["SET LOCAL lock_timeout = '5s';"]
    for item in items:
        if item.get("status") == "INVALID" or item.get("questionId") is None:
            continue
        content = item["_content"]
        clean = {key: value for key, value in content.items() if not key.startswith("_")}
        body = json.dumps(clean, ensure_ascii=False, sort_keys=True)
        verification = json.dumps({"verifierVersion": VERIFIER_VERSION, "report": str(verifier_report),
                                   "checks": item["checks"], "issues": item["issues"],
                                   "computable": item["computable"]}, ensure_ascii=False)
        for marker in ("$tutor$", "$ver$"):
            if marker in body or marker in verification:
                raise ValueError(f"İçerik ayırıcı dizgeyi içeriyor: {item['code']}")
        generation = content["generation"]
        statements.append(f"""
INSERT INTO tutor_contents(question_id, question_code, version_no, schema_version, content, content_sha256,
  image_sha256, answer_key, subject_id, category_id, pattern_key, verification, confidence, confidence_band,
  review_flag, review_reasons, status, generator, generation_tier, prompt_version, source_file)
SELECT {item['questionId']}, {sql_text(item['code'])},
  coalesce((SELECT max(version_no) FROM tutor_contents WHERE question_id={item['questionId']}), 0) + 1,
  {content['schemaVersion']}, $tutor${body}$tutor$::jsonb, {sql_text(item['contentSha256'])},
  {sql_text(content['question']['imageSha256'])}, {sql_text(content['question']['answerKey'])},
  {sql_text(item['subjectId'])}, {sql_text(item['categoryId'])}, {sql_text(item['patternKey'])},
  $ver${verification}$ver$::jsonb, {item['confidence']}, {sql_text(item['band'])}, {str(item['reviewFlag']).lower()},
  {sql_text(json.dumps(item['reviewReasons'], ensure_ascii=False))}::jsonb, {sql_text(item['status'])},
  {sql_text(generation['generator'])}, {sql_text(generation['tier'])}, {sql_text(generation['promptVersion'])},
  {sql_text(item['file'])}
WHERE NOT EXISTS (SELECT 1 FROM tutor_contents WHERE question_id={item['questionId']}
                  AND content_sha256={sql_text(item['contentSha256'])});""")
    statements.append("""
UPDATE tutor_regeneration_requests r SET status='RESOLVED', resolved_at=now(),
  resolved_content_id=(SELECT max(c.id) FROM tutor_contents c WHERE c.question_id=r.question_id)
WHERE r.status='EXPORTED' AND EXISTS (SELECT 1 FROM tutor_contents c WHERE c.question_id=r.question_id
  AND c.created_at > r.created_at);""")
    return "\n".join(statements)


def run_sql_file(connection, sql):
    command, env, _ = connection
    REPORT_ROOT.mkdir(parents=True, exist_ok=True)
    script = REPORT_ROOT / "son-aktarim.sql"
    script.write_text(sql + "\n", encoding="utf-8")
    result = subprocess.run([*command, "--single-transaction", "--quiet", "--file", str(script)], env=env,
                            capture_output=True, text=True, encoding="utf-8")
    if result.returncode:
        raise RuntimeError(result.stderr.strip())


def print_summary(items, report_path, report):
    data = report["summary"]
    print(f"Dosya {data['files']} | geçersiz {data['invalid']} | otomatik doğrulandı {data['autoVerified']} | "
          f"inceleme gerekli {data['needsReview']} | bant {data['bands']} | denetim "
          f"{data['checks']['passed']}/{data['checks']['total']} | sert sorun {data['hardIssues']}")
    for item in items:
        problems = [f"{issue['code']}@{issue['path']}" for issue in item.get("issues", []) if issue["severity"] == "HARD"]
        problems += [f"CHECK@{check['path']}: {check['detail']}" for check in item.get("checks", []) if not check["passed"]]
        problems += item.get("schemaErrors", [])
        if problems:
            print(f"  ! {item.get('code') or item['file']}: " + "; ".join(problems[:6]))
    print(f"Rapor: {report_path}")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("command", choices=["dogrula", "aktar", "yeniden-uretim", "kalibrasyon"])
    parser.add_argument("--db", default=None, help="main: ivme; temporary test: ivme_test")
    parser.add_argument("--images", default=os.environ.get("YKS_RESIM_KLASORU", str(DEFAULT_IMAGES)))
    parser.add_argument("--offline", action="store_true", help="DB bağlarını atla (yalnız dosya denetimi)")
    parser.add_argument("--subject", default=None, help="Yalnız bu branş klasörü")
    args = parser.parse_args(argv)
    if args.command in ("dogrula", "aktar"):
        paths = [path for path in content_files() if not args.subject or path.parent.name == args.subject]
        connection = None if args.offline else db_connection(args.db)
        items = evaluate(paths, connection, args.images)
        report_path, report = write_report(items, "aktarim" if args.command == "aktar" else "dogrulama")
        print_summary(items, report_path, report)
        if args.command == "aktar":
            if args.offline:
                raise SystemExit("Aktarım için DB bağlantısı gerekir.")
            if report["summary"]["invalid"]:
                raise SystemExit("Geçersiz dosya varken aktarım yapılmaz.")
            run_sql_file(connection, import_sql(items, report_path))
            print(query(connection, """SELECT 'DB: ' || count(*) || ' sürüm, ' || count(DISTINCT question_id) || ' soru'
                                       FROM tutor_contents"""))
        return 0 if not report["summary"]["invalid"] else 1
    connection = db_connection(args.db)
    if args.command == "yeniden-uretim":
        raw = query(connection, """
            WITH picked AS (
              UPDATE tutor_regeneration_requests SET status='EXPORTED' WHERE status='OPEN' RETURNING *)
            SELECT coalesce(json_agg(json_build_object('requestId', p.id, 'questionCode', q.code, 'reason', p.reason,
              'contentId', p.content_id, 'requestedAt', p.created_at) ORDER BY p.id), '[]'::json)
            FROM picked p JOIN questions q ON q.id=p.question_id""")
        requests = json.loads(raw or "[]")
        target = REPORT_ROOT / "yeniden-uretim" / f"{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}.json"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps({"requests": requests}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{len(requests)} istek → {target}")
        return 0
    raw = query(connection, """
        SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.band), '[]'::json) FROM (
          SELECT r.band_at_review AS band, count(*) AS reviews,
                 count(*) FILTER (WHERE r.decision='APPROVE') AS approved,
                 round(avg(r.confidence_at_review), 3) AS mean_confidence
          FROM tutor_content_reviews r GROUP BY r.band_at_review) t""")
    print(json.dumps(json.loads(raw or "[]"), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
