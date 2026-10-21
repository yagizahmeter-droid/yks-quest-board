import json
from pathlib import Path
from pypdf import PdfReader

folder = Path(__file__).resolve().parent.parent / 'test-results' / 'mebi'
records = json.loads((folder / 'manifest.json').read_text(encoding='utf-8'))
for record in records:
    if not (folder / record['file']).exists():
        continue
    reader = PdfReader(folder / record['file'])
    pages = []
    for index, page in enumerate(reader.pages[:10]):
        pages.append({'page': index + 1, 'text': page.extract_text() or ''})
    record['pages'] = len(reader.pages)
    record['frontmatter'] = pages
    record['outline'] = []
    def walk(items):
        for item in items:
            if isinstance(item, list):
                walk(item)
            else:
                record['outline'].append({'title': item.title, 'page': reader.get_destination_page_number(item) + 1})
    walk(reader.outline)
    (folder / (record['file'] + '.json')).write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
    print(record['kind'], record['exam'], record['lesson'], record['pages'], len(record['outline']))
