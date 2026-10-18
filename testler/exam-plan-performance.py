"""Bounded, read-only timing of the local exam planner; never creates exams."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from http.cookiejar import CookieJar
import json
from pathlib import Path
from time import perf_counter
from urllib.parse import unquote
from urllib.request import build_opener, HTTPCookieProcessor, Request


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    base = 'http://127.0.0.1:9090'
    cookies = CookieJar()
    client = build_opener(HTTPCookieProcessor(cookies))
    try:
        client.open(base + '/api/auth/me', timeout=15).close()
    except Exception as error:
        if getattr(error, 'code', None) != 401:
            raise
    token = next(unquote(cookie.value) for cookie in cookies if cookie.name == 'XSRF-TOKEN')
    client.open(Request(base + '/api/auth/dev-login', data=b'',
                        headers={'X-XSRF-TOKEN': token}, method='POST'), timeout=15).close()
    cookie_header = '; '.join(f'{cookie.name}={cookie.value}' for cookie in cookies)

    def measure(query):
        start = perf_counter()
        # Each worker owns its HTTP handler; the authenticated cookie is read-only.
        with build_opener().open(Request(base + '/api/exams/plan?' + query,
                                        headers={'Cookie': cookie_header}), timeout=60) as response:
            plan = json.load(response)
        return {'query': query, 'milliseconds': round((perf_counter() - start) * 1000, 2), 'plan': plan}

    queries = ['examType=TYT&includeSolved=true', 'examType=TYT&includeSolved=false',
               'examType=AYT&track=SAYISAL&includeSolved=true',
               'examType=AYT&track=SOZEL&includeSolved=false']
    sequential = [measure(query) for query in queries]
    start = perf_counter()
    with ThreadPoolExecutor(max_workers=4) as workers:
        concurrent = list(workers.map(measure, queries))
    report = {'site': base, 'sequential': sequential, 'concurrentWorkers': 4,
              'concurrentMilliseconds': round((perf_counter() - start) * 1000, 2),
              'concurrent': concurrent, 'examOrAnswerWrites': 0}
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'output': str(path), 'sequentialMs': [r['milliseconds'] for r in sequential],
                      'concurrentMs': report['concurrentMilliseconds']}))


if __name__ == '__main__':
    main()
