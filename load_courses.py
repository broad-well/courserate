import csv, json

def to_item(row):
    levels = []
    if row['Leveled?'] != 'TRUE':
        levels.append('Level 0 - Unleveled')
    if row['Has level 3 CP'] == 'TRUE':
        levels.append('Level 3 - College Prep')
    if row['Has level 2 CP'] == 'TRUE':
        levels.append('Level 2 - College Prep')
    if row['Has level 1 (Honors)'] == 'TRUE':
        levels.append('Level 1 - Honors')
    if row['Has level 5 (Enriched)'] == 'TRUE':
        levels.append('Level 5 - Enriched')
    if row['Has level 7 (AP)'] == 'TRUE':
        levels.append('Level 7 - AP')
    
    keywords = row['Keywords (separate by commas)'].split(',')
    while '' in keywords:
        keywords.remove('')

    return {
        'id': 'k12.andoverma.us:' + row['Course Code'],
        'schoolDomain': 'k12.andoverma.us',
        'name': row['Name'],
        'levels': levels,
        'enrollCount': 0,
        'keywords': keywords
    }

with open('courses.csv') as csvfile:
    reader = csv.DictReader(csvfile)
    out = []
    for row in reader:
        out.append(to_item(row))
    print(json.dumps(out))
