"""Check a published MEBI snapshot without rebuilding sources or changing decisions."""
import argparse
import json
from pathlib import Path

from kaynakli_arastirma_db import db_connection
from yks_birlestirme import Store,digest,signature,read_json,write_json
from yks_stages.database import Snapshot

APP=Path(__file__).resolve().parents[1]


def validate_catalog(maintenance,categories,navigation,questions,candidate=False):
    if maintenance.get('curriculumAuthority')!='MEBI_PROVIDER':raise ValueError('MEBI maintenance source required')
    known={c['id']:c for c in maintenance['categories']}
    published={c['id']:c for c in categories}
    # The publisher materializes topicNumber for API ordering.  It is derived
    # from the immutable selectable/unit order and is not a curriculum-source
    # definition change, so it cannot invalidate an identity-preserving check.
    def source_definition(value):
        return {key: item for key,item in value.items() if key != 'topicNumber'}
    if any(identity in known and source_definition(c)!=source_definition(known[identity]) for identity,c in published.items()):
        raise ValueError('Published category definitions differ; prepare a new identity-preserving maintenance candidate')
    if not candidate:
        published_yks={identity for identity,c in published.items() if c.get('exam') in ('TYT','AYT')}
        known_yks={identity for identity,c in known.items() if c.get('exam') in ('TYT','AYT')}
        if published_yks!=known_yks:raise ValueError('Maintenance has unpublished YKS categories')
        # Other exam tracks are independent shared-catalog additions and must
        # remain byte-for-byte definitions, not disappear during YKS cutover.
        foreign={identity:c for identity,c in published.items() if c.get('exam') not in ('TYT','AYT')}
        if any(source_definition(known.get(identity,c))!=source_definition(c) for identity,c in foreign.items()):
            raise ValueError('Other-exam category definition changed during YKS cutover')
    if not candidate and navigation!=maintenance['curriculumNavigation']:
        raise ValueError('Published navigation differs from the maintenance projection')
    if questions['missing'] > questions.get('allowedMissing',0) or questions['stale']:
        raise ValueError('Question additions/changes require source intake before snapshot reuse')
    return {'definitionsUnchanged':True,'publishedCategories':len(published),'maintenanceCategories':len(known),
            'otherExamCategoriesPreserved':sum(c.get('exam') not in ('TYT','AYT') for c in published.values()),
             'questionInventory':questions,'questionRowsWritten':0,'studentRowsWritten':0,'modelsCalled':0,
            'sourceExtractionReused':True,'publicationRequired':False}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database',choices=['ivme','ivme_test'],default='ivme')
    parser.add_argument('--candidate',action='store_true')
    args=parser.parse_args()
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    folder=store.child(state['runId']+'/yol-uyumluluk')
    file=folder/'maintenance-candidate.json' if args.candidate else APP/'backend/src/main/resources/content-taxonomy.json'
    maintenance=read_json(file)
    cmd,env,_=db_connection(args.database)
    with Snapshot(cmd,env) as snapshot:
        published=json.loads(snapshot.execute("SELECT json_build_object('runKey',r.run_key,'summary',r.summary,'categories',(SELECT json_agg(definition ORDER BY category_id) FROM learning_catalog.current_categories)) FROM learning_catalog.runs r JOIN learning_catalog.current_run c USING(run_key);"))
        questions=json.loads(snapshot.execute("""SELECT json_build_object('total',count(*),'missing',count(*) FILTER(WHERE i.item_key IS NULL),
             'stale',count(*) FILTER(WHERE i.source_stamp IS DISTINCT FROM extract(epoch FROM q.updated_at)::text))
             FROM questions q LEFT JOIN learning_catalog.current_items i ON i.item_key='question:'||q.code
             WHERE q.exam_type IN ('TYT','AYT');"""))
    questions['allowedMissing']=int(published['summary'].get('preexistingMissingQuestions',0))
    report=validate_catalog(maintenance,published['categories'],published['summary'].get('curriculumNavigation'),questions,args.candidate)
    reference=maintenance['unitReference']['providerCatalogSha256']
    provider=Path(state['sourceRoots'][0])/'katalog.json'
    if digest(provider)!=reference:raise ValueError('Provider catalog changed; compile/audit its new navigation before refresh')
    report.update(status='PASS',scope='PREPARED_CANDIDATE_COMPATIBILITY' if args.candidate else 'PUBLISHED_SNAPSHOT_REUSE',
        runKey=published['runKey'],questionInventoryScope='TYT_AYT',maintenanceSha256=digest(file),navigationSha256=signature(maintenance['curriculumNavigation']))
    write_json(folder/('candidate-catalog-check.json' if args.candidate else 'published-catalog-check.json'),report)
    print(json.dumps(report,ensure_ascii=False))


if __name__=='__main__':main()
