"""Read a consistent current catalog before reclassification; never writes to PostgreSQL."""
import json
import subprocess
from pathlib import Path

from kaynakli_arastirma_db import db_connection

APP = Path(__file__).resolve().parents[1]


def main():
    connection = db_connection()
    command, env, database = connection
    state = APP / 'veri/content-labels'
    export = state / 'excel-before.ndjson'
    sql = """BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
      SELECT json_build_object('summary',r.summary,'runKey',r.run_key,
        'categories',(SELECT json_agg(definition ORDER BY category_id) FROM learning_catalog.current_categories))
      FROM learning_catalog.runs r JOIN learning_catalog.current_run c USING(run_key);
      SELECT data::text FROM learning_catalog.current_items ORDER BY item_key;
      COMMIT;"""
    with export.open('wb') as output:
        result = subprocess.run([*command, '--tuples-only', '--no-align', '--quiet'], env=env,
            input=sql.encode('utf-8'), stdout=output, stderr=subprocess.PIPE, check=False)
    if result.returncode:
        raise RuntimeError(result.stderr.decode('utf-8'))
    temporary = state / 'labels.snapshot.tmp'
    count = 0
    with export.open(encoding='utf-8') as source, temporary.open('w', encoding='utf-8', newline='\n') as output:
        header = json.loads(next(source))
        output.write('{"version":1,"method":"SOURCE_EVIDENCE_V1","categories":')
        json.dump(header['categories'], output, ensure_ascii=False, separators=(',', ':'))
        output.write(',"items":[')
        for line in source:
            if not line.strip():
                continue
            if count:
                output.write(',')
            output.write(line.strip())
            count += 1
        output.write(']}\n')
    temporary.replace(state / 'labels.json')
    summary = {**header['summary'], 'runKey':header['runKey'], 'resources':count}
    (state / 'report.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2)+'\n',encoding='utf-8')
    export.unlink()
    print(json.dumps({'database':database,'runKey':header['runKey'],'resources':count}))


if __name__ == '__main__':
    main()
